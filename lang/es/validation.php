<?php

// Mensajes de validación en español (solo las reglas que usa LUMICLASS).
return [
    'accepted' => 'El campo :attribute debe ser aceptado.',
    'after_or_equal' => 'El campo :attribute debe ser una fecha igual o posterior a :date.',
    'array' => 'El campo :attribute debe ser un objeto con solo estas claves: :values.',
    'between' => [
        'numeric' => 'El campo :attribute debe estar entre :min y :max.',
        'string' => 'El campo :attribute debe tener entre :min y :max caracteres.',
    ],
    'boolean' => 'El campo :attribute debe ser verdadero o falso.',
    'confirmed' => 'La confirmación de :attribute no coincide.',
    'date' => 'El campo :attribute no es una fecha válida.',
    'date_format' => 'El campo :attribute debe tener el formato :format.',
    'email' => 'El campo :attribute debe ser un correo electrónico válido.',
    'enum' => 'El valor de :attribute no es válido.',
    'exists' => 'El :attribute seleccionado no existe.',
    'in' => 'El valor de :attribute no es válido.',
    'integer' => 'El campo :attribute debe ser un número entero.',
    'max' => [
        'numeric' => 'El campo :attribute no puede ser mayor que :max.',
        'string' => 'El campo :attribute no puede tener más de :max caracteres.',
    ],
    'min' => [
        'numeric' => 'El campo :attribute debe ser al menos :min.',
        'string' => 'El campo :attribute debe tener al menos :min caracteres.',
    ],
    'numeric' => 'El campo :attribute debe ser un número.',
    'required' => 'El campo :attribute es obligatorio.',
    'required_without' => 'El campo :attribute es obligatorio si no se envía :values.',
    'string' => 'El campo :attribute debe ser texto.',
    'timezone' => 'El campo :attribute debe ser una zona horaria válida (p. ej. America/Bogota).',
    'unique' => 'Ese :attribute ya está en uso.',
    'uuid' => 'El campo :attribute debe ser un UUID válido.',

    'attributes' => [
        'accion' => 'acción',
        'accion.accion' => 'acción de la regla',
        'condicion' => 'condición',
        'condicion.presencia' => 'presencia de la condición',
        'condicion.duracion_segundos' => 'duración en segundos',
        'conexion' => 'conexión',
        'email' => 'correo',
        'id_solicitud' => 'id de solicitud',
        'luces_por_zona' => 'luces por zona',
        'password' => 'contraseña',
        'respuesta' => 'respuesta',
        'zona_horaria' => 'zona horaria',
        'por_pagina' => 'resultados por página',
        'page' => 'página',
        'zona_id' => 'zona',
    ],
];
