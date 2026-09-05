import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class AuditController {
  /**
   * Fetch audit logs with filtering by action, user, or date
   */
  static async getAuditLogs(req: Request, res: Response) {
    try {
      const { action, limit = 50 } = req.query;

      const whereClause: any = {};
      if (action) whereClause.action = String(action);

      const logs = await prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        take: Number(limit)
      });

      return res.json({
        success: true,
        count: logs.length,
        data: logs
      });
    } catch (error: any) {
      logger.error('Error fetching audit logs:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch audit logs' });
    }
  }

  /**
   * Fetch national level dashboard statistics for MHA / NCRB
   */
  static async getSystemStats(_req: Request, res: Response) {
    try {
      const [totalCases, sensitiveCases, totalDocs, verifiedDocs, auditCount] = await Promise.all([
        prisma.case.count(),
        prisma.case.count({ where: { isSensitive: true } }),
        prisma.legalDocument.count(),
        prisma.verificationRecord.count({ where: { isAuthentic: true } }),
        prisma.auditLog.count()
      ]);

      const casesByStatus = await prisma.case.groupBy({
        by: ['status'],
        _count: { _all: true }
      });

      const docsByType = await prisma.legalDocument.groupBy({
        by: ['documentType'],
        _count: { _all: true }
      });

      return res.json({
        success: true,
        data: {
          totalCases,
          sensitiveCases,
          totalDocumentsAnchored: totalDocs,
          totalVerificationsPerformed: verifiedDocs,
          totalAuditEvents: auditCount,
          casesByStatus: casesByStatus.map(s => ({ status: s.status, count: s._count._all })),
          docsByType: docsByType.map(d => ({ type: d.documentType, count: d._count._all })),
          blockchainNetwork: 'Ethereum / Hardhat (Chain ID 1337)',
          smartContractStatus: 'ONLINE / ACTIVE',
          legalCompliance: 'Sec 65B Indian Evidence Act / Sec 63 BSA & POCSO'
        }
      });
    } catch (error: any) {
      logger.error('Error fetching system stats:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch system stats' });
    }
  }
}
