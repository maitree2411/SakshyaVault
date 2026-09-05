import { Router } from 'express';
import { WomenSafetyController } from '../controllers/women-safety.controller';

const router = Router();

router.post('/redact-protect', WomenSafetyController.redactAndProtect);
router.get('/sensitive-cases', WomenSafetyController.listSensitiveCases);

export default router;
