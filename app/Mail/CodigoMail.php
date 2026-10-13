<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Correo con un código de 6 dígitos (recuperar contraseña o verificar el correo alternativo). */
class CodigoMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $codigo,
        public readonly string $nombre,
        public readonly string $motivo,
        public readonly int $minutos,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Tu código de LUMICLASS');
    }

    public function content(): Content
    {
        return new Content(markdown: 'correos.codigo');
    }
}
