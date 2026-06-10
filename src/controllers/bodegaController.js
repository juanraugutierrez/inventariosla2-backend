import prisma from '../config/prisma.js';

/**
 * 1. LISTAR TODAS LAS BODEGAS CON SU VALORIZACIÓN O TOTAL DE SKUS
 * GET /api/bodegas
 */
export const getBodegas = async (req, res) => {
    try {
        // Traemos las bodegas e incluimos los registros de stock de artículos que contiene
        const bodegas = await prisma.bodega.findMany({
            include: {
                stock_bodegas: true
            },
            orderBy: { nombre: 'asc' }
        });

        // Mapeamos para enviar datos planos e informativos al frontend de React
        const respuesta = bodegas.map(b => {
            const filasStock = b.stock_bodegas || [];
            // Calculamos el total de unidades físicas almacenadas en esta bodega
            const totalUnidades = filasStock.reduce((sum, item) => sum + (item.cantidad_unidades || 0), 0);
            // Total de SKUs distintos mapeados en esta instalación
            const totalSkus = filasStock.length;

            return {
                id: b.id,
                nombre: b.nombre,
                ubicacion: b.ubicacion || 'Sin dirección registrada',
                total_unidades: totalUnidades,
                total_skus: totalSkus
            };
        });

        return res.json(respuesta);
    } catch (error) {
        return res.status(500).json({ 
            error: 'Error al consultar el catálogo de bodegas en MySQL', 
            details: error.message 
        });
    }
};

/**
 * 2. CREAR NUEVA BODEGA / INSTALACIÓN
 * POST /api/bodegas
 */
export const createBodega = async (req, res) => {
    try {
        const { nombre, ubicacion } = req.body;

        if (!nombre) {
            return res.status(400).json({ error: 'El nombre de la bodega es mandatorio.' });
        }

        const nuevaBodega = await prisma.bodega.create({
            data: {
                nombre: nombre.trim(),
                ubicacion: ubicacion && ubicacion.trim() ? ubicacion.trim() : null
            }
        });

        return res.status(201).json({
            id: nuevaBodega.id,
            message: 'Bodega aperturada y registrada con éxito en MySQL.'
        });
    } catch (error) {
        return res.status(500).json({ error: 'Error al insertar la bodega', details: error.message });
    }
};

/**
 * 3. MODIFICAR ATRIBUTOS DE UNA BODEGA
 * PUT /api/bodegas/:id
 */
export const updateBodega = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, ubicacion } = req.body;

        if (!nombre) {
            return res.status(400).json({ error: 'El nombre es un campo requerido.' });
        }

        const actualizada = await prisma.bodega.update({
            where: { id: parseInt(id) },
            data: {
                nombre: nombre.trim(),
                ubicacion: ubicacion && ubicacion.trim() ? ubicacion.trim() : null
            }
        });

        return res.json({ message: 'Instalación modificada correctamente.', actualizada });
    } catch (error) {
        return res.status(500).json({ error: 'Error al actualizar la bodega en MySQL', details: error.message });
    }
};