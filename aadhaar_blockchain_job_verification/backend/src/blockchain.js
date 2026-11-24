import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const artifactPath = path.resolve(__dirname, "../artifacts/contracts/CredentialRegistry.sol/CredentialRegistry.json");

function contract() {
  if (!process.env.CONTRACT_ADDRESS) throw new Error("CONTRACT_ADDRESS is missing. Deploy the contract first.");
  if (!fs.existsSync(artifactPath)) throw new Error("Contract artifact missing. Run npm run compile.");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545");
  const wallet = new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY, provider);
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, artifact.abi, wallet);
}

export async function registerHash(hashHex) {
  const registry = contract();
  const bytes32 = `0x${hashHex}`;
  const tx = await registry.registerCredential(bytes32);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, credentialHash: bytes32 };
}

export async function verifyHash(hashHex) {
  const registry = contract();
  const result = await registry.verifyCredential(`0x${hashHex}`);
  return {
    exists: result[0],
    registeredBy: result[1],
    registeredAt: Number(result[2])
  };
}
