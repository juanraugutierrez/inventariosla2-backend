import { Router } from 'express';
import { getDashboardData } from '../controllers/dashboardController.js';

const router = Router();

// Cambiamos a '/' para que responda directamente cuando se use app.use('/api/dashboard', ...)
router.get('/', getDashboardData);

export default router;