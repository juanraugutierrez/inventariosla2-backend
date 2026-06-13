import { Router } from 'express';
import { getAllSubcategorias,getSubcategoriasByCategoria, createSubcategoria, updateSubcategoria, deleteSubcategoria } from '../controllers/subcategoriaController.js';

const router = Router();
router.get('/', getAllSubcategorias);
router.get('/categoria/:categoriaId', getSubcategoriasByCategoria);
router.post('/', createSubcategoria);
router.put('/:id', updateSubcategoria);
router.delete('/:id', deleteSubcategoria);

export default router;