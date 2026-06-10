// src/server.js
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { json } from 'express';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Importar routers
import authRoutes from './routes/authRoutes.js'; 
import userRoutes from './routes/userRoutes.js';
import bodegaRoutes from './routes/bodegaRoutes.js';
import productoRoutes from './routes/productoRoutes.js';
import categoriaRoutes from './routes/categoriaRoutes.js';
import transaccionRoutes from './routes/transaccionRoutes.js';
import perfilRoutes from './routes/perfilRoutes.js'; // 🆕 Línea Agregada

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(json());

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bodegas', bodegaRoutes);
app.use('/api/productos', productoRoutes); // Enlazado con articuloController
app.use('/api/categorias', categoriaRoutes);
app.use('/api/transacciones', transaccionRoutes);
app.use('/api/perfiles', perfilRoutes); // 🆕 Línea Agregada

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en el puerto ${PORT}`);
  console.log('API lista para recibir solicitudes.');
});

// Desconectar Prisma al cerrar la aplicación
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});