import prisma from '../config/prisma.js';

export const getAllSubcategorias = async (req, res) => {
    try {
        const subcategorias = await prisma.subcategorias.findMany({
            orderBy: { nombre: 'asc' }
        });
        return res.json(subcategorias);
    } catch (error) {
        console.error("Error en getAllSubcategorias:", error);
        return res.status(500).json({ error: 'Error al obtener subcategorías globales', details: error.message });
    }
};

export const getSubcategoriasByCategoria = async (req, res) => {
    try {
        const { categoriaId } = req.params;
        const subcategorias = await prisma.subcategorias.findMany({
            where: { categoria_id: parseInt(categoriaId) },
            orderBy: { id: 'asc' }
        });
        return res.json(subcategorias);
    } catch (error) {
        console.error("Error en getSubcategoriasByCategoria:", error);
        return res.status(500).json({ error: 'Error al obtener subcategorías', details: error.message });
    }
};

export const createSubcategoria = async (req, res) => {
    try {
        const { nombre, categoria_id } = req.body;
        if (!nombre || !categoria_id) {
            return res.status(400).json({ error: 'El nombre y la categoría padre son obligatorios.' });
        }

        const nueva = await prisma.subcategorias.create({
            data: { 
                nombre: String(nombre).trim(), 
                categoria_id: parseInt(categoria_id) 
            }
        });
        return res.status(201).json(nueva);
    } catch (error) {
        console.error("Error en createSubcategoria:", error);
        return res.status(500).json({ error: 'Error interno al crear subcategoría', details: error.message });
    }
};

export const updateSubcategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body;
        
        const actualizada = await prisma.subcategorias.update({
            where: { id: parseInt(id) },
            data: { nombre: String(nombre).trim() }
        });
        return res.json(actualizada);
    } catch (error) {
        console.error("Error en updateSubcategoria:", error);
        return res.status(500).json({ error: 'Error al actualizar subcategoría', details: error.message });
    }
};
export const deleteSubcategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const { force } = req.query; // Capturamos si el frontend pide borrado en cascada

        if (force === 'true') {
            // BORRADO EN CASCADA (Transacción: Borra productos y luego subcategoría)
            await prisma.$transaction([
                // 👇 CORRECCIÓN AQUÍ: Cambiado a prisma.articulo (en singular)
                prisma.articulo.deleteMany({
                    where: { subcategoria_id: parseInt(id) }
                }),
                prisma.subcategorias.delete({
                    where: { id: parseInt(id) }
                })
            ]);
            return res.json({ message: 'Subcategoría y todos sus productos eliminados en cascada correctamente.' });
        } else {
            // BORRADO NORMAL
            await prisma.subcategorias.delete({
                where: { id: parseInt(id) } 
            });
            return res.json({ message: 'Subcategoría eliminada correctamente.' });
        }
    } catch (error) {
        console.error("Error en deleteSubcategoria:", error);
        
        if (error.code === 'P2003') {
            // Le agregamos la bandera "hasProducts: true" para que el frontend sepa qué hacer
            return res.status(400).json({ 
                error: 'Esta subcategoría tiene productos asociados.',
                hasProducts: true 
            });
        }

        return res.status(500).json({ 
            error: 'Error interno al intentar eliminar la subcategoría.', 
            details: error.message 
        });
    }
};