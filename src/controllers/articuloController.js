import prisma from '../config/prisma.js';
import xlsx from 'xlsx'; // Importación necesaria para leer el Excel

/**
 * 1. LISTAR ARTÍCULOS CON RELACIONES E IMÁGENES
 * GET /api/productos
 */
export const getArticulos = async (req, res) => {
    try {
        const articulos = await prisma.articulo.findMany({
            include: {
                stock_bodegas: true,
                subcategorias: {
                    include: {
                        categorias: true
                    }
                }
            }
        });

        const respuesta = articulos.map(art => {
            const registrosStock = art.stock_bodegas || [];
            const stockTotal = registrosStock.reduce((sum, f) => sum + (f.cantidad_unidades || 0), 0);

            const subcatObjeto = art.subcategorias;
            const catObjeto = subcatObjeto?.categorias;

            return {
                id: art.id,
                codigo_sku: art.codigo_sku,
                nombre: art.nombre,
                descripcion: art.descripcion,
                url_foto: art.url_foto, 
                tipo_activo: art.tipo_activo,
                precio_promedio: parseFloat(art.precio_promedio) || 0.00,
                stock: stockTotal,
                
                // Mapeo unificado para posicionar los Selectores de React
                subcategoria_id: art.subcategoria_id || subcatObjeto?.id || '',
                subcategoria_nombre: subcatObjeto?.nombre || 'Sin Subcategoría',
                categoria_id: subcatObjeto?.categoria_id || catObjeto?.id || '',
                categoria_nombre: catObjeto?.nombre || 'Sin Categoría'
            };
        });

        return res.json(respuesta);
    } catch (error) {
        return res.status(500).json({ 
            error: 'Error crítico al procesar el catálogo relacional en MySQL', 
            details: error.message 
        });
    }
};

/**
 * 2. CREAR NUEVO ARTÍCULO (COMPLETAMENTE PROTEGIDO CONTRA STRINGS VACÍOS)
 * POST /api/productos
 */
export const createArticulo = async (req, res) => {
    try {
        const { codigo_sku, nombre, descripcion, url_foto, tipo_activo, precio_promedio, subcategoria_id } = req.body;

        if (!codigo_sku || !nombre || !tipo_activo || !subcategoria_id) {
            return res.status(400).json({ error: 'El SKU, nombre, clasificación contable y subcategoría son obligatorios.' });
        }

        // Conversión y saneamiento defensivo de tipos para MySQL en el Backend 🔑
        const skuLimpio = String(codigo_sku).trim();
        const nombreLimpio = String(nombre).trim();
        const descLimpia = descripcion && String(descripcion).trim() ? String(descripcion).trim() : null;
        const fotoLimpia = url_foto || null;
        const precioParseado = precio_promedio && !isNaN(precio_promedio) ? parseFloat(precio_promedio) : 0.00;
        const subcatIdParseado = parseInt(subcategoria_id);

        if (isNaN(subcatIdParseado)) {
            return res.status(400).json({ error: 'El ID de la subcategoría enviado no es un identificador numérico válido.' });
        }

        const nuevoArticulo = await prisma.articulo.create({
            data: {
                codigo_sku: skuLimpio,
                nombre: nombreLimpio,
                descripcion: descLimpia,
                url_foto: fotoLimpia, 
                tipo_activo,
                precio_promedio: precioParseado,
                subcategoria_id: subcatIdParseado
            }
        });

        return res.status(201).json({ 
            id: nuevoArticulo.id, 
            message: 'Artículo catalogado correctamente en la base de datos MySQL.' 
        });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'El código SKU ingresado ya se encuentra registrado en el sistema.' });
        }
        return res.status(500).json({ error: 'Error al insertar el artículo en MySQL', details: error.message });
    }
};

/**
 * 3. ACTUALIZAR ARTÍCULO COMPLETO 
 * PUT /api/productos/:id
 */
export const updateArticulo = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, url_foto, tipo_activo, subcategoria_id } = req.body;

        if (!nombre || !tipo_activo || !subcategoria_id) {
            return res.status(400).json({ error: 'El nombre, tipo de activo y subcategoría son campos requeridos.' });
        }

        const nuevoSubcatId = parseInt(subcategoria_id);
        if (isNaN(nuevoSubcatId)) {
            return res.status(400).json({ error: 'Subcategoría inválida.' });
        }

        const actualizado = await prisma.articulo.update({
            where: { id: parseInt(id) },
            data: {
                nombre: String(nombre).trim(),
                descripcion: descripcion && String(descripcion).trim() ? String(descripcion).trim() : null,
                url_foto: url_foto || null, 
                tipo_activo,
                subcategoria_id: nuevoSubcatId
            }
        });

        return res.json({ message: 'Artículo modificado correctamente en MySQL.', actualizado });
    } catch (error) {
        return res.status(500).json({ error: 'Error al actualizar con Prisma en MySQL', details: error.message });
    }
};

/**
 * 4. CARGA MASIVA DE ARTÍCULOS DESDE EXCEL
 * POST /api/productos/cargar-masivo
 */
export const cargarMasivoExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No se ha adjuntado ningún archivo." });
        }

        // Leer el archivo Excel desde la memoria (buffer)
        const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0]; // Toma la primera hoja
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
            return res.status(400).json({ error: "El archivo Excel está vacío." });
        }

        let articulosInsertados = 0;
        const cacheSecuencias = {}; // Memoria temporal para manejar lotes grandes de la misma subcategoría

        for (const row of rows) {
            // Se esperan estas columnas en el Excel: nombre, descripcion, precio_promedio, categoria_cod, subcategoria_cod, subcategoria_id, tipo_activo
            const { nombre, descripcion, precio_promedio, categoria_cod, subcategoria_cod, subcategoria_id, tipo_activo, url_foto } = row;

            // Validaciones mínimas de estructura de negocio según tu modelo
            if (!nombre || !categoria_cod || !subcategoria_cod || !subcategoria_id || !tipo_activo) {
                continue; // Salta la fila si falta algún dato crítico
            }

            // Construir prefijo del SKU (ej: SL0502)
            const catStr = String(categoria_cod).padStart(2, "0");
            const subCatStr = String(subcategoria_cod).padStart(2, "0");
            const prefixSKU = `SL${catStr}${subCatStr}`;

            let siguienteSecuencia = 1;

            if (cacheSecuencias[prefixSKU]) {
                cacheSecuencias[prefixSKU]++;
                siguienteSecuencia = cacheSecuencias[prefixSKU];
            } else {
                // Consulta en base de datos al artículo con el código más alto para ese prefijo
                const ultimoArticulo = await prisma.articulo.findFirst({
                    where: { codigo_sku: { startsWith: prefixSKU } },
                    orderBy: { codigo_sku: "desc" },
                });

                if (ultimoArticulo && ultimoArticulo.codigo_sku) {
                    const ultimaSecuenciaStr = ultimoArticulo.codigo_sku.substring(6);
                    const seqParsed = parseInt(ultimaSecuenciaStr, 10);
                    if (!isNaN(seqParsed)) {
                        siguienteSecuencia = seqParsed + 1;
                    }
                }
                cacheSecuencias[prefixSKU] = siguienteSecuencia;
            }

            // Convertir secuencia a 5 dígitos (ej: 00007) y combinar
            const secuenciaStr = String(siguienteSecuencia).padStart(5, "0");
            const skuFinal = `${prefixSKU}${secuenciaStr}`;

            // Inserción en Prisma respetando los tipos de tu BD
            await prisma.articulo.create({
                data: {
                    codigo_sku: skuFinal,
                    nombre: String(nombre).trim(),
                    descripcion: descripcion ? String(descripcion).trim() : null,
                    url_foto: url_foto || null,
                    tipo_activo: String(tipo_activo).trim(),
                    precio_promedio: precio_promedio ? parseFloat(precio_promedio) : 0.00,
                    subcategoria_id: parseInt(subcategoria_id)
                },
            });

            articulosInsertados++;
        }

        return res.status(201).json({ count: articulosInsertados, message: "Carga masiva completada con éxito." });

    } catch (error) {
        console.error("Error en la carga masiva:", error);
        return res.status(500).json({ error: "Ocurrió un error interno al procesar el Excel.", details: error.message });
    }
};