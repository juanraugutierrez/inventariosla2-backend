import { Router } from 'express';
import { 
    getCategorias, 
    createCategoria, 
    updateCategoria, 
    deleteCategoria 
} from '../controllers/categoriaController.js';

const router = Router();

// Rutas para el CRUD de Categorías
router.get('/', getCategorias);
router.post('/', createCategoria);
router.put('/:id', updateCategoria);
router.delete('/:id', deleteCategoria);

export default router;