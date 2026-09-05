import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';

const router = Router();

router.get('/logs', AuditController.getAuditLogs);
router.get('/stats', AuditController.getSystemStats);

export default router;
