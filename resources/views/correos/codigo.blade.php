<x-mail::message>
# Hola, {{ $nombre }}

{{ $motivo }}

<x-mail::panel>
<p style="margin:0;text-align:center;font-size:34px;font-weight:700;letter-spacing:10px;color:#1e1b4b;">{{ $codigo }}</p>
</x-mail::panel>

El código vence en **{{ $minutos }} minutos** y sirve **una sola vez**.

Si no lo pediste, ignora este correo: tu cuenta sigue igual. Nunca compartas este código con nadie; el equipo de LUMICLASS jamás te lo pedirá.

— Equipo LUMICLASS
</x-mail::message>
