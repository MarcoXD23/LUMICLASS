@include('errors.plantilla', [
    'codigo' => 429,
    'titulo' => 'Demasiados intentos',
    'mensaje' => 'Hiciste muchas solicitudes seguidas. Espera un minuto y vuelve a probar.',
])
