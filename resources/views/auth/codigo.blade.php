@extends('layouts.invitado', ['titulo' => 'Recuperar con código'])

@section('contenido')
    {{-- Formas 2 y 3. "via": correo (código al correo principal) | alternativo (al correo alternativo verificado). --}}
    <div x-data="recuperarCodigo(@js($via))" class="space-y-5">
        <div>
            <h2 class="text-lg font-semibold">¿Olvidaste tu contraseña?</h2>
            <p class="text-sm text-slate-600">Elige cómo quieres recuperarla.</p>
        </div>

        <x-opciones-recuperacion :activa="$via" />

        {{-- Paso 1: el correo de la cuenta --}}
        <form x-show="paso === 'correo'" @submit.prevent="pedir" class="space-y-4 border-t border-slate-200 pt-5" novalidate>
            <p class="text-sm text-slate-600" x-show="via === 'correo'">
                Escribe el correo de tu cuenta y te enviaremos un código de 6 dígitos.
            </p>
            <p class="text-sm text-slate-600" x-show="via === 'alternativo'" x-cloak>
                Escribe el correo <strong>principal</strong> de tu cuenta. Si tiene un correo alternativo verificado, el
                código llegará a ese correo.
            </p>

            <p x-show="mensaje && !Object.keys(errores).length" x-text="mensaje" x-cloak role="alert"
                class="rounded-xl bg-error-suave p-3 text-sm text-error-texto"></p>

            <x-campo etiqueta="Correo de tu cuenta" type="email" x-model="email" autocomplete="email" required error="errores.email" />

            <button type="submit" class="btn btn-primario w-full" :disabled="enviando">
                <span x-show="!enviando">Enviar código</span>
                <span x-show="enviando" x-cloak>Enviando…</span>
            </button>
        </form>

        {{-- Paso 2: el código y la contraseña nueva --}}
        <form x-show="paso === 'codigo'" x-cloak @submit.prevent="cambiar" class="space-y-4 border-t border-slate-200 pt-5" novalidate>
            <p class="flex items-start gap-2 rounded-xl bg-ocupado-suave p-3 text-sm text-ocupado-texto" role="status">
                <x-icono nombre="exito" clase="size-5 shrink-0" />
                <span x-text="aviso"></span>
            </p>

            <p x-show="mensaje && !Object.keys(errores).length" x-text="mensaje" x-cloak role="alert"
                class="rounded-xl bg-error-suave p-3 text-sm text-error-texto"></p>

            <x-casillas-codigo modelo="codigo" />
            <p class="error-campo" x-show="errores.codigo" x-text="errores.codigo" x-cloak></p>

            <x-campo etiqueta="Contraseña nueva (mínimo 8 caracteres)" type="password" x-model="password"
                autocomplete="new-password" required error="errores.password" />
            <x-campo etiqueta="Repite la contraseña" type="password" x-model="password_confirmation"
                autocomplete="new-password" required />

            <button type="submit" class="btn btn-primario w-full" :disabled="enviando || codigo.length !== 6">
                <span x-show="!enviando">Guardar contraseña</span>
                <span x-show="enviando" x-cloak>Guardando…</span>
            </button>

            <div class="flex flex-wrap justify-between gap-2 text-sm">
                <button type="button" class="inline-flex min-h-11 items-center font-semibold text-marca-600 lg:min-h-0" :disabled="enviando"
                    @click="reenviar">Enviar otro código</button>
                <button type="button" class="inline-flex min-h-11 items-center text-slate-600 lg:min-h-0" @click="paso = 'correo'">Cambiar el correo</button>
            </div>
            <p class="text-sm text-slate-500 lg:text-xs">El código vence en 10 minutos. Pedir uno nuevo anula el anterior.</p>
        </form>

        <p class="text-center text-sm text-slate-600">
            <a href="{{ route('ingresar') }}" class="inline-flex min-h-11 items-center font-semibold text-marca-600 lg:inline lg:min-h-0">Volver a ingresar</a>
        </p>
    </div>
@endsection
