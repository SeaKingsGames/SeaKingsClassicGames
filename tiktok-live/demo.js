/* =====================================================
   Modo demo: un "live falso" que manda comentarios,
   regalos y likes con el mismo formato que TikTok.
   Sirve para probar OBS y el juego sin estar en vivo:
       node server.js --demo
   ===================================================== */
import { EventEmitter } from 'node:events';

const NOMBRES = ['ajolote_rey', 'lupita.mx', 'el_brayan', 'sofi_gamer', 'don_chuy', 'mariana_23', 'eltioaxel', 'pao.vlogs', 'memo_ecatepec', 'la_neni'];
const LETRAS = 'AEIOUSRNLTDCMPBGVYQHFJZXKWÑ';
const REGALOS = [
  { giftId: 5655, giftName: 'Rose', diamondCount: 1, giftType: 1 },
  { giftId: 5269, giftName: 'TikTok', diamondCount: 1, giftType: 1 },
  { giftId: 5827, giftName: 'Ice Cream Cone', diamondCount: 1, giftType: 1 },
  { giftId: 5879, giftName: 'Doughnut', diamondCount: 30, giftType: 1 },
  { giftId: 5760, giftName: 'Weights', diamondCount: 1, giftType: 1 },
  { giftId: 6064, giftName: 'GG', diamondCount: 1, giftType: 1 },
  { giftId: 7934, giftName: 'Heart Me', diamondCount: 1, giftType: 1 },
  { giftId: 5585, giftName: 'Confetti', diamondCount: 100, giftType: 2 },
];
const azar = a => a[(Math.random() * a.length) | 0];
const usuario = n => ({ uniqueId: n, nickname: n, profilePicture: { url: [] } });

export class ConexionDemo extends EventEmitter {
  async connect() {
    this.timers = [
      setInterval(() => this.comentario(), 700),
      setInterval(() => this.emit('like', { user: usuario(azar(NOMBRES)), likeCount: 5 + ((Math.random() * 25) | 0), totalLikeCount: 0 }), 1500),
      setInterval(() => this.regalo(), 6000),
    ];
    setTimeout(() => this.emit('follow', { user: usuario(azar(NOMBRES)) }), 4000);
    return { roomId: 'demo' };
  }
  comentario() {
    const n = azar(NOMBRES), r = Math.random();
    const texto = r < 0.08 ? azar(['salvar', 'ahorcar']) : r < 0.15 ? azar(['jajaja', 'saludos!!', 'vamos chat 🔥']) : azar([...LETRAS]).toLowerCase();
    this.emit('chat', { user: usuario(n), comment: texto, userIdentity: {} });
  }
  regalo() {
    // simula una racha: varios eventos con el total acumulado y luego repeatEnd
    const g = azar(REGALOS), n = azar(NOMBRES), veces = g.giftType === 1 ? 1 + ((Math.random() * 4) | 0) : 1;
    const base = { user: usuario(n), giftId: g.giftId, groupId: String(Date.now()), giftDetails: { giftName: g.giftName, diamondCount: g.diamondCount, giftType: g.giftType } };
    for (let i = 1; i <= veces; i++) setTimeout(() => this.emit('gift', { ...base, repeatCount: i, repeatEnd: 0 }), i * 250);
    if (g.giftType === 1) setTimeout(() => this.emit('gift', { ...base, repeatCount: veces, repeatEnd: 1 }), (veces + 1) * 250);
  }
  disconnect() { (this.timers || []).forEach(clearInterval); }
}
