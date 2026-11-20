#!/usr/bin/env node
// Promo codes for Instagram stories. The game stores only a hash of each code, so the codes are not readable in the page.
//   node tools/v2/world/promo.js add KOD 25000 2026-12-31   — add a code (amount in $, last valid day)
//   node tools/v2/world/promo.js list                       — show stored codes (hashes, amounts, dates)
//   node tools/v2/world/promo.js del KOD                    — remove a code
// Then rebuild index.html (node tools/v2/world/build.js …) and push.
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const F = path.join(__dirname, 'promo.json');
const list = fs.existsSync(F) ? JSON.parse(fs.readFileSync(F, 'utf8')) : [];
const hash = c => crypto.createHash('sha256').update('td:' + String(c).trim().toUpperCase()).digest('hex');
const [cmd, code, sum, until] = process.argv.slice(2);
if (cmd === 'add') {
  if (!code || !(+sum > 0)) { console.error('usage: add KOD SUMMA [YYYY-MM-DD]'); process.exit(2); }
  const h = hash(code), i = list.findIndex(p => p.h === h), e = { h, sum: Math.round(+sum), until: until || '' };
  if (i >= 0) list[i] = e; else list.push(e);
  fs.writeFileSync(F, JSON.stringify(list, null, 1) + '\n'); console.log('qoʻshildi:', code.toUpperCase(), '$' + e.sum, e.until ? 'gacha ' + e.until : 'muddatsiz');
} else if (cmd === 'del') {
  const h = hash(code || ''); const n = list.filter(p => p.h !== h); fs.writeFileSync(F, JSON.stringify(n, null, 1) + '\n'); console.log(list.length - n.length ? 'oʻchirildi' : 'topilmadi');
} else { list.forEach(p => console.log(p.h.slice(0, 12) + '…', '$' + p.sum, p.until || 'muddatsiz')); }
