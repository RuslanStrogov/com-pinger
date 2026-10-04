/**
 * COM-Pinger — Node.js → Arduino serial ping tool
 *
 * Sends periodic "ping <timestamp>" messages over a COM port to an Arduino
 * and measures round-trip latency from the echoed response.
 *
 * Usage:
 *   node src/main.js [--port COM8] [--baud 9600] [--interval 1000] [--log ping.log]
 */

const { SerialPort } = require("serialport");

// ── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const get = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const PORT_PATH       = get("--port",     "COM8");
const BAUD_RATE       = parseInt(get("--baud",     "9600"), 10);
const PING_INTERVAL_MS = parseInt(get("--interval", "1000"), 10);
const RECONNECT_DELAY  = parseInt(get("--reconnect", "3000"), 10);
const LOG_FILE        = get("--log", null);          // optional file logging

// ── Optional file logger ────────────────────────────────────────────────────
let logStream = null;
if (LOG_FILE) {
  const fs = require("fs");
  logStream = fs.createWriteStream(LOG_FILE, { flags: "a" });
  logStream.write(`\n--- COM-Pinger started ${new Date().toISOString()} ---\n`);
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  if (logStream) logStream.write(line + "\n");
}

// ── State ───────────────────────────────────────────────────────────────────
let pingTimer    = null;
let reconnectTimer = null;
let port         = null;
let pingId       = 0;
const pending   = new Map();          // id → { sentAt }

// ── Serial port ─────────────────────────────────────────────────────────────
function openPort() {
  log(`Opening ${PORT_PATH} @ ${BAUD_RATE} baud …`);

  port = new SerialPort({ path: PORT_PATH, baudRate: BAUD_RATE, autoOpen: false });

  port.on("open",  () => { log("Port opened");  startPinging(); });
  port.on("close", () => { log("Port closed");  stopPinging(); scheduleReconnect(); });
  port.on("error", (err) => { log(`Port error: ${err.message}`); });

  port.on("data", (buf) => {
    const text = buf.toString("utf8").trim();
    // Expected echo: "ping <id> <timestamp>"
    if (text.startsWith("ping ")) {
      const parts = text.split(" ");
      const id = parseInt(parts[1], 10);
      if (!isNaN(id) && pending.has(id)) {
        const rtt = Date.now() - pending.get(id).sentAt;
        pending.delete(id);
        log(`pong id=${id} rtt=${rtt}ms`);
      }
    } else {
      log(`echo: ${text}`);
    }
  });

  port.open((err) => {
    if (err) log(`Open failed: ${err.message}`);
  });
}

// ── Ping / pong ─────────────────────────────────────────────────────────────
function sendPing() {
  if (!port || !port.isOpen) return;
  const id = ++pingId;
  const msg = `ping ${id} ${Date.now()}\n`;
  pending.set(id, { sentAt: Date.now() });
  port.write(msg);
}

function startPinging() {
  if (pingTimer) return;
  log(`Ping interval: ${PING_INTERVAL_MS} ms`);
  pingTimer = setInterval(sendPing, PING_INTERVAL_MS);
}

function stopPinging() {
  if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
  pending.clear();
}

// ── Reconnect ───────────────────────────────────────────────────────────────
function scheduleReconnect() {
  if (reconnectTimer) return;
  log(`Reconnecting in ${RECONNECT_DELAY} ms …`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    openPort();
  }, RECONNECT_DELAY);
}

// ── Graceful shutdown ───────────────────────────────────────────────────────
function shutdown() {
  log("Shutting down …");
  stopPinging();
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (port && port.isOpen) port.close();
  if (logStream) logStream.end();
  process.exit(0);
}

process.on("SIGINT",  shutdown);
process.on("SIGTERM", shutdown);

// ── Start ───────────────────────────────────────────────────────────────────
log("COM-Pinger starting");
log(`  port=${PORT_PATH} baud=${BAUD_RATE} interval=${PING_INTERVAL_MS}ms reconnect=${RECONNECT_DELAY}ms`);
if (LOG_FILE) log(`  log file: ${LOG_FILE}`);
openPort();

// ===== EASTER EGG =====
const EASTER_EGGS = {
  '42': () => {
    console.log('');
    console.log('  🐧  ~  ПИНГВИН-ПОНГ  ~  🐧');
    console.log('  ╔══════════════════════╗');
    console.log('  ║   PONG! PONG! PONG!  ║');
    console.log('  ║   Ответ — 42 мс     ║');
    console.log('  ║   (смысл жизни)     ║');
    console.log('  ╚══════════════════════╝');
    console.log('');
  },
  '777': () => {
    console.log('');
    console.log('  🌟  ДЖЕКПОТ-ПИНГ  🌟');
    console.log('  Все 7 пингов дошли мгновенно!');
    console.log('  Счастливый пакет #777');
    console.log('');
  },
  '1337': () => {
    console.log('');
    console.log('  👾  LEET PING  👾');
    console.log('  RTT: 1337ms');
    console.log('  H4CK3R M0D3 4CT1V4T3D!');
    console.log('');
  }
};

// Hook into the existing ping handler
const _origLog = log;
log = function(msg) {
  _origLog(msg);
  // Check for easter egg ping IDs
  const match = msg.match(/ping #(\d+)/);
  if (match) {
    const egg = EASTER_EGGS[match[1]];
    if (egg) egg();
  }
};
