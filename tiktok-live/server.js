/* =====================================================
   SeaKingsGames · Puente TikTok Live → Ahorcado EN VIVO
   - Lee el chat, regalos, likes y follows de tu live.
   - Se los pasa a la página del juego por WebSocket.
   - Sirve los juegos en http://localhost:8787
   Uso:  node server.js            (pones tu usuario en la página)
         node server.js tuusuario  (se conecta solo)
   ===================================================== */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';
import { datosUsuario, crearContadorDeRegalos } from './eventos.js';
import { ConexionDemo } from './demo.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const JUEGOS = path.resolve(AQUI, '..');

let config = {};
try { config = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')); } catch {}
const PUERTO = Number(process.env.PORT || config.puerto || 8787);
const EULER_KEY = process.env.EULER_API_KEY || config.eulerApiKey || undefined;
const DEMO = process.argv.includes('--demo');
const USUARIO_INICIAL = DEMO ? 'demo' : (process.argv.slice(2).find(a => !a.startsWith('--')) || config.usuario || '').replace(/^@/, '').trim();

/* ---------- servidor de archivos (solo para esta compu) ---------- */
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
};
const servidor = http.createServer((req, res) => {
  let ruta;
  try { ruta = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  if (ruta === '/') ruta = '/ahorcado-live.html';
  const archivo = path.normalize(path.join(JUEGOS, ruta));
  const relativo = path.relative(JUEGOS, archivo);
  // no salir de la carpeta de juegos ni mostrar este programa
  if (relativo.startsWith('..') || path.isAbsolute(relativo) || relativo.split(path.sep).some(p => p.startsWith('.') || p === 'tiktok-live')) {
    res.writeHead(404).end('No encontrado'); return;
  }
  fs.readFile(archivo, (err, datos) => {
    if (err) { res.writeHead(404).end('No encontrado'); return; }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(datos);
  });
});

/* ---------- WebSocket hacia la página ---------- */
// Solo aceptamos páginas abiertas en esta compu o en tus dominios
const ORIGENES = [/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i, /^https:\/\/([\w-]+\.)*vercel\.app$/i, /^https:\/\/(www\.)?seakingsstudios\.com$/i, ...(config.origenesExtra || []).map(o => new RegExp(o, 'i'))];
const wss = new WebSocketServer({
  server: servidor, path: '/ws',
  verifyClient: ({ origin }) => !origin || origin === 'null' || ORIGENES.some(r => r.test(origin)),
});
const enviarATodos = obj => { const s = JSON.stringify(obj); wss.clients.forEach(c => c.readyState === 1 && c.send(s)); };

let resumen = null;
let conexion = null, usuario = USUARIO_INICIAL, estado = 'disconnected', mensaje = '', reintento = null;
function ponerEstado(nuevo, msg) {
  estado = nuevo; mensaje = msg || '';
  enviarATodos({ type: 'status', state: estado, message: mensaje, user: usuario });
  console.log(`[${new Date().toLocaleTimeString()}] ${mensaje || estado}`);
}

wss.on('connection', ws => {
  console.log('🎮 Se abrió una pantalla del juego');
  ws.send(JSON.stringify({ type: 'status', state: estado, message: mensaje, user: usuario }));
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.type === 'connect' && typeof m.username === 'string') conectar(m.username);
    if (m.type === 'disconnect') desconectar(true);
  });
});

/* ---------- conexión con TikTok ---------- */
function conectar(nombre) {
  nombre = String(nombre).replace(/^@/, '').trim();
  if (DEMO) nombre = 'demo';
  if (!nombre) return;
  if (nombre.toLowerCase() === (usuario || '').toLowerCase() && conexion && (estado === 'connected' || estado === 'connecting')) {
    ponerEstado(estado, mensaje); return;
  }
  desconectar(false);
  usuario = nombre;
  iniciar();
}
function desconectar(avisar) {
  clearTimeout(reintento); reintento = null;
  const c = conexion; conexion = null;
  if (c) { try { c.removeAllListeners(); c.disconnect(); } catch {} }
  if (avisar) ponerEstado('disconnected', 'Desconectado de TikTok');
}
function reintentar(ms) {
  clearTimeout(reintento);
  reintento = setTimeout(() => { if (usuario) iniciar(); }, ms);
}

async function iniciar() {
  clearTimeout(reintento);
  ponerEstado('connecting', `Conectando con el live de @${usuario}…`);
  const c = DEMO ? new ConexionDemo() : new TikTokLiveConnection(usuario, { signApiKey: EULER_KEY, processInitialData: false });
  conexion = c;
  const regalo = crearContadorDeRegalos();
  const quien = (u, extra) => datosUsuario(u, extra, usuario);
  const cuenta = { chat: 0, like: 0, gift: 0, datos: 0, total: 0, tipos: new Map() };

  // Diagnóstico: cuenta todo lo que manda TikTok, para saber si está llegando algo
  c.on('decodedData', tipo => { cuenta.datos++; cuenta.total++; cuenta.tipos.set(tipo, (cuenta.tipos.get(tipo) || 0) + 1); });
  c.on(WebcastEvent.CHAT, d => {
    cuenta.chat++; cuenta.total++;
    const u = quien(d.user, d);
    console.log(`💬 ${u.name}: ${String(d.comment || '').slice(0, 60)}`);
    enviarATodos({ type: 'chat', user: u, text: d.comment });
  });
  c.on(WebcastEvent.GIFT, d => { const g = regalo(d, usuario); if (g) { cuenta.gift++; cuenta.total++; enviarATodos(g); console.log(`🎁 ${g.user.name}: ${g.giftName} ×${g.count} (${g.coins} c/u)`); } });
  c.on(WebcastEvent.LIKE, d => { cuenta.like++; cuenta.total++; enviarATodos({ type: 'like', user: quien(d.user), count: d.likeCount, total: d.totalLikeCount }); });
  c.on(WebcastEvent.FOLLOW, d => enviarATodos({ type: 'follow', user: quien(d.user) }));
  c.on(WebcastEvent.SHARE, d => enviarATodos({ type: 'share', user: quien(d.user) }));
  c.on(WebcastEvent.STREAM_END, () => { if (conexion !== c) return; ponerEstado('offline', 'Terminó el live. Reviso cada 30 s por si vuelves.'); reintentar(30000); });
  c.on(ControlEvent.DISCONNECTED, () => { if (conexion !== c || estado === 'offline') return; ponerEstado('disconnected', 'Se cortó la conexión. Reintento en 10 s…'); reintentar(10000); });
  c.on(ControlEvent.ERROR, e => console.log('⚠️ ', e?.info || e?.message || e));

  try {
    const st = await c.connect();
    if (conexion !== c) return;
    ponerEstado('connected', `Conectado al live de @${usuario}${st?.roomId ? ` (sala ${st.roomId})` : ''}`);
    console.log('   Comenta una letra desde otra cuenta: debe aparecer aquí como 💬');
    // resumen cada 30 s
    clearInterval(resumen);
    resumen = setInterval(() => {
      if (conexion !== c) { clearInterval(resumen); return; }
      const tipos = [...cuenta.tipos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k.replace(/^Webcast|Message$/g, '')}×${v}`).join(', ');
      console.log(`📊 Últimos 30 s: ${cuenta.chat} comentarios, ${cuenta.like} likes, ${cuenta.gift} regalos · ${cuenta.datos} mensajes de TikTok${tipos ? ` (${tipos})` : ''}`);
      if (!cuenta.total && !DEMO) console.log('⚠️  TikTok no le está mandando nada a este programa. Cierra esta ventana, vuelve a abrir iniciar.bat y, si sigue igual, avísale a Claude.');
      enviarATodos({ type: 'stats', chat: cuenta.chat, like: cuenta.like, gift: cuenta.gift, datos: cuenta.datos, total: cuenta.total });
      cuenta.chat = cuenta.like = cuenta.gift = cuenta.datos = cuenta.total = 0; cuenta.tipos.clear();
    }, 30000);
  } catch (err) {
    if (conexion !== c) return;
    const txt = `${err?.name || ''} ${err?.message || err}`;
    if (/offline|not live|isn't online|no est|room ?id/i.test(txt)) {
      ponerEstado('offline', `No encontré un live activo de @${usuario}. ¿Ya estás en vivo y el usuario está bien escrito? Reintento en 30 s…`); reintentar(30000);
    } else if (/rate ?limit|429/i.test(txt)) {
      ponerEstado('error', 'TikTok pidió esperar (límite de conexiones). Reintento en 60 s…'); reintentar(60000);
    } else {
      ponerEstado('error', `No se pudo conectar: ${err?.message || err}. Reintento en 20 s…`); reintentar(20000);
    }
  }
}

servidor.on('error', e => {
  if (e.code === 'EADDRINUSE') console.log(`\n❌ El puerto ${PUERTO} ya está ocupado. ¿Ya tienes otra ventana del puente abierta?\n`);
  else console.log(e);
  process.exit(1);
});
servidor.listen(PUERTO, '127.0.0.1', () => {
  console.log('\n==============================================');
  console.log('  🪢 SeaKingsGames · Puente TikTok Live');
  console.log('==============================================');
  console.log(`  Juego para OBS:  http://localhost:${PUERTO}/ahorcado-live.html`);
  if (DEMO) console.log('  MODO DEMO: comentarios y regalos de mentira para probar.');
  console.log('  Deja esta ventana abierta mientras estés en vivo.');
  console.log('  Para cerrar: Ctrl + C');
  console.log('==============================================\n');
  if (usuario) iniciar();
});
process.on('SIGINT', () => { desconectar(false); process.exit(0); });
