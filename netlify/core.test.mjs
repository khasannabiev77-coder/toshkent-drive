// Offline check of netlify/td-core.mjs with an in-memory store:  node netlify/core.test.mjs
import * as C from './td-core.mjs';
const mem = new Map();
const store = {
  async set(k, v) { mem.set(k, v); }, async setJSON(k, v) { mem.set(k, JSON.stringify(v)); },
  async get(k, o) { const v = mem.get(k); return v == null ? null : o && o.type === 'json' ? JSON.parse(v) : v; },
  async delete(k) { mem.delete(k); },
  async list({ prefix }) { return { blobs: [...mem.keys()].filter(k => k.startsWith(prefix)).sort().map(key => ({ key })) }; } };
const j = async r => ({ s: r.status, b: await r.json() });
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
const d1 = 'a'.repeat(16), d2 = 'b'.repeat(16), d3 = 'c'.repeat(16);
ok((await j(await C.hit(store, { d: d1, e: 'open' }))).s === 200, 'hit accepted');
await C.hit(store, { d: d1, e: 'open' }); await C.hit(store, { d: d2, e: 'play' });
ok((await j(await C.hit(store, { d: 'x', e: 'open' }))).s === 400, 'bad device rejected');
const today = (await C.stats(store, 1))[0];
ok(today.open === 1 && today.play === 1, 'stats count unique devices per day');
await C.submit(store, { b: 'drift', d: d1, n: 'Sardor', v: 3200 });
await C.submit(store, { b: 'drift', d: d2, n: 'Ali <b>', v: 5100 });
await C.submit(store, { b: 'drift', d: d1, n: 'Sardor', v: 2000 });
await C.submit(store, { b: 'drift', d: d1, n: 'Sardor', v: 6000 });
await C.submit(store, { b: 'drift', d: d3, n: 'Олим', v: 4000 });
const rows = (await j(await C.top(store, 'drift'))).b.rows;
ok(rows.map(r => r.v).join() === '6000,5100,4000', 'ranked best-first, one row per device');
ok(rows[1].n === 'Ali b' && rows[2].n === 'Олим', 'names cleaned, Cyrillic kept');
ok([...mem.keys()].filter(k => k.startsWith('s/')).length === 3, 'old score keys removed');
ok((await j(await C.submit(store, { b: 'drift', d: d1, n: '', v: 5 }))).s === 400, 'empty name rejected');
ok((await j(await C.submit(store, { b: 'earned', d: d1, n: 'a', v: 2e9 }))).s === 400, 'impossible score rejected');
ok(C.statsPage(await C.stats(store, 2)).includes('<table>'), 'stats page renders');
console.log(fails ? fails + ' failed' : 'all passed'); process.exit(fails ? 1 : 0);
