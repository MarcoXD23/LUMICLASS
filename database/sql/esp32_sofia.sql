-- =====================================================================================
-- LUMICLASS · ESP32 con relé (diseño definitivo) · cambios para el hosting sin terminal
--
-- Equivale a estas migraciones:
--   2026_11_16_000001_add_direccion_esp32_a_actuadores
--   2026_11_16_000002_add_clave_dispositivo_a_actuadores
--   2026_11_18_000001_quitar_placa_del_salon (y marca como aplicadas las dos de la Fase 8 que esa limpia)
--
-- CÓMO USARLO
--   1. Antes, debe estar aplicado cambios_hosting.sql (correo alternativo y códigos).
--   2. phpMyAdmin → la base de LUMICLASS (la del DB_DATABASE del .env del hosting) → pestaña "SQL".
--   3. Pega la PARTE 1 → "Continuar". Ejecútala UNA sola vez.
--      Si dice "Duplicate column name 'direccion'", ya estaba aplicada: no la repitas.
--   4. La PARTE 2 SOLO si alguna vez corriste fase8_placa.sql en este hosting.
--
-- Solo estructura: no borra datos de usuarios, salones, luces ni historial.
-- =====================================================================================

SET NAMES utf8mb4;

-- ===================================== PARTE 1 ======================================

-- 1) Columnas del ESP32 en cada luz (actuador) --------------------------------------------
ALTER TABLE `actuadores`
    ADD COLUMN `direccion` VARCHAR(120) NULL AFTER `nombre`,
    ADD COLUMN `ultima_respuesta_en` TIMESTAMP NULL DEFAULT NULL AFTER `ultimo_resultado`;

ALTER TABLE `actuadores`
    ADD COLUMN `clave_hash` VARCHAR(64) NULL AFTER `direccion`,
    ADD COLUMN `estado_reportado` TINYINT(1) NULL AFTER `ultima_respuesta_en`,
    ADD UNIQUE KEY `actuadores_clave_hash_unique` (`clave_hash`);

-- 2) Avisarle a Laravel qué migraciones ya están aplicadas (para que no intente repetirlas) --
INSERT INTO `migrations` (`migration`, `batch`)
SELECT m.nombre, (SELECT IFNULL(MAX(`batch`), 0) + 1 FROM `migrations`)
FROM (
    SELECT '2026_11_16_000001_add_direccion_esp32_a_actuadores' AS nombre
    UNION ALL SELECT '2026_11_16_000001_create_placas_table'
    UNION ALL SELECT '2026_11_16_000002_add_clave_dispositivo_a_actuadores'
    UNION ALL SELECT '2026_11_16_000002_add_numero_en_placa_y_orden_codigo'
    UNION ALL SELECT '2026_11_18_000001_quitar_placa_del_salon'
) AS m
WHERE NOT EXISTS (SELECT 1 FROM `migrations` x WHERE x.`migration` = m.nombre);

-- ===================================== PARTE 2 ======================================
-- SOLO si corriste fase8_placa.sql en este hosting. Si no, NO la ejecutes (daría error).
--
-- DROP TABLE IF EXISTS `placas`;
-- ALTER TABLE `actuadores`
--     DROP COLUMN `numero_en_placa`,
--     DROP COLUMN `orden_codigo`,
--     DROP COLUMN `confirmacion_resultado`,
--     DROP COLUMN `confirmacion_mensaje`;
-- ALTER TABLE `sensores` DROP COLUMN `numero_en_placa`;
