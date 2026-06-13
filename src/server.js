// src/server.js
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Importar routers
import authRoutes from './routes/authRoutes.js'; 
import userRoutes from './routes/userRoutes.js';
import bodegaRoutes from './routes/bodegaRoutes.js';
import productoRoutes from './routes/productoRoutes.js'; // Enlazado con articuloController
import categoriaRoutes from './routes/categoriaRoutes.js';
import transaccionRoutes from './routes/transaccionRoutes.js';
import perfilRoutes from './routes/perfilRoutes.js'; 
import subcategoriaRoutes from './routes/subcategoriaRoutes.js';
import inventarioRoutes from './routes/inventarioRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// ==========================================
// ⚙️ MIDDLEWARES GLOBALES (ORDEN CONFIGURADO)
// ==========================================
app.use(cors());

// 🔑 CORRECCIÓN: Se eliminó 'app.use(json())' y quedan únicamente los límites extendidos a 50mb
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==========================================
// 🚀 RUTAS DE LA API (DEBAJO DE LOS LÍMITES)
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bodegas', bodegaRoutes);
app.use('/api/productos', productoRoutes); 
app.use('/api/categorias', categoriaRoutes);
app.use('/api/transacciones', transaccionRoutes);
app.use('/api/perfiles', perfilRoutes); 
app.use('/api/subcategorias', subcategoriaRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en el puerto ${PORT}`);
  console.log('API lista para recibir solicitudes.');
});

// Desconectar Prisma al cerrar la aplicación
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});