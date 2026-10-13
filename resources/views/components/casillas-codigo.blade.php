{{--
    Código de 6 dígitos en 6 casillas, cómodo en celular (teclado numérico, avanza solo, acepta pegar el
    código completo o el autocompletado del teléfono). "modelo" es la variable de Alpine que recibe el código.
--}}
@props(['modelo', 'etiqueta' => 'Código de 6 dígitos'])

<div x-data="casillasCodigo" x-modelable="valor" x-model="{{ $modelo }}" role="group" aria-label="{{ $etiqueta }}">
    <span class="etiqueta">{{ $etiqueta }}</span>
    <div class="grid grid-cols-6 gap-2">
        <template x-for="(digito, i) in digitos" :key="i">
            <input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6"
                class="campo h-14 px-0 text-center text-2xl font-bold tracking-normal"
                :autocomplete="i === 0 ? 'one-time-code' : 'off'" :aria-label="`Dígito ${i + 1} de 6`"
                :value="digito" @input="escribir(i, $event)" @keydown.backspace="borrar(i, $event)"
                @paste.prevent="repartir($event.clipboardData.getData('text'))" @focus="$event.target.select()">
        </template>
    </div>
</div>
