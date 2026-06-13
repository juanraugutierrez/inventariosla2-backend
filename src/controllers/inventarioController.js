import prisma from '../config/prisma.js';

// ==========================================
// 📥 1. REGISTRAR INGRESO (CON RECALCULO DE PPP ENTERO)
// ==========================================
export const registrarIngreso = async (req, res) => {
    try {
        const { 
            tipo_documento, numero_documento, fecha_emision, proveedor_o_emisor,
            monto_neto, monto_total, bodega_id, responsable_id, observaciones,
            articulos_movimiento
        } = req.body;

        if (!bodega_id || !tipo_documento || !numero_documento || !articulos_movimiento || articulos_movimiento.length === 0) {
            return res.status(400).json({ error: 'Todos los campos de la cabecera y el lote de artículos son obligatorios.' });
        }

        const bId = parseInt(bodega_id);
        const respId = responsable_id ? parseInt(responsable_id) : 1;

        // A) Buscar o registrar el Documento de Soporte Inicial
        let documento = await (prisma.documentos_soporte || prisma.documento_soporte).findFirst({
            where: { tipo_documento, numero_documento }
        });

        if (!documento) {
            documento = await (prisma.documentos_soporte || prisma.documento_soporte).create({
                data: {
                    tipo_documento,
                    numero_documento,
                    fecha_emision: new Date(fecha_emision),
                    proveedor_o_emisor: proveedor_o_emisor ? proveedor_o_emisor.trim() : 'Proveedor Externo',
                    monto_neto: parseFloat(monto_neto) || 0,
                    monto_iva: (parseFloat(monto_neto) || 0) * 0.19,
                    monto_total: parseFloat(monto_total) || 0
                }
            });
        }

        
       // B) Registrar la cabecera del movimiento de ENTRADA (CON FOLIO INTERNO GENERADO)
        // 🔑 REPLICACIÓN DE LÓGICA: Generamos un timestamp único para el ingreso institucional
        const folioIngreso = `IN-${Date.now()}`;

        const cabeceraMov = await (prisma.movimientos || prisma.movimiento).create({
            data: {
                tipo_movimiento: 'ENTRADA',
                motivo_operacion: tipo_documento === 'VALE_DEVOLUCION' ? 'REPARACION_HERRAMIENTA' : 'INGRESO_PROVEEDOR',
                bodega_destino_id: bId,
                bodega_origen_id: null,
                documento_soporte_id: documento.id,
                responsable_id: respId,
                // 🔑 INYECCIÓN: Almacenamos el folio interno en la columna correspondiente
                folio_documento_salida: folioIngreso, 
                observaciones: observaciones ? observaciones.trim() : `Ingreso masivo por ${tipo_documento}`
            }
        });

        // C) Procesar el lote de artículos (Ponderación + Stock)
        for (const item of articulos_movimiento) {
            let aId;
            const cantidadNueva = parseInt(item.cantidad);
            const precioCompraUnidad = parseFloat(item.precio_unitario) || 0;

            if (cantidadNueva <= 0) throw new Error("Las cantidades ingresadas deben ser mayores a cero.");

            if (item.es_nuevo) {
                const subcatId = parseInt(item.subcategoria_id) || 1;

                const nuevoArticulo = await (prisma.articulos || prisma.articulo).create({
                    data: {
                        codigo_sku: item.codigo_sku.trim().toUpperCase(),
                        nombre: item.nombre.trim(),
                        subcategoria_id: subcatId,
                        tipo_activo: item.tipo_activo,
                        precio_promedio: Math.round(precioCompraUnidad)
                    }
                });
                aId = nuevoArticulo.id;
            } else {
                aId = parseInt(item.articulo_id);
                
                const articuloActual = await (prisma.articulos || prisma.articulo).findUnique({ where: { id: aId } });
                if (!articuloActual) throw new Error(`El artículo ID ${aId} no existe en el catálogo maestro.`);

                const agregadoStock = await (prisma.stock_bodegas || prisma.stock_bodega).aggregate({
                    where: { articulo_id: aId },
                    _sum: { cantidad_unidades: true }
                });

                const stockGlobalActual = agregadoStock._sum.cantidad_unidades || 0;
                const pppActual = parseFloat(articuloActual.precio_promedio) || 0;

                const numeradorTotal = (stockGlobalActual * pppActual) + (cantidadNueva * precioCompraUnidad);
                const denominatorTotal = stockGlobalActual + cantidadNueva;
                const nuevoPppPonderado = Math.round(numeradorTotal / denominatorTotal);

                await (prisma.articulos || prisma.articulo).update({
                    where: { id: aId },
                    data: { precio_promedio: nuevoPppPonderado }
                });
            }

            // D) Registrar detalle del movimiento
            await (prisma.detalle_movimientos || prisma.detalle_movimiento).create({
                data: {
                    movimiento_id: cabeceraMov.id,
                    articulo_id: aId,
                    cantidad: cantidadNueva,
                    precio_unitario_operacion: precioCompraUnidad
                }
            });

            // E) Actualizar stock específico de la bodega
            const stockExistente = await (prisma.stock_bodegas || prisma.stock_bodega).findUnique({
                where: {
                    bodega_id_articulo_id: { bodega_id: bId, articulo_id: aId }
                }
            });

            if (stockExistente) {
                await (prisma.stock_bodegas || prisma.stock_bodega).update({
                    where: {
                        bodega_id_articulo_id: { bodega_id: bId, articulo_id: aId }
                    },
                    data: { cantidad_unidades: stockExistente.cantidad_unidades + cantidadNueva }
                });
            } else {
                await (prisma.stock_bodegas || prisma.stock_bodega).create({
                    data: { bodega_id: bId, articulo_id: aId, cantidad_unidades: cantidadNueva }
                });
            }
        }

        return res.status(201).json({ message: 'Lote de recepción e ingresos asentado y procesado con éxito.' });
    } catch (error) {
        console.error("Error detectado en registrarIngreso:", error);
        return res.status(500).json({ error: 'La base de datos rechazó la operación.', details: error.message });
    }
};

// ==========================================
// 📤 2. REGISTRAR SALIDA (LOGÍSTICA TÉCNICOS)
// ==========================================
export const registrarSalida = async (req, res) => {
    try {
        const { 
            bodega_id, responsable_id, quien_retira, observaciones, motivo_operacion, 
            identificador_destino_externo, articulos_movimiento 
        } = req.body;

        if (!bodega_id || !quien_retira || !motivo_operacion || !articulos_movimiento || articulos_movimiento.length === 0) {
            return res.status(400).json({ error: 'La bodega, el técnico que retira, el motivo y el listado de materiales son obligatorios.' });
        }

        const bId = parseInt(bodega_id);
        const respId = responsable_id ? parseInt(responsable_id) : 1;
        const folioSalida = `OUT-${Date.now()}`;

        for (const item of articulos_movimiento) {
            const aId = parseInt(item.articulo_id);
            const cantidadSalida = parseInt(item.cantidad);

            const stockActual = await (prisma.stock_bodegas || prisma.stock_bodega).findUnique({
                where: {
                    bodega_id_articulo_id: { bodega_id: bId, articulo_id: aId }
                }
            });

            if (!stockActual || stockActual.cantidad_unidades < cantidadSalida) {
                const artInfo = await (prisma.articulos || prisma.articulo).findUnique({ where: { id: aId } });
                return res.status(400).json({ 
                    error: `Stock insuficiente para [${artInfo?.codigo_sku || 'SKU'}] ${artInfo?.nombre || 'Artículo'}. Disponible en bodega: ${stockActual ? stockActual.cantidad_unidades : 0} u.` 
                });
            }
        }

        const cabeceraMov = await (prisma.movimientos || prisma.movimiento).create({
            data: {
                tipo_movimiento: 'SALIDA',
                motivo_operacion: motivo_operacion, 
                identificador_destino_externo: identificador_destino_externo ? identificador_destino_externo.trim() : 'General',
                bodega_origen_id: bId,
                bodega_destino_id: null,
                responsable_id: respId,
                quien_retira: quien_retira.trim(),
                folio_documento_salida: folioSalida,
                observaciones: observaciones ? observaciones.trim() : `Salida de materiales asignada a ${quien_retira}`
            }
        });

        for (const item of articulos_movimiento) {
            const aId = parseInt(item.articulo_id);
            const cantidadSalida = parseInt(item.cantidad);

            const articuloInfo = await (prisma.articulos || prisma.articulo).findUnique({ where: { id: aId } });

            await (prisma.detalle_movimientos || prisma.detalle_movimiento).create({
                data: {
                    movimiento_id: cabeceraMov.id,
                    articulo_id: aId,
                    cantidad: cantidadSalida,
                    precio_unitario_operacion: articuloInfo.precio_promedio
                }
            });

            const stockRegistro = await (prisma.stock_bodegas || prisma.stock_bodega).findUnique({
                where: {
                    bodega_id_articulo_id: { bodega_id: bId, articulo_id: aId }
                }
            });

            await (prisma.stock_bodegas || prisma.stock_bodega).update({
                where: {
                    bodega_id_articulo_id: { bodega_id: bId, articulo_id: aId }
                },
                data: {
                    cantidad_unidades: stockRegistro.cantidad_unidades - cantidadSalida
                }
            });
        }

        return res.status(201).json({ 
            message: 'Salida de bodega autorizada con éxito.',
            folio: folioSalida 
        });

    } catch (error) {
        console.error("Error crítico en la operación de salida:", error);
        return res.status(500).json({ error: 'Fallo interno en el servidor al alterar el inventario.', details: error.message });
    }
};

// ==========================================
// 🔍 3. OBTENER VALE POR FOLIO (RETORNO RÁPIDO)
// ==========================================
export const obtenerSalidaPorFolio = async (req, res) => {
    try {
        const { folio } = req.params;
        const salida = await (prisma.movimientos || prisma.movimiento).findFirst({
            where: { folio_documento_salida: folio },
            include: {
                detalle_movimientos: {
                    include: { articulos: true }
                }
            }
        });
        if (!salida) return res.status(404).json({ error: 'El vale de salida consultado no existe.' });
        return res.json(salida);
    } catch (error) {
        console.error("Error en obtenerSalidaPorFolio:", error);
        return res.status(500).json({ error: 'Fallo al recuperar el documento.' });
    }
};
// ==========================================
// 🔍 4. LISTAR MOVIMIENTOS POR TIPO (FILTRO ENTRADAS/SALIDAS)
// ==========================================
// ==========================================
// 🔍 4. LISTAR MOVIMIENTOS POR TIPO (FILTRO ENTRADAS/SALIDAS)
// ==========================================
// ==========================================
// 🔍 4. LISTAR MOVIMIENTOS POR TIPO (CORREGIDO DE RAÍZ)
// ==========================================
export const listarMovimientos = async (req, res) => {
    try {
        const { tipo } = req.query; 
        const tipoMov = tipo || 'ENTRADA';

        // 1. Detectar el nombre real de la columna de fecha en tu tabla movimientos
        const columnasTable = await prisma.$queryRaw`SHOW COLUMNS FROM movimientos;`;
        const listaColumnas = columnasTable.map(c => c.Field.toLowerCase());
        
        let columnaFecha = "id"; 
        if (listaColumnas.includes("fecha_registro")) columnaFecha = "fecha_registro";
        else if (listaColumnas.includes("created_at")) columnaFecha = "created_at";
        else if (listaColumnas.includes("fecha")) columnaFecha = "fecha";
        else if (listaColumnas.includes("fecha_movimiento")) columnaFecha = "fecha_movimiento";

        // 2. 🚀 QUERY CORREGIDA: Se añade m.motivo_operacion que faltaba
        const querySQL = `
            SELECT 
                m.id,
                m.${columnaFecha} AS fecha_final,
                m.motivo_operacion,
                m.observaciones,
                m.bodega_destino_id,
                ds.tipo_documento,
                ds.numero_documento,
                ds.proveedor_o_emisor,
                ds.monto_neto,
                b.nombre AS nombre_bodega_destino
            FROM movimientos m
            LEFT JOIN documentos_soporte ds ON m.documento_soporte_id = ds.id
            LEFT JOIN bodegas b ON m.bodega_destino_id = b.id
            WHERE m.tipo_movimiento = '${tipoMov}'
            ORDER BY m.id DESC;
        `;

        const movimientos = await prisma.$queryRawUnsafe(querySQL);

        // 3. Formateamos enviando los nombres planos y estables que MySQL escupe
        const respuestaFormateada = movimientos.map(mov => ({
            id: mov.id,
            // Enviamos el string ISO certificado de fecha para que no mute a 2001
            fecha_registro: mov.fecha_final ? new Date(mov.fecha_final).toISOString() : new Date().toISOString(),
            motivo_operacion: mov.motivo_operacion || "INGRESO_PROVEEDOR",
            observaciones: mov.observaciones,
            bodega_destino_id: mov.bodega_destino_id,
            numero_documento: mov.numero_documento || "N/A",
            tipo_documento: mov.tipo_documento || "N/A",
            proveedor_o_emisor: mov.proveedor_o_emisor || "No Registrado",
            nombre_bodega_destino: mov.nombre_bodega_destino || `Bodega #${mov.bodega_destino_id}`
        }));

        return res.json(respuestaFormateada);
    } catch (error) {
        console.error("Error crítico en listarMovimientos:", error);
        return res.status(500).json({ error: 'Fallo interno en el servidor al consultar el libro histórico.' });
    }
};
// ==========================================
// 🔍 5. OBTENER DETALLE ESPECÍFICO DE UN MOVIMIENTO POR ID
// ==========================================
export const obtenerMovimientoPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const movId = parseInt(id);

        // Obtenemos el movimiento principal
        const movimientoBase = await (prisma.movimientos || prisma.movimiento).findUnique({
            where: { id: movId },
            include: { documentos_soporte: true }
        });

        if (!movimientoBase) return res.status(404).json({ error: 'El ingreso consultado no existe.' });

        // Buscamos los artículos asociados de forma directa mediante SQL Nativo para asegurar compatibilidad
        const detalles = await prisma.$queryRaw`
            SELECT 
                dm.id,
                dm.cantidad,
                dm.precio_unitario_operacion,
                a.codigo_sku,
                a.nombre AS nombre_articulo
            FROM detalle_movimientos dm
            INNER JOIN articulos a ON dm.articulo_id = a.id
            WHERE dm.movimiento_id = ${movId};
        `;

        // Adaptamos los nombres del detalle al formato que espera el componente de React
        const detallesMapeados = detalles.map(d => ({
            id: d.id,
            cantidad: d.cantidad,
            precio_unitario_operacion: parseFloat(d.precio_unitario_operacion) || 0,
            articulos: {
                codigo_sku: d.codigo_sku,
                nombre: d.nombre_articulo
            }
        }));

        return res.json({
            ...movimientoBase,
            detalle_movimientos: detallesMapeados
        });

    } catch (error) {
        console.error("Error crítico en obtenerMovimientoPorId:", error);
        return res.status(500).json({ error: 'Fallo en el servidor al desglosar los artículos del movimiento.' });
    }
};
// ==========================================
// 🔍 6. LISTAR SALIDAS HISTÓRICAS (CON DETECCIÓN DE FECHA AUTOMÁTICA)
// ==========================================
export const listarSalidas = async (req, res) => {
    try {
        // 1. Detectar el nombre real de la columna de fecha en la tabla movimientos
        const columnasTable = await prisma.$queryRaw`SHOW COLUMNS FROM movimientos;`;
        const listaColumnas = columnasTable.map(c => c.Field.toLowerCase());
        
        let columnaFecha = "id"; 
        if (listaColumnas.includes("fecha_registro")) columnaFecha = "fecha_registro";
        else if (listaColumnas.includes("created_at")) columnaFecha = "created_at";
        else if (listaColumnas.includes("fecha")) columnaFecha = "fecha";
         else if (listaColumnas.includes("fecha_movimiento")) columnaFecha = "fecha_movimiento";

        // 2. Construir la consulta SQL para las salidas
        const querySQL = `
            SELECT 
                m.id,
                m.${columnaFecha} AS fecha_final,
                m.motivo_operacion,
                m.identificador_destino_externo,
                m.quien_retira,
                m.folio_documento_salida,
                m.observaciones,
                b.nombre AS nombre_bodega_origen
            FROM movimientos m
            LEFT JOIN bodegas b ON m.bodega_origen_id = b.id
            WHERE m.tipo_movimiento = 'SALIDA'
            ORDER BY m.id DESC;
        `;

        const salidas = await prisma.$queryRawUnsafe(querySQL);

        // 3. Formatear la respuesta adaptada a lo que espera React
        const respuestaFormateada = salidas.map(sal => ({
            id: sal.id,
            fecha_registro: sal.fecha_final || new Date(),
            motivo_operacion: sal.motivo_operacion,
            identificador_destino_externo: sal.identificador_destino_externo,
            quien_retira: sal.quien_retira,
            folio_documento_salida: sal.folio_documento_salida,
            observaciones: sal.observaciones,
            bodega_origen: sal.nombre_bodega_origen || `Bodega #${sal.bodega_origen_id}`
        }));

        return res.json(respuestaFormateada);
    } catch (error) {
        console.error("Error crítico en listarSalidas:", error);
        return res.status(500).json({ error: 'Fallo interno en el servidor al consultar el libro de egresos.' });
    }
};

// ==========================================
// 🔍 7. OBTENER DETALLE ESPECÍFICO DE UNA SALIDA POR ID (SQL PURO - INMUNE A ERRORES)
// ==========================================
export const obtenerSalidaPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const idParseado = parseInt(id);

        if (isNaN(idParseado)) {
            return res.status(400).json({ error: "ID de movimiento inválido" });
        }

        // 1. Traer la cabecera de la salida usando SQL nativo directo sobre la tabla física
        const [movimientoBase] = await prisma.$queryRaw`
            SELECT 
                m.id,
                m.folio_documento_salida,
                m.fecha_movimiento as fecha_registro,
                m.quien_retira,
                m.identificador_destino_externo,
                m.motivo_operacion,
                b.nombre AS nombre_bodega_origen
            FROM movimientos m
            LEFT JOIN bodegas b ON m.bodega_origen_id = b.id
            WHERE m.id = ${idParseado}
            order by m.id asc
        `;

        if (!movimientoBase) {
            return res.status(404).json({ error: "El vale de salida no existe." });
        }

        // 2. Traer el desglose de artículos usando SQL nativo directo
        const detalles = await prisma.$queryRaw`
            SELECT
                dm.id,
                dm.cantidad,
                dm.precio_unitario_operacion,
                a.codigo_sku,
                a.nombre AS nombre_articulo
            FROM detalle_movimientos dm
            INNER JOIN articulos a ON dm.articulo_id = a.id
            WHERE dm.movimiento_id = ${idParseado}
            order by dm.id asc
        `;

        // 3. Mapear de forma limpia y plana los ítems del desglose
        const detalleFormateado = detalles.map(item => {
            const cant = parseInt(item.cantidad || 0);
            const precio = parseFloat(item.precio_unitario_operacion || 0);
            return {
                id: item.id,
                sku: item.codigo_sku || "N/A",
                descripcion: item.nombre_articulo || "Componente sin nombre",
                cantidad: cant,
                valor_ppp: precio,
                total: cant * precio
            };
        });

        // 4. Calcular el monto acumulado total bajo responsabilidad del técnico
        const montoTotal = detalleFormateado.reduce((acc, item) => acc + item.total, 0);

        // 5. Responder con la estructura unificada limpia
        return res.json({
            id: movimientoBase.id,
            folio: movimientoBase.folio_documento_salida || `OUT-CONF-${movimientoBase.id}`,
            fecha: movimientoBase.fecha_registro || new Date(),
            tecnico: movimientoBase.quien_retira ? String(movimientoBase.quien_retira).replace(/[()]/g, "").trim() : "No especificado",
            destino: movimientoBase.identificador_destino_externo || "General",
            motivo: movimientoBase.motivo_operacion ? String(movimientoBase.motivo_operacion).replace(/_/g, " ") : "PROYECTO",
            bodega_origen: movimientoBase.nombre_bodega_origen || "Bodega Central",
            detalle: detalleFormateado,
            monto_total: montoTotal
        });

    } catch (error) {
        console.error("🚨 Error crítico en obtenerSalidaPorId:", error);
        return res.status(500).json({
            error: "Fallo en el servidor al consolidar el vale de cargo.",
            details: error.message
        });
    }
};