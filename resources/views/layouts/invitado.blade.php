<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#4f46e5">
    <title>{{ $titulo ?? 'LUMICLASS' }} · LUMICLASS</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>

<body class="grid min-h-dvh place-items-center bg-gradient-to-b from-marca-50 to-slate-50 px-4 py-10">
    <main class="w-full max-w-sm">
        <div class="mb-6 flex flex-col items-center gap-2 text-center">
            <span class="grid size-14 place-items-center rounded-2xl bg-marca-600 text-white shadow-lg">
                <x-icono nombre="foco" clase="size-8" />
            </span>
            <h1 class="text-2xl font-bold text-marca-900">LUMICLASS</h1>
            <p class="text-sm text-slate-600">Iluminación inteligente del salón de clases</p>
        </div>

        <div class="tarjeta p-6">
            @yield('contenido')
        </div>
    </main>

    <x-avisos />
</body>

</html>
