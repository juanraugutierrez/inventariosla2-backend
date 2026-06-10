// src/routes/transaccionRoutes.js
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'mi_secreto_super_secreto';

// Middleware de autenticación y autorización para la gestión de transacciones
const authenticateTransaction = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    // Todos los roles, excepto TECNICO, pueden realizar transacciones
    if (err || user.role === 'TECNICO') {
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

router.use(authenticateTransaction);

// Registrar una nueva transacción (INGRESO o EGRESO)
router.post('/', async (req, res) => {
  const { tipo, cantidad, productoId, origenBodegaId, destinoBodegaId, quienRecibeId } = req.body;
  
  try {
    // Encontrar el producto y su precio unitario
    const producto = await prisma.producto.findUnique({
      where: { id: parseInt(productoId) },
    });

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Lógica para EGRESO
    if (tipo === 'EGRESO') {
      if (!origenBodegaId) {
        return res.status(400).json({ error: 'Origen de bodega es requerido para un egreso' });
      }

      // Encontrar y actualizar la existencia en la bodega de origen
      const existencia = await prisma.existencia.findUnique({
        where: { productoId_bodegaId: { productoId: parseInt(productoId), bodegaId: parseInt(origenBodegaId) } },
      });

      if (!existencia || existencia.cantidad < cantidad) {
        return res.status(400).json({ error: 'Existencia insuficiente en la bodega de origen' });
      }

      await prisma.existencia.update({
        where: { id: existencia.id },
        data: {
          cantidad: { decrement: cantidad },
          valorizacion: { decrement: cantidad * producto.precioUnitario },
        },
      });
    }

    // Lógica para INGRESO
    if (tipo === 'INGRESO') {
      if (!destinoBodegaId) {
        return res.status(400).json({ error: 'Destino de bodega es requerido para un ingreso' });
      }

      // Encontrar o crear la existencia en la bodega de destino
      const existenciaExistente = await prisma.existencia.findUnique({
        where: { productoId_bodegaId: { productoId: parseInt(productoId), bodegaId: parseInt(destinoBodegaId) } },
      });

      if (existenciaExistente) {
        await prisma.existencia.update({
          where: { id: existenciaExistente.id },
          data: {
            cantidad: { increment: cantidad },
            valorizacion: { increment: cantidad * producto.precioUnitario },
          },
        });
      } else {
        await prisma.existencia.create({
          data: {
            productoId: parseInt(productoId),
            bodegaId: parseInt(destinoBodegaId),
            cantidad: cantidad,
            valorizacion: cantidad * producto.precioUnitario,
          },
        });
      }
    }

    // Registrar la transacción
    const newTransaction = await prisma.transaccion.create({
      data: {
        tipo,
        cantidad,
        productoId: parseInt(productoId),
        origenBodegaId: origenBodegaId ? parseInt(origenBodegaId) : null,
        destinoBodegaId: destinoBodegaId ? parseInt(destinoBodegaId) : null,
        quienEntregaId: req.user.userId,
        quienRecibeId: parseInt(quienRecibeId),
      },
    });

    res.status(201).json(newTransaction);
  } catch (error) {
    res.status(400).json({ error: 'Error al registrar la transacción', details: error.message });
  }
});

// Obtener todas las transacciones
router.get('/', async (req, res) => {
  try {
    const transacciones = await prisma.transaccion.findMany({
      include: {
        producto: true,
        origenBodega: true,
        destinoBodega: true,
        quienEntrega: true,
        quienRecibe: true,
      },
      orderBy: { fecha: 'desc' },
    });
    res.json(transacciones);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las transacciones' });
  }
});

export default router;
