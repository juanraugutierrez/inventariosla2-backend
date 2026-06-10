import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando el proceso de seeding...');

  // Limpiar datos existentes para evitar duplicados en cada ejecución.
  await prisma.transaccion.deleteMany();
  await prisma.existencia.deleteMany();
  await prisma.producto.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.bodega.deleteMany();
  await prisma.user.deleteMany();

  console.log('Datos antiguos eliminados.');

  // Hashear la contraseña de prueba
  const passwordHash = await bcrypt.hash('12345678', 10);

  // Crear usuarios de prueba con diferentes roles
  const users = await prisma.user.createMany({
    data: [
      { name: 'Gerente Servilift', email: 'gerente@servilift.com', passwordHash, role: 'GERENTE' },
      { name: 'Admin Sistema', email: 'admin@servilift.com', passwordHash, role: 'ADMINISTRADOR_SISTEMA' },
      { name: 'Encargado Bodega Central', email: 'bodeguero-central@servilift.com', passwordHash, role: 'ENCARGADO_BODEGA' },
      { name: 'Encargado Bodega Móvil 1', email: 'bodeguero-movil1@servilift.com', passwordHash, role: 'ENCARGADO_BODEGA' },
      { name: 'Tecnico Juan Perez', email: 'tecnico1@servilift.com', passwordHash, role: 'TECNICO' },
      { name: 'Proveedor Ejemplo', email: 'proveedor1@servilift.com', passwordHash, role: 'PROVEEDOR' },
    ],
    skipDuplicates: true,
  });
  console.log('Usuarios creados.');

  // Obtener los IDs de los usuarios creados
  const encargadoBodegaCentral = await prisma.user.findFirst({ where: { email: 'bodeguero-central@servilift.com' } });
  const encargadoBodegaMovil1 = await prisma.user.findFirst({ where: { email: 'bodeguero-movil1@servilift.com' } });
  const proveedorEjemplo = await prisma.user.findFirst({ where: { email: 'proveedor1@servilift.com' } });
  const tecnicoJuan = await prisma.user.findFirst({ where: { email: 'tecnico1@servilift.com' } });

  // Crear bodegas de prueba
  const bodegaCentral = await prisma.bodega.create({
    data: {
      name: 'Bodega Central',
      location: 'Santiago, Chile',
      tipo: 'CENTRAL',
      encargadoId: encargadoBodegaCentral!.id,
    },
  });

  const bodegaMovil1 = await prisma.bodega.create({
    data: {
      name: 'Bodega Móvil #1',
      location: 'Camioneta A',
      tipo: 'MOVIL',
      encargadoId: encargadoBodegaMovil1!.id,
    },
  });

  const bodegaMovil2 = await prisma.bodega.create({
    data: {
      name: 'Bodega Móvil #2',
      location: 'Camioneta B',
      tipo: 'MOVIL',
      encargadoId: encargadoBodegaMovil1!.id, // Mismo encargado para ambas bodegas móviles
    },
  });

  console.log('Bodegas creadas.');

  // Crear categorías
  const categorias = await prisma.categoria.createMany({
    data: [
      { name: 'Repuestos' },
      { name: 'Insumos' },
      { name: 'Herramientas' },
    ],
    skipDuplicates: true,
  });
  console.log('Categorías creadas.');

  // Obtener IDs de categorías
  const categoriaRepuestos = await prisma.categoria.findUnique({ where: { name: 'Repuestos' } });
  const categoriaInsumos = await prisma.categoria.findUnique({ where: { name: 'Insumos' } });
  const categoriaHerramientas = await prisma.categoria.findUnique({ where: { name: 'Herramientas' } });

  // Crear productos de prueba
  const productoTornillo = await prisma.producto.create({
    data: {
      codigo: 'PROD-0001',
      name: 'Tornillo 6mm x 1 1/4"',
      description: 'Tornillo de acero inoxidable para sujeción de componentes.',
      precioUnitario: 0.50,
      categoriaId: categoriaInsumos!.id,
      proveedorId: proveedorEjemplo!.id,
    },
  });

  const productoCable = await prisma.producto.create({
    data: {
      codigo: 'PROD-0002',
      name: 'Cable eléctrico 16 AWG',
      description: 'Cable de cobre para sistemas de control.',
      precioUnitario: 1.20,
      categoriaId: categoriaInsumos!.id,
      proveedorId: proveedorEjemplo!.id,
    },
  });

  const productoMultimetro = await prisma.producto.create({
    data: {
      codigo: 'PROD-0003',
      name: 'Multímetro Digital',
      description: 'Herramienta de medición eléctrica.',
      precioUnitario: 75.00,
      categoriaId: categoriaHerramientas!.id,
      proveedorId: proveedorEjemplo!.id,
    },
  });
  console.log('Productos creados.');

  // Crear existencias iniciales y transacciones de ingreso
  const cantidadInicialTornillo = 1000;
  const valorizacionTornillo = cantidadInicialTornillo * productoTornillo.precioUnitario;

  // Existencia de tornillos en bodega central
  await prisma.existencia.create({
    data: {
      productoId: productoTornillo.id,
      bodegaId: bodegaCentral.id,
      cantidad: cantidadInicialTornillo,
      valorizacion: valorizacionTornillo,
    },
  });
  console.log(`Existencia de ${cantidadInicialTornillo} tornillos creada en Bodega Central.`);

  // Transacción de ingreso de tornillos
  await prisma.transaccion.create({
    data: {
      tipo: 'INGRESO',
      cantidad: cantidadInicialTornillo,
      productoId: productoTornillo.id,
      destinoBodegaId: bodegaCentral.id,
      quienEntregaId: proveedorEjemplo!.id,
      quienRecibeId: encargadoBodegaCentral!.id,
    },
  });
  console.log('Transacción de ingreso de tornillos registrada.');

  // Simular un egreso para un técnico
  const cantidadEgresoTornillo = 50;
  await prisma.transaccion.create({
    data: {
      tipo: 'EGRESO',
      cantidad: cantidadEgresoTornillo,
      productoId: productoTornillo.id,
      origenBodegaId: bodegaCentral.id,
      quienEntregaId: encargadoBodegaCentral!.id,
      quienRecibeId: tecnicoJuan!.id,
    },
  });

  // Actualizar existencia de tornillos después del egreso
  await prisma.existencia.update({
    where: { productoId_bodegaId: { productoId: productoTornillo.id, bodegaId: bodegaCentral.id } },
    data: {
      cantidad: { decrement: cantidadEgresoTornillo },
      valorizacion: { decrement: cantidadEgresoTornillo * productoTornillo.precioUnitario },
    },
  });
  console.log(`Egreso de ${cantidadEgresoTornillo} tornillos para técnico Juan. Existencia actualizada.`);

  console.log('Proceso de seeding finalizado con éxito.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
