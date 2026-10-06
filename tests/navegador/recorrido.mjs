// Recorrido de LUMICLASS en un navegador real (Edge o Chrome ya instalados; no descarga nada).
// Requisitos: servidor encendido (php artisan serve --port=8001) y la cuenta demo (php artisan migrate --seed).
// Uso: npm run prueba:navegador      (LUMICLASS_URL=http://otra:puerto para otro servidor)
// Ojo: modifica el salón demo (reinicia el simulador, crea una regla y una cuenta nueva).
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE = process.env.LUMICLASS_URL ?? 'http://localhost:8001';
const CAPTURAS = join(dirname(fileURLToPath(import.meta.url)), 'capturas');
const NAVEGADORES = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/microsoft-edge',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

const problemas = [];
let paso = 0;

async function etapa(nombre, accion) {
    paso++;
    try {
        await accion();
        console.log(`✔ ${paso}. ${nombre}`);
    } catch (error) {
        problemas.push(`${paso}. ${nombre}: ${error.message.split('\n')[0]}`);
        console.log(`✘ ${paso}. ${nombre}`);
    }
}

function vigilar(pagina, nombre) {
    pagina.on('pageerror', (e) => problemas.push(`[${nombre}] error de JavaScript: ${e.message}`));
    pagina.on('response', (r) => r.status() >= 500 && problemas.push(`[${nombre}] HTTP ${r.status()} ${r.url()}`));
}

async function revisarCelular(pagina, nombre) {
    const medida = await pagina.evaluate(() => ({
        scroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        chicos: [...document.querySelectorAll('button, a, select, input')]
            .filter((el) => el.offsetParent && el.type !== 'checkbox' && el.getBoundingClientRect().height < 44)
            .map((el) => (el.innerText || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30)),
    }));
    if (medida.scroll) problemas.push(`[${nombre}] scroll horizontal en celular`);
    if (medida.chicos.length) problemas.push(`[${nombre}] botones de menos de 44 px: ${medida.chicos.join(', ')}`);
    await pagina.screenshot({ path: join(CAPTURAS, `${nombre}.png`), fullPage: true });
}

const ejecutable = NAVEGADORES.find(existsSync);
if (!ejecutable) {
    console.error('No encontré Edge ni Chrome. Instala uno de los dos.');
    process.exit(1);
}
try {
    await fetch(`${BASE}/api/v1/salud`);
} catch {
    console.error(`No hay servidor en ${BASE}. Enciéndelo con: php artisan serve --port=8001`);
    process.exit(1);
}

mkdirSync(CAPTURAS, { recursive: true });
const navegador = await chromium.launch({ executablePath: ejecutable, headless: true });
const celular = await navegador.newContext({ viewport: { width: 375, height: 812 } });
const p = await celular.newPage();
vigilar(p, 'celular');
let salon = '';

await etapa('Ingresar: error en español con contraseña mala', async () => {
    await p.goto(`${BASE}/ingresar`);
    await p.fill('input[type=email]', 'demo@lumiclass.test');
    await p.fill('input[type=password]', 'mala-clave');
    await p.click('button[type=submit]');
    await p.getByText('Correo o contraseña incorrectos.').waitFor({ timeout: 5000 });
});

await etapa('Ingresar con la cuenta demo', async () => {
    await p.fill('input[type=password]', 'demo12345');
    await p.click('button[type=submit]');
    await p.waitForURL('**/salones', { timeout: 5000 });
    salon = BASE + (await p.locator('a', { hasText: 'Abrir' }).first().getAttribute('href'));
    await revisarCelular(p, 'mis-salones');
});

await etapa('Simulador: reiniciar y "Entra gente" enciende las luces por regla', async () => {
    await p.goto(`${salon}/simulador`);
    p.once('dialog', (d) => d.accept());
    await p.getByRole('button', { name: 'Reiniciar' }).click();
    await p.getByText('Escenario reiniciado.').waitFor({ timeout: 5000 });
    await p.getByRole('button', { name: 'Entra gente' }).click();
    await p.getByText(/sensor\(es\) actualizados/).waitFor({ timeout: 5000 });
    await revisarCelular(p, 'simulador');
    await p.goto(salon);
    await p.getByText('4/4').waitFor({ timeout: 8000 });
    await revisarCelular(p, 'inicio');
});

await etapa('Control: apagar una luz a mano pasa la zona a manual', async () => {
    await p.goto(`${salon}/control`);
    await p.getByRole('button', { name: 'Apagar Luz frontal izquierda' }).click();
    await p.getByText('"Luz frontal izquierda" apagada.').waitFor({ timeout: 5000 });
    await revisarCelular(p, 'control');
});

await etapa('Servo en falla: la luz queda "Desconocido" y aparece la alerta', async () => {
    await p.goto(`${salon}/simulador`);
    await p.locator('select[id^="sim-resp-"]').first().selectOption('falla');
    await p.waitForTimeout(600);
    await p.goto(`${salon}/control`);
    await p.getByRole('button', { name: 'Encender Luz frontal izquierda' }).click();
    await p.getByText(/no logró mover el interruptor/).first().waitFor({ timeout: 5000 });
    await p.goto(salon);
    await p.getByText('Requiere atención').waitFor({ timeout: 5000 });
    // Deja el servo bien para la próxima vez.
    await p.goto(`${salon}/simulador`);
    await p.locator('select[id^="sim-resp-"]').first().selectOption('ok');
    await p.waitForTimeout(600);
});

await etapa('Sensores', async () => {
    await p.goto(`${salon}/sensores`);
    await p.getByText('Sensor PIR 1').waitFor({ timeout: 5000 });
    await revisarCelular(p, 'sensores');
});

await etapa('Reglas: validación en español y crear una regla', async () => {
    await p.goto(`${salon}/reglas`);
    await p.getByRole('button', { name: 'Nueva regla' }).click();
    await p.getByRole('button', { name: 'Guardar' }).click();
    await p.locator('.error-campo', { hasText: 'obligatorio' }).first().waitFor({ timeout: 5000 });
    const nombre = `Prueba ${Date.now()}`;
    await p.getByLabel('Nombre').fill(nombre);
    await p.getByRole('button', { name: 'Guardar' }).click();
    await p.getByText(nombre).waitFor({ timeout: 5000 });
    await revisarCelular(p, 'reglas');
});

await etapa('Historial y descarga CSV', async () => {
    await p.goto(`${salon}/historial`);
    await p.getByText(/Orden "apagar"/).first().waitFor({ timeout: 5000 });
    const [descarga] = await Promise.all([p.waitForEvent('download'), p.getByRole('link', { name: 'Descargar CSV' }).click()]);
    if (!descarga.suggestedFilename().endsWith('.csv')) throw new Error('la descarga no es un CSV');
    await revisarCelular(p, 'historial');
});

await etapa('Estadísticas', async () => {
    await p.goto(`${salon}/estadisticas`);
    await p.getByText('Tiempo encendida por luz').waitFor({ timeout: 5000 });
    await revisarCelular(p, 'estadisticas');
});

await etapa('Servidor caído: "Datos desactualizados" y luego "Conexión recuperada"', async () => {
    await p.goto(salon);
    await p.getByText('Luces encendidas').waitFor({ timeout: 5000 });
    await p.route('**/api/v1/**', (ruta) => ruta.abort('connectionrefused'));
    await p.getByText(/Datos desactualizados/).waitFor({ timeout: 15000 });
    await p.unroute('**/api/v1/**');
    await p.getByText('Conexión recuperada. Los datos están al día.').waitFor({ timeout: 20000 });
});

await etapa('Página 404 en español', async () => {
    await p.goto(`${BASE}/salones/999999`);
    await p.getByText('Página no encontrada').waitFor({ timeout: 5000 });
});

await etapa('Escritorio (1280 px): barra lateral con Estadísticas', async () => {
    const escritorio = await navegador.newContext({ viewport: { width: 1280, height: 800 } });
    await escritorio.addCookies(await celular.cookies());
    const e = await escritorio.newPage();
    vigilar(e, 'escritorio');
    await e.goto(`${salon}/control`);
    await e.getByRole('navigation', { name: 'Secciones del salón' }).getByRole('link', { name: 'Estadísticas' }).waitFor({ timeout: 5000 });
    await e.screenshot({ path: join(CAPTURAS, 'escritorio-control.png'), fullPage: true });
});

await etapa('Registro de una cuenta nueva y salir', async () => {
    const nuevo = await navegador.newContext({ viewport: { width: 375, height: 812 } });
    const r = await nuevo.newPage();
    vigilar(r, 'registro');
    await r.goto(`${BASE}/registro`);
    await r.getByLabel('Nombre').fill('Cuenta de prueba');
    await r.getByLabel('Correo').fill(`prueba${Date.now()}@ejemplo.com`);
    await r.getByLabel('Contraseña (mínimo 8 caracteres)').fill('secreta123');
    await r.getByLabel('Repite la contraseña').fill('secreta123');
    await r.getByRole('button', { name: 'Crear cuenta' }).click();
    await r.waitForURL(/\/salones\/\d+$/, { timeout: 5000 });
    await r.getByRole('button', { name: 'Salir' }).click();
    await r.waitForURL('**/ingresar', { timeout: 5000 });
});

await navegador.close();

console.log(`\nCapturas en ${CAPTURAS}`);
if (problemas.length) {
    console.log(`\n${problemas.length} problema(s):\n- ${problemas.join('\n- ')}`);
    process.exit(1);
}
console.log('\nTodo bien: ningún problema.');
