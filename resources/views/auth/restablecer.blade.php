@extends('layouts.invitado', ['titulo' => 'Nueva contraseña'])

@section('contenido')
    {{-- @js escapa el token y el correo (vienen de la URL) para usarlos dentro de JavaScript sin riesgo. --}}
    <form x-data="restablecer(@js($token), @js($email))" @submit.prevent="enviar" class="space-y-4" novalidate>
        <h2 class="text-lg font-semibold">Crea una contraseña nueva</h2>
        <p class="text-sm text-slate-600">Para la cuenta <strong x-text="email"></strong>.</p>

        <div x-show="mensaje && !Object.keys(errores).length" x-cloak role="alert"
            class="rounded-xl bg-error-suave p-3 text-sm text-error-texto">
            <p x-text="mensaje"></p>
            <a x-show="enlaceVencido" href="{{ route('olvide') }}" class="mt-1 inline-flex min-h-11 items-center font-semibold underline lg:min-h-0">Pedir un enlace nuevo</a>
        </div>

        <x-campo etiqueta="Contraseña nueva (mínimo 8 caracteres)" type="password" x-model="password"
            autocomplete="new-password" required error="errores.password" />
        <x-campo etiqueta="Repite la contraseña" type="password" x-model="password_confirmation"
            autocomplete="new-password" required />

        <button type="submit" class="btn btn-primario w-full" :disabled="enviando">
            <span x-show="!enviando">Guardar contraseña</span>
            <span x-show="enviando" x-cloak>Guardando…</span>
        </button>
    </form>
@endsection
