@extends('layouts.invitado', ['titulo' => 'Crear cuenta'])

@section('contenido')
    <form x-data="registro" @submit.prevent="enviar" class="space-y-4" novalidate>
        <h2 class="text-lg font-semibold">Crear cuenta</h2>
        <p class="text-sm text-slate-600">Recibirás un salón de ejemplo para empezar a probar.</p>

        <p x-show="mensaje && !Object.keys(errores).length" x-text="mensaje" x-cloak role="alert"
            class="rounded-xl bg-error-suave p-3 text-sm text-error-texto"></p>

        <x-campo etiqueta="Nombre" x-model="nombre" autocomplete="name" required error="errores.nombre" />
        <x-campo etiqueta="Correo" type="email" x-model="email" autocomplete="email" required error="errores.email" />
        <x-campo etiqueta="Contraseña (mínimo 8 caracteres)" type="password" x-model="password"
            autocomplete="new-password" required error="errores.password" />
        <x-campo etiqueta="Repite la contraseña" type="password" x-model="password_confirmation"
            autocomplete="new-password" required />

        <button type="submit" class="btn btn-primario w-full" :disabled="enviando">
            <span x-show="!enviando">Crear cuenta</span>
            <span x-show="enviando" x-cloak>Creando…</span>
        </button>

        <p class="text-center text-sm text-slate-600">
            ¿Ya tienes cuenta? <a href="{{ route('ingresar') }}" class="inline-flex min-h-11 items-center font-semibold text-marca-600 lg:inline lg:min-h-0">Ingresa</a>
        </p>
    </form>
@endsection
