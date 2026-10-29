/* =====================================================
   Traduce los eventos de TikTok (tiktok-live-connector v2)
   a mensajes sencillos para la página del juego.
   ===================================================== */

/** Datos básicos de quien comenta o regala. */
export function datosUsuario(u = {}, extra = {}, host = '') {
  const foto =
    u.profilePicture?.url?.[0] ||
    u.profilePicture?.urls?.[0] ||
    u.profilePictureUrl || '';
  const id = String(u.uniqueId || u.userId || 'anonimo');
  const ident = extra.userIdentity || {};
  return {
    id,
    name: u.nickname || id,
    avatar: foto,
    isMod: !!(ident.isModeratorOfAnchor || u.isModerator),
    isHost: !!ident.isAnchor || (!!host && id.toLowerCase() === host.toLowerCase()),
  };
}

/**
 * Regalos en racha (como mandar 20 rosas seguidas): TikTok manda un evento
 * por cada actualización con el total acumulado. Aquí se calcula solo lo
 * nuevo para que cada rosa cuente una vez y en el momento en que llega.
 */
export function crearContadorDeRegalos() {
  const rachas = new Map(); // clave -> { visto, t }
  return function procesar(d, host = '') {
    const det = d.giftDetails || {};
    const tipo = det.giftType ?? d.giftType;
    const monedas = Number(det.diamondCount ?? d.diamondCount ?? d.extendedGiftInfo?.diamond_count ?? 1) || 1;
    const nombre = det.giftName ?? d.giftName ?? 'Regalo';
    const user = datosUsuario(d.user, {}, host);
    const total = Number(d.repeatCount) || 1;
    const fin = !!Number(d.repeatEnd);
    let cantidad;

    if (tipo === 1) {
      const clave = `${user.id}:${d.giftId ?? nombre}:${d.groupId ?? ''}`;
      const previo = rachas.get(clave)?.visto ?? 0;
      cantidad = total >= previo ? total - previo : total; // si bajó, es una racha nueva
      if (fin) rachas.delete(clave); else rachas.set(clave, { visto: total, t: Date.now() });
    } else {
      cantidad = total;
    }

    // limpia rachas abandonadas
    if (rachas.size > 200) {
      const limite = Date.now() - 120000;
      for (const [k, v] of rachas) if (v.t < limite) rachas.delete(k);
    }

    if (cantidad <= 0) return null;
    return { type: 'gift', user, coins: monedas, count: cantidad, giftName: nombre, giftId: d.giftId };
  };
}
