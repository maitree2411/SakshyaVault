import { Router } from 'express';
import { IntegrityVerificationController } from '../controllers/integrity-verification.controller';

const router = Router();

router.post('/verify-hash', IntegrityVerificationController.verifyByHash);
router.post('/verify-content', IntegrityVerificationController.verifyByFileContent);
router.get('/certificate-65b/:documentId', IntegrityVerificationController.generateSection65BCertificate);

export default router;
