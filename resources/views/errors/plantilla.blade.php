{{--
    Plantilla de las páginas de error. Estilos en línea a propósito: debe verse bien aunque falle
    la compilación de Vite o la base de datos (justo cuando aparecen estos errores).
--}}
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $titulo }} · LUMICLASS</title>
    <style>
        body { margin: 0; min-height: 100dvh; display: grid; place-items: center; padding: 24px; box-sizing: border-box;
            font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; background: #eef2ff; color: #0f172a; }
        main { box-sizing: border-box; max-width: 26rem; width: 100%; background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem;
            padding: 2rem 1.5rem; text-align: center; box-shadow: 0 1px 2px rgb(0 0 0 / .05); }
        .codigo { font-size: .875rem; font-weight: 600; color: #4f46e5; letter-spacing: .05em; }
        h1 { font-size: 1.5rem; margin: .5rem 0; }
        p { color: #475569; line-height: 1.5; margin: 0 0 1.5rem; }
        a { display: inline-flex; min-height: 44px; align-items: center; padding: 0 1.25rem; border-radius: .75rem;
            background: #4f46e5; color: #fff; font-weight: 600; text-decoration: none; }
        a:focus-visible { outline: 2px solid #4f46e5; outline-offset: 2px; }
    </style>
</head>

<body>
    <main>
        <div class="codigo">LUMICLASS · ERROR {{ $codigo }}</div>
        <h1>{{ $titulo }}</h1>
        <p>{{ $mensaje }}</p>
        <a href="{{ $enlace ?? url('/') }}">{{ $textoEnlace ?? 'Volver al inicio' }}</a>
    </main>
</body>

</html>
