-- =====================================================================================
-- LUMICLASS · Fase 8 (placa ESP32) · Cambios para el hosting (ejecutar en phpMyAdmin)
--
-- Equivale a las migraciones:
--   database/migrations/2026_11_16_000001_create_placas_table.php
--   database/migrations/2026_11_16_000002_add_numero_en_placa_y_orden_codigo.php
--   · tabla placas: una placa por salón, clave guardada como hash SHA-256
--   · sensores y actuadores: numero_en_placa (1 = primer pin) y datos de la orden a confirmar
--
-- CÓMO USARLO
--   1. phpMyAdmin → elige la base de LUMICLASS (la del DB_DATABASE del .env del hosting).
--   2. Pestaña "SQL" → pega TODO este archivo → "Continuar".
--   3. Ejecútalo UNA SOLA VEZ, ANTES de subir los archivos de esta versión.
--      Si dice "Table 'placas' already exists" o "Duplicate column name", ya estaba aplicado.
--
-- Requiere MySQL 8 o MariaDB 10.2 o superior (usa ROW_NUMBER para numerar lo que ya existe).
-- Solo agrega estructura y numera sensores/servos existentes: no borra datos.
-- =====================================================================================

SET NAMES utf8mb4;

-- 1) Placas -------------------------------------------------------------------------
CREATE TABLE `placas` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `salon_id` BIGINT UNSIGNED NOT NULL,
    `clave_hash` CHAR(64) NOT NULL,
    `en_linea` TINYINT(1) NOT NULL DEFAULT 0,
    `ultimo_contacto` TIMESTAMP NULL,
    `ip` VARCHAR(45) NULL,
    `version_firmware` VARCHAR(20) NULL,
    `created_at` TIMESTAMP NULL,
    `updated_at` TIMESTAMP NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `placas_salon_id_unique` (`salon_id`),
    UNIQUE KEY `placas_clave_hash_unique` (`clave_hash`),
    CONSTRAINT `placas_salon_id_foreign`
        FOREIGN KEY (`salon_id`) REFERENCES `salones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Número en la placa y orden por confirmar ------------------------------------------
ALTER TABLE `sensores`
    ADD COLUMN `numero_en_placa` TINYINT UNSIGNED NULL AFTER `tipo`;

ALTER TABLE `actuadores`
    ADD COLUMN `numero_en_placa` TINYINT UNSIGNED NULL AFTER `nombre`,
    ADD COLUMN `orden_codigo` VARCHAR(16) NULL AFTER `orden_iniciada_en`,
    ADD COLUMN `confirmacion_resultado` VARCHAR(10) NULL AFTER `orden_codigo`,
    ADD COLUMN `confirmacion_mensaje` VARCHAR(200) NULL AFTER `confirmacion_resultado`;

-- 3) Numera lo que ya existe: 1, 2, 3… por salón, en el orden en que se creó -----------
UPDATE `actuadores` a
JOIN (
    SELECT `id`, ROW_NUMBER() OVER (PARTITION BY `salon_id` ORDER BY `id`) AS `n`
    FROM `actuadores`
) t ON t.`id` = a.`id`
SET a.`numero_en_placa` = t.`n`;

UPDATE `sensores` s
JOIN (
    SELECT se.`id`, ROW_NUMBER() OVER (PARTITION BY z.`salon_id` ORDER BY se.`id`) AS `n`
    FROM `sensores` se
    JOIN `zonas` z ON z.`id` = se.`zona_id`
) t ON t.`id` = s.`id`
SET s.`numero_en_placa` = t.`n`;

-- 4) Que Laravel sepa que las migraciones ya se aplicaron ---------------------------------
INSERT INTO `migrations` (`migration`, `batch`)
SELECT m.`migration`, (SELECT COALESCE(MAX(`batch`), 0) + 1 FROM `migrations`)
FROM (
    SELECT '2026_11_16_000001_create_placas_table' AS `migration`
    UNION ALL SELECT '2026_11_16_000002_add_numero_en_placa_y_orden_codigo'
) m;
