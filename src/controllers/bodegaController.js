import prisma from '../config/prisma.js';

export const getBodegas = async (req, res) => {
    try {
        const bodegas = await prisma.bodega.findMany({ // <- Corregido a prisma.bodega
            orderBy: { id: 'asc' }
        });
        return res.json(bodegas);
    } catch (error) {
        console.error("Error al obtener bodegas:", error);
        return res.status(500).json({ error: 'Error al obtener bodegas', details: error.message });
    }
};

export const createBodega = async (req, res) => {
    try {
        const { nombre, direccion, es_central, responsable_id } = req.body;

        if (!nombre) {
            return res.status(400).json({ error: 'El nombre de la bodega es obligatorio.' });
        }

        const nueva = await prisma.bodega.create({
            data: {
                nombre: String(nombre).trim(),
                direccion: direccion ? String(direccion).trim() : null,
                es_central: Boolean(es_central), // true para central, false para furgón
                responsable_id: responsable_id ? parseInt(responsable_id) : null
            }
        });
        return res.status(201).json(nueva);
    } catch (error) {
        console.error("Error al crear bodega:", error);
        return res.status(500).json({ error: 'Error al crear la bodega', details: error.message });
    }
};

export const updateBodega = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, direccion, es_central, responsable_id } = req.body;

        const actualizada = await prisma.bodega.update({
            where: { id: parseInt(id) },
            data: {
                nombre: String(nombre).trim(),
                direccion: direccion ? String(direccion).trim() : null,
                es_central: Boolean(es_central),
                responsable_id: responsable_id ? parseInt(responsable_id) : null
            }
        });
        return res.json(actualizada);
    } catch (error) {
        console.error("Error al actualizar bodega:", error);
        return res.status(500).json({ error: 'Error al actualizar bodega', details: error.message });
    }
};

export const deleteBodega = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.bodega.delete({
            where: { id: parseInt(id) }
        });
        return res.json({ message: 'Bodega eliminada correctamente.' });
    } catch (error) {
        console.error("Error al eliminar bodega:", error);
        return res.status(400).json({ error: 'No se puede eliminar. Verifica dependencias en base de datos.', details: error.message });
    }
};