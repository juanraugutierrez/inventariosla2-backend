import prisma from '../config/prisma.js';

/**
 * LISTAR TODAS LAS CATEGORÍAS MADRE
 * GET /api/categorias
 */
export const getCategorias = async (req, res) => {
    try {
        // Consultamos de forma tolerante al modelo singular o plural de tu esquema
        let listaCategorias = [];
        try {
            listaCategorias = await prisma.categorias.findMany({
                orderBy: { nombre: 'asc' }
            });
        } catch (e) {
            listaCategorias = await prisma.categoria.findMany({
                orderBy: { nombre: 'asc' }
            });
        }

        // Devolvemos el arreglo mapeado de forma limpia
        const respuesta = listaCategorias.map(c => ({
            id: c.id,
            nombre: c.nombre
        }));

        return res.json(respuesta);
    } catch (error) {
        return res.status(500).json({ 
            error: 'Error al obtener las categorías desde MySQL', 
            details: error.message 
        });
    }
};

/**
 * LISTAR TODAS LAS SUBCATEGORÍAS CON RELACIÓN DE DEPENDENCIA
 * GET /api/subcategorias
 */
export const getSubcategorias = async (req, res) => {
    try {
        let listaSubcategorias = [];
        try {
            listaSubcategorias = await prisma.subcategorias.findMany({
                orderBy: { nombre: 'asc' }
            });
        } catch (e) {
            listaSubcategorias = await prisma.subcategoria.findMany({
                orderBy: { nombre: 'asc' }
            });
        }

        // Mapeamos asegurando que la propiedad de dependencia 'categoria_id' 
        // viaje de forma explícita e idéntica a como la busca el frontend
        const respuesta = listaSubcategorias.map(s => ({
            id: s.id,
            nombre: s.nombre,
            categoria_id: s.categoria_id || s.categoriaId // Tolerancia a la convención de Prisma
        }));

        return res.json(respuesta);
    } catch (error) {
        return res.status(500).json({ 
            error: 'Error al obtener las subcategorías desde MySQL', 
            details: error.message 
        });
    }
};