// Toshkent Drive server logic: anonymous daily usage counts and two leaderboards.
// Storage is append/overwrite only (one key per device per day/event; one score key per device per board),
// so concurrent players never read-modify-write the same key.
export const EVENTS = ['open', 'play', 'install', 'bonus', 'promo'];
export const BOARDS = { drift: { max: 400000 }, earned: { max: 1e9 } };
const DEV = /^[a-f0-9]{16,32}$/;
const day = (t = Date.now()) => new Date(t + 5 * 3600e3).toISOString().slice(0, 10); // Tashkent date (UTC+5)
const pad = v => String(Math.max(0, 1e12 - Math.round(v))).padStart(13, '0'); // ascending key = descending score
export const cleanName = n => String(n || '').normalize('NFC').replace(/[^\p{L}\p{N} _.\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
const json = (o, status = 200, cache = 'no-store') => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache } });

export async function hit(store, body) {
  const d = String(body && body.d || ''), e = String(body && body.e || '');
  if (!DEV.test(d) || !EVENTS.includes(e)) return json({ ok: false }, 400);
  await store.set(`${day()}/${e}/${d}`, '1');
  return json({ ok: true });
}

export async function stats(store, days = 14) {
  const rows = [];
  for (let i = 0; i < days; i++) { const k = day(Date.now() - i * 86400e3), c = Object.fromEntries(EVENTS.map(e => [e, 0]));
    const { blobs } = await store.list({ prefix: k + '/' });
    for (const b of blobs) { const e = b.key.split('/')[1]; if (e in c) c[e]++; }
    rows.push({ day: k, ...c }); }
  return rows;
}

export async function submit(store, body) {
  const b = String(body && body.b || ''), d = String(body && body.d || ''), n = cleanName(body && body.n), v = Number(body && body.v);
  if (!BOARDS[b] || !DEV.test(d) || !n || !Number.isFinite(v) || v <= 0 || v > BOARDS[b].max) return json({ ok: false }, 400);
  const ref = `dev/${b}/${d}`, old = await store.get(ref, { type: 'json' });
  if (old && old.v >= v && old.n === n) return json({ ok: true, kept: true });
  const best = old && old.v > v ? old.v : v, key = `s/${b}/${pad(best)}/${d}/${encodeURIComponent(n)}`;
  await store.set(key, '');
  if (old && old.key !== key) await store.delete(old.key);
  await store.setJSON(ref, { key, v: best, n });
  return json({ ok: true });
}

export async function top(store, b, limit = 20) {
  if (!BOARDS[b]) return json({ ok: false }, 400);
  const { blobs } = await store.list({ prefix: `s/${b}/` });
  const rows = blobs.map(x => x.key.split('/')).sort((p, q) => p[2] < q[2] ? -1 : p[2] > q[2] ? 1 : 0).slice(0, limit)
    .map(p => ({ v: 1e12 - Number(p[2]), n: decodeURIComponent(p[4] || ''), me: p[3].slice(0, 6) }));
  return json({ ok: true, b, rows }, 200, 'public, max-age=30');
}

export function statsPage(rows) {
  const tot = EVENTS.map(e => rows.reduce((a, r) => a + r[e], 0));
  const td = v => `<td>${v}</td>`;
  return `<!doctype html><html lang="uz"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Toshkent Drive — statistika</title>
<style>body{margin:0;padding:20px 16px;background:#071015;color:#eaf3f3;font:15px/1.5 system-ui,sans-serif}h1{font-size:22px;margin:0 0 4px}p{color:#8ea6aa;margin:0 0 16px}
table{border-collapse:collapse;width:100%;max-width:720px}th,td{padding:8px 10px;border-bottom:1px solid rgba(140,215,220,.16);text-align:right;font-variant-numeric:tabular-nums}th:first-child,td:first-child{text-align:left}th{color:#8ea6aa;font-weight:600;font-size:13px}tfoot td{font-weight:700;color:#f0b83e}</style>
<h1>Toshkent Drive — statistika</h1><p>Har bir qator: oʻsha kuni harakatni bajargan alohida qurilmalar soni (Toshkent vaqti). Shaxsiy maʼlumot saqlanmaydi.</p>
<table><thead><tr><th>Sana</th><th>Ochgan</th><th>Oʻynagan</th><th>Oʻrnatgan</th><th>Instagram bonus</th><th>Promo-kod</th></tr></thead>
<tbody>${rows.map(r => `<tr><td>${r.day}</td>${EVENTS.map(e => td(r[e])).join('')}</tr>`).join('')}</tbody>
<tfoot><tr><td>${rows.length} kun jami</td>${tot.map(td).join('')}</tr></tfoot></table></html>`;
}
