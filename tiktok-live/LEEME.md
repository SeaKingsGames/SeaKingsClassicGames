# 🪢 Ahorcado EN VIVO para TikTok Live

Este programita lee el chat, los regalos y los likes de tu live y se los pasa al juego `ahorcado-live.html`. Tus viewers juegan comentando, y sus regalos cambian la partida.

## Cómo se juega (para explicarlo en el live)

- **Comenta una letra** (por ejemplo `a`). Cada pocos segundos se juega **la letra más votada**. Si está en la palabra, todos los que votaron por ella ganan puntos.
- **Comenta la palabra completa** para ganar muchos puntos y terminar la ronda.
- **Elige tu equipo** comentando `SALVAR` 🛟 o `AHORCAR` 💀. Quien no elige va con los Salvadores (lo puedes cambiar en el panel).
- **Los regalos ayudan a tu equipo:**

| Monedas | 🛟 Salvadores | 💀 Verdugos |
|---|---|---|
| 1 a 9 (Rosa, etc.) | +1 vida | −1 vida |
| 10 a 99 | revela 1 letra | −2 vidas |
| 100 a 499 | escudo de 2 errores + 2 letras | −3 vidas |
| 500 o más | ¡rescate total! | ¡ahorcado inmediato! |

- **Likes:** cada 300 likes se desbloquea la pista y, después, una letra gratis.
- **👑 Rey del Mar:** el que más monedas ha regalado en la sesión. Su nombre se queda en pantalla hasta que alguien regale más.
- La última letra nunca se regala: esa siempre la tiene que adivinar el chat.

## Lo que necesitas (solo una vez)

1. Instala **Node.js** versión LTS desde https://nodejs.org (siguiente, siguiente, finalizar).
2. Descarga este repositorio desde GitHub: botón verde **Code → Download ZIP** y descomprímelo.

## Cada vez que vayas a hacer live

1. Abre la carpeta `tiktok-live` y da doble clic en **`iniciar.bat`**.
   - La primera vez tarda un poco porque instala lo necesario.
   - Se abre una ventana negra: **déjala abierta** mientras estés en vivo.
   - Se abre el juego en tu navegador.
2. **Empieza tu live en TikTok.**
3. En el juego mueve el mouse y da clic en ⚙️ (o presiona la tecla **P**). Escribe tu usuario de TikTok sin @ y da clic en **Conectar**. El juego se acuerda de tu usuario para la próxima vez.
4. Cuando diga **🟢 TikTok Live: conectado**, cierra el panel con **P** y listo.

### En OBS

- Agrega una **Fuente → Navegador** con:
  - URL: `http://localhost:8787/ahorcado-live.html`
  - Ancho **1080**, alto **1920**
  - Activa "Controlar audio a través de OBS" si quieres los sonidos en el stream.
- Para abrir el panel dentro de OBS: clic derecho en la fuente → **Interactuar** → presiona **P**.
- Si quieres poner tu cámara detrás del juego usa `http://localhost:8787/ahorcado-live.html?fondo=transparente`.

Si transmites con TikTok LIVE Studio, captura la ventana del navegador donde está el juego.

La pantalla está acomodada para TikTok: lo importante va arriba y a la derecha, porque abajo a la izquierda los viewers ven los comentarios encima.

## Comandos desde tu chat

Tú (y tus moderadores, si lo activas en el panel) pueden escribir en el chat del live:

| Comando | Qué hace |
|---|---|
| `!siguiente` | Salta a otra palabra |
| `!pausa` / `!seguir` | Pausa o reanuda |
| `!pista` | Muestra la pista |
| `!revelar` | Revela una letra |
| `!categoria animales` | Cambia la categoría desde la siguiente palabra |
| `!dificultad facil` | `facil`, `medio`, `dificil`, `extra` o `mixto` |

## Probar sin estar en vivo

- En el panel del juego hay un **simulador** con botones de rosas, regalos grandes, likes y un chat automático.
- Para probar también el programa puente, abre una terminal en esta carpeta y escribe `node server.js --demo`. Manda comentarios y regalos de mentira con el mismo formato que TikTok.

## Si algo falla

- **"No encontré un live activo"**: revisa que ya estés en vivo y que el usuario esté bien escrito. El programa vuelve a intentar solo cada 30 segundos.
- **"Límite de conexiones"**: TikTok a veces limita las conexiones gratuitas. Espera un minuto. Si pasa seguido, puedes sacar una clave gratuita en https://www.eulerstream.com, copiar `config.ejemplo.json` como `config.json` y pegarla en `eulerApiKey`.
- **"El puerto 8787 ya está ocupado"**: ya tienes otra ventana del puente abierta. Ciérrala.
- **El ranking quedó con datos de prueba**: en el panel, botón **Reiniciar ranking y rey**.

Esta conexión usa la librería no oficial `tiktok-live-connector`. Si TikTok cambia algo, a veces hay que actualizarla: borra la carpeta `node_modules` y vuelve a abrir `iniciar.bat`.
