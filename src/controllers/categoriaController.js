import prisma from '../config/prisma.js';

export const getCategorias = async (req, res) => {
    try {
        const categorias = await prisma.categorias.findMany({
            orderBy: {
                id: 'asc' // <- Cambiado para ordenar por ID ascendente (1, 2, 3...)
            }
        });
        return res.json(categorias);
    } catch (error) {
        return res.status(500).json({ error: 'Error al obtener categorías', details: error.message });
    }
};

export const createCategoria = async (req, res) => {
    try {
        const { nombre } = req.body;
        if (!nombre || String(nombre).trim() === '') return res.status(400).json({ error: 'El nombre es obligatorio.' });

        const nuevaCategoria = await prisma.categorias.create({
            data: { nombre: String(nombre).trim() }
        });
        return res.status(201).json(nuevaCategoria);
    } catch (error) {
        if (error.code === 'P2002') return res.status(400).json({ error: 'Categoría duplicada.' });
        return res.status(500).json({ error: 'Error interno', details: error.message });
    }
};

export const updateCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body;
        if (!nombre || String(nombre).trim() === '') return res.status(400).json({ error: 'Nombre vacío.' });

        const actualizada = await prisma.categorias.update({
            where: { id: parseInt(id) },
            data: { nombre: String(nombre).trim() }
        });
        return res.json(actualizada);
    } catch (error) {
        return res.status(500).json({ error: 'Error al actualizar', details: error.message });
    }
};

export const deleteCategoria = async (req, res) => {
    try {
        await prisma.categorias.delete({ where: { id: parseInt(req.params.id) } });
        return res.json({ message: 'Eliminada correctamente.' });
    } catch (error) {
        return res.status(400).json({ error: 'No se puede eliminar. Revise dependencias.', details: error.message });
    }
};