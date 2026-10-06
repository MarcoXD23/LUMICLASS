<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#4f46e5">
    <title>{{ $titulo ?? 'LUMICLASS' }} · LUMICLASS</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>

<body class="min-h-dvh">
    <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div class="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
            <a href="{{ route('salones.index') }}" class="flex min-h-11 items-center gap-2 font-bold text-marca-900 lg:min-h-0" aria-label="LUMICLASS: mis salones">
                <span class="grid size-8 place-items-center rounded-lg bg-marca-600 text-white">
                    <x-icono nombre="foco" />
                </span>
                <span class="hidden sm:inline">LUMICLASS</span>
            </a>

            @isset($salon)
                <a href="{{ route('salones.index') }}"
                    class="flex min-h-11 min-w-0 items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 lg:min-h-0"
                    title="Cambiar de salón">
                    <x-icono nombre="salon" clase="size-4 shrink-0" />
                    <span class="truncate font-semibold">{{ $salon->nombre }}</span>
                </a>
            @endisset

            <div class="ml-auto flex items-center gap-2">
                @if (isset($salon) && config('lumiclass.driver') === 'simulado')
                    <a href="{{ route('salones.simulador', $salon) }}" class="btn btn-secundario min-h-11 lg:min-h-9 px-3 lg:hidden"
                        aria-label="Simulador">
                        <x-icono nombre="simulador" clase="size-4" />
                        <span class="hidden sm:inline">Simulador</span>
                    </a>
                @endif
                <span class="hidden text-sm text-slate-500 md:inline">{{ auth()->user()->name }}</span>
                <button type="button" class="btn btn-secundario min-h-11 lg:min-h-9 px-3" x-data="sesion" @click="salir" aria-label="Salir"
                    :disabled="saliendo">
                    <x-icono nombre="salir" clase="size-4" /> <span class="hidden sm:inline">Salir</span>
                </button>
            </div>
        </div>
    </header>

    <div class="mx-auto flex max-w-6xl gap-6 px-4 pb-28 pt-4 lg:pb-10">
        @isset($salon)
            <x-navegacion :salon="$salon" :pagina="$pagina ?? ''" />
        @endisset

        <main class="min-w-0 flex-1">
            @yield('contenido')
        </main>
    </div>

    <x-avisos />
</body>

</html>
