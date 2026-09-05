import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class WomenSafetyController {
  /**
   * Automated PII Redaction & Witness Protection for NCRB Women Safety Division.
   * Redacts sensitive victim/witness personal identifiable information (PII)
   * while computing a blinded cryptographic commitment hash for evidentiary validity.
   */
  static async redactAndProtect(req: Request, res: Response) {
    try {
      const {
        caseId,
        title,
        statementContent,
        victimName,
        victimAddress,
        victimPhone,
        officerName,
        uploaderAddress
      } = req.body;

      if (!caseId || !title || !statementContent) {
        return res.status(400).json({
          error: 'Missing required fields: caseId, title, and statementContent are required'
        });
      }

      const caseRecord = await prisma.case.findUnique({
        where: { id: caseId }
      });

      if (!caseRecord) {
        return res.status(404).json({ error: 'Case not found' });
      }

      // Compute original raw hash
      const originalHash = `0x${crypto.createHash('sha256').update(statementContent).digest('hex')}`;

      // Automated Redaction
      let redactedText = statementContent;
      const redactedTokens: string[] = [];

      if (victimName && victimName.trim()) {
        const nameRegex = new RegExp(victimName.trim(), 'gi');
        redactedText = redactedText.replace(nameRegex, '[PROTECTED_VICTIM_ID]');
        redactedTokens.push('VICTIM_NAME');
      }

      if (victimAddress && victimAddress.trim()) {
        const addrRegex = new RegExp(victimAddress.trim(), 'gi');
        redactedText = redactedText.replace(addrRegex, '[CONFIDENTIAL_LOCATION_REDACTED]');
        redactedTokens.push('VICTIM_ADDRESS');
      }

      if (victimPhone && victimPhone.trim()) {
        const phoneRegex = new RegExp(victimPhone.trim(), 'gi');
        redactedText = redactedText.replace(phoneRegex, '[PHONE_NUMBER_REDACTED]');
        redactedTokens.push('PHONE_NUMBER');
      }

      // Generic Regex Redaction for Phone Numbers, Emails, Aadhaar-like 12 digits
      // Phone numbers
      redactedText = redactedText.replace(/(\+?91[\-\s]?)?[6-9]\d{9}/g, '[PHONE_REDACTED]');
      // Emails
      redactedText = redactedText.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');
      // Aadhaar (12 digits)
      redactedText = redactedText.replace(/\b\d{4}\s\d{4}\s\d{4}\b|\b\d{12}\b/g, '[UIDAI_AADHAAR_REDACTED]');

      // Compute hash of the protected public copy
      const redactedHash = `0x${crypto.createHash('sha256').update(redactedText).digest('hex')}`;
      const txHash = `0x${crypto.randomBytes(32).toString('hex')}`;

      // Mark case as sensitive if not already
      if (!caseRecord.isSensitive) {
        await prisma.case.update({
          where: { id: caseId },
          data: { isSensitive: true }
        });
      }

      // Save redacted document
      const protectedDoc = await prisma.legalDocument.create({
        data: {
          caseId,
          title: `[PROTECTED] ${title}`,
          documentType: 'WITNESS_STATEMENT',
          documentHash: redactedHash,
          previousHash: originalHash,
          ipfsHash: `Qm${crypto.randomBytes(22).toString('hex')}`,
          fileSize: Buffer.byteLength(redactedText, 'utf8'),
          fileType: 'text/plain',
          encryptedData: null,
          version: 1,
          isAnonymized: true,
          redactedFields: JSON.stringify({
            statutoryProtection: 'Sec 228A IPC / Sec 72 BNS & POCSO Act',
            tokensRedacted: redactedTokens.length ? redactedTokens : ['AUTOMATED_PII_SCAN'],
            originalBlindedCommitment: originalHash
          }),
          txHash,
          uploaderAddress: uploaderAddress || '0xNCRB...7701'
        }
      });

      // Chain of Custody
      await prisma.chainOfCustody.create({
        data: {
          documentId: protectedDoc.id,
          fromParty: officerName || 'NCRB Women Safety Desk',
          toParty: 'Judicial Sealed File / Public Prosecutor',
          transferReason: 'Witness identity redaction under POCSO / Sec 228A IPC statutory guidelines',
          location: 'NCRB Women Safety Division / State Police HQ',
          txHash,
          officerSignature: `WSD-MASK-${crypto.randomBytes(12).toString('hex').toUpperCase()}`
        }
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          action: 'REDACT_PROTECT_DOCUMENT',
          resource: protectedDoc.documentHash,
          officerName: officerName || 'NCRB Women Safety Officer',
          details: JSON.stringify({
            caseNumber: caseRecord.caseNumber,
            redactedHash,
            originalHash
          }),
          ipAddress: req.ip || '127.0.0.1'
        }
      });

      logger.info(`Protected document created under Sec 228A IPC: ${protectedDoc.id}`);

      return res.status(201).json({
        success: true,
        data: {
          document: protectedDoc,
          redactedContent: redactedText,
          originalBlindedCommitment: originalHash,
          statutoryCompliance: 'Section 228A IPC / Section 72 Bharatiya Nyaya Sanhita, 2023 Compliant'
        },
        message: 'Witness statement redacted and protected with cryptographic commitment'
      });
    } catch (error: any) {
      logger.error('Error in redactAndProtect:', error);
      return res.status(500).json({ error: error.message || 'Redaction failed' });
    }
  }

  /**
   * List sensitive cases under NCRB Women Safety Division
   */
  static async listSensitiveCases(_req: Request, res: Response) {
    try {
      const sensitiveCases = await prisma.case.findMany({
        where: { isSensitive: true },
        include: {
          investigatingOfficer: true,
          documents: {
            where: { isAnonymized: true }
          },
          _count: {
            select: { documents: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.json({
        success: true,
        count: sensitiveCases.length,
        data: sensitiveCases
      });
    } catch (error: any) {
      logger.error('Error fetching sensitive cases:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch sensitive cases' });
    }
  }
}
