{{-- Modo de una zona. "estado" es una expresión de Alpine. --}}
@props(['estado'])

<span class="insignia bg-marca-100 text-marca-900" x-show="{{ $estado }} === 'automatico'">
    <x-icono nombre="automatico" clase="size-4" /> Automático
</span>
<span class="insignia bg-slate-200 text-slate-800" x-show="{{ $estado }} === 'manual'">
    <x-icono nombre="manual" clase="size-4" /> Manual
</span>
