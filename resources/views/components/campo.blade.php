{{--
    Campo de formulario con etiqueta y error. "error" es una expresión de Alpine con el mensaje.
    Los demás atributos (x-model, type, autocomplete...) van al <input>.
--}}
@props(['etiqueta', 'error' => null, 'id' => 'campo-'.\Illuminate\Support\Str::random(6)])

<div>
    <label for="{{ $id }}" class="etiqueta">{{ $etiqueta }}</label>
    <input id="{{ $id }}" {{ $attributes->merge(['class' => 'campo', 'type' => 'text']) }}
        @if ($error) :aria-invalid="Boolean({{ $error }})" :class="{{ $error }} && 'border-error'" @endif>
    @if ($error)
        <p class="error-campo" x-show="{{ $error }}" x-text="{{ $error }}" x-cloak></p>
    @endif
</div>
