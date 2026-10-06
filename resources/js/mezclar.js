/**
 * Combina objetos de componentes Alpine conservando los getters (el operador "..." los
 * convertiría en valores fijos que no se actualizan). Lo de la derecha reemplaza a lo de la izquierda.
 */
export function mezclar(...objetos) {
    const resultado = {};

    for (const objeto of objetos) {
        Object.defineProperties(resultado, Object.getOwnPropertyDescriptors(objeto));
    }

    return resultado;
}
