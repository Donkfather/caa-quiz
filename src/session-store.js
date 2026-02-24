const STORAGE_KEY = "caa_quiz_sessions_v1";
const MAX_AGE_DAYS = 30;

function safeNow() {
  return Date.now();
}

function readMap() {
  if (typeof window === "undefined" || !window.localStorage) {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / private mode errors
  }
}

export function loadSessions() {
  const map = readMap();
  const sessions = [];
  const now = safeNow();
  const maxAgeMs = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  let changed = false;

  for (const [id, session] of Object.entries(map)) {
    const created = Date.parse(session.createdAt || session.updatedAt || "");
    if (!created || now - created > maxAgeMs) {
      delete map[id];
      changed = true;
      continue;
    }
    if (!session.id) {
      session.id = id;
    }
    sessions.push(session);
  }

  if (changed) {
    writeMap(map);
  }

  sessions.sort((a, b) => {
    const ta = Date.parse(a.updatedAt || a.createdAt || "") || 0;
    const tb = Date.parse(b.updatedAt || b.createdAt || "") || 0;
    return tb - ta;
  });

  return sessions;
}

export function saveSession(session) {
  if (!session || !session.id) return;
  const map = readMap();
  const existing = map[session.id];
  if (existing && !session.createdAt) {
    session.createdAt = existing.createdAt;
  }
  map[session.id] = session;
  writeMap(map);
}

export function deleteSession(id) {
  if (!id) return;
  const map = readMap();
  if (Object.prototype.hasOwnProperty.call(map, id)) {
    delete map[id];
    writeMap(map);
  }
}

