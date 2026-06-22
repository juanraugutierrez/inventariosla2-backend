// src/routes/authRoutes.js
import { Router } from 'express';
import { login } from '../controllers/authController.js';

const router = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Autenticar usuario y obtener permisos de acceso (RBAC)
 * @access  Público
 */
router.post('/login', login);

// 🚨 CORRECCIÓN CRÍTICA: Exportación por defecto obligatoria para que 'server.js' lo reconozca sin llaves
export default router;