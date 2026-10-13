@extends('layouts.app', ['titulo' => 'Seguridad de mi cuenta'])

@section('contenido')
    <div x-data="seguridad" class="mx-auto max-w-2xl space-y-4">
        <div>
            <a href="{{ route('salones.index') }}" class="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-marca-600 lg:min-h-0">← Mis salones</a>
            <h1 class="flex items-center gap-2 text-2xl font-bold"><x-icono nombre="escudo" clase="size-7 text-marca-600" /> Seguridad de mi cuenta</h1>
            <p class="text-sm text-slate-600">Un correo alternativo te permite recuperar la contraseña aunque pierdas acceso a tu correo principal.</p>
        </div>

        <p x-show="errorCarga" x-text="errorCarga" x-cloak role="alert" class="rounded-xl bg-error-suave p-3 text-sm text-error-texto"></p>
        <p x-show="!datos && !errorCarga" class="text-sm text-slate-500">Cargando…</p>

        <template x-if="datos">
            <div class="space-y-4">
                {{-- Correo principal --}}
                <section class="tarjeta" aria-labelledby="titulo-principal">
                    <h2 id="titulo-principal" class="titulo-seccion">Correo principal</h2>
                    <p class="mt-1 flex items-center gap-2 font-medium break-all"><x-icono nombre="correo" clase="size-5 shrink-0 text-slate-500" /> <span x-text="datos.email"></span></p>
                </section>

                {{-- Correo alternativo --}}
                <section class="tarjeta space-y-4" aria-labelledby="titulo-alternativo">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <h2 id="titulo-alternativo" class="titulo-seccion">Correo alternativo</h2>
                        <span x-show="datos.alternativo?.verificado" class="insignia bg-ocupado-suave text-ocupado-texto">
                            <x-icono nombre="exito" clase="size-4" /> Verificado
                        </span>
                        <span x-show="!datos.alternativo && datos.pendiente" x-cloak class="insignia bg-aviso-suave text-aviso-texto">
                            <x-icono nombre="alerta" clase="size-4" /> Sin verificar
                        </span>
                        <span x-show="!datos.alternativo && !datos.pendiente" x-cloak class="insignia bg-apagada-suave text-apagada-texto">
                            Sin configurar
                        </span>
                    </div>

                    {{-- Activo (verificado) --}}
                    <div x-show="datos.alternativo" class="flex flex-wrap items-center justify-between gap-3">
                        <p>
                            <span class="font-medium" x-text="datos.alternativo?.enmascarado"></span>
                            <span class="block text-sm text-slate-500" x-show="datos.alternativo?.verificado_en"
                                x-text="`Verificado el ${fechaHora(datos.alternativo?.verificado_en)}`"></span>
                        </p>
                        <div class="flex gap-2">
                            <button type="button" class="btn btn-secundario" @click="abrir('cambiar')" :disabled="trabajando">Cambiar</button>
                            <button type="button" class="btn btn-secundario text-error-texto" @click="abrir('quitar')" :disabled="trabajando">Quitar</button>
                        </div>
                    </div>

                    {{-- Pendiente de verificar --}}
                    <form x-show="datos.pendiente" x-cloak @submit.prevent="verificar" class="space-y-3 rounded-xl bg-aviso-suave/60 p-4" novalidate>
                        <p class="text-sm text-slate-800">
                            Enviamos un código de 6 dígitos a <strong x-text="datos.pendiente"></strong>. Escríbelo para verificarlo.
                            <span x-show="datos.alternativo">Mientras tanto, tu correo alternativo actual sigue activo.</span>
                        </p>
                        <x-casillas-codigo modelo="codigo" etiqueta="Código de verificación" />
                        <p class="error-campo" x-show="errores.codigo" x-text="errores.codigo" x-cloak></p>
                        <div class="flex flex-wrap gap-2">
                            <button type="submit" class="btn btn-primario" :disabled="trabajando || codigo.length !== 6">Verificar</button>
                            <button type="button" class="btn btn-secundario" @click="reenviar" :disabled="trabajando">Enviar otro código</button>
                            <button type="button" class="btn btn-secundario text-error-texto" x-show="!datos.alternativo" @click="abrir('quitar')" :disabled="trabajando">Cancelar</button>
                        </div>
                    </form>

                    {{-- Sin correo alternativo --}}
                    <div x-show="!datos.alternativo && !datos.pendiente && formulario !== 'cambiar'" x-cloak class="space-y-3">
                        <p class="text-sm text-slate-600">Aún no tienes correo alternativo. Si pierdes acceso a tu correo principal, no podrás usar la opción 3 para recuperar la contraseña.</p>
                        <button type="button" class="btn btn-primario" @click="abrir('cambiar')">Agregar correo alternativo</button>
                    </div>

                    {{-- Agregar o cambiar --}}
                    <form x-show="formulario === 'cambiar'" x-cloak @submit.prevent="guardar" class="space-y-3 border-t border-slate-200 pt-4" novalidate>
                        <h3 class="font-semibold" x-text="datos.alternativo ? 'Cambiar correo alternativo' : 'Agregar correo alternativo'"></h3>
                        <x-campo etiqueta="Correo alternativo" type="email" x-model="nuevo.correo" autocomplete="email" required
                            error="errores.correo_alternativo" />
                        <x-campo etiqueta="Tu contraseña actual" type="password" x-model="nuevo.password" autocomplete="current-password"
                            required error="errores.password_actual" />
                        <div class="flex flex-wrap gap-2">
                            <button type="submit" class="btn btn-primario" :disabled="trabajando">Enviar código de verificación</button>
                            <button type="button" class="btn btn-secundario" @click="cerrar">Cancelar</button>
                        </div>
                    </form>

                    {{-- Quitar --}}
                    <form x-show="formulario === 'quitar'" x-cloak @submit.prevent="quitar" class="space-y-3 border-t border-slate-200 pt-4" novalidate>
                        <h3 class="font-semibold">Quitar correo alternativo</h3>
                        <p class="text-sm text-slate-600">Ya no podrás recuperar la contraseña con la opción 3.</p>
                        <x-campo etiqueta="Tu contraseña actual" type="password" x-model="quitarPassword" autocomplete="current-password"
                            required error="errores.password_actual" />
                        <div class="flex flex-wrap gap-2">
                            <button type="submit" class="btn btn-peligro" :disabled="trabajando">Quitar</button>
                            <button type="button" class="btn btn-secundario" @click="cerrar">Cancelar</button>
                        </div>
                    </form>
                </section>

                {{-- Actividad --}}
                <section class="tarjeta" aria-labelledby="titulo-actividad">
                    <h2 id="titulo-actividad" class="titulo-seccion mb-2">Actividad de la cuenta</h2>
                    <ol class="divide-y divide-slate-100">
                        <template x-for="evento in datos.actividad" :key="evento.id">
                            <li class="py-2">
                                <p class="text-sm" x-text="evento.mensaje"></p>
                                <p class="text-sm text-slate-500 lg:text-xs" x-text="fechaHora(evento.fecha)"></p>
                            </li>
                        </template>
                        <li x-show="!datos.actividad.length" class="py-2 text-sm text-slate-500">Sin cambios todavía.</li>
                    </ol>
                </section>
            </div>
        </template>
    </div>
@endsection
