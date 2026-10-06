@include('errors.plantilla', [
    'codigo' => 419,
    'titulo' => 'La sesión expiró',
    'mensaje' => 'Pasó mucho tiempo sin actividad. Vuelve a ingresar para continuar.',
    'enlace' => url('/ingresar'),
    'textoEnlace' => 'Ingresar de nuevo',
])
