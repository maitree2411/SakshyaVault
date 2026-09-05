import { Router } from 'express';
import { LegalDocumentController } from '../controllers/legal-document.controller';

const router = Router();

router.post('/upload', LegalDocumentController.uploadDocument);
router.post('/:documentId/custody', LegalDocumentController.transferCustody);
router.post('/:documentId/amend', LegalDocumentController.amendVersion);
router.post('/:documentId/revoke', LegalDocumentController.revokeDocument);
router.get('/', LegalDocumentController.listDocuments);

export default router;
