import { describe, expect, it } from 'vitest';
import { codigoConexion, imagenQr } from '../../resources/js/qrPlaca';

describe('Conectar placa', () => {
    it('arma el código que entiende el firmware', () => {
        expect(codigoConexion('http://192.168.1.3:8001', 'lc_abc')).toBe('LUMICLASS;http://192.168.1.3:8001;lc_abc');
    });

    it('genera el QR como imagen sin internet', () => {
        const imagen = imagenQr(codigoConexion('http://192.168.1.3:8001', 'lc_' + 'x'.repeat(40)));
        expect(imagen.startsWith('data:image/gif;base64,')).toBe(true);
    });
});
