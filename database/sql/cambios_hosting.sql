-- =====================================================================================
-- LUMICLASS · Cambios para el hosting (InfinityFree no tiene terminal: ejecutar en phpMyAdmin)
--
-- Equivale a la migración: database/migrations/2026_10_13_000001_add_correo_alternativo_y_codigos.php
--   · users: correo alternativo (formas 2 y 3 de recuperar la contraseña)
--   · tabla codigos_verificacion: códigos de 6 dígitos guardados con hash
--
-- CÓMO USARLO
--   1. phpMyAdmin → elige la base de LUMICLASS (la del DB_DATABASE del .env del hosting).
--   2. Pestaña "SQL" → pega TODO este archivo → "Continuar".
--   3. Ejecútalo UNA SOLA VEZ. Si dice "Duplicate column name 'correo_alternativo'", ya estaba aplicado.
--
-- Solo estructura: no borra ni modifica datos existentes.
-- =====================================================================================

SET NAMES utf8mb4;

-- 1) Correo alternativo en las cuentas ------------------------------------------------
ALTER TABLE `users`
    ADD COLUMN `correo_alternativo` VARCHAR(255) NULL AFTER `email`,
    ADD COLUMN `correo_alternativo_verificado_en` TIMESTAMP NULL AFTER `correo_alternativo`,
    ADD COLUMN `correo_alternativo_pendiente` VARCHAR(255) NULL AFTER `correo_alternativo_verificado_en`,
    ADD UNIQUE KEY `users_correo_alternativo_unique` (`correo_alternativo`);

-- 2) Códigos de 6 dígitos (uno activo por cuenta y propósito) -------------------------
CREATE TABLE `codigos_verificacion` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `proposito` VARCHAR(30) NOT NULL,
    `destino` VARCHAR(255) NOT NULL,
    `codigo_hash` VARCHAR(255) NOT NULL,
    `expira_en` TIMESTAMP NOT NULL,
    `created_at` TIMESTAMP NULL,
    `updated_at` TIMESTAMP NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `codigos_verificacion_user_id_proposito_unique` (`user_id`, `proposito`),
    CONSTRAINT `codigos_verificacion_user_id_foreign`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) Avisarle a Laravel que esta migración ya está aplicada (para que no intente repetirla)
INSERT INTO `migrations` (`migration`, `batch`)
SELECT '2026_10_13_000001_add_correo_alternativo_y_codigos', IFNULL(MAX(`batch`), 0) + 1 FROM `migrations`;
