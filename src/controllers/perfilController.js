// src/controllers/perfilController.js
import prisma from '../config/prisma.js';

// 1. Obtener todos los perfiles existentes
// En tu backend: src/controllers/perfilController.js (o archivo de rutas de perfiles)

export const getPerfiles = async (req, res) => {
  try {
    // 🔓 CORRECCIÓN MAESTRA: Eliminamos cualquier filtro 'where' restrictivo
    // para que Prisma ejecute un SELECT global y transparente.
    const perfiles = await prisma.$queryRaw`SELECT * FROM perfil ORDER BY id ASC`;

    return res.status(200).json(perfiles);
  } catch (error) {
    console.error("Error en el servidor al leer perfiles:", error);
    return res.status(500).json({ error: "Fallo al leer la tabla perfil en MySQL." });
  }
};

// 2. Crear un nuevo perfil/cargo de forma aislada
export const createPerfil = async (req, res) => {
    const { nombre, descripcion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre del perfil es obligatorio' });

    try {
        const nuevoPerfil = await prisma.perfil.create({
            data: { 
                nombre: nombre.toUpperCase().trim(), 
                descripcion: descripcion ? descripcion.trim() : null 
            }
        });
        res.status(201).json(nuevoPerfil);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear perfil', details: error.message });
    }
};

// 3. Obtener el catálogo maestro de todos los permisos que soporta el ERP
export const getPermisosMaestros = async (req, res) => {
    try {
        const permisos = await prisma.permiso.findMany({
            orderBy: [{ modulo: 'asc' }, { nombre: 'asc' }]
        });
        res.json(permisos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener catálogo de permisos' });
    }
};

// 4. Obtener las IDs de los permisos que tiene actualmente un perfil asignado
export const getPermisosDePerfil = async (req, res) => {
    const { id } = req.params;
    try {
        const asignaciones = await prisma.perfil_permiso.findMany({
            where: { perfil_id: parseInt(id) },
            select: { permiso_id: true }
        });
        res.json(asignaciones.map(a => a.permiso_id));
    } catch (error) {
        res.status(500).json({ error: 'Error al cargar los permisos del perfil seleccionado' });
    }
};

// 5. Guardar Matriz Transaccional de Permisos (Checkboxes)
export const guardarPermisosPerfil = async (req, res) => {
    const { id } = req.params;
    const { permisosIds } = req.body;

    if (!Array.isArray(permisosIds)) {
        return res.status(400).json({ error: 'Se requiere un arreglo válido de permisosIds.' });
    }

    try {
        await prisma.$transaction([
            prisma.perfil_permiso.deleteMany({
                where: { perfil_id: parseInt(id) }
            }),
            prisma.perfil_permiso.createMany({
                data: permisosIds.map(idPermiso => ({
                    perfil_id: parseInt(id),
                    permiso_id: parseInt(idPermiso)
                }))
            })
        ]);
        res.json({ message: 'Matriz de permisos actualizada correctamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al sincronizar la matriz de permisos', details: error.message });
    }
};

// 6. ACTUALIZAR PARÁMETROS DEL PERFIL (Para el Modo Edición del CRUD)
export const updatePerfil = async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;

    try {
        const perfilId = parseInt(id);
        const perfilActualizado = await prisma.perfil.update({
            where: { id: perfilId },
            data: {
                nombre: nombre.toUpperCase().trim(),
                descripcion: descripcion ? descripcion.trim() : null
            }
        });
        res.json(perfilActualizado);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar los parámetros del perfil en MySQL', details: error.message });
    }
};

// 7. ELIMINACIÓN CONTROLADA CON VALIDACIÓN CRÍTICA DE USUARIOS
// src/controllers/perfilController.js -> Reemplazar la función #7 (deletePerfil)

export const deletePerfil = async (req, res) => {
    const { id } = req.params;

    try {
        const perfilId = parseInt(id);
        if (isNaN(perfilId)) {
            return res.status(400).json({ error: 'El ID de perfil proporcionado es inválido.' });
        }

        // 🛡️ ESCUDO DE SEGURIDAD LÓGICA: Verificamos si hay usuarios vivos con este rol
        const conteoUsuarios = await prisma.usuario.count({
            where: { perfil_id: perfilId }
        });

        // Si hay usuarios asignados en la tabla, detenemos la operación con un aviso limpio para el frontend
        if (conteoUsuarios > 0) {
            return res.status(400).json({ 
                error: `Acción denegada. Existen ${conteoUsuarios} usuarios asociados a este perfil en MySQL.`,
                details: "Por consistencia del sistema, debes reasignar o dar de baja a esos usuarios antes de borrar este rol."
            });
        }

        // 🚀 BYPASS ESTRUCTURAL CON SQL PURO:
        // Si el perfil no tiene usuarios, limpiamos de forma manual y secuencial la tabla puente 
        // de permisos y la tabla maestra. Esto evita cualquier error de tipado o nombres en Prisma.
        await prisma.$transaction([
            // 1. Borramos todas las filas que usen este perfil en la tabla de relaciones de permisos
            prisma.$executeRaw`DELETE FROM perfil_permiso WHERE perfil_id = ${perfilId}`,
            
            // 2. Borramos el perfil de la tabla maestra
            prisma.$executeRaw`DELETE FROM perfil WHERE id = ${perfilId}`
        ]);

        return res.json({ message: 'Perfil eliminado de la base de datos de manera limpia.' });

  } catch (error) {
        console.error("❌ ERROR CRÍTICO EN EL MOTOR AL ELIMINAR PERFIL:", error);
        return res.status(500).json({ 
            error: 'Error interno en el motor de base de datos al intentar eliminar el registro', 
            details: error.message 
        });
  }
};