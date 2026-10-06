@extends('layouts.invitado', ['titulo' => 'Ingresar'])

@section('contenido')
    <form x-data="ingreso" @submit.prevent="enviar" class="space-y-4" novalidate>
        <h2 class="text-lg font-semibold">Ingresar</h2>

        <p x-show="mensaje && !Object.keys(errores).length" x-text="mensaje" x-cloak role="alert"
            class="rounded-xl bg-error-suave p-3 text-sm text-error-texto"></p>

        <x-campo etiqueta="Correo" type="email" x-model="email" autocomplete="email" required error="errores.email" />
        <x-campo etiqueta="Contraseña" type="password" x-model="password" autocomplete="current-password" required
            error="errores.password" />

        <button type="submit" class="btn btn-primario w-full" :disabled="enviando">
            <span x-show="!enviando">Ingresar</span>
            <span x-show="enviando" x-cloak>Ingresando…</span>
        </button>

        <p class="text-center text-sm text-slate-600">
            ¿No tienes cuenta? <a href="{{ route('registro') }}" class="font-semibold text-marca-600">Regístrate</a>
        </p>
    </form>
@endsection
