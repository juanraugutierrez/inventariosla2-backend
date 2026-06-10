import { Router } from 'express';
import { login } from '../controllers/authController.js';

const router = Router();

/**
 * ==============================================================================
 * ENDPOINT PÚBLICO: INICIO DE SESIÓN / LOGIN
 * ==============================================================================
 * Ruta real final mapeada por server.js: POST http://localhost:3000/api/auth/login
 */
router.post('/login', login);

// 🔑 CRÍTICO: Esta es la línea que le falta a tu archivo y que soluciona el error
export default router;