// src/routes/perfilRoutes.js
import { Router } from 'express';
import { 
    getPerfiles, 
    createPerfil, 
    getPermisosMaestros, 
    getPermisosDePerfil, 
    guardarPermisosPerfil, 
    updatePerfil, 
    deletePerfil 
} from '../controllers/perfilController.js';

const router = Router();

// Endpoints base del CRUD de Perfiles
router.get('/', getPerfiles);
router.post('/', createPerfil);
router.put('/:id', updatePerfil);
router.delete('/:id', deletePerfil);

// Endpoints de la Matriz de Permisos
router.get('/permisos', getPermisosMaestros);
router.get('/:id/permisos', getPermisosDePerfil);
router.post('/:id/permisos', guardarPermisosPerfil);

export default router;