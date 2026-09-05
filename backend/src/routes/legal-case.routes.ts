import { Router } from 'express';
import { LegalCaseController } from '../controllers/legal-case.controller';

const router = Router();

router.post('/', LegalCaseController.createCase);
router.get('/', LegalCaseController.listCases);
router.get('/:id', LegalCaseController.getCaseById);
router.patch('/:id/status', LegalCaseController.updateStatus);

export default router;
