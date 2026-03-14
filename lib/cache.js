// ── Client-side localStorage cache with TTL ────────────────────
// Reduces Supabase calls dramatically on re-navigation.
// Falls back gracefully if localStorage unavailable (SSR / private mode).

var PREFIX = 'lz_cache_';

function isClient() { return typeof window !== 'undefined'; }

export function cacheSet(key, data, ttlSeconds) {
  if (!isClient()) return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({
      data: data,
      exp: Date.now() + (ttlSeconds || 60) * 1000,
    }));
  } catch(e) {}
}

export function cacheGet(key) {
  if (!isClient()) return null;
  try {
    var raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    var obj = JSON.parse(raw);
    if (Date.now() > obj.exp) { localStorage.removeItem(PREFIX + key); return null; }
    return obj.data;
  } catch(e) { return null; }
}

export function cacheDel(key) {
  if (!isClient()) return;
  try { localStorage.removeItem(PREFIX + key); } catch(e) {}
}

export function cacheClear() {
  if (!isClient()) return;
  try {
    Object.keys(localStorage).filter(function(k) { return k.startsWith(PREFIX); })
      .forEach(function(k) { localStorage.removeItem(k); });
  } catch(e) {}
}

// Convenience: cache-first fetch
// If fresh cache exists → returns it instantly, then calls fetcher in background.
// If cache is stale/missing → calls fetcher, caches result.
export async function cacheFetch(key, fetcher, ttlSeconds, backgroundRefresh) {
  var cached = cacheGet(key);
  if (cached !== null) {
    if (backgroundRefresh) {
      // Return cached now, refresh in background
      fetcher().then(function(fresh) { cacheSet(key, fresh, ttlSeconds); }).catch(function() {});
    }
    return cached;
  }
  var data = await fetcher();
  cacheSet(key, data, ttlSeconds);
  return data;
}
