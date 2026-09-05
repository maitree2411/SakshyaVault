import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class LegalCaseController {
  /**
   * Create a new investigation case & FIR dossier
   */
  static async createCase(req: Request, res: Response) {
    try {
      const {
        caseNumber,
        firNumber,
        title,
        description,
        policeStation,
        district,
        state,
        sections,
        isSensitive,
        investigatingOfficerId,
        officerName
      } = req.body;

      if (!caseNumber || !firNumber || !title || !policeStation || !sections) {
        return res.status(400).json({
          error: 'Missing required fields: caseNumber, firNumber, title, policeStation, and sections are required'
        });
      }

      // Check for duplicate case or FIR
      const existing = await prisma.case.findFirst({
        where: {
          OR: [{ caseNumber }, { firNumber }]
        }
      });

      if (existing) {
        return res.status(409).json({
          error: 'A case with this Case Number or FIR Number already exists'
        });
      }

      const newCase = await prisma.case.create({
        data: {
          caseNumber,
          firNumber,
          title,
          description: description || '',
          policeStation,
          district: district || 'Central District',
          state: state || 'Delhi',
          sections,
          isSensitive: Boolean(isSensitive),
          investigatingOfficerId: investigatingOfficerId || null,
        },
        include: {
          investigatingOfficer: true,
        }
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          userId: investigatingOfficerId || null,
          officerName: officerName || 'Investigating Officer',
          action: 'CREATE_CASE',
          resource: newCase.caseNumber,
          details: JSON.stringify({ firNumber, title, isSensitive }),
          ipAddress: req.ip || '127.0.0.1'
        }
      });

      logger.info(`New case created: ${newCase.caseNumber} (FIR: ${newCase.firNumber})`);
      return res.status(201).json({
        success: true,
        data: newCase,
        message: 'Investigation case registered successfully'
      });
    } catch (error: any) {
      logger.error('Error creating case:', error);
      return res.status(500).json({ error: error.message || 'Failed to create case' });
    }
  }

  /**
   * List cases with filtering and search
   */
  static async listCases(req: Request, res: Response) {
    try {
      const { status, isSensitive, search } = req.query;

      const whereClause: any = {};

      if (status) {
        whereClause.status = String(status);
      }

      if (isSensitive !== undefined) {
        whereClause.isSensitive = isSensitive === 'true';
      }

      if (search) {
        const query = String(search);
        whereClause.OR = [
          { caseNumber: { contains: query } },
          { firNumber: { contains: query } },
          { title: { contains: query } },
          { policeStation: { contains: query } },
          { sections: { contains: query } }
        ];
      }

      const cases = await prisma.case.findMany({
        where: whereClause,
        include: {
          investigatingOfficer: true,
          _count: {
            select: { documents: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.json({
        success: true,
        count: cases.length,
        data: cases
      });
    } catch (error: any) {
      logger.error('Error listing cases:', error);
      return res.status(500).json({ error: error.message || 'Failed to list cases' });
    }
  }

  /**
   * Get single case by ID with complete document dossier and custody trail
   */
  static async getCaseById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const caseRecord = await prisma.case.findFirst({
        where: {
          OR: [{ id }, { caseNumber: id }, { firNumber: id }]
        },
        include: {
          investigatingOfficer: true,
          documents: {
            include: {
              custodyHistory: {
                orderBy: { timestamp: 'desc' }
              },
              uploader: true,
              verifications: {
                take: 1,
                orderBy: { verifiedAt: 'desc' }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!caseRecord) {
        return res.status(404).json({ error: 'Case record not found' });
      }

      return res.json({
        success: true,
        data: caseRecord
      });
    } catch (error: any) {
      logger.error('Error fetching case by ID:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch case details' });
    }
  }

  /**
   * Update case status (e.g. Charge Sheeted, In Trial, Disposed)
   */
  static async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, officerName, remarks } = req.body;

      const updated = await prisma.case.update({
        where: { id },
        data: { status }
      });

      await prisma.auditLog.create({
        data: {
          action: 'UPDATE_CASE_STATUS',
          resource: updated.caseNumber,
          officerName: officerName || 'Court / IO',
          details: JSON.stringify({ newStatus: status, remarks }),
          ipAddress: req.ip || '127.0.0.1'
        }
      });

      return res.json({
        success: true,
        data: updated,
        message: `Case status updated to ${status}`
      });
    } catch (error: any) {
      logger.error('Error updating case status:', error);
      return res.status(500).json({ error: error.message || 'Failed to update case status' });
    }
  }
}
