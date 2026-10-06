{{-- Ocupación de un salón o zona. "estado" es una expresión de Alpine. --}}
@props(['estado'])

<span class="insignia bg-ocupado-suave text-ocupado-texto" x-show="{{ $estado }} === 'ocupado'">
    <x-icono nombre="persona" clase="size-4" /> Ocupado
</span>
<span class="insignia bg-vacio-suave text-vacio-texto" x-show="{{ $estado }} === 'vacio'">
    <x-icono nombre="sin-persona" clase="size-4" /> Vacío
</span>
<span class="insignia bg-apagada-suave text-apagada-texto" x-show="{{ $estado }} === 'desconocida'">
    <x-icono nombre="pregunta" clase="size-4" /> Sin datos
</span>
