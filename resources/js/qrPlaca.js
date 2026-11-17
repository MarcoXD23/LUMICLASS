import qrcode from 'qrcode-generator';

/** Texto del QR y del campo "Código de conexión" del portal de la placa. El firmware lo separa por ";". */
export function codigoConexion(servidor, clave) {
    return `LUMICLASS;${servidor};${clave}`;
}

/** Imagen del código QR (data URL GIF), generada en el navegador sin CDN ni internet. Se usa en <img :src>. */
export function imagenQr(texto) {
    const qr = qrcode(0, 'M');
    qr.addData(texto);
    qr.make();

    return qr.createDataURL(6, 12);
}
