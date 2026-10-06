# LUMICLASS

Sistema inteligente de control y monitoreo de iluminación de un salón de clases.

Aplicación web que muestra si el salón está ocupado o vacío, controla las luces (manual o automático) y registra el historial, usando sensores y servomotores. Funciona primero con hardware simulado.

**Equipo:** Camilo, Marcos y Sofía.

> ⚠️ **Seguridad eléctrica:** los servomotores **solo accionan el interruptor de pared de forma mecánica**. **Nunca** se conectan a la corriente de red (110/220 V). La placa y los servos usan su propia fuente de 5 V.

## Requisitos

- [Node.js](https://nodejs.org/) 20.12 o superior (incluye npm). Probado en Windows 11 con Node 24.
- Git.

## Instalación (Windows, macOS o Linux)

```
git clone https://github.com/MarcoXD23/LUMICLASS.git
cd LUMICLASS
npm install
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3000/api/v1/salud

La página debe mostrar **"API: conectada"**. Para cambiar puerto o driver, copia `apps/backend/.env.example` como `apps/backend/.env` (es opcional; sin él se usan los valores por defecto).

## Scripts

| Comando             | Qué hace                                                     |
| ------------------- | ------------------------------------------------------------ |
| `npm run dev`       | Levanta backend y frontend juntos (Ctrl+C detiene ambos)     |
| `npm test`          | Ejecuta las pruebas de todos los paquetes                    |
| `npm run lint`      | Revisa el código con ESLint                                  |
| `npm run typecheck` | Revisa los tipos de TypeScript                               |
| `npm run build`     | Compila backend y frontend en `dist/`                        |
| `npm run format`    | Formatea el código con Prettier                              |
| `npm run verificar` | Lint + formato + tipos + pruebas + compilación (antes de PR) |

## Estructura

```
apps/backend         API (Fastify + TypeScript)
apps/frontend        Interfaz web (React + Vite + Tailwind)
packages/compartido  Tipos y esquemas compartidos
firmware/            Código de la placa (Fase 8)
docs/                Arquitectura y documentación
diseno/              Referencia de Figma
```

La arquitectura completa está en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md). Las reglas de trabajo están en [CLAUDE.md](CLAUDE.md).

**Estado:** Fase 3 completada (estructura inicial).
