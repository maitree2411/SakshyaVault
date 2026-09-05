import { Router } from 'express';
import legalCaseRoutes from './legal-case.routes';
import legalDocumentRoutes from './legal-document.routes';
import integrityRoutes from './integrity-verification.routes';
import womenSafetyRoutes from './women-safety.routes';
import auditRoutes from './audit.routes';
import authRoutes from './auth.routes';
import didRoutes from './did.routes';

const router = Router();

// Legal & Investigation Document Management System (NyayDMS / NCRB LegiChain)
router.use('/cases', legalCaseRoutes);
router.use('/legal-documents', legalDocumentRoutes);
router.use('/integrity', integrityRoutes);
router.use('/women-safety', womenSafetyRoutes);
router.use('/audit', auditRoutes);

// Auth & Identity
router.use('/auth', authRoutes);
router.use('/did', didRoutes);

export default router;
