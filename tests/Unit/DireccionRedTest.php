<?php

namespace Tests\Unit;

use App\Servicios\DireccionRed;
use PHPUnit\Framework\TestCase;

/** Elegir la IP que debe usar la placa. Datos como los que entrega Windows con VirtualBox instalado. */
class DireccionRedTest extends TestCase
{
    private function interfaz(string $descripcion, string $ip, bool $activa = true): array
    {
        return ['description' => $descripcion, 'up' => $activa, 'unicast' => [['family' => 2, 'address' => $ip]]];
    }

    public function test_marca_la_del_wifi_y_muestra_las_demas_con_su_tipo(): void
    {
        $lista = DireccionRed::clasificar([
            '{A}' => $this->interfaz('VirtualBox Host-Only Ethernet Adapter', '192.168.56.1'),
            '{B}' => $this->interfaz('Realtek Wireless LAN WiFi 6 PCI-E NIC #2', '169.254.144.251', false),
            '{C}' => $this->interfaz('Realtek Wireless LAN WiFi 6 PCI-E NIC', '192.168.1.3'),
            '{D}' => $this->interfaz('Software Loopback Interface 1', '127.0.0.1'),
            '{E}' => $this->interfaz('Intel Ethernet Connection', '10.0.0.5'),
        ], '192.168.1.3');

        $this->assertSame(['192.168.1.3', '10.0.0.5', '192.168.56.1'], array_column($lista, 'ip'));
        $this->assertSame(['wifi', 'cableada', 'virtual'], array_column($lista, 'tipo'));
        $this->assertSame([true, false, false], array_column($lista, 'recomendada'));
    }

    public function test_sin_wifi_recomienda_la_ip_de_salida(): void
    {
        $lista = DireccionRed::clasificar([
            '{A}' => $this->interfaz('vEthernet (WSL)', '172.20.0.1'),
            '{B}' => $this->interfaz('Intel Ethernet Connection', '192.168.0.20'),
        ], '192.168.0.20');

        $this->assertSame('192.168.0.20', $lista[0]['ip']);
        $this->assertTrue($lista[0]['recomendada']);
        $this->assertSame('virtual', $lista[1]['tipo']);
    }

    public function test_si_no_se_leen_adaptadores_usa_la_ip_de_salida(): void
    {
        $this->assertSame('192.168.1.7', DireccionRed::clasificar([], '192.168.1.7')[0]['ip']);
        $this->assertSame([], DireccionRed::clasificar([], null));
    }
}
