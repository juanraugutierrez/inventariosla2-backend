// src/routes/userRoutes.js
import { Router } from 'express';
import { 
  getUsuarios, 
  createUsuario, 
  updateUsuario, // 👈 Importado
  deleteUsuario 
} from '../controllers/usuarioController.js';

const router = Router();

// Express ya monta este archivo sobre el prefijo '/api/users' en server.js
router.get('/', getUsuarios);   
router.post('/', createUsuario); 
router.put('/:id', updateUsuario);    // 👈 RUTA PUT AGREGADA Y HABILITADA
router.delete('/:id', deleteUsuario);  // 👈 Mapeado correctamente como /api/users/:id

export default router;