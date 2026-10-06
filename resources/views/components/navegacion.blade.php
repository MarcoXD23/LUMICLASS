{{-- Navegación de un salón: barra lateral en escritorio y barra inferior en celular. --}}
@props(['salon', 'pagina'])

@php
    $enlaces = [
        'inicio' => ['Inicio', 'inicio', route('salones.inicio', $salon)],
        'control' => ['Control', 'control', route('salones.control', $salon)],
        'sensores' => ['Sensores', 'sensor', route('salones.sensores', $salon)],
        'reglas' => ['Reglas', 'regla', route('salones.reglas', $salon)],
        'historial' => ['Historial', 'historial', route('salones.historial', $salon)],
    ];
    $simuladorActivo = config('lumiclass.driver') === 'simulado';
@endphp

{{-- Escritorio --}}
<nav class="hidden w-56 shrink-0 lg:block" aria-label="Secciones del salón">
    <ul class="sticky top-20 space-y-1">
        @foreach ($enlaces as $clave => [$texto, $icono, $url])
            <li>
                <a href="{{ $url }}" @class([
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                    'bg-marca-600 text-white' => $pagina === $clave,
                    'text-slate-700 hover:bg-slate-200' => $pagina !== $clave,
                ]) @if ($pagina === $clave) aria-current="page" @endif>
                    <x-icono :nombre="$icono" /> {{ $texto }}
                </a>
            </li>
        @endforeach
        @if ($simuladorActivo)
            <li class="pt-3">
                <a href="{{ route('salones.simulador', $salon) }}" @class([
                    'flex items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 text-sm font-medium',
                    'border-marca-600 bg-marca-50 text-marca-900' => $pagina === 'simulador',
                    'border-slate-300 text-slate-700 hover:bg-slate-200' => $pagina !== 'simulador',
                ]) @if ($pagina === 'simulador') aria-current="page" @endif>
                    <x-icono nombre="simulador" /> Simulador
                </a>
            </li>
        @endif
    </ul>
</nav>

{{-- Celular --}}
<nav class="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden"
    aria-label="Secciones del salón">
    <ul class="mx-auto grid max-w-lg grid-cols-5">
        @foreach ($enlaces as $clave => [$texto, $icono, $url])
            <li>
                <a href="{{ $url }}" @class([
                    'flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium',
                    'text-marca-600' => $pagina === $clave,
                    'text-slate-500' => $pagina !== $clave,
                ]) @if ($pagina === $clave) aria-current="page" @endif>
                    <x-icono :nombre="$icono" clase="size-6" /> {{ $texto }}
                </a>
            </li>
        @endforeach
    </ul>
</nav>
