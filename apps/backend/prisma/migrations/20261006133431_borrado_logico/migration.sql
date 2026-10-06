-- DropIndex
DROP INDEX "Regla_nombre_key";

-- AlterTable
ALTER TABLE "Actuador" ADD COLUMN "inactivadoPorId" TEXT;
ALTER TABLE "Actuador" ADD COLUMN "inactivoDesde" DATETIME;

-- AlterTable
ALTER TABLE "Luz" ADD COLUMN "inactivadoPorId" TEXT;
ALTER TABLE "Luz" ADD COLUMN "inactivoDesde" DATETIME;

-- AlterTable
ALTER TABLE "Regla" ADD COLUMN "inactivadoPorId" TEXT;
ALTER TABLE "Regla" ADD COLUMN "inactivoDesde" DATETIME;

-- AlterTable
ALTER TABLE "Sensor" ADD COLUMN "inactivadoPorId" TEXT;
ALTER TABLE "Sensor" ADD COLUMN "inactivoDesde" DATETIME;

-- AlterTable
ALTER TABLE "SolicitudProcesada" ADD COLUMN "vencidaEn" DATETIME;

-- AlterTable
ALTER TABLE "Zona" ADD COLUMN "inactivadoPorId" TEXT;
ALTER TABLE "Zona" ADD COLUMN "inactivoDesde" DATETIME;

-- CreateTable
CREATE TABLE "VersionRegistro" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "datos" TEXT NOT NULL,
    "reemplazadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reemplazadoPorId" TEXT
);

-- CreateIndex
CREATE INDEX "VersionRegistro_entidad_entidadId_idx" ON "VersionRegistro"("entidad", "entidadId");
