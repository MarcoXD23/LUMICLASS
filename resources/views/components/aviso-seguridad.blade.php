{{-- Aviso discreto (no bloquea) para quien aún no tiene correo alternativo verificado. Se puede cerrar. --}}
@php $usuario = auth()->user(); @endphp

@if ($usuario && ! $usuario->tieneAlternativoVerificado() && ! request()->routeIs('cuenta.seguridad'))
    <div x-data="avisoSeguridad" x-show="visible" x-cloak role="status"
        class="mb-4 flex items-start gap-3 rounded-xl border border-marca-100 bg-marca-50 p-3 text-sm text-marca-900">
        <x-icono nombre="escudo" clase="size-5 mt-0.5 shrink-0" />
        <p class="flex-1">
            @if ($usuario->correo_alternativo_pendiente)
                Tu correo alternativo está sin verificar: escribe el código que te enviamos.
            @else
                Agrega un correo alternativo para recuperar tu contraseña aunque pierdas acceso a tu correo.
            @endif
            <a href="{{ route('cuenta.seguridad') }}" class="inline-flex min-h-11 items-center font-semibold underline lg:inline lg:min-h-0">Seguridad de mi cuenta</a>
        </p>
        <button type="button" class="-my-2.5 -mr-2 grid size-11 shrink-0 place-items-center opacity-70 hover:opacity-100 lg:m-0 lg:size-6"
            @click="cerrar" aria-label="Cerrar aviso">
            <x-icono nombre="cerrar" clase="size-4" />
        </button>
    </div>
@endif
