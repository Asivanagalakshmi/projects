# Job Credential Verification via Aadhaar Using Blockchain Technology

Full-stack academic demonstration using **React.js, Node.js/Express, PostgreSQL, Solidity smart contracts, AES-256-GCM encryption, and TOTP multi-factor authentication**.

> **Aadhaar integration notice:** This repository contains a clearly labelled *mock Aadhaar identity adapter*. It does not connect to UIDAI, perform e-KYC, validate Aadhaar numbers, send OTPs, or authenticate biometrics. Never enter or store a real Aadhaar number or OTP. A real integration requires authorized access and a compliant UIDAI ecosystem partner. The demo identity step is not proof of Aadhaar authentication.

## What the application demonstrates

- Candidate identity check through a mock Aadhaar adapter (demo-only).
- TOTP multi-factor authentication for a demo user.
- Credential registration with certificate SHA-256 digest.
- Smart-contract registration and verification of credential digests on a local Ethereum development chain.
- AES-256-GCM encryption of credential metadata before PostgreSQL storage.
- Employer verification by certificate ID and document digest.
- Audit events and blockchain transaction hashes.

## Technology stack

- Frontend: React.js + Vite
- Backend: Node.js + Express
- Database: PostgreSQL
- Smart contract: Solidity + Hardhat + ethers.js
- Encryption: Node.js crypto (AES-256-GCM)
- MFA: TOTP (otplib)

## Prerequisites

- Node.js 20 or newer and npm
- Docker Desktop (recommended for PostgreSQL), or a local PostgreSQL server

## Run locally

Open three terminals from the project root.

### 1. Start PostgreSQL

```bash
docker compose up -d postgres
```

### 2. Configure and start the blockchain

```bash
cd backend
npm install
copy .env.example .env
```

On macOS/Linux, use `cp .env.example .env` instead of `copy`.

Start a local Hardhat blockchain and keep this terminal running:

```bash
npm run chain
```

In a second backend terminal:

```bash
cd backend
npm run deploy
```

Copy the printed contract address into `backend/.env` as `CONTRACT_ADDRESS`.

### 3. Start the backend

```bash
cd backend
npm run dev
```

The API runs at `http://localhost:4000`.

### 4. Start the React frontend

In a third terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL printed in the terminal, normally `http://localhost:5173`.

## Demo flow

1. Click **Create demo session**. This uses a mock identity check and does not contact UIDAI.
2. Set up TOTP MFA. Scan the displayed `otpauth://` URI with an authenticator app, or enter the secret manually. Enter the current six-digit code to enable MFA.
3. Register a credential. Enter a candidate name, candidate reference, qualification, issuing institution, certificate ID and certificate file. Complete the mock identity and TOTP steps.
4. The server calculates the file SHA-256 digest, writes the digest to the smart contract, encrypts metadata with AES-256-GCM and stores it in PostgreSQL.
5. Verify using the certificate ID and the exact same file. Change the file to demonstrate a failed hash comparison.

## API endpoints

- `GET /api/health` — backend and database status
- `POST /api/demo/identity-check` — mock identity check; accepts a demo reference, not Aadhaar
- `POST /api/mfa/setup` — create a TOTP secret for a demo session
- `POST /api/mfa/verify` — verify TOTP and enable MFA
- `POST /api/credentials` — register credential (multipart form)
- `POST /api/credentials/verify` — verify a credential (multipart form)
- `GET /api/credentials/:certificateId` — retrieve safe credential status

## Important implementation notes

- `backend/contracts/CredentialRegistry.sol` stores only a `bytes32` digest and registration metadata on-chain. It does not store names, Aadhaar data, certificate contents, or other personal information.
- Credential details are encrypted in PostgreSQL using AES-256-GCM. The encryption key is configured using `ENCRYPTION_KEY` (32 bytes represented as 64 hexadecimal characters).
- The project uses a local development blockchain and a demo signer. Do not use the included development private key on a public network.
- This is a learning prototype, not a production-ready identity or employment-verification service. Production deployment requires a security review, real issuer verification, consent and privacy controls, secure key management, access controls, rate limiting, audit retention, backups, and legally authorized identity-provider integration.

## Troubleshooting

- If the API says the contract is not configured, deploy the contract and add the printed address to `backend/.env`.
- If PostgreSQL is unavailable, confirm the Docker container is healthy with `docker compose ps`.
- If a TOTP code is rejected, check your device clock and wait for the next 30-second code.
- Keep the Hardhat node running while using the app.

## Upload this project to GitHub (important)

**Do not upload the ZIP archive as the project source.** GitHub's browser uploader is for repository files; it does not extract an archive into folders. First extract the ZIP on your computer, then upload the extracted project contents.

### Option A — GitHub website

1. Create an empty repository on GitHub (do not initialize it with a README if you plan to upload this README).
2. Extract the downloaded ZIP.
3. Open the extracted `aadhaar_blockchain_job_verification` folder.
4. In your GitHub repository, choose **Add file → Upload files**.
5. Drag the *contents* of the extracted folder into the upload area (the `backend` and `frontend` folders, `docker-compose.yml`, `.gitignore`, and `README.md`). Do not drag the ZIP file.
6. Commit the upload.

### Option B — Git command line (recommended)

Install Git, open a terminal inside the extracted project folder, then run:

```bash
git init
git add .
git status
git commit -m "Initial job credential verification project"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the remote URL with your own repository URL. Never commit `.env` files, private keys, real Aadhaar information, OTPs, or certificate files. The `.gitignore` excludes `.env` and generated build folders.

GitHub's browser upload has per-file and batch limits. If the browser uploader rejects a large batch, use Git from the command line.
