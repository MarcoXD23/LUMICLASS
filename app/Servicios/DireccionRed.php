<?php

namespace App\Servicios;

/**
 * Direcciones IP del PC en la red local, para que la placa sepa a dónde conectarse.
 * Se muestran todas las útiles y se marca la del WiFi (la placa también usa WiFi).
 * Se descartan 127.x (solo sirve dentro del PC) y 169.254.x (adaptador sin red).
 */
class DireccionRed
{
    private const PATRON_WIFI = '/wireless|wi-?fi|wlan|802\.11/i';

    private const PATRON_VIRTUAL = '/virtualbox|hyper-v|vethernet|wsl|vmware|virtual|docker|loopback|tap-|tunnel|vpn/i';

    /** @return list<array{ip: string, adaptador: string, tipo: string, recomendada: bool}> */
    public function detectar(): array
    {
        $interfaces = function_exists('net_get_interfaces') ? (net_get_interfaces() ?: []) : [];

        return self::clasificar($interfaces, $this->ipDeSalida());
    }

    /**
     * Función pura (fácil de probar): recibe lo que devuelve net_get_interfaces() y la IP de salida.
     *
     * @param  array<string, array<string, mixed>>  $interfaces
     * @return list<array{ip: string, adaptador: string, tipo: string, recomendada: bool}>
     */
    public static function clasificar(array $interfaces, ?string $ipSalida): array
    {
        $lista = [];

        foreach ($interfaces as $nombre => $datos) {
            if (($datos['up'] ?? true) === false) {
                continue;
            }

            $adaptador = (string) ($datos['description'] ?? $nombre);

            foreach ($datos['unicast'] ?? [] as $direccion) {
                $ip = (string) ($direccion['address'] ?? '');

                if (! self::esIpv4Util($ip)) {
                    continue;
                }

                $lista[] = [
                    'ip' => $ip,
                    'adaptador' => $adaptador,
                    'tipo' => match (true) {
                        (bool) preg_match(self::PATRON_VIRTUAL, $adaptador.' '.$nombre) => 'virtual',
                        (bool) preg_match(self::PATRON_WIFI, $adaptador.' '.$nombre) => 'wifi',
                        default => 'cableada',
                    },
                    'recomendada' => false,
                ];
            }
        }

        // Si no se pudo leer ningún adaptador, al menos la IP de salida.
        if ($lista === [] && $ipSalida !== null && self::esIpv4Util($ipSalida)) {
            $lista[] = ['ip' => $ipSalida, 'adaptador' => 'Adaptador de red', 'tipo' => 'cableada', 'recomendada' => false];
        }

        // Recomendada: la del WiFi (mejor si además es la de salida); si no hay WiFi, la de salida.
        $indice = self::buscar($lista, fn ($d) => $d['tipo'] === 'wifi' && $d['ip'] === $ipSalida)
            ?? self::buscar($lista, fn ($d) => $d['tipo'] === 'wifi')
            ?? self::buscar($lista, fn ($d) => $d['ip'] === $ipSalida && $d['tipo'] !== 'virtual')
            ?? self::buscar($lista, fn ($d) => $d['tipo'] !== 'virtual');

        if ($indice !== null) {
            $lista[$indice]['recomendada'] = true;
        }

        // Primero la recomendada, después las reales y al final las virtuales.
        usort($lista, fn ($a, $b) => [! $a['recomendada'], $a['tipo'] === 'virtual'] <=> [! $b['recomendada'], $b['tipo'] === 'virtual']);

        return $lista;
    }

    /** IP del adaptador que usa el PC para salir a otras redes. UDP no envía nada al "conectarse". */
    private function ipDeSalida(): ?string
    {
        $socket = @stream_socket_client('udp://8.8.8.8:53', $codigo, $mensaje, 1);

        if ($socket === false) {
            return null;
        }

        $nombre = stream_socket_get_name($socket, false) ?: '';
        fclose($socket);
        $ip = explode(':', $nombre)[0] ?? '';

        return self::esIpv4Util($ip) ? $ip : null;
    }

    private static function esIpv4Util(string $ip): bool
    {
        return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false
            && ! str_starts_with($ip, '127.')
            && ! str_starts_with($ip, '169.254.')
            && $ip !== '0.0.0.0';
    }

    /** @param  list<array<string, mixed>>  $lista */
    private static function buscar(array $lista, callable $condicion): ?int
    {
        foreach ($lista as $i => $direccion) {
            if ($condicion($direccion)) {
                return $i;
            }
        }

        return null;
    }
}
