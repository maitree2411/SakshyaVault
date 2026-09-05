// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title LegalDocumentRegistry
 * @dev Secure Digital Document Management & Evidence Integrity Registry for Law Enforcement,
 *      Forensics, Judiciary, and NCRB (Ministry of Home Affairs).
 *      Compliant with Section 65B of the Indian Evidence Act for electronic record admissibility.
 */
contract LegalDocumentRegistry is AccessControl, Pausable {
    bytes32 public constant POLICE_ROLE = keccak256("POLICE_ROLE");
    bytes32 public constant FORENSIC_ROLE = keccak256("FORENSIC_ROLE");
    bytes32 public constant JUDICIARY_ROLE = keccak256("JUDICIARY_ROLE");
    bytes32 public constant NCRB_ADMIN_ROLE = keccak256("NCRB_ADMIN_ROLE");

    enum DocumentType {
        FIR,                // 0: First Information Report
        CASE_DIARY,         // 1: Police Case Diary (Sec 172 CrPC)
        WITNESS_STATEMENT,  // 2: Witness Statement (Sec 161/164 CrPC)
        SEIZURE_MEMO,       // 3: Panchnama / Seizure Memo
        FORENSIC_REPORT,    // 4: Forensic Science Laboratory (FSL) Report
        MEDICAL_REPORT,     // 5: Medico-Legal Examination Report
        CHARGE_SHEET,       // 6: Final Police Report (Sec 173 CrPC)
        COURT_ORDER,        // 7: Bail Order / Summons / Warrant
        JUDGMENT,           // 8: Court Judgment / Order
        OTHER               // 9: Miscellaneous Legal Record
    }

    struct CustodyTransfer {
        address from;
        address to;
        uint256 timestamp;
        string transferReason;
        string location;
    }

    struct LegalDocument {
        bytes32 docHash;        // SHA-256 / Keccak-256 fingerprint
        string caseId;          // FIR or Court Case ID
        DocumentType docType;   // Document Category
        string ipfsCid;         // Encrypted IPFS / Storage Reference
        string metadataUri;     // JSON metadata URI
        address uploader;       // Officer wallet address / DID
        uint256 timestamp;      // Timestamp of anchoring
        uint256 version;        // Document Version
        bytes32 previousHash;   // Pointer to previous version if amended
        bool isRevoked;         // Revocation status
        string revocationReason;// Reason for revocation/invalidation
        bool exists;            // Existence flag
    }

    // docHash => LegalDocument
    mapping(bytes32 => LegalDocument) public documents;

    // caseId => array of docHashes
    mapping(string => bytes32[]) private caseDocuments;

    // docHash => array of Chain of Custody transfers
    mapping(bytes32 => CustodyTransfer[]) private custodyHistories;

    // Total documents anchored
    uint256 public totalDocuments;

    // Events
    event DocumentRegistered(
        bytes32 indexed docHash,
        string indexed caseId,
        DocumentType indexed docType,
        address uploader,
        uint256 timestamp,
        string ipfsCid,
        uint256 version
    );

    event ChainOfCustodyTransferred(
        bytes32 indexed docHash,
        address indexed from,
        address indexed to,
        string transferReason,
        string location,
        uint256 timestamp
    );

    event DocumentVersionUpdated(
        bytes32 indexed oldDocHash,
        bytes32 indexed newDocHash,
        string caseId,
        uint256 newVersion,
        string updateReason
    );

    event DocumentRevoked(
        bytes32 indexed docHash,
        string indexed caseId,
        address revoker,
        string reason,
        uint256 timestamp
    );

    constructor(address initialAdmin) {
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(NCRB_ADMIN_ROLE, initialAdmin);
        _grantRole(POLICE_ROLE, initialAdmin);
        _grantRole(FORENSIC_ROLE, initialAdmin);
        _grantRole(JUDICIARY_ROLE, initialAdmin);
    }

    /**
     * @dev Register and anchor a legal/investigation document onto the blockchain.
     */
    function registerDocument(
        bytes32 docHash,
        string calldata caseId,
        DocumentType docType,
        string calldata ipfsCid,
        string calldata metadataUri
    ) external whenNotPaused {
        require(docHash != bytes32(0), "Invalid document hash");
        require(bytes(caseId).length > 0, "Case ID required");
        require(!documents[docHash].exists, "Document already registered");

        documents[docHash] = LegalDocument({
            docHash: docHash,
            caseId: caseId,
            docType: docType,
            ipfsCid: ipfsCid,
            metadataUri: metadataUri,
            uploader: msg.sender,
            timestamp: block.timestamp,
            version: 1,
            previousHash: bytes32(0),
            isRevoked: false,
            revocationReason: "",
            exists: true
        });

        caseDocuments[caseId].push(docHash);
        totalDocuments++;

        // Initial Custody Record
        custodyHistories[docHash].push(CustodyTransfer({
            from: address(0),
            to: msg.sender,
            timestamp: block.timestamp,
            transferReason: "Initial Evidence Ingestion / Registration",
            location: "Originating Police Station / Lab"
        }));

        emit DocumentRegistered(
            docHash,
            caseId,
            docType,
            msg.sender,
            block.timestamp,
            ipfsCid,
            1
        );
    }

    /**
     * @dev Record a Chain of Custody handover between departments.
     */
    function recordChainOfCustody(
        bytes32 docHash,
        address to,
        string calldata transferReason,
        string calldata location
    ) external whenNotPaused {
        require(documents[docHash].exists, "Document not registered");
        require(!documents[docHash].isRevoked, "Document is revoked");
        require(to != address(0), "Invalid recipient address");

        custodyHistories[docHash].push(CustodyTransfer({
            from: msg.sender,
            to: to,
            timestamp: block.timestamp,
            transferReason: transferReason,
            location: location
        }));

        emit ChainOfCustodyTransferred(
            docHash,
            msg.sender,
            to,
            transferReason,
            location,
            block.timestamp
        );
    }

    /**
     * @dev Update document version (amendment, supplementary report, revised charge sheet).
     */
    function updateDocumentVersion(
        bytes32 oldDocHash,
        bytes32 newDocHash,
        string calldata newIpfsCid,
        string calldata newMetadataUri,
        string calldata updateReason
    ) external whenNotPaused {
        require(documents[oldDocHash].exists, "Previous document does not exist");
        require(!documents[oldDocHash].isRevoked, "Cannot amend revoked document");
        require(!documents[newDocHash].exists, "New document hash already registered");

        LegalDocument memory prev = documents[oldDocHash];
        uint256 newVersion = prev.version + 1;

        documents[newDocHash] = LegalDocument({
            docHash: newDocHash,
            caseId: prev.caseId,
            docType: prev.docType,
            ipfsCid: newIpfsCid,
            metadataUri: newMetadataUri,
            uploader: msg.sender,
            timestamp: block.timestamp,
            version: newVersion,
            previousHash: oldDocHash,
            isRevoked: false,
            revocationReason: "",
            exists: true
        });

        caseDocuments[prev.caseId].push(newDocHash);
        totalDocuments++;

        emit DocumentVersionUpdated(
            oldDocHash,
            newDocHash,
            prev.caseId,
            newVersion,
            updateReason
        );
    }

    /**
     * @dev Verify document authenticity and retrieve integrity metadata.
     */
    function verifyDocument(bytes32 docHash)
        external
        view
        returns (
            bool exists,
            uint256 timestamp,
            address uploader,
            DocumentType docType,
            string memory caseId,
            uint256 version,
            bool isRevoked,
            string memory ipfsCid
        )
    {
        LegalDocument memory doc = documents[docHash];
        return (
            doc.exists,
            doc.timestamp,
            doc.uploader,
            doc.docType,
            doc.caseId,
            doc.version,
            doc.isRevoked,
            doc.ipfsCid
        );
    }

    /**
     * @dev Fetch all document hashes associated with a case.
     */
    function getCaseDocuments(string calldata caseId)
        external
        view
        returns (bytes32[] memory)
    {
        return caseDocuments[caseId];
    }

    /**
     * @dev Fetch the complete chain of custody transfer history for a document.
     */
    function getCustodyHistory(bytes32 docHash)
        external
        view
        returns (CustodyTransfer[] memory)
    {
        require(documents[docHash].exists, "Document not registered");
        return custodyHistories[docHash];
    }

    /**
     * @dev Revoke or invalidate a document with an authorized reason.
     */
    function revokeDocument(bytes32 docHash, string calldata reason)
        external
        whenNotPaused
    {
        require(documents[docHash].exists, "Document does not exist");
        require(!documents[docHash].isRevoked, "Already revoked");
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender) ||
            hasRole(NCRB_ADMIN_ROLE, msg.sender) ||
            hasRole(JUDICIARY_ROLE, msg.sender) ||
            documents[docHash].uploader == msg.sender,
            "Not authorized to revoke"
        );

        documents[docHash].isRevoked = true;
        documents[docHash].revocationReason = reason;

        emit DocumentRevoked(
            docHash,
            documents[docHash].caseId,
            msg.sender,
            reason,
            block.timestamp
        );
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
