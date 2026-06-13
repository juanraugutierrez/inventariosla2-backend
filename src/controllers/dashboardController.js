import prisma from '../config/prisma.js';

export const getDashboardData = async (req, res) => {
    try {
        // 1. Consulta Maestra de Valorización de Existencias Actuales
        const reporteInventario = await prisma.$queryRaw`
            SELECT 
                c.id AS Categoria_Id,
                c.nombre AS Categoria,
                SUM(sb.cantidad_unidades) AS Stock_Total_Global,
                SUM(sb.cantidad_unidades * a.precio_promedio) AS Valorizacion_Stock
            FROM articulos a
            INNER JOIN subcategorias s ON a.subcategoria_id = s.id
            INNER JOIN categorias c ON s.categoria_id = c.id
            LEFT JOIN stock_bodegas sb ON a.id = sb.articulo_id
            LEFT JOIN bodegas b ON sb.bodega_id = b.id
            WHERE b.activa = 1 OR sb.cantidad_unidades IS NULL
            GROUP BY c.id;
        `;

        // 2. Consulta Maestra de Flujos Históricos para KPIs de Operación en Terreno
        const flujosHistoricos = await prisma.$queryRaw`
            SELECT 
                m.tipo_movimiento,
                m.motivo_operacion,
                a.tipo_activo,
                SUM(dm.cantidad) AS Unidades_Movidas,
                SUM(dm.cantidad * dm.precio_unitario_operacion) AS Monto_Movido
            FROM detalle_movimientos dm
            INNER JOIN movimientos m ON dm.movimiento_id = m.id
            INNER JOIN articulos a ON dm.articulo_id = a.id
            GROUP BY m.tipo_movimiento, m.motivo_operacion, a.tipo_activo;
        `;

        // ⚡ 3. NUEVAS CONSULTAS: Métricas de Modelos de SKU e indexación por categoría
        // A. Conteo directo de SKUs únicos creados en el catálogo maestro
        const totalSkus = await prisma.articulo.count();

        // B. Distribución de cuántos SKUs pertenecen a cada categoría madre
        const conteoSkuPorCategoria = await prisma.$queryRaw`
            SELECT 
                c.nombre AS categoria,
                COUNT(a.id) AS cantidad
            FROM articulos a
            INNER JOIN subcategorias s ON a.subcategoria_id = s.id
            INNER JOIN categorias c ON s.categoria_id = c.id
            GROUP BY c.id;
        `;

        // Formatear la distribución de SKUs garantizando tipos numéricos limpios
        const distribucionSkuPorCategoria = conteoSkuPorCategoria.map(row => ({
            categoria: row.categoria || 'Sin Categoría',
            cantidad: parseInt(row.cantidad) || 0
        })).sort((a, b) => b.cantidad - a.cantidad);


        let stockMonetizado = 0;
        const stockByCategory = [];
        const unitsByCategory = [];

        // 4. Procesar inventario actual por categoría
        reporteInventario.forEach(fila => {
            const valor = parseFloat(fila.Valorizacion_Stock) || 0;
            const unidades = parseFloat(fila.Stock_Total_Global) || 0;
            const catNombre = fila.Categoria || 'General';

            stockMonetizado += valor;

            stockByCategory.push({ 
                name: catNombre, 
                valor: Math.round(valor) 
            });
            
            unitsByCategory.push({ 
                name: catNombre, 
                unidades: Math.round(unidades) 
            });
        });

        // 5. Inicializar y procesar contadores para KPIs de Servicios Servilift
        let consumoProyectos = 0;
        let emergenciasRepuestos = 0;
        let mantenimientoCorrectivo = 0;
        let herramientasEnTerreno = 0;

        flujosHistoricos.forEach(flow => {
            const monto = parseFloat(flow.Monto_Movido) || 0;
            const unidades = parseFloat(flow.Unidades_Movidas) || 0;
            const motivo = flow.motivo_operacion;
            const tipoMov = flow.tipo_movimiento;

            if (tipoMov === 'SALIDA') {
                if (motivo === 'PROYECTO') consumoProyectos += monto;
                if (motivo === 'EMERGENCIA') emergenciasRepuestos += monto;
                if (motivo === 'MANTENIMIENTO_CORRECTIVO') mantenimientoCorrectivo += monto;
                if (motivo === 'REPARACION_HERRAMIENTA') herramientasEnTerreno += unidades;
            }
        });

        // Distribución contable estándar basada en el catálogo cargado
        const activoFisico = stockMonetizado * 0.70;
        const activoCirculante = stockMonetizado * 0.30;

        // 6. Estructura de respuesta unificada para el Frontend
        return res.json({
            kpis: {
                stockMonetizado: Math.round(stockMonetizado),
                activoFisico: Math.round(activoFisico),
                activoCirculante: Math.round(activoCirculante),
                consumoProyectos: Math.round(consumoProyectos),
                emergenciasRepuestos: Math.round(emergenciasRepuestos),
                mantenimientoCorrectivo: Math.round(mantenimientoCorrectivo),
                herramientasEnTerreno: Math.round(herramientasEnTerreno), //
                
                // 🔑 NUEVO KPI NUMÉRICO ENVIADO AL FRONTEND:
                totalSkus: totalSkus 
            },
            stockMonetizadoPorCategoria: stockByCategory.sort((a, b) => b.valor - a.valor),
            unidadesPorCategoria: unitsByCategory.sort((a, b) => b.unidades - a.unidades),
            kpisGastosTerreno: [
                { name: 'Proyectos', monto: Math.round(consumoProyectos) },
                { name: 'Mantenimiento', monto: Math.round(mantenimientoCorrectivo) },
                { name: 'Emergencias', monto: Math.round(emergenciasRepuestos) } //
            ],
            
            // 🔑 NUEVO ARREGLO ENVIADO AL FRONTEND PARA LOS PORCENTAJES/TABLAS:
            distribucionSkuPorCategoria: distribucionSkuPorCategoria
        });

    } catch (error) {
        console.error("Error crítico en dashboardController:", error);
        return res.status(500).json({ 
            error: 'Fallo interno en el servidor al procesar la query consolidada de métricas.'
        });
    }
};