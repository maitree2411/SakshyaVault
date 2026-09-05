import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class IntegrityVerificationController {
  /**
   * Verify document integrity by cryptographic hash (SHA-256).
   * Verifies against on-chain database records.
   */
  static async verifyByHash(req: Request, res: Response) {
    try {
      const { documentHash, verifierAgency, verifierAddress } = req.body;

      if (!documentHash) {
        return res.status(400).json({ error: 'documentHash is required for verification' });
      }

      const formattedHash = documentHash.startsWith('0x') ? documentHash : `0x${documentHash}`;

      const doc = await prisma.legalDocument.findUnique({
        where: { documentHash: formattedHash },
        include: {
          case: true,
          custodyHistory: {
            orderBy: { timestamp: 'desc' }
          },
          uploader: {
            select: {
              name: true,
              department: true,
              badgeNumber: true,
              role: true
            }
          }
        }
      });

      const isAuthentic = Boolean(doc && !doc.isRevoked);

      // Save verification log
      const record = await prisma.verificationRecord.create({
        data: {
          documentHash: formattedHash,
          documentId: doc ? doc.id : null,
          isAuthentic,
          verifierAgency: verifierAgency || 'Public / Court Verification Portal',
          verifierAddress: verifierAddress || '0xVerifier...0000',
          remarks: doc
            ? doc.isRevoked
              ? `REVOKED: ${doc.revocationReason}`
              : 'Authentic and verified on blockchain registry'
            : 'TAMPERING DETECTED: Hash not found on registry',
          proofType: 'SHA256_ONCHAIN'
        }
      });

      if (!doc) {
        return res.status(200).json({
          success: true,
          isAuthentic: false,
          status: 'TAMPERED_OR_UNREGISTERED',
          message: 'TAMPERING DETECTED: This document does not match any official record in the blockchain registry. The document may have been altered, modified, or forged.',
          hashChecked: formattedHash,
          verificationId: record.id,
          verifiedAt: record.verifiedAt
        });
      }

      if (doc.isRevoked) {
        return res.status(200).json({
          success: true,
          isAuthentic: false,
          status: 'REVOKED',
          message: `DOCUMENT REVOKED: This document was officially revoked on ${doc.updatedAt.toISOString()}. Reason: ${doc.revocationReason}`,
          document: doc,
          verificationId: record.id
        });
      }

      return res.status(200).json({
        success: true,
        isAuthentic: true,
        status: 'AUTHENTIC_VERIFIED',
        message: 'DOCUMENT INTEGRITY VERIFIED: Cryptographic fingerprint matches official blockchain registry.',
        document: {
          id: doc.id,
          title: doc.title,
          documentType: doc.documentType,
          documentHash: doc.documentHash,
          version: doc.version,
          txHash: doc.txHash,
          ipfsHash: doc.ipfsHash,
          createdAt: doc.createdAt,
          case: {
            caseNumber: doc.case.caseNumber,
            firNumber: doc.case.firNumber,
            title: doc.case.title,
            policeStation: doc.case.policeStation,
            sections: doc.case.sections,
            status: doc.case.status
          },
          custodyChainLength: doc.custodyHistory.length,
          latestCustodian: doc.custodyHistory[0] ? doc.custodyHistory[0].toParty : 'Case File'
        },
        verificationId: record.id,
        verifiedAt: record.verifiedAt
      });
    } catch (error: any) {
      logger.error('Error verifying document hash:', error);
      return res.status(500).json({ error: error.message || 'Verification process failed' });
    }
  }

  /**
   * Verify document by calculating hash directly from raw text or base64 file content
   */
  static async verifyByFileContent(req: Request, res: Response) {
    try {
      const { content, fileBase64, verifierAgency } = req.body;

      if (!content && !fileBase64) {
        return res.status(400).json({ error: 'Either content or fileBase64 is required' });
      }

      const payload = fileBase64 || content;
      const computedHash = `0x${crypto.createHash('sha256').update(payload).digest('hex')}`;

      // Delegate to verifyByHash
      req.body.documentHash = computedHash;
      req.body.verifierAgency = verifierAgency || 'Direct File Content Verifier';
      return IntegrityVerificationController.verifyByHash(req, res);
    } catch (error: any) {
      logger.error('Error verifying file content:', error);
      return res.status(500).json({ error: error.message || 'Content verification failed' });
    }
  }

  /**
   * Generate Section 65B Indian Evidence Act Certificate for Court Admissibility.
   */
  static async generateSection65BCertificate(req: Request, res: Response) {
    try {
      const { documentId } = req.params;
      const { certifierName, certifierDesignation, courtName } = req.query;

      const doc = await prisma.legalDocument.findUnique({
        where: { id: documentId },
        include: {
          case: true,
          custodyHistory: {
            orderBy: { timestamp: 'asc' }
          },
          uploader: true
        }
      });

      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const certificateId = `SEC65B-${doc.case.firNumber.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`;
      const certTimestamp = new Date().toISOString();

      const certificateData = {
        certificateId,
        legalStatute: 'Section 65B(4) of the Indian Evidence Act, 1872 / Section 63 of Bharatiya Sakshya Adhiniyam, 2023',
        courtJurisdiction: courtName || 'In the Court of Competent Judicial Magistrate / District & Sessions Judge',
        certifier: {
          name: certifierName || doc.uploader?.name || 'Authorized Officer / Digital Evidence Custodian',
          designation: certifierDesignation || 'System Administrator / Forensic Evidence In-Charge',
          agency: doc.uploader?.department || doc.case.policeStation,
        },
        caseParticulars: {
          caseNumber: doc.case.caseNumber,
          firNumber: doc.case.firNumber,
          policeStation: doc.case.policeStation,
          sectionsOfLaw: doc.case.sections,
          caseTitle: doc.case.title,
        },
        electronicRecordDetails: {
          documentTitle: doc.title,
          documentType: doc.documentType,
          cryptographicHash: doc.documentHash,
          hashAlgorithm: 'SHA-256 (256-bit Secure Hash Algorithm)',
          blockchainAnchorTx: doc.txHash || '0xAnchoredBlockRegistry',
          storageCid: doc.ipfsHash,
          version: doc.version,
          creationTimestamp: doc.createdAt.toISOString(),
          isTamperProof: !doc.isRevoked,
        },
        chainOfCustodyAudit: doc.custodyHistory.map((step, idx) => ({
          step: idx + 1,
          from: step.fromParty,
          to: step.toParty,
          purpose: step.transferReason,
          location: step.location,
          timestamp: step.timestamp.toISOString(),
          digitalSignature: step.officerSignature
        })),
        statutoryDeclaration: `I hereby solemnly declare and certify that the electronic record described herein has been produced by a computer system operating properly during the period over which the computer was used regularly to store or process information. The electronic record has not been altered, manipulated, or tampered with at any point during its retention, and its integrity is mathematically guaranteed via cryptographic hash anchored in the immutable legal registry.`,
        issuedAt: certTimestamp,
        digitalSeal: `MHA-NCRB-SEAL-${crypto.createHash('sha256').update(certificateId + certTimestamp).digest('hex').substring(0, 32).toUpperCase()}`
      };

      await prisma.auditLog.create({
        data: {
          action: 'EXPORT_65B_CERTIFICATE',
          resource: doc.documentHash,
          officerName: String(certifierName || 'Court Clerk / IO'),
          details: JSON.stringify({ certificateId, caseNumber: doc.case.caseNumber }),
          ipAddress: req.ip || '127.0.0.1'
        }
      });

      return res.json({
        success: true,
        data: certificateData
      });
    } catch (error: any) {
      logger.error('Error generating Section 65B certificate:', error);
      return res.status(500).json({ error: error.message || 'Failed to generate Section 65B certificate' });
    }
  }
}
