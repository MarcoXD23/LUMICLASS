// Ejecuta "vitest run" con la letra de unidad en mayúscula (c:\ → C:\).
// En Windows, si la terminal abre la carpeta como "c:\...", Node carga el motor de Vitest dos veces
// (file:///c:/… y file:///C:/…) y todas las pruebas fallan con "reading 'config'". Ver docs/PRUEBAS.md.
import { spawnSync } from 'node:child_process';

const carpeta = process.cwd().replace(/^[a-z]:/, (unidad) => unidad.toUpperCase());

const { status } = spawnSync('npx', ['vitest', 'run', ...process.argv.slice(2)], {
    cwd: carpeta,
    stdio: 'inherit',
    shell: process.platform === 'win32',
});

process.exit(status ?? 1);
