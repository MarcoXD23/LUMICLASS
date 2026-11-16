{{--
    Campo de formulario con etiqueta y error. "error" es una expresión de Alpine con el mensaje.
    Los demás atributos (x-model, type, autocomplete...) van al <input>.
    Si type="password", agrega el botón de ojo para mostrar u ocultar lo escrito (44 px de área táctil).
--}}
@props(['etiqueta', 'error' => null, 'id' => 'campo-'.\Illuminate\Support\Str::random(6)])

@php($esClave = $attributes->get('type') === 'password')

<div>
    <label for="{{ $id }}" class="etiqueta">{{ $etiqueta }}</label>
    @if ($esClave)
        <div class="relative" x-data="{ claveVisible: false }">
            <input id="{{ $id }}" {{ $attributes->merge(['class' => 'campo pr-12']) }}
                :type="claveVisible ? 'text' : 'password'"
                @if ($error) :aria-invalid="Boolean({{ $error }})" :class="{{ $error }} && 'border-error'" @endif>
            <button type="button" class="btn-ojo" aria-controls="{{ $id }}"
                aria-label="Mostrar contraseña" aria-pressed="false"
                :aria-label="claveVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                :aria-pressed="claveVisible.toString()"
                @click="claveVisible = !claveVisible">
                {{-- Ojo: la contraseña está oculta y se puede mostrar --}}
                <svg x-show="!claveVisible" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                </svg>
                {{-- Ojo tachado: la contraseña se ve y se puede ocultar --}}
                <svg x-show="claveVisible" x-cloak class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.2" />
                    <path d="M6.6 6.6A16.7 16.7 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
                    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                    <path d="m2 2 20 20" />
                </svg>
            </button>
        </div>
    @else
        <input id="{{ $id }}" {{ $attributes->merge(['class' => 'campo', 'type' => 'text']) }}
            @if ($error) :aria-invalid="Boolean({{ $error }})" :class="{{ $error }} && 'border-error'" @endif>
    @endif
    @if ($error)
        <p class="error-campo" x-show="{{ $error }}" x-text="{{ $error }}" x-cloak></p>
    @endif
</div>
