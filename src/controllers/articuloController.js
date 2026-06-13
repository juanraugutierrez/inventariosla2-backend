// src/controllers/articuloController.js
import prisma from '../config/prisma.js';
import xlsx from 'xlsx'; // Importación necesaria para leer el Excel

/**
 * 🛠️ FUNCIÓN AUXILIAR DE NEGOCIO: DETERMINAR EL TIPO DE ACTIVO POR CATEGORÍA
 * Regla Servilift: ID 8 (Consumibles, Lubricantes y Químicos) es CIRCULANTE. El resto es FIJO.
 */
const calcularTipoActivo = (categoriaId) => {
    const id = parseInt(categoriaId);
    if (id === 8) {
        return 'ACTIVO_CIRCULANTE'; // Fluidos, paños, lubricantes (se extinguen)
    }
    return 'ACTIVO_FIJO'; // Herramientas, mangueras, motores (bienes durables / repuestos fijos)
};

/**
 * 1. LISTAR ARTÍCULOS CON RELACIONES E IMÁGENES
 * GET /api/productos
 */
export const getArticulos = async (req, res) => {
    try {
        // Soporte flexible para el nombre del modelo mapeado por Prisma (articulos o articulo)
        const modeloArticulo = prisma.articulo || prisma.articulos;
        
        const articulos = await modeloArticulo.findMany({
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

            // RECONVERSIÓN: Si es un Buffer binario de LONGBLOB, lo pasamos a texto Base64 para el front
            let renderFoto = null;
            if (art.url_foto && Buffer.isBuffer(art.url_foto)) {
                renderFoto = art.url_foto.toString('utf8');
            } else if (typeof art.url_foto === 'string') {
                renderFoto = art.url_foto;
            }

            return {
                id: art.id,
                codigo_sku: art.codigo_sku,
                nombre: art.nombre,
                descripcion: art.descripcion,
                url_foto: renderFoto,
                tipo_activo: art.tipo_activo,
                precio_promedio: parseFloat(art.precio_promedio) || 0.00,
                stock: stockTotal,
                
                subcategoria_id: art.subcategoria_id || subcatObjeto?.id || '',
                subcategoria_nombre: subcatObjeto?.nombre || 'Sin Subcategoría',
                subcategoria_codigo: subcatObjeto?.codigo_subcategoria || '01',
                categoria_id: subcatObjeto?.categoria_id || catObjeto?.id || '',
                categoria_nombre: catObjeto?.nombre || 'Sin Categoría'
            };
        });

        return res.json(respuesta);
    } catch (error) {
        console.error("Error en getArticulos:", error);
        return res.status(500).json({ 
            error: 'Error crítico al procesar el catálogo relacional en MySQL', 
            details: error.message 
        });
    }
};

/**
 * 2. CREAR NUEVO ARTÍCULO (BLINDADO CONTRA MODELOS UNDEFINED)
 * POST /api/productos
 */
export const createArticulo = async (req, res) => {
    try {
        const { codigo_sku, nombre, descripcion, url_foto, precio_promedio, subcategoria_id } = req.body;

        if (!codigo_sku || !nombre || !subcategoria_id) {
            return res.status(400).json({ error: 'Faltan campos obligatorios: SKU, Nombre o Subcategoria.' });
        }

        const subcatIdParseado = parseInt(subcategoria_id);
        if (isNaN(subcatIdParseado)) {
            return res.status(400).json({ error: 'El ID de la subcategoria debe ser un numero valido.' });
        }

        // 🔑 REFUERZO DE TOLERANCIA: Mapeo dinámico del modelo de subcategorías para evitar caídas por "undefined"
        const modeloSubcategoria = prisma.subcategoria || prisma.subcategorias || prisma.Subcategoria;
        const modeloArticulo = prisma.articulo || prisma.articulos || prisma.Articulo;

        if (!modeloSubcategoria) {
            return res.status(500).json({ error: 'El modelo Subcategoria no esta inicializado correctamente en el cliente de Prisma.' });
        }

        // Buscar la subcategoría correspondiente
        const dbSubcategoria = await modeloSubcategoria.findUnique({
            where: { id: subcatIdParseado }
        });

        if (!dbSubcategoria) {
            return res.status(404).json({ error: 'La subcategoria seleccionada no existe en la base de datos.' });
        }

        const tipoActivoDeducido = calcularTipoActivo(dbSubcategoria.categoria_id);

        // Almacenar Base64 como un Buffer de texto seguro para el LONGBLOB de MySQL
        let blobFoto = null;
        if (url_foto && typeof url_foto === 'string') {
            blobFoto = Buffer.from(url_foto, 'utf8');
        }

        const nuevoArticulo = await modeloArticulo.create({
            data: {
                codigo_sku: String(codigo_sku).trim(),
                nombre: String(nombre).trim(),
                descripcion: descripcion && String(descripcion).trim() ? String(descripcion).trim() : null,
                url_foto: blobFoto,
                tipo_activo: tipoActivoDeducido,
                precio_promedio: precio_promedio ? parseFloat(precio_promedio) : 0.00,
                subcategoria_id: subcatIdParseado
            }
        });

        return res.status(201).json({ 
            id: nuevoArticulo.id,
            message: 'Articulo catalogado y clasificado correctamente en MySQL.' 
        });

    } catch (error) {
        console.error("🚨 Error capturado en createArticulo:", error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'El codigo SKU generado ya existe para otro articulo en el sistema.' });
        }
        return res.status(400).json({ 
            error: 'La base de datos MySQL rechazo la operacion.', 
            details: error.message
        });
    }
};

/**
 * 3. ACTUALIZAR ARTÍCULO COMPLETO
 * PUT /api/productos/:id
 */
export const updateArticulo = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, url_foto, subcategoria_id } = req.body;

        const nuevoSubcatId = parseInt(subcategoria_id);
        const modeloSubcategoria = prisma.subcategoria || prisma.subcategorias || prisma.Subcategoria;
        const modeloArticulo = prisma.articulo || prisma.articulos || prisma.Articulo;

        const dbSubcategoria = await modeloSubcategoria.findUnique({
            where: { id: nuevoSubcatId }
        });

        if (!dbSubcategoria) {
            return res.status(404).json({ error: 'La subcategoría ingresada no existe.' });
        }

        const tipoActivoDeducido = calcularTipoActivo(dbSubcategoria.categoria_id);

        let blobFoto = null;
        if (url_foto && typeof url_foto === 'string') {
            blobFoto = Buffer.from(url_foto, 'utf8');
        }

        const actualizado = await modeloArticulo.update({
            where: { id: parseInt(id) },
            data: {
                nombre: String(nombre).trim(),
                descripcion: descripcion && String(descripcion).trim() ? String(descripcion).trim() : null,
                url_foto: blobFoto, 
                tipo_activo: tipoActivoDeducido, 
                subcategoria_id: nuevoSubcatId
            }
        });

        return res.json({ message: 'Artículo modificado correctamente en MySQL.', actualizado });
    } catch (error) {
        return res.status(500).json({ error: 'Error al actualizar en MySQL', details: error.message });
    }
};

/**
 * 4. ELIMINAR ARTÍCULO DE FORMA FÍSICA
 * DELETE /api/productos/:id
 */
export const deleteArticulo = async (req, res) => {
    try {
        const { id } = req.params;
        const modeloArticulo = prisma.articulo || prisma.articulos || prisma.Articulo;

        const eliminado = await modeloArticulo.delete({
            where: { id: parseInt(id) }
        });

        return res.json({ message: 'Artículo removido exitosamente del catálogo maestro de MySQL.', eliminado });
    } catch (error) {
        return res.status(500).json({ error: 'Fallo interno al intentar eliminar el registro de la base de datos.', details: error.message });
    }
};

/**
 * 5. CARGA MASIVA DE ARTÍCULOS DESDE EXCEL
 * POST /api/productos/cargar-masivo
 */
export const cargarMasivoExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No se ha adjuntado ningún archivo." });
        }

        const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0]; 
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
            return res.status(400).json({ error: "El archivo Excel está vacío." });
        }

        let articulosInsertados = 0;
        const cacheSecuencias = {}; 

        const todasLasSubcategorias = await prisma.subcategoria.findMany();
        const modeloArticulo = prisma.articulo || prisma.articulos || prisma.Articulo;

        for (const row of rows) {
            const { nombre, descripcion, precio_promedio, subcategoria_id, url_foto } = row;

            if (!nombre || !subcategoria_id) {
                continue;
            }

            const subcatIdActual = parseInt(subcategoria_id);
            const subcatData = todasLasSubcategorias.find(s => s.id === subcatIdActual);
            
            if (!subcatData) {
                continue;
            }

            const tipoActivoCalculado = calcularTipoActivo(subcatData.categoria_id);

            const catStr = String(subcatData.categoria_id).padStart(2, "0");
            const subCatStr = String(subcatData.codigo_subcategoria).padStart(2, "0");
            const prefixSKU = `SLA${catStr}${subCatStr}`;

            let siguienteSecuencia = 1;

            if (cacheSecuencias[prefixSKU]) {
                cacheSecuencias[prefixSKU]++;
                siguienteSecuencia = cacheSecuencias[prefixSKU];
            } else {
                const ultimoArticulo = await modeloArticulo.findFirst({
                    where: { codigo_sku: { startsWith: prefixSKU } },
                    orderBy: { codigo_sku: "desc" },
                });

                if (ultimoArticulo && ultimoArticulo.codigo_sku && ultimoArticulo.codigo_sku.length === 11) {
                    const ultimaSecuenciaStr = ultimoArticulo.codigo_sku.substring(7);
                    const seqParsed = parseInt(ultimaSecuenciaStr, 10);
                    if (!isNaN(seqParsed)) {
                        siguienteSecuencia = seqParsed + 1;
                    }
                }
                cacheSecuencias[prefixSKU] = siguienteSecuencia;
            }

            const secuenciaStr = String(siguienteSecuencia).padStart(4, "0");
            const skuFinal = `${prefixSKU}${secuenciaStr}`;

            let excelBlobFoto = null;
            if (url_foto && typeof url_foto === 'string') {
                excelBlobFoto = Buffer.from(url_foto, 'utf8');
            }

            await modeloArticulo.create({
                data: {
                    codigo_sku: skuFinal,
                    nombre: String(nombre).trim(),
                    descripcion: descripcion ? String(descripcion).trim() : null,
                    url_foto: excelBlobFoto,
                    tipo_activo: tipoActivoCalculado,
                    precio_promedio: precio_promedio ? parseFloat(precio_promedio) : 0.00,
                    subcategoria_id: subcatIdActual
                },
            });

            articulosInsertados++;
        }

        return res.status(201).json({ count: articulosInsertados, message: "Carga masiva completada y clasificada con éxito." });
    } catch (error) {
        console.error("Error en la carga masiva:", error);
        return res.status(500).json({ error: "Ocurrió un error interno al procesar el Excel.", details: error.message });
    }
};