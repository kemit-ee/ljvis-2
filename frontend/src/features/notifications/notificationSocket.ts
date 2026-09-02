// --------------------------------------------------------------------------
// notificationSocket — üks jagatud WebSocket-ühendus kõigi kelluke-badge'ide
// jaoks (päise nupp + külgmenüü). Varem avas iga `useNotificationCount`
// tarbija oma ühenduse ja oma 5s reconnect-loopi → brauserikonsool täitus
// vigadega. Nüüd: refcount-itud singleton + eksponentsiaalne backoff + lagi.
//
// WS-üle EI liigu kasutajaandmeid. Server saadab ainult
// {type:"notification_update"} ("tee refetch"); iga tarbija teeb seejärel oma
// autenditud HTTP-päringu. {type:"unauthorized"} = sessioon aegunud/tühistatud.
// --------------------------------------------------------------------------

type Listener = () => void;

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;
const PING_INTERVAL_MS = 30_000;

const listeners = new Set<Listener>();

let ws: WebSocket | null = null;
let attempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let gaveUp = false;
let started = false;
let visibilityBound = false;

// WebSocket endpoint — sama-origin, läbi olemasoleva `/api/` nginx-proxy
// (→ ruuter:8086/ljvis/). Toodangus teeb nginx/ALB upgrade'i samale teele.
function buildWsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/api/notifications/connect`;
}

function notifyListeners(): void {
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* ühe kuulaja viga ei peata teisi */
    }
  }
}

function clearReconnectTimer(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function clearPingTimer(): void {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
}

function scheduleReconnect(): void {
  if (gaveUp || reconnectTimer || listeners.size === 0) return;

  attempts += 1;
  if (attempts > MAX_RECONNECT_ATTEMPTS) {
    // Loobume WS-ist — tarbijad jäävad HTTP-polling'ule (useNotificationCount).
    // `visibilitychange` (tab uuesti fookusesse) proovib veel korra.
    gaveUp = true;
    return;
  }

  const backoff = Math.min(BASE_DELAY_MS * 2 ** (attempts - 1), MAX_DELAY_MS);
  const jitter = backoff * (0.8 + Math.random() * 0.4);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, jitter);
}

function connect(): void {
  if (ws || listeners.size === 0) return;

  let socket: WebSocket;
  try {
    socket = new WebSocket(buildWsUrl());
  } catch {
    scheduleReconnect();
    return;
  }
  ws = socket;

  socket.onopen = () => {
    attempts = 0;
    gaveUp = false;
    // Käivitab connect.yml autentimise (cookie handshake'ist).
    try {
      socket.send(JSON.stringify({ type: 'hello' }));
    } catch {
      /* ignore */
    }
    clearPingTimer();
    pingTimer = setInterval(() => {
      try {
        socket.send(JSON.stringify({ type: 'ping' }));
      } catch {
        /* ignore */
      }
    }, PING_INTERVAL_MS);
  };

  socket.onmessage = (evt) => {
    let msg: { type?: string };
    try {
      msg = JSON.parse(evt.data as string);
    } catch {
      return;
    }
    if (msg.type === 'notification_update') {
      notifyListeners();
    } else if (msg.type === 'unauthorized') {
      // Sessioon aegunud/tühistatud — lõpeta, jää polling'ule.
      gaveUp = true;
      teardownSocket();
    }
  };

  // Reconnect käib onclose kaudu; ära spämmi konsooli.
  socket.onerror = () => {};

  socket.onclose = () => {
    if (ws === socket) ws = null;
    clearPingTimer();
    scheduleReconnect();
  };
}

function teardownSocket(): void {
  clearPingTimer();
  clearReconnectTimer();
  if (ws) {
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    try {
      ws.close();
    } catch {
      /* ignore */
    }
    ws = null;
  }
}

function onVisibilityChange(): void {
  if (document.visibilityState !== 'visible') return;
  // Tab tuli fookusesse — anna WS-ile veel üks võimalus.
  if (gaveUp || (!ws && listeners.size > 0)) {
    gaveUp = false;
    attempts = 0;
    clearReconnectTimer();
    connect();
  }
}

/**
 * Registreeri callback, mida kutsutakse kui server annab märku, et teavitused
 * on muutunud. Tagastab lahtiütlemise funktsiooni. Esimene subscriber avab
 * ühenduse, viimane lahkuja sulgeb selle.
 */
export function subscribeToNotificationUpdates(listener: Listener): () => void {
  listeners.add(listener);

  if (!started) {
    started = true;
    attempts = 0;
    gaveUp = false;
    if (!visibilityBound && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
      visibilityBound = true;
    }
    connect();
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      started = false;
      teardownSocket();
      if (visibilityBound && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        visibilityBound = false;
      }
    }
  };
}
