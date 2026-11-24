import crypto from "node:crypto";

function encryptionKey() {
  const hex = process.env.ENCRYPTION_KEY || "";
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes).");
  }
  return Buffer.from(hex, "hex");
}

export function encryptJson(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final()
  ]);
  return {
    encrypted: encrypted.toString("base64"),
    iv: iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex")
  };
}

export function decryptJson(row) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(row.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(row.auth_tag, "hex"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(row.encrypted_payload, "base64")),
    decipher.final()
  ]);
  return JSON.parse(plain.toString("utf8"));
}

export function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
