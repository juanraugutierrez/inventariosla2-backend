import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
// 🔑 Reutilizamos tu middleware de autenticación oficial para evitar caídas y código duplicado
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * ==============================================================================
 * APLICACIÓN DE SEGURIDAD GLOBAL
 * ==============================================================================
 * Todas las rutas de este archivo exigirán un Token JWT válido en las cabeceras
 */
router.use(requireAuth);

/**
 * 1. OBTENER TODAS LAS BODEGAS
 * GET /api/bodegas
 */
router.get('/', async (req, res) => {
  try {
    // Ajustado de forma tolerante a tu modelo relacional de Prisma
    const bodegas = await prisma.bodega.findMany({
      include: { 
        stock_bodegas: true // Trae las existencias de artículos vinculados
      },
      orderBy: { nombre: 'asc' }
    });
    
    res.json(bodegas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las bodegas desde MySQL', details: error.message });
  }
});

/**
 * 2. CREAR UNA NUEVA BODEGA
 * POST /api/bodegas
 */
router.post('/', async (req, res) => {
  // Ajustamos el rol al formato que maneja tu token (Administrador General es id: 1 o string 'ADMINISTRADOR')
  // Nota: Si no tienes implementada la restricción estricta de roles en el token, puedes comentar este IF temporalmente
  if (req.user?.role !== 'ADMINISTRADOR_SISTEMA' && req.user?.perfil_id !== 1) {
    return res.status(403).json({ error: 'Acceso denegado. Se requieren privilegios de Administrador.' });
  }

  // 🔑 CORRECCIÓN: Usamos 'nombre' y 'ubicacion' en español, idéntico a tu esquema de base de datos
  const { nombre, ubicacion } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre de la bodega es mandatorio.' });
  }

  try {
    const newBodega = await prisma.bodega.create({
      data: {
        nombre: nombre.trim(),
        ubicacion: ubicacion && ubicacion.trim() ? ubicacion.trim() : null,
      },
    });
    res.status(201).json(newBodega);
  } catch (error) {
    res.status(400).json({ error: 'Error al insertar la bodega en MySQL', details: error.message });
  }
});

export default router;