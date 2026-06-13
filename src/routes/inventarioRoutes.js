import { Router } from 'express';
import { 
    registrarIngreso, 
    registrarSalida, 
    obtenerSalidaPorFolio, 
    listarMovimientos, 
    obtenerMovimientoPorId, 
    listarSalidas, 
    obtenerSalidaPorId 
} from '../controllers/inventarioController.js';

const router = Router();

// ==========================================
// 📥 SECCIÓN 1: ENTRADAS / INGRESOS DE MERCADERÍA
// ==========================================
router.post('/ingreso', registrarIngreso);                  // Crear entrada masiva
router.get('/movimientos', listarMovimientos);              // Historial maestro filtrado de ingresos
router.get('/movimiento/:id', obtenerMovimientoPorId);      // Desglose modal de artículos por ID

// ==========================================
// 📤 SECCIÓN 2: SALIDAS / VALES DE CARGO TÉCNICO
// ==========================================
router.post('/salida', registrarSalida);                    // Autorizar y descontar stock de salida
router.get('/salida/:folio', obtenerSalidaPorFolio);        // 🔥 CRUCIAL: Recuperar vale por Folio para la vista de Impresión PDF
router.get('/salidas-historial', listarSalidas);            // Historial maestro de egresos técnicos
router.get('/salida-detalle/:id', obtenerSalidaPorId);      // Desglose modal de insumos retirados por ID

export default router;