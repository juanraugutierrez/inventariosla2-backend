import { Router } from 'express';
import { getCategorias, getSubcategorias } from '../controllers/categoriaController.js';

const router = Router();

/**
 * ==============================================================================
 * RUTAS PÚBLICAS (Lectura para alimentar los Selectores/Combobox del Frontend)
 * ==============================================================================
 * Nota: Se omite de forma explícita el middleware 'requireAuth' en estos endpoints
 * para que React y Postman puedan pre-cargar las jerarquías sin problemas de tokens.
 */

// Sincronizado con: GET http://localhost:3000/api/categorias
router.get('/', getCategorias);

// Sincronizado con: GET http://localhost:3000/api/categorias/subcategorias
router.get('/subcategorias', getSubcategorias);

export default router;