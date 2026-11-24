import { expect } from "chai";
import { ethers } from "hardhat";

describe("CredentialRegistry", function () {
  it("registers a credential digest and verifies it", async function () {
    const Registry = await ethers.getContractFactory("CredentialRegistry");
    const registry = await Registry.deploy();
    const digest = ethers.keccak256(ethers.toUtf8Bytes("demo certificate"));
    await registry.registerCredential(digest);
    const result = await registry.verifyCredential(digest);
    expect(result[0]).to.equal(true);
  });

  it("rejects duplicate registration", async function () {
    const Registry = await ethers.getContractFactory("CredentialRegistry");
    const registry = await Registry.deploy();
    const digest = ethers.keccak256(ethers.toUtf8Bytes("demo certificate"));
    await registry.registerCredential(digest);
    await expect(registry.registerCredential(digest)).to.be.revertedWith("Already registered");
  });
});
