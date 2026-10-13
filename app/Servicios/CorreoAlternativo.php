<?php

namespace App\Servicios;

use App\Enums\OrigenEvento;
use App\Enums\PropositoCodigo;
use App\Enums\TipoEvento;
use App\Exceptions\ComandoRechazado;
use App\Models\CodigoVerificacion;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Correo alternativo para recuperar la contraseña. Se guarda primero como "pendiente" y solo queda activo
 * al confirmar el código que le llega; mientras tanto, el alternativo anterior (si había) sigue sirviendo.
 */
class CorreoAlternativo
{
    public function __construct(
        private readonly CodigosVerificacion $codigos,
        private readonly RegistroEventos $eventos,
    ) {}

    /** @throws ComandoRechazado 429 si ya se enviaron 3 códigos en la última hora */
    public function solicitar(User $usuario, string $correo): void
    {
        $anterior = $usuario->correo_alternativo_pendiente;
        $usuario->forceFill(['correo_alternativo_pendiente' => $correo])->save();

        try {
            $this->enviarCodigo($usuario);
        } catch (ComandoRechazado $limite) {
            // No salió ningún código: se deja todo como estaba.
            $usuario->forceFill(['correo_alternativo_pendiente' => $anterior])->save();
            throw $limite;
        }

        $this->registrar($usuario, 'Se pidió verificar el correo alternativo '.User::enmascarar($correo).'.');
    }

    /** @throws ComandoRechazado */
    public function reenviar(User $usuario): void
    {
        if ($usuario->correo_alternativo_pendiente === null) {
            throw new ComandoRechazado('sin_pendiente', 'No hay ningún correo alternativo esperando verificación.');
        }

        $this->enviarCodigo($usuario);
    }

    /** @throws ComandoRechazado código inválido, demasiados intentos o el correo ya lo tomó otra cuenta */
    public function verificar(User $usuario, string $codigo): void
    {
        $pendiente = $usuario->correo_alternativo_pendiente;
        if ($pendiente === null) {
            throw new ComandoRechazado('sin_pendiente', 'No hay ningún correo alternativo esperando verificación.');
        }

        $this->codigos->consumir($usuario, PropositoCodigo::VerificarAlternativo, $codigo, 'verificar:'.$usuario->id);

        // Pudo quedar en uso por otra cuenta mientras se verificaba.
        if (self::enUsoPorOtraCuenta($pendiente, $usuario->id)) {
            $usuario->forceFill(['correo_alternativo_pendiente' => null])->save();
            throw new ComandoRechazado('correo_en_uso', 'Ese correo ya está en uso en otra cuenta. Usa otro.');
        }

        $usuario->forceFill([
            'correo_alternativo' => $pendiente,
            'correo_alternativo_verificado_en' => now(),
            'correo_alternativo_pendiente' => null,
        ])->save();

        $this->registrar($usuario, 'Correo alternativo '.User::enmascarar($pendiente).' verificado.');
    }

    public function quitar(User $usuario): void
    {
        DB::transaction(function () use ($usuario) {
            $usuario->forceFill([
                'correo_alternativo' => null,
                'correo_alternativo_verificado_en' => null,
                'correo_alternativo_pendiente' => null,
            ])->save();

            CodigoVerificacion::query()->where('user_id', $usuario->id)
                ->whereIn('proposito', [PropositoCodigo::VerificarAlternativo, PropositoCodigo::RecuperarAlternativo])
                ->delete();
        });

        $this->registrar($usuario, 'Correo alternativo quitado.');
    }

    /** ¿Lo usa otra cuenta como correo principal o como alternativo? */
    public static function enUsoPorOtraCuenta(string $correo, ?int $exceptoUsuario = null): bool
    {
        return User::query()
            ->when($exceptoUsuario, fn ($q) => $q->where('id', '!=', $exceptoUsuario))
            ->where(fn ($q) => $q->where('email', $correo)->orWhere('correo_alternativo', $correo))
            ->exists();
    }

    /** @throws ComandoRechazado */
    private function enviarCodigo(User $usuario): void
    {
        $enviado = $this->codigos->enviar(
            $usuario,
            PropositoCodigo::VerificarAlternativo,
            $usuario->correo_alternativo_pendiente,
            'Escribe este código en "Seguridad de mi cuenta" para confirmar que este es tu correo alternativo de LUMICLASS.',
        );

        if (! $enviado) {
            throw new ComandoRechazado(
                'limite_codigos',
                'Ya pediste '.CodigosVerificacion::MAXIMO_ENVIOS_POR_HORA.' códigos en la última hora. Intenta más tarde.',
                429,
            );
        }
    }

    private function registrar(User $usuario, string $mensaje): void
    {
        $this->eventos->registrar(TipoEvento::CuentaAlternativo, OrigenEvento::Usuario, $mensaje, $usuario);
    }
}
