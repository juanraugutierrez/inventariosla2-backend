import prisma from '../config/prisma.js'; 

// 1. LISTAR USUARIOS
export const getUsuarios = async (req, res) => {
    try {
        const usuarios = await prisma.usuario.findMany({
            where: { activo: true },
            include: {
                perfil: {
                    select: { id: true, nombre: true }
                }
            }
        });
        
        const response = usuarios.map(u => ({
            id: u.id,
            rut_o_documento: u.rut_o_documento,
            nombre_completo: u.nombre_completo,
            email: u.email,
            perfil_id: u.perfil_id, 
            perfil: u.perfil?.nombre || 'Sin Rol',
            creado_en: u.creado_en
        }));

        res.json(response);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener usuarios', details: error.message });
    }
};

// 2. CREAR USUARIO
export const createUsuario = async (req, res) => {
    const { rut_o_documento, nombre_completo, email, password, perfil_id } = req.body;

    if (!rut_o_documento || !nombre_completo || !email || !password || !perfil_id) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    try {
        const nuevoUsuario = await prisma.usuario.create({
            data: {
                rut_o_documento,
                nombre_completo,
                email,
                password_hash: password, 
                perfil_id: parseInt(perfil_id)
            }
        });
        res.status(201).json({ id: nuevoUsuario.id, message: 'Usuario insertado exitosamente con Prisma' });
    } catch (error) {
        if (error.code === 'P2002') { 
            return res.status(400).json({ error: 'El RUT o el Email ya están en uso.' });
        }
        res.status(500).json({ error: 'Error al crear usuario', details: error.message });
    }
};

// 3. MODIFICAR USUARIO (PUT)
export const updateUsuario = async (req, res) => {
    const { id } = req.params;
    const { rut_o_documento, nombre_completo, email, perfil_id } = req.body; // 👈 Agregado rut_o_documento

    if (!nombre_completo || !email || !rut_o_documento) {
        return res.status(400).json({ error: 'El RUT, nombre completo y el email son campos obligatorios.' });
    }

    try {
        const dataPayload = {
            rut_o_documento: rut_o_documento.trim(), // 👈 Lo mapeamos al payload de Prisma
            nombre_completo: nombre_completo.trim(),
            email: email.trim(),
        };

        if (perfil_id && !isNaN(perfil_id)) {
            dataPayload.perfil_id = parseInt(perfil_id);
        }

        const usuarioActualizado = await prisma.usuario.update({
            where: { id: parseInt(id) },
            data: dataPayload
        });

        res.json({ message: 'Usuario actualizado con éxito en MySQL', usuarioActualizado });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'El RUT o el correo electrónico ya están siendo utilizados por otro usuario.' });
        }
        res.status(500).json({ error: 'Error al actualizar el usuario en MySQL', details: error.message });
    }
};

// 4. ELIMINAR USUARIO (DELETE - Borrado Lógico)
export const deleteUsuario = async (req, res) => {
    const { id } = req.params;

    try {
        await prisma.usuario.update({
            where: { id: parseInt(id) },
            data: { activo: false }
        });
        res.json({ message: 'Usuario dado de baja correctamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el usuario', details: error.message });
    }
};
// 1. Obtener catálogo maestro de todos los permisos disponibles en la app
export const getPermisosMaestros = async (req, res) => {
    try {
        const permisos = await prisma.permiso.findMany();
        res.json(permisos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Obtener qué permisos tiene activos un perfil actualmente
export const getPermisosPorPerfil = async (req, res) => {
    const { id } = req.params; // ID del perfil
    try {
        const relaciones = await prisma.perfilPermiso.findMany({
            where: { perfil_id: parseInt(id) },
            select: { permiso_id: true }
        });
        res.json(relaciones);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Sincronizar dinámicamente (Borrar anteriores e inyectar los nuevos seleccionados)
export const updatePermisosPerfil = async (req, res) => {
    const { id } = req.params; // ID del perfil
    const { permisosIds } = req.body; // Matriz enviada por React: [1, 2, 5]

    try {
        // Ejecutamos una transacción Prisma para asegurar consistencia
        await prisma.$transaction([
            // Limpiamos los permisos viejos del perfil
            prisma.perfilPermiso.deleteMany({
                where: { perfil_id: parseInt(id) }
            }),
            // Insertamos en bloque los nuevos permisos seleccionados del modal
            prisma.perfilPermiso.createMany({
                data: permisosIds.map(permId => ({
                    perfil_id: parseInt(id),
                    permiso_id: parseInt(permId)
                }))
            })
        ]);

        res.json({ message: "Matriz de privilegios actualizada dinámicamente con éxito." });
    } catch (error) {
        res.status(500).json({ error: "Falla al sincronizar privilegios", details: error.message });
    }
};