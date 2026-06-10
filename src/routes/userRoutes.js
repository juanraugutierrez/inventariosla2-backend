// src/routes/userRoutes.js
import { Router } from 'express';
import { getUsuarios, createUsuario } from '../controllers/usuarioController.js';

const router = Router();

// Express ya monta este archivo sobre el prefijo '/api/users' en server.js
router.get('/', getUsuarios);   // GET http://localhost:4000/api/users
router.post('/', createUsuario); // POST http://localhost:4000/api/users

export default router;