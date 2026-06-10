import prisma from '../config/prisma.js'; 

// 1. LISTAR USUARIOS (Con inner join a Perfiles)
export const getUsuarios = async (req, res) => {
    try {
        const usuarios = await prisma.usuario.findMany({
            where: { activo: true },
            include: {
                perfil: {
                    select: { id: true, nombre: true } // 👈 Traemos el ID también para mapearlo en React
                }
            }
        });
        
        const response = usuarios.map(u => ({
            id: u.id,
            rut_o_documento: u.rut_o_documento,
            nombre_completo: u.nombre_completo,
            email: u.email,
            perfil_id: u.perfil_id, // 👈 Enviamos el ID numérico real de MySQL
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

// 3. MODIFICAR USUARIO (PUT) 🛠️ ¡REPARADO Y BLINDADO CON CASTING DE TIPO ENTIDADES!
export const updateUsuario = async (req, res) => {
    const { id } = req.params;
    const { nombre_completo, email, perfil_id } = req.body;

    if (!nombre_completo || !email) {
        return res.status(400).json({ error: 'El nombre completo y el email son campos obligatorios.' });
    }

    try {
        // Estructura limpia para actualizar en MySQL
        const dataPayload = {
            nombre_completo: nombre_completo.trim(),
            email: email.trim(),
        };

        // Si viene el perfil_id y es almacenable (numérico o texto convertible) lo inyectamos
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
            return res.status(400).json({ error: 'El correo electrónico ya está siendo utilizado por otro usuario.' });
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