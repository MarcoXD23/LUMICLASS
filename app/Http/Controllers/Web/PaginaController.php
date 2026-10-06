<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Salon;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;

/**
 * Solo entrega las vistas: los datos los pide cada pantalla a la API (/api/v1).
 * {salon} ya viene filtrado por dueño (routes/api.php): el salón de otra cuenta responde 404.
 */
class PaginaController extends Controller
{
    public function ingresar(): View
    {
        return view('auth.ingresar');
    }

    public function registro(): View
    {
        return view('auth.registro');
    }

    public function olvide(): View
    {
        return view('auth.olvide');
    }

    /** Llega desde el enlace del correo: /restablecer/{token}?email=... */
    public function restablecer(Request $request, string $token): View
    {
        return view('auth.restablecer', ['token' => $token, 'email' => (string) $request->query('email', '')]);
    }

    public function salones(): View
    {
        return view('salones.index');
    }

    public function inicio(Salon $salon): View
    {
        return view('salones.inicio', ['salon' => $salon]);
    }

    public function control(Salon $salon): View
    {
        return view('salones.control', ['salon' => $salon]);
    }

    public function sensores(Salon $salon): View
    {
        return view('salones.sensores', ['salon' => $salon]);
    }

    public function reglas(Salon $salon): View
    {
        return view('salones.reglas', ['salon' => $salon]);
    }

    public function historial(Salon $salon): View
    {
        return view('salones.historial', ['salon' => $salon]);
    }

    public function estadisticas(Salon $salon): View
    {
        return view('salones.estadisticas', ['salon' => $salon]);
    }

    public function configuracion(Salon $salon): View
    {
        return view('salones.configuracion', ['salon' => $salon]);
    }

    public function simulador(Salon $salon): View
    {
        abort_unless(config('lumiclass.driver') === 'simulado', 404);

        return view('salones.simulador', ['salon' => $salon]);
    }
}
