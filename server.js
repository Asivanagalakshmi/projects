import express from "express";
import cors from "cors";
import helmet from "helmet";
import multer from "multer";
import crypto from "node:crypto";
import dotenv from "dotenv";
import { authenticator } from "otplib";
import { pool, initializeDatabase } from "./db.js";
import { encryptJson, decryptJson, sha256 } from "./security.js";
import { registerHash, verifyHash } from "./blockchain.js";
import { sessions, getSession } from "./session.js";

dotenv.config();
const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/png", "image/jpeg"];
    cb(allowed.includes(file.mimetype) ? null : new Error("Only PDF, PNG and JPG files are allowed."), allowed.includes(file.mimetype));
  }
});

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "100kb" }));

function requireDemoSession(req, res, next) {
  const session = getSession(req);
  if (!session?.identityChecked || !session?.mfaEnabled) {
    return res.status(401).json({ error: "Complete the demo identity check and TOTP MFA first." });
  }
  req.demoSession = session;
  next();
}

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected", identityProvider: "mock-demo-only" });
  } catch {
    res.status(503).json({ status: "error", database: "unavailable" });
  }
});

// MOCK ONLY: this does not validate Aadhaar, contact UIDAI, or accept an Aadhaar number.
app.post("/api/demo/identity-check", (req, res) => {
  const { candidateRef } = req.body || {};
  if (!candidateRef || String(candidateRef).trim().length < 3) {
    return res.status(400).json({ error: "Enter a demo candidate reference (at least 3 characters)." });
  }
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, {
    identityChecked: true,
    mfaEnabled: false,
    candidateRef: String(candidateRef).trim(),
    mfaSecret: null
  });
  res.json({
    sessionId,
    status: "DEMO_IDENTITY_CHECK_PASSED",
    message: "Mock identity check only. No Aadhaar authentication was performed."
  });
});

app.post("/api/mfa/setup", (req, res) => {
  const session = getSession(req);
  if (!session?.identityChecked) return res.status(401).json({ error: "Complete demo identity check first." });
  const secret = authenticator.generateSecret();
  session.mfaSecret = secret;
  const otpauth = authenticator.keyuri(session.candidateRef, "Job Credential Verification Demo", secret);
  res.json({ secret, otpauth, message: "Add this demo account to an authenticator app. Keep the secret private." });
});

app.post("/api/mfa/verify", (req, res) => {
  const session = getSession(req);
  const { token } = req.body || {};
  if (!session?.identityChecked || !session?.mfaSecret) return res.status(401).json({ error: "Set up MFA first." });
  if (!/^\d{6}$/.test(String(token || "")) || !authenticator.check(String(token), session.mfaSecret)) {
    return res.status(400).json({ error: "Invalid or expired TOTP code." });
  }
  session.mfaEnabled = true;
  res.json({ status: "MFA_ENABLED", message: "TOTP multi-factor authentication enabled for this demo session." });
});

app.post("/api/credentials", requireDemoSession, upload.single("certificate"), async (req, res) => {
  try {
    const { candidateName, candidateRef, qualification, institution, certificateId } = req.body;
    if (![candidateName, candidateRef, qualification, institution, certificateId].every(v => String(v || "").trim())) {
      return res.status(400).json({ error: "All credential fields are required." });
    }
    if (candidateRef.trim() !== req.demoSession.candidateRef) {
      return res.status(403).json({ error: "Candidate reference does not match the demo session." });
    }
    if (!req.file) return res.status(400).json({ error: "Upload a certificate file." });

    const documentHash = sha256(req.file.buffer);
    const payload = {
      candidateName: candidateName.trim(),
      candidateRef: candidateRef.trim(),
      qualification: qualification.trim(),
      institution: institution.trim(),
      certificateId: certificateId.trim(),
      originalFileName: req.file.originalname
    };
    const encrypted = encryptJson(payload);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const chainResult = await registerHash(documentHash);
      const insert = await client.query(
        `INSERT INTO credentials
         (certificate_id, encrypted_payload, iv, auth_tag, document_hash, blockchain_tx, blockchain_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, created_at`,
        [payload.certificateId, encrypted.encrypted, encrypted.iv, encrypted.authTag,
         documentHash, chainResult.txHash, chainResult.credentialHash]
      );
      await client.query(
        "INSERT INTO audit_events(event_type, certificate_id, event_detail) VALUES ($1,$2,$3)",
        ["CREDENTIAL_REGISTERED", payload.certificateId, JSON.stringify({ txHash: chainResult.txHash })]
      );
      await client.query("COMMIT");
      res.status(201).json({
        message: "Credential registered. Metadata encrypted in PostgreSQL and file digest recorded on blockchain.",
        id: insert.rows[0].id,
        createdAt: insert.rows[0].created_at,
        documentHash,
        transactionHash: chainResult.txHash
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "Certificate ID is already registered." });
    console.error(error);
    res.status(500).json({ error: error.message || "Credential registration failed." });
  }
});

app.post("/api/credentials/verify", upload.single("certificate"), async (req, res) => {
  try {
    const certificateId = String(req.body.certificateId || "").trim();
    if (!certificateId || !req.file) return res.status(400).json({ error: "Certificate ID and certificate file are required." });
    const result = await pool.query("SELECT * FROM credentials WHERE certificate_id = $1", [certificateId]);
    if (!result.rowCount) return res.status(404).json({ verified: false, error: "No credential found for this certificate ID." });

    const row = result.rows[0];
    const suppliedHash = sha256(req.file.buffer);
    const fileMatches = suppliedHash === row.document_hash;
    const chainRecord = await verifyHash(row.document_hash);
    const verified = fileMatches && chainRecord.exists;

    await pool.query(
      "INSERT INTO audit_events(event_type, certificate_id, event_detail) VALUES ($1,$2,$3)",
      ["CREDENTIAL_VERIFICATION", certificateId, JSON.stringify({ fileMatches, onChain: chainRecord.exists, verified })]
    );

    res.json({
      verified,
      status: verified ? "VERIFIED" : "FAILED",
      fileHashMatches: fileMatches,
      blockchainRecordExists: chainRecord.exists,
      blockchainRegisteredBy: chainRecord.registeredBy,
      blockchainRegisteredAt: chainRecord.registeredAt,
      transactionHash: row.blockchain_tx,
      credential: decryptJson(row)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Verification failed." });
  }
});

app.get("/api/credentials/:certificateId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT certificate_id, document_hash, blockchain_tx, created_at FROM credentials WHERE certificate_id = $1",
      [req.params.certificateId]
    );
    if (!result.rowCount) return res.status(404).json({ error: "Credential not found." });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Could not retrieve credential." });
  }
});

const port = Number(process.env.PORT || 4000);
initializeDatabase().then(() => {
  app.listen(port, () => console.log(`API running at http://localhost:${port}`));
}).catch(error => {
  console.error("Database initialization failed:", error);
  process.exit(1);
});
