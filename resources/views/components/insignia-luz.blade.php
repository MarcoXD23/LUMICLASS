{{-- Estado de una luz. "estado" es una expresión de Alpine, p. ej. luz.estado_real --}}
@props(['estado'])

<span class="insignia bg-encendida-suave text-encendida-texto" x-show="{{ $estado }} === 'encendida'">
    <x-icono nombre="foco" clase="size-4 text-encendida" /> Encendida
</span>
<span class="insignia bg-apagada-suave text-apagada-texto" x-show="{{ $estado }} === 'apagada'">
    <x-icono nombre="foco" clase="size-4 text-apagada" /> Apagada
</span>
<span class="insignia bg-aviso-suave text-aviso-texto" x-show="{{ $estado }} === 'desconocida'">
    <x-icono nombre="pregunta" clase="size-4" /> Desconocido
</span>
