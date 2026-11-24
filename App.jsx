import { useState } from "react";

const API = "http://localhost:4000/api";

async function request(path, options = {}, sessionId = "") {
  const headers = { ...(options.headers || {}) };
  if (sessionId) headers["x-demo-session"] = sessionId;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function App() {
  const [sessionId, setSessionId] = useState("");
  const [candidateRef, setCandidateRef] = useState("DEMO-CAND-001");
  const [mfaSecret, setMfaSecret] = useState("");
  const [otp, setOtp] = useState("");
  const [mfaReady, setMfaReady] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [registration, setRegistration] = useState(null);
  const [verification, setVerification] = useState(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    candidateName: "", candidateRef: "DEMO-CAND-001", qualification: "",
    institution: "", certificateId: ""
  });
  const [certificate, setCertificate] = useState(null);
  const [verifyId, setVerifyId] = useState("");
  const [verifyFile, setVerifyFile] = useState(null);

  function update(key, value) { setForm(old => ({ ...old, [key]: value })); }
  function clearNotices() { setMessage(""); setError(""); }

  async function run(action) {
    clearNotices(); setBusy(true);
    try { await action(); } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function createSession() {
    const result = await request("/demo/identity-check", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateRef })
    });
    setSessionId(result.sessionId);
    setForm(old => ({ ...old, candidateRef }));
    setMessage(result.message);
  }

  async function setupMfa() {
    const result = await request("/mfa/setup", { method: "POST" }, sessionId);
    setMfaSecret(result.secret);
    setMessage("MFA secret created. Add it to your authenticator app, then enter the current 6-digit code.");
  }

  async function verifyMfa() {
    await request("/mfa/verify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: otp })
    }, sessionId);
    setMfaReady(true);
    setMessage("TOTP MFA enabled for this demo session.");
  }

  async function register(e) {
    e.preventDefault();
    if (!certificate) throw new Error("Choose a certificate file first.");
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, value));
    body.append("certificate", certificate);
    const result = await request("/credentials", { method: "POST", body }, sessionId);
    setRegistration(result);
    setMessage(result.message);
  }

  async function verify(e) {
    e.preventDefault();
    if (!verifyFile) throw new Error("Choose the certificate file to verify.");
    const body = new FormData();
    body.append("certificateId", verifyId);
    body.append("certificate", verifyFile);
    const result = await request("/credentials/verify", { method: "POST", body });
    setVerification(result);
    setMessage("Verification check completed.");
  }

  return (
    <main className="shell">
      <header className="hero">
        <div className="eyebrow">BLOCKCHAIN • IDENTITY • TRUST</div>
        <h1>Job Credential Verification</h1>
        <p>Secure credential registration and employer verification with encrypted records and smart-contract-backed integrity.</p>
        <div className="chips"><span>React.js</span><span>Node.js</span><span>PostgreSQL</span><span>Solidity</span><span>TOTP MFA</span></div>
      </header>

      <div className="notice"><strong>Academic demo only:</strong> Aadhaar identity is simulated. This app does not connect to UIDAI. Do not enter Aadhaar numbers, OTPs, biometrics or upload Aadhaar documents.</div>

      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}

      <section className="panel">
        <div className="section-title"><div><span className="step">01</span><h2>Identity & multi-factor authentication</h2></div><span className={sessionId ? "status good" : "status"}>{sessionId ? "Demo identity checked" : "Not started"}</span></div>
        <div className="grid two">
          <label>Demo candidate reference<input value={candidateRef} onChange={e => setCandidateRef(e.target.value)} placeholder="DEMO-CAND-001" /></label>
          <div className="action-wrap"><button onClick={() => run(createSession)} disabled={busy}>Create demo session</button></div>
        </div>
        {sessionId && <div className="mfa-box">
          <div className="row"><button className="secondary" onClick={() => run(setupMfa)} disabled={busy || mfaReady}>Generate TOTP setup</button><span className={mfaReady ? "status good" : "status"}>{mfaReady ? "MFA enabled" : "MFA pending"}</span></div>
          {mfaSecret && <div className="secret"><b>Authenticator secret (demo)</b><code>{mfaSecret}</code><small>Enter this secret manually in an authenticator app. Keep it private.</small></div>}
          {mfaSecret && <div className="grid two otp-row"><label>6-digit authenticator code<input value={otp} onChange={e => setOtp(e.target.value)} maxLength="6" inputMode="numeric" /></label><div className="action-wrap"><button onClick={() => run(verifyMfa)} disabled={busy || mfaReady}>Verify MFA code</button></div></div>}
        </div>}
      </section>

      <section className="panel">
        <div className="section-title"><div><span className="step">02</span><h2>Register candidate credential</h2></div><span className="tag">Encrypted + on-chain hash</span></div>
        <form onSubmit={e => run(() => register(e))}>
          <div className="grid two">
            <label>Candidate full name<input required value={form.candidateName} onChange={e => update("candidateName", e.target.value)} /></label>
            <label>Candidate reference ID<input required value={form.candidateRef} onChange={e => update("candidateRef", e.target.value)} /></label>
            <label>Qualification / degree<input required value={form.qualification} onChange={e => update("qualification", e.target.value)} /></label>
            <label>Issuing institution<input required value={form.institution} onChange={e => update("institution", e.target.value)} /></label>
            <label>Certificate ID<input required value={form.certificateId} onChange={e => update("certificateId", e.target.value)} /></label>
            <label className="file-label">Certificate file (PDF, PNG, JPG)<input required type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setCertificate(e.target.files[0])} /></label>
          </div>
          <button disabled={busy || !sessionId || !mfaReady}>{busy ? "Please wait…" : "Register credential on blockchain"}</button>
          {(!sessionId || !mfaReady) && <small className="hint">Complete demo identity check and TOTP MFA before registration.</small>}
        </form>
        {registration && <div className="result"><b>Registration successful</b><p>Certificate SHA-256</p><code>{registration.documentHash}</code><p>Blockchain transaction</p><code>{registration.transactionHash}</code></div>}
      </section>

      <section className="panel">
        <div className="section-title"><div><span className="step">03</span><h2>Employer credential verification</h2></div><span className="tag">Tamper detection</span></div>
        <form onSubmit={e => run(() => verify(e))}>
          <div className="grid two">
            <label>Certificate ID<input required value={verifyId} onChange={e => setVerifyId(e.target.value)} /></label>
            <label className="file-label">Candidate's certificate file<input required type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setVerifyFile(e.target.files[0])} /></label>
          </div>
          <button className="secondary" disabled={busy}>Verify certificate</button>
        </form>
        {verification && <div className={`result ${verification.verified ? "verified" : "failed"}`}>
          <h3>{verification.verified ? "✓ Credential verified" : "✕ Verification failed"}</h3>
          <p>Document hash match: <b>{String(verification.fileHashMatches)}</b></p>
          <p>Blockchain record exists: <b>{String(verification.blockchainRecordExists)}</b></p>
          {verification.credential && <p>{verification.credential.candidateName} · {verification.credential.qualification} · {verification.credential.institution}</p>}
          <small>Transaction: {verification.transactionHash}</small>
        </div>}
      </section>

      <footer>Job Credential Verification • Local academic prototype • Personal information is kept off-chain</footer>
    </main>
  );
}
