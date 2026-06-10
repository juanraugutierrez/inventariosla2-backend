/*
  Warnings:

  - You are about to drop the `bodega` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `categoria` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `existencia` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `producto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `transaccion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `bodega` DROP FOREIGN KEY `Bodega_encargadoId_fkey`;

-- DropForeignKey
ALTER TABLE `existencia` DROP FOREIGN KEY `Existencia_bodegaId_fkey`;

-- DropForeignKey
ALTER TABLE `existencia` DROP FOREIGN KEY `Existencia_productoId_fkey`;

-- DropForeignKey
ALTER TABLE `producto` DROP FOREIGN KEY `Producto_categoriaId_fkey`;

-- DropForeignKey
ALTER TABLE `producto` DROP FOREIGN KEY `Producto_proveedorId_fkey`;

-- DropForeignKey
ALTER TABLE `transaccion` DROP FOREIGN KEY `Transaccion_destinoBodegaId_fkey`;

-- DropForeignKey
ALTER TABLE `transaccion` DROP FOREIGN KEY `Transaccion_origenBodegaId_fkey`;

-- DropForeignKey
ALTER TABLE `transaccion` DROP FOREIGN KEY `Transaccion_productoId_fkey`;

-- DropForeignKey
ALTER TABLE `transaccion` DROP FOREIGN KEY `Transaccion_quienEntregaId_fkey`;

-- DropForeignKey
ALTER TABLE `transaccion` DROP FOREIGN KEY `Transaccion_quienRecibeId_fkey`;

-- DropTable
DROP TABLE `bodega`;

-- DropTable
DROP TABLE `categoria`;

-- DropTable
DROP TABLE `existencia`;

-- DropTable
DROP TABLE `producto`;

-- DropTable
DROP TABLE `transaccion`;

-- DropTable
DROP TABLE `user`;

-- CreateTable
CREATE TABLE `perfiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(50) NOT NULL,
    `descripcion` VARCHAR(255) NULL,
    `permiso_crear_bodega` BOOLEAN NOT NULL DEFAULT false,
    `permiso_ingresar_stock` BOOLEAN NOT NULL DEFAULT false,
    `permiso_retirar_stock` BOOLEAN NOT NULL DEFAULT false,
    `permiso_ver_informes` BOOLEAN NOT NULL DEFAULT false,
    `creado_en` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `nombre`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rut_o_documento` VARCHAR(20) NOT NULL,
    `nombre_completo` VARCHAR(150) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `perfil_id` INTEGER NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creado_en` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `rut_o_documento`(`rut_o_documento`),
    UNIQUE INDEX `email`(`email`),
    INDEX `perfil_id`(`perfil_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `articulos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo_sku` VARCHAR(50) NOT NULL,
    `nombre` VARCHAR(150) NOT NULL,
    `descripcion` TEXT NULL,
    `url_foto` LONGTEXT NULL,
    `subcategoria_id` INTEGER NOT NULL,
    `tipo_activo` ENUM('ACTIVO_FIJO', 'ACTIVO_CIRCULANTE') NOT NULL,
    `precio_promedio` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `creado_en` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `actualizado_en` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `codigo_sku`(`codigo_sku`),
    INDEX `idx_articulos_activo`(`tipo_activo`),
    INDEX `idx_articulos_nombre`(`nombre`),
    INDEX `subcategoria_id`(`subcategoria_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bodegas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `direccion` VARCHAR(255) NULL,
    `es_central` BOOLEAN NOT NULL DEFAULT false,
    `responsable_id` INTEGER NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `creado_en` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `actualizado_en` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `nombre`(`nombre`),
    INDEX `responsable_id`(`responsable_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categorias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` TEXT NULL,
    `creado_en` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `nombre`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `detalle_movimientos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `movimiento_id` INTEGER NOT NULL,
    `articulo_id` INTEGER NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `precio_unitario_operacion` DECIMAL(12, 2) NOT NULL,

    INDEX `idx_detalle_articulo`(`articulo_id`),
    INDEX `movimiento_id`(`movimiento_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documentos_soporte` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo_documento` ENUM('FACTURA', 'ORDEN_COMPRA', 'BOLETA', 'VALE') NOT NULL,
    `numero_documento` VARCHAR(50) NOT NULL,
    `fecha_emision` DATE NOT NULL,
    `proveedor_o_emisor` VARCHAR(150) NULL,
    `creado_en` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uq_tipo_numero`(`tipo_documento`, `numero_documento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movimientos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo_movimiento` ENUM('ENTRADA', 'SALIDA', 'TRASPASO') NOT NULL,
    `bodega_origen_id` INTEGER NULL,
    `bodega_destino_id` INTEGER NULL,
    `documento_soporte_id` INTEGER NULL,
    `responsable_id` INTEGER NOT NULL,
    `fecha_movimiento` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `observaciones` TEXT NULL,

    INDEX `bodega_destino_id`(`bodega_destino_id`),
    INDEX `bodega_origen_id`(`bodega_origen_id`),
    INDEX `documento_soporte_id`(`documento_soporte_id`),
    INDEX `idx_movimientos_fecha`(`fecha_movimiento`),
    INDEX `responsable_id`(`responsable_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_bodegas` (
    `bodega_id` INTEGER NOT NULL,
    `articulo_id` INTEGER NOT NULL,
    `cantidad_unidades` INTEGER NOT NULL DEFAULT 0,

    INDEX `articulo_id`(`articulo_id`),
    PRIMARY KEY (`bodega_id`, `articulo_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subcategorias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `categoria_id` INTEGER NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` TEXT NULL,
    `creado_en` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uq_cat_subcat`(`categoria_id`, `nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`perfil_id`) REFERENCES `perfiles`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `articulos` ADD CONSTRAINT `articulos_ibfk_1` FOREIGN KEY (`subcategoria_id`) REFERENCES `subcategorias`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `bodegas` ADD CONSTRAINT `bodegas_ibfk_1` FOREIGN KEY (`responsable_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `detalle_movimientos` ADD CONSTRAINT `detalle_movimientos_ibfk_1` FOREIGN KEY (`movimiento_id`) REFERENCES `movimientos`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `detalle_movimientos` ADD CONSTRAINT `detalle_movimientos_ibfk_2` FOREIGN KEY (`articulo_id`) REFERENCES `articulos`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `movimientos` ADD CONSTRAINT `movimientos_ibfk_1` FOREIGN KEY (`bodega_origen_id`) REFERENCES `bodegas`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `movimientos` ADD CONSTRAINT `movimientos_ibfk_2` FOREIGN KEY (`bodega_destino_id`) REFERENCES `bodegas`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `movimientos` ADD CONSTRAINT `movimientos_ibfk_3` FOREIGN KEY (`documento_soporte_id`) REFERENCES `documentos_soporte`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `movimientos` ADD CONSTRAINT `movimientos_ibfk_4` FOREIGN KEY (`responsable_id`) REFERENCES `usuarios`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_bodegas` ADD CONSTRAINT `stock_bodegas_ibfk_1` FOREIGN KEY (`bodega_id`) REFERENCES `bodegas`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_bodegas` ADD CONSTRAINT `stock_bodegas_ibfk_2` FOREIGN KEY (`articulo_id`) REFERENCES `articulos`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `subcategorias` ADD CONSTRAINT `subcategorias_ibfk_1` FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
