// src/routes/perfilRoutes.js
import { Router } from 'express';
import { getPerfiles, createPerfil } from '../controllers/perfilController.js';

const router = Router();

// Responderá a las solicitudes del catálogo de roles
router.get('/', getPerfiles);   // GET http://localhost:4000/api/perfiles
router.post('/', createPerfil); // POST http://localhost:4000/api/perfiles

export default router;