// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Stores certificate digests, never personal data or certificate files.
contract CredentialRegistry {
    struct Credential {
        address registeredBy;
        uint256 registeredAt;
        bool exists;
    }

    mapping(bytes32 => Credential) private credentials;

    event CredentialRegistered(
        bytes32 indexed credentialHash,
        address indexed registeredBy,
        uint256 registeredAt
    );

    function registerCredential(bytes32 credentialHash) external {
        require(credentialHash != bytes32(0), "Empty credential hash");
        require(!credentials[credentialHash].exists, "Already registered");

        credentials[credentialHash] = Credential({
            registeredBy: msg.sender,
            registeredAt: block.timestamp,
            exists: true
        });

        emit CredentialRegistered(credentialHash, msg.sender, block.timestamp);
    }

    function verifyCredential(bytes32 credentialHash)
        external
        view
        returns (bool exists, address registeredBy, uint256 registeredAt)
    {
        Credential memory item = credentials[credentialHash];
        return (item.exists, item.registeredBy, item.registeredAt);
    }
}
