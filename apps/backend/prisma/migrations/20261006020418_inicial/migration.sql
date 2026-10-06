-- CreateTable
CREATE TABLE "Salon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Zona" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salonId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "modo" TEXT NOT NULL DEFAULT 'automatico',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "actualizadoEn" DATETIME NOT NULL,
    CONSTRAINT "Zona_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Actuador" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "conexion" TEXT NOT NULL DEFAULT 'activo',
    "ocupado" BOOLEAN NOT NULL DEFAULT false,
    "ultimoResultado" TEXT,
    "actualizadoEn" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Luz" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "zonaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estadoDeseado" TEXT NOT NULL DEFAULT 'off',
    "estadoReal" TEXT NOT NULL DEFAULT 'desconocido',
    "actuadorId" TEXT NOT NULL,
    "actualizadoEn" DATETIME NOT NULL,
    CONSTRAINT "Luz_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "Zona" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Luz_actuadorId_fkey" FOREIGN KEY ("actuadorId") REFERENCES "Actuador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sensor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "zonaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'pir',
    "conexion" TEXT NOT NULL DEFAULT 'activo',
    "presencia" BOOLEAN NOT NULL DEFAULT false,
    "conteoPersonas" INTEGER,
    "ultimaLectura" DATETIME,
    "actualizadoEn" DATETIME NOT NULL,
    CONSTRAINT "Sensor_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "Zona" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Regla" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "prioridad" INTEGER NOT NULL DEFAULT 100,
    "zonaId" TEXT,
    "condicion" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL,
    CONSTRAINT "Regla_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "Zona" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Evento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL,
    "origen" TEXT NOT NULL,
    "severidad" TEXT NOT NULL DEFAULT 'info',
    "entidad" TEXT,
    "entidadId" TEXT,
    "mensaje" TEXT NOT NULL,
    "datos" TEXT NOT NULL DEFAULT '{}'
);

-- CreateTable
CREATE TABLE "SolicitudProcesada" (
    "idSolicitud" TEXT NOT NULL PRIMARY KEY,
    "ruta" TEXT NOT NULL,
    "codigoEstado" INTEGER NOT NULL,
    "respuesta" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Zona_salonId_idx" ON "Zona"("salonId");

-- CreateIndex
CREATE UNIQUE INDEX "Luz_actuadorId_key" ON "Luz"("actuadorId");

-- CreateIndex
CREATE INDEX "Luz_zonaId_idx" ON "Luz"("zonaId");

-- CreateIndex
CREATE INDEX "Sensor_zonaId_idx" ON "Sensor"("zonaId");

-- CreateIndex
CREATE UNIQUE INDEX "Regla_nombre_key" ON "Regla"("nombre");

-- CreateIndex
CREATE INDEX "Evento_fecha_idx" ON "Evento"("fecha");

-- CreateIndex
CREATE INDEX "Evento_tipo_fecha_idx" ON "Evento"("tipo", "fecha");
