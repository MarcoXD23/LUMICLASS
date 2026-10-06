@extends('layouts.invitado', ['titulo' => 'Recuperar contraseña'])

@section('contenido')
    <div x-data="olvide">
        <form x-show="!enviado" @submit.prevent="enviar" class="space-y-4" novalidate>
            <h2 class="text-lg font-semibold">¿Olvidaste tu contraseña?</h2>
            <p class="text-sm text-slate-600">Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva.</p>

            <p x-show="mensaje && !Object.keys(errores).length" x-text="mensaje" x-cloak role="alert"
                class="rounded-xl bg-error-suave p-3 text-sm text-error-texto"></p>

            <x-campo etiqueta="Correo" type="email" x-model="email" autocomplete="email" required error="errores.email" />

            <button type="submit" class="btn btn-primario w-full" :disabled="enviando">
                <span x-show="!enviando">Enviar enlace</span>
                <span x-show="enviando" x-cloak>Enviando…</span>
            </button>
        </form>

        <div x-show="enviado" x-cloak class="space-y-4" role="status">
            <h2 class="flex items-center gap-2 text-lg font-semibold"><x-icono nombre="exito" clase="size-6 text-ocupado" /> Revisa tu correo</h2>
            <p class="text-sm text-slate-700" x-text="enviado"></p>
            <p class="text-sm text-slate-600">El enlace vence en 60 minutos.</p>
        </div>

        <p class="mt-4 text-center text-sm text-slate-600">
            <a href="{{ route('ingresar') }}" class="inline-flex min-h-11 items-center font-semibold text-marca-600 lg:inline lg:min-h-0">Volver a ingresar</a>
        </p>
    </div>
@endsection
