{{-- Configurar salón → Conectar placa (Fase 8). Guía completa: docs/HARDWARE.md --}}
<section id="conectar-placa" x-data="conectarPlaca({{ $salon->id }})" class="tarjeta space-y-4" aria-labelledby="titulo-conectar-placa">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 id="titulo-conectar-placa" class="flex items-center gap-2 text-lg font-semibold">
            <x-icono nombre="enlace" /> Conectar placa
        </h2>
        <template x-if="datos">
            <span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium"
                :class="datos.placa.en_linea ? 'bg-ocupado-suave text-ocupado-texto' : 'bg-slate-100 text-slate-600'">
                <span class="size-2 rounded-full bg-current"></span>
                <span x-text="datos.placa.en_linea ? 'En línea' : (datos.placa.configurada ? 'Desconectada' : 'Sin configurar')"></span>
            </span>
        </template>
    </div>

    <p x-show="error" x-text="error" x-cloak role="alert" class="rounded-xl bg-error-suave p-3 text-sm text-error-texto"></p>

    <template x-if="datos">
        <div class="space-y-4">
            <p x-show="datos.driver !== 'real'" class="flex items-start gap-2 rounded-xl bg-aviso-suave p-3 text-sm text-aviso-texto">
                <x-icono nombre="alerta" clase="size-4 mt-0.5 shrink-0" />
                <span>El sistema está en modo simulado. Para usar la placa, pon <code>LUMICLASS_DRIVER=real</code> en el archivo
                    <code>.env</code> y reinicia el servidor.</span>
            </p>

            <p class="text-sm text-slate-600" x-show="datos.placa.ultimo_contacto">
                Último contacto <span x-text="hace(datos.placa.ultimo_contacto)"></span>
                <span x-show="datos.placa.ip" x-text="`desde ${datos.placa.ip}`"></span>
                <span x-show="datos.placa.version_firmware" x-text="`· firmware ${datos.placa.version_firmware}`"></span>.
            </p>

            {{-- 1. Dirección del servidor --}}
            <div>
                <h3 class="titulo-seccion mb-2">1. Dirección de este computador en la red</h3>
                <p class="mb-2 text-sm text-slate-600">La placa debe estar en el <strong>mismo WiFi</strong> que este computador.
                    Usa la marcada como WiFi.</p>
                <ul class="space-y-2">
                    <template x-for="direccion in datos.direcciones" :key="direccion.ip">
                        <li>
                            <label class="flex cursor-pointer items-center gap-3 rounded-xl bg-slate-50 p-3">
                                <input type="radio" name="servidor-placa" :value="direccion.servidor" x-model="servidor" class="size-4">
                                <span class="min-w-0 flex-1">
                                    <span class="block font-mono font-medium" x-text="direccion.servidor"></span>
                                    <span class="block truncate text-xs text-slate-500" x-text="direccion.adaptador"></span>
                                </span>
                                <span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                                    :class="{
                                        'bg-ocupado-suave text-ocupado-texto': direccion.tipo === 'wifi',
                                        'bg-slate-200 text-slate-700': direccion.tipo === 'cableada',
                                        'bg-aviso-suave text-aviso-texto': direccion.tipo === 'virtual',
                                    }"
                                    x-text="{ wifi: 'WiFi', cableada: 'Cable', virtual: 'Virtual (no usar)' }[direccion.tipo]"></span>
                            </label>
                        </li>
                    </template>
                    <li x-show="!datos.direcciones.length" class="rounded-xl bg-aviso-suave p-3 text-sm text-aviso-texto">
                        No se encontró ninguna red. Conecta el computador al WiFi y recarga la página.
                    </li>
                </ul>
            </div>

            {{-- 2. Clave --}}
            <div>
                <h3 class="titulo-seccion mb-2">2. Clave de la placa</h3>
                <template x-if="!clave">
                    <div class="space-y-2">
                        <p class="text-sm text-slate-600" x-text="datos.placa.configurada
                            ? 'La clave ya se generó y no se puede volver a ver (solo se guarda cifrada). Si la perdiste, genera otra.'
                            : 'Genera la clave que la placa usará para identificarse con este salón.'"></p>
                        <button type="button" class="btn btn-primario" :disabled="trabajando" @click="generar"
                            x-text="datos.placa.configurada ? 'Generar clave nueva' : 'Generar clave'"></button>
                    </div>
                </template>

                <template x-if="clave">
                    <div class="grid gap-4 md:grid-cols-[auto_1fr] md:items-start">
                        <img class="mx-auto w-56 rounded-xl border bg-white [image-rendering:pixelated]" :src="qr"
                            alt="Código QR con la dirección del servidor y la clave de la placa">
                        <div class="space-y-3 text-sm">
                            <p class="flex items-start gap-2 rounded-xl bg-aviso-suave p-3 text-aviso-texto">
                                <x-icono nombre="alerta" clase="size-4 mt-0.5 shrink-0" />
                                Se muestra una sola vez. Escanéala o cópiala antes de salir de esta página.
                            </p>
                            <div>
                                <p class="text-slate-500">Código de conexión (lo que trae el QR)</p>
                                <p class="break-all rounded-lg bg-slate-50 p-2 font-mono text-xs" x-text="codigo"></p>
                                <button type="button" class="btn btn-secundario mt-1 min-h-11 lg:min-h-9" @click="copiar(codigo)">Copiar código</button>
                            </div>
                            <div>
                                <p class="text-slate-500">O por separado: servidor y clave</p>
                                <p class="break-all font-mono text-xs" x-text="servidor"></p>
                                <p class="break-all font-mono text-xs" x-text="clave"></p>
                            </div>
                        </div>
                    </div>
                </template>
            </div>

            {{-- 3. Portal de la placa --}}
            <div>
                <h3 class="titulo-seccion mb-2">3. Configura la placa desde el celular</h3>
                <ol class="list-decimal space-y-1 pl-5 text-sm text-slate-600">
                    <li>Escanea el QR con la cámara y copia el texto.</li>
                    <li>Enciende la placa. La primera vez (o con BOOT presionado 5 s) crea la red WiFi <strong>LUMICLASS-Placa</strong>.</li>
                    <li>Conéctate a esa red: se abre el portal. Elige tu WiFi, escribe su contraseña y pega el código de conexión.</li>
                    <li>Guarda. La placa se reinicia y este cuadro cambia a <strong>En línea</strong>.</li>
                </ol>
            </div>

            {{-- Mapa de conexiones --}}
            <div class="grid gap-4 md:grid-cols-2">
                <div>
                    <h3 class="titulo-seccion mb-2">Servos en la placa</h3>
                    <ul class="space-y-1 text-sm">
                        <template x-for="servo in datos.servos" :key="servo.numero">
                            <li class="flex gap-2"><span class="w-16 shrink-0 font-mono" x-text="`Servo ${servo.numero}`"></span>
                                <span class="truncate text-slate-600" x-text="servo.luz ?? 'sin luz'"></span></li>
                        </template>
                    </ul>
                </div>
                <div>
                    <h3 class="titulo-seccion mb-2">Sensores PIR en la placa</h3>
                    <ul class="space-y-1 text-sm">
                        <template x-for="sensor in datos.sensores" :key="sensor.numero">
                            <li class="flex gap-2"><span class="w-16 shrink-0 font-mono" x-text="`PIR ${sensor.numero}`"></span>
                                <span class="truncate text-slate-600" x-text="sensor.nombre"></span></li>
                        </template>
                    </ul>
                </div>
            </div>
            <p class="text-xs text-slate-500">
                Cuando la placa confirma una orden quiere decir que <strong>el servo se movió</strong>. Sin un sensor de luz el
                sistema no puede comprobar que la luz realmente prendió o apagó. Cambia los números en las tarjetas de cada zona.
            </p>
        </div>
    </template>
</section>
