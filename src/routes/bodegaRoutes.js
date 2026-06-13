import { Router } from 'express';
import { 
    getBodegas, 
    createBodega, 
    updateBodega, 
    deleteBodega 
} from '../controllers/bodegaController.js';

const router = Router();

router.get('/', getBodegas);
router.post('/', createBodega);
router.put('/:id', updateBodega);
router.delete('/:id', deleteBodega);

// 👇 ESTA ES LA LÍNEA QUE FALTABA Y CAUSABA EL ERROR 👇
export default router;