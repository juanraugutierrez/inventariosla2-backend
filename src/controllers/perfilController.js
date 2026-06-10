import prisma from '../config/prisma.js'; // Importación obligatoria con extensión .js

// Listar todos los perfiles (Útil para llenar los <select> en los formularios de React)
export const getPerfiles = async (req, res) => {
    try {
        const perfiles = await prisma.perfil.findMany();
        res.json(perfiles);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener perfiles', details: error.message });
    }
};

// Crear un nuevo Perfil con sus respectivos permisos booleanos
export const createPerfil = async (req, res) => {
    const { 
        nombre, 
        descripcion, 
        permiso_crear_bodega, 
        permiso_ingresar_stock, 
        permiso_retirar_stock, 
        permiso_ver_informes 
    } = req.body;

    if (!nombre) {
        return res.status(400).json({ error: 'El nombre del perfil es obligatorio' });
    }

    try {
        const nuevoPerfil = await prisma.perfil.create({
            data: {
                nombre,
                descripcion,
                // Forzamos a booleanos reales usando la doble negación (!!) por seguridad
                permiso_crear_bodega: !!permiso_crear_bodega, 
                permiso_ingresar_stock: !!permiso_ingresar_stock,
                permiso_retirar_stock: !!permiso_retirar_stock,
                permiso_ver_informes: !!permiso_ver_informes
            }
        });
        
        res.status(201).json({ 
            id: nuevoPerfil.id, 
            message: 'Perfil creado exitosamente con Prisma' 
        });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Ya existe un perfil registrado con ese nombre.' });
        }
        res.status(500).json({ error: 'Error al crear el perfil', details: error.message });
    }
};