{{-- Las 3 formas de recuperar la contraseña. "activa": enlace | correo | alternativo --}}
@props(['activa'])

@php
    $opciones = [
        'enlace' => ['enlace', '1. Enlace por correo', 'Te enviamos un enlace para crear la contraseña nueva.', route('olvide')],
        'correo' => ['numeral', '2. Código de 6 dígitos por correo', 'Te enviamos un código para escribirlo aquí mismo.', route('recuperar.codigo', ['via' => 'correo'])],
        'alternativo' => ['correo', '3. Usar mi correo alternativo', 'El código llega a tu correo de respaldo verificado.', route('recuperar.codigo', ['via' => 'alternativo'])],
    ];
@endphp

<nav aria-label="Formas de recuperar la contraseña" class="space-y-2">
    @foreach ($opciones as $clave => [$icono, $titulo, $explicacion, $url])
        <a href="{{ $url }}" @class([
            'flex min-h-11 items-start gap-3 rounded-xl border p-3 text-left transition',
            'border-marca-600 bg-marca-50' => $activa === $clave,
            'border-slate-200 hover:bg-slate-50' => $activa !== $clave,
        ]) @if ($activa === $clave) aria-current="page" @endif>
            <span @class([
                'grid size-9 shrink-0 place-items-center rounded-lg',
                'bg-marca-600 text-white' => $activa === $clave,
                'bg-slate-100 text-slate-600' => $activa !== $clave,
            ])>
                <x-icono :nombre="$icono" />
            </span>
            <span class="min-w-0">
                <span class="block text-sm font-semibold text-slate-900">{{ $titulo }}</span>
                <span class="block text-sm text-slate-600">{{ $explicacion }}</span>
            </span>
        </a>
    @endforeach
</nav>
