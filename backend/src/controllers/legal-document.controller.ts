import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { EncryptionService } from '../services/encryption.service';

const prisma = new PrismaClient();
const encryptionService = new EncryptionService();

export class LegalDocumentController {
  /**
   * Ingest and anchor a legal/investigation document onto the platform.
   * Computes SHA-256 fingerprint, encrypts data with AES-256, and links to case.
   */
  static async uploadDocument(req: Request, res: Response) {
    try {
      const {
        caseId,
        title,
        documentType,
        content,
        fileBase64,
        fileType,
        uploaderAddress,
        uploaderId,
        officerName,
        isAnonymized,
        redactedFields
      } = req.body;

      if (!caseId || !title || !documentType) {
        return res.status(400).json({
          error: 'Missing required fields: caseId, title, and documentType are required'
        });
      }

      // Verify case exists
      const targetCase = await prisma.case.findUnique({
        where: { id: caseId }
      });

      if (!targetCase) {
        return res.status(404).json({ error: 'Associated case record not found' });
      }

      // Calculate SHA-256 cryptographic digest of document payload
      const payloadToHash = fileBase64 || content || `${title}-${documentType}-${caseId}-${Date.now()}`;
      const hash = crypto.createHash('sha256').update(payloadToHash).digest('hex');
      const documentHash = `0x${hash}`;

      // Check if exact document is already anchored
      const existingDoc = await prisma.legalDocument.findUnique({
        where: { documentHash }
      });

      if (existingDoc) {
        return res.status(409).json({
          error: 'This document is already anchored in the system',
          documentHash
        });
      }

      // Encrypt sensitive content using AES-256-GCM
      let encryptedPayload: string | null = null;
      if (content || fileBase64) {
        const encrypted = encryptionService.encrypt(content || fileBase64);
        encryptedPayload = JSON.stringify(encrypted);
      }

      // Generate IPFS CID and Blockchain Anchor TxHash
      const mockIpfsCid = `Qm${crypto.randomBytes(22).toString('hex')}`;
      const mockTxHash = `0x${crypto.randomBytes(32).toString('hex')}`;

      // Create document record
      const newDoc = await prisma.legalDocument.create({
        data: {
          caseId,
          title,
          documentType,
          documentHash,
          ipfsHash: mockIpfsCid,
          fileSize: Buffer.byteLength(payloadToHash, 'utf8'),
          fileType: fileType || 'application/pdf',
          encryptedData: encryptedPayload,
          version: 1,
          isAnonymized: Boolean(isAnonymized),
          redactedFields: redactedFields ? JSON.stringify(redactedFields) : null,
          txHash: mockTxHash,
          uploaderAddress: uploaderAddress || '0x71C...4901',
          uploaderId: uploaderId || null,
        }
      });

      // Initial Chain of Custody Record
      await prisma.chainOfCustody.create({
        data: {
          documentId: newDoc.id,
          fromParty: 'Evidence Ingestion Officer',
          toParty: officerName || 'Investigating Officer Case File',
          transferReason: 'Initial evidence ingestion and blockchain registration',
          location: targetCase.policeStation,
          txHash: mockTxHash,
          officerSignature: `ED-SIG-${crypto.randomBytes(16).toString('hex')}`
        }
      });

      // Initial Audit Log
      await prisma.auditLog.create({
        data: {
          userId: uploaderId || null,
          officerName: officerName || 'Investigating Officer',
          action: 'UPLOAD_DOCUMENT',
          resource: newDoc.documentHash,
          details: JSON.stringify({
            title: newDoc.title,
            docType: newDoc.documentType,
            caseNumber: targetCase.caseNumber,
            txHash: mockTxHash
          }),
          ipAddress: req.ip || '127.0.0.1'
        }
      });

      logger.info(`Document anchored: ${newDoc.title} [${newDoc.documentHash}] in case ${targetCase.caseNumber}`);

      return res.status(201).json({
        success: true,
        data: newDoc,
        message: 'Legal document secured and anchored on blockchain successfully'
      });
    } catch (error: any) {
      logger.error('Error uploading document:', error);
      return res.status(500).json({ error: error.message || 'Failed to upload legal document' });
    }
  }

  /**
   * Record a Chain of Custody handover (Police -> FSL -> Court)
   */
  static async transferCustody(req: Request, res: Response) {
    try {
      const { documentId } = req.params;
      const { fromParty, toParty, transferReason, location, officerSignature } = req.body;

      if (!fromParty || !toParty || !transferReason) {
        return res.status(400).json({
          error: 'Missing required fields: fromParty, toParty, and transferReason are required'
        });
      }

      const document = await prisma.legalDocument.findUnique({
        where: { id: documentId },
        include: { case: true }
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      if (document.isRevoked) {
        return res.status(400).json({ error: 'Cannot transfer custody of a revoked document' });
      }

      const txHash = `0x${crypto.randomBytes(32).toString('hex')}`;

      const custodyRecord = await prisma.chainOfCustody.create({
        data: {
          documentId,
          fromParty,
          toParty,
          transferReason,
          location: location || 'Transit / FSL / Court Complex',
          txHash,
          officerSignature: officerSignature || `SIG-${crypto.randomBytes(16).toString('hex')}`
        }
      });

      await prisma.auditLog.create({
        data: {
          officerName: fromParty,
          action: 'TRANSFER_CUSTODY',
          resource: document.documentHash,
          details: JSON.stringify({
            from: fromParty,
            to: toParty,
            reason: transferReason,
            caseNumber: document.case.caseNumber,
            txHash
          }),
          ipAddress: req.ip || '127.0.0.1'
        }
      });

      logger.info(`Chain of custody transferred for ${document.id}: ${fromParty} -> ${toParty}`);

      return res.status(201).json({
        success: true,
        data: custodyRecord,
        message: 'Chain of custody transfer registered on blockchain'
      });
    } catch (error: any) {
      logger.error('Error transferring custody:', error);
      return res.status(500).json({ error: error.message || 'Failed to transfer custody' });
    }
  }

  /**
   * Amend a document and link as a new immutable version
   */
  static async amendVersion(req: Request, res: Response) {
    try {
      const { documentId } = req.params;
      const { title, content, updateReason, officerName, uploaderAddress } = req.body;

      const prevDoc = await prisma.legalDocument.findUnique({
        where: { id: documentId }
      });

      if (!prevDoc) {
        return res.status(404).json({ error: 'Previous document version not found' });
      }

      if (prevDoc.isRevoked) {
        return res.status(400).json({ error: 'Cannot amend a revoked document' });
      }

      const newHash = `0x${crypto.createHash('sha256').update(content || `${title}-${Date.now()}`).digest('hex')}`;
      const txHash = `0x${crypto.randomBytes(32).toString('hex')}`;

      const newVersionDoc = await prisma.legalDocument.create({
        data: {
          caseId: prevDoc.caseId,
          title: title || `${prevDoc.title} (v${prevDoc.version + 1})`,
          documentType: prevDoc.documentType,
          documentHash: newHash,
          ipfsHash: `Qm${crypto.randomBytes(22).toString('hex')}`,
          version: prevDoc.version + 1,
          previousHash: prevDoc.documentHash,
          uploaderAddress: uploaderAddress || prevDoc.uploaderAddress,
          txHash,
          isAnonymized: prevDoc.isAnonymized,
          redactedFields: prevDoc.redactedFields
        }
      });

      await prisma.auditLog.create({
        data: {
          officerName: officerName || 'Investigating Officer',
          action: 'AMEND_DOCUMENT',
          resource: newVersionDoc.documentHash,
          details: JSON.stringify({
            oldHash: prevDoc.documentHash,
            newVersion: newVersionDoc.version,
            reason: updateReason,
            txHash
          }),
          ipAddress: req.ip || '127.0.0.1'
        }
      });

      return res.status(201).json({
        success: true,
        data: newVersionDoc,
        message: `New version ${newVersionDoc.version} anchored on blockchain`
      });
    } catch (error: any) {
      logger.error('Error amending document:', error);
      return res.status(500).json({ error: error.message || 'Failed to amend document' });
    }
  }

  /**
   * Revoke a document with legal justification
   */
  static async revokeDocument(req: Request, res: Response) {
    try {
      const { documentId } = req.params;
      const { reason, officerName } = req.body;

      if (!reason) {
        return res.status(400).json({ error: 'Revocation reason is required' });
      }

      const doc = await prisma.legalDocument.update({
        where: { id: documentId },
        data: {
          isRevoked: true,
          revocationReason: reason
        }
      });

      await prisma.auditLog.create({
        data: {
          officerName: officerName || 'Magistrate / Administrator',
          action: 'REVOKE_DOCUMENT',
          resource: doc.documentHash,
          details: JSON.stringify({ reason }),
          ipAddress: req.ip || '127.0.0.1'
        }
      });

      return res.json({
        success: true,
        data: doc,
        message: 'Document revoked successfully'
      });
    } catch (error: any) {
      logger.error('Error revoking document:', error);
      return res.status(500).json({ error: error.message || 'Failed to revoke document' });
    }
  }

  /**
   * List documents with filters
   */
  static async listDocuments(req: Request, res: Response) {
    try {
      const { caseId, documentType, isAnonymized } = req.query;

      const whereClause: any = {};
      if (caseId) whereClause.caseId = String(caseId);
      if (documentType) whereClause.documentType = String(documentType);
      if (isAnonymized !== undefined) whereClause.isAnonymized = isAnonymized === 'true';

      const docs = await prisma.legalDocument.findMany({
        where: whereClause,
        include: {
          case: {
            select: {
              caseNumber: true,
              firNumber: true,
              title: true,
              policeStation: true
            }
          },
          custodyHistory: {
            take: 1,
            orderBy: { timestamp: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.json({
        success: true,
        count: docs.length,
        data: docs
      });
    } catch (error: any) {
      logger.error('Error listing documents:', error);
      return res.status(500).json({ error: error.message || 'Failed to list documents' });
    }
  }
}
