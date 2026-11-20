/**
 * Mensaje para el usuario a partir del error que entrega el interceptor ({ status, mensaje }).
 * Distingue "sin conexión" de "datos incorrectos" para no confundir al usuario.
 */
export function mensajeDeError(err: any, porDefecto: string): string {
  if (!err) return porDefecto;
  if (err.status === 0 || err.status >= 500 || err.status === 429) return err.mensaje || porDefecto;
  return err.mensaje || porDefecto;
}
