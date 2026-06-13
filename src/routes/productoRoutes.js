// src/routes/productoRoutes.js
import { Router } from 'express';
import multer from 'multer';
import { 
    getArticulos, 
    createArticulo, 
    updateArticulo,
    deleteArticulo, // 🔑 NUEVA IMPORTACIÓN
    cargarMasivoExcel 
} from '../controllers/articuloController.js';

const router = Router();

// Configuración de Multer para guardar el Excel temporalmente en la memoria RAM
const upload = multer({ storage: multer.memoryStorage() });

// Rutas mapeadas sobre el prefijo '/api/productos' configurado en server.js
router.get('/', getArticulos);                           // GET /api/productos
router.post('/', createArticulo);                        // POST /api/productos
router.put('/:id', updateArticulo);                      // PUT /api/productos/:id
router.delete('/:id', deleteArticulo);                  // 🔑 NUEVO: DELETE /api/productos/:id

// Nueva ruta para la carga masiva (Atrapa el archivo y luego ejecuta el controlador)
router.post('/cargar-masivo', upload.single('excelFile'), cargarMasivoExcel); //

export default router;