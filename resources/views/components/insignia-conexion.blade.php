{{-- Conexión de un sensor o servo. "estado" es una expresión de Alpine. --}}
@props(['estado'])

<span class="insignia bg-ocupado-suave text-ocupado-texto" x-show="{{ $estado }} === 'activo'">
    <x-icono nombre="exito" clase="size-4" /> Activo
</span>
<span class="insignia bg-aviso-suave text-aviso-texto" x-show="{{ $estado }} === 'inactivo'">
    <x-icono nombre="alerta" clase="size-4" /> Inactivo
</span>
<span class="insignia bg-error-suave text-error-texto" x-show="{{ $estado }} === 'falla'">
    <x-icono nombre="alerta" clase="size-4" /> Falla
</span>
