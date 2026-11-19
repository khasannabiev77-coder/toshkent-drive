#!/usr/bin/env node
// Open-world layer for Toshkent Drive v2.
// Takes the page produced by tools/v2/build.py and adds: the hero on foot, police & wanted levels, weather,
// story missions, side jobs, random events, phone, full map with GPS, save slots.
//   usage: node tools/v2/world/build.js <v2-index.html> <out-index.html> [<artifact-copy.html>]
// Every patch must match exactly once, so a change in the v2 sources fails loudly instead of building a broken page.
'use strict';
const fs = require('fs'), path = require('path');
const HERE = __dirname;
const [src, dst, copy] = process.argv.slice(2);
if (!src || !dst) { console.error('usage: node build.js <v2-index.html> <out.html> [<copy.html>]'); process.exit(2); }
let s = fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n');
if (s.includes('OPEN-WORLD SYSTEMS')) { console.error('input already contains the open-world layer'); process.exit(1); }
const read = f => fs.readFileSync(path.join(HERE, f), 'utf8').replace(/\r\n/g, '\n');
function rep(a, b) { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`patch anchor found ${n}x: ${a.slice(0, 90)}`); s = s.replace(a, () => b); }
// replace the text from `a` (inclusive) up to `b` (exclusive, or inclusive when incl) with `t`
function span(a, b, t, incl) { const i = s.indexOf(a); if (i < 0 || s.indexOf(a, i + 1) >= 0) throw new Error('span start: ' + a.slice(0, 80));
  const j = s.indexOf(b, i); if (j < 0) throw new Error('span end: ' + b.slice(0, 80)); s = s.slice(0, i) + t + s.slice(j + (incl ? b.length : 0)); }

/* ---------------- styles and markup ---------------- */
rep('</style>', read('world.css') + '</style>');
rep('    <div class="card loc">', '    <div class="card" id="hp"><span>Sogʻliq</span><i><u id="hpU"></u></i></div>\n    <div class="card loc">');
rep('    <div class="card" id="envChip">', '    <div class="card" id="obj"><div class="ot" id="objT">Missiya</div><div class="ox" id="objX"></div><div class="oz" id="objZ"></div></div>\n    <div class="card" id="envChip">');
rep('<div id="tr" class="card"><canvas id="mini" width="352" height="352"></canvas></div>', '<div id="tr" class="card"><canvas id="mini" width="352" height="352"></canvas></div>\n  <div id="stars" class="card" aria-label="Qidiruv darajasi"></div>');
rep('    <button class="hbtn" id="bShop">Avtosalon <kbd>B</kbd></button>', '    <button class="hbtn" id="bPhone">Telefon <kbd>P</kbd></button>\n    <button class="hbtn" id="bMap">Xarita <kbd>M</kbd></button>\n    <button class="hbtn" id="bShop">Avtosalon <kbd>B</kbd></button>');
rep('<button class="hbtn" id="bSound">Ovoz <kbd>M</kbd></button>', '<button class="hbtn" id="bSound">Ovoz</button>');
span('<div id="touch" style="visibility:hidden">', '  <div class="tb" id="tNitro" style="display:none">NITRO</div>\n</div>\n', `<div id="subs"><div></div></div>
<div id="hint" class="card"></div>

<div id="touch" style="visibility:hidden">
  <div id="tDrive">
    <div class="tb" id="tLeft" data-k="left">◀</div>
    <div class="tb" id="tRight" data-k="right">▶</div>
    <div class="tb" id="tBrake" data-k="down">TORMOZ</div>
    <div class="tb" id="tGas" data-k="up">GAZ</div>
    <div class="tb" id="tHb" data-k="hb">DRIFT</div>
    <div class="tb" id="tNitro" style="display:none">NITRO</div>
    <div class="tb" id="tExit" data-a="enter">CHIQISH</div>
  </div>
  <div id="tFoot">
    <div id="joy"><div id="joyK"></div></div>
    <div class="tb" id="tJump" data-a="jump">SAKRASH</div>
    <div class="tb" id="tRun" data-k="sprint">YUGURISH</div>
    <div class="tb" id="tPunch" data-a="punch">MUSHT</div>
    <div class="tb" id="tEnter" data-a="enter">MASHINA</div>
  </div>
  <div class="tb" id="tAct" data-a="act">E</div>
</div>

<div id="phone" role="dialog" aria-label="Telefon"><div class="ph-screen"><div class="ph-bar"><span id="phClock">09:00</span><span id="phWx"></span></div><div class="ph-body" id="phBody"></div></div><button class="ph-home-btn" id="phHome" aria-label="Bosh ekran"></button></div>
<div id="mapv">
  <canvas id="bigmap"></canvas>
  <div class="mv-top"><div class="card st-title" style="padding:6px 12px;font-size:20px">XARITA</div><span class="stat-line card" style="padding:7px 10px" id="mvSub">Bosing — GPS nuqta qoʻyish</span><div class="sp"></div>
    <button class="btn ghost" id="mvMe">Men</button><button class="btn ghost" id="mvIn">+</button><button class="btn ghost" id="mvOut">−</button><button class="btn ghost" id="mvClr">Nuqtani oʻchirish</button><button class="btn" id="mvClose">Yopish</button></div>
  <div class="mv-leg card"><i style="background:#fff"></i>Siz<i style="background:#b46cff"></i>GPS nuqta<i style="background:#f0b83e"></i>Hikoya missiyasi<i style="background:#4fd18b"></i>Qoʻshimcha ish<i style="background:#1fc1c4"></i>Diqqatga sazovor joy<i style="background:#ff5b4d"></i>Politsiya</div>
  <div class="card" id="mvInfo"></div>
</div>
<div id="flash"></div>
<div id="fade"><div><h2 id="fadeT"></h2><p id="fadeP"></p></div></div>
`, true);
rep('<div class="row"><button class="btn" id="play">Boshlash</button><button class="btn ghost" id="playShop">Avtosalon</button></div>',
  '<div class="row"><button class="btn" id="play">Davom etish</button><button class="btn ghost" id="newGame">Yangi oʻyin</button><button class="btn ghost" id="loadGame">Yuklash</button><button class="btn ghost" id="playShop">Avtosalon</button></div>\n    <div class="row" id="slotRow" style="gap:6px" hidden></div>');
rep('<p class="lead">Poytaxt koʻchalarida haydang, taksida pul ishlang, doʻkonlardan xarid qiling va garajingizni toʻldiring. Kun va tun, toʻrt fasl, 59 ta haqiqiy 3D mashina.</p>',
  '<p class="lead">Qoʻqondan kelgan Sardor poytaxtda yangi hayot boshlaydi: piyoda yuring, mashina haydang, hikoya missiyalari va ishlarni bajaring, politsiyadan qochib qutuling, doʻkonlardan xarid qiling. Kun va tun, toʻrt fasl, ob-havo, 59 ta haqiqiy 3D mashina.</p>');
span('    <div class="keys">', '    </div>\n', `    <div class="keys">
      <b>W A S D / ↑ ← ↓ →</b><span>Haydash · piyoda yurish (kamera tomonga)</span>
      <b>Probel · Shift</b><span>Drift · nitro (mashinada) / sakrash · yugurish (piyoda)</span>
      <b>F · E · Q</b><span>Mashinaga oʻtirish/tushish · Gaplashish, doʻkon · Musht</span>
      <b>P / Esc · M</b><span>Telefon (pauza) · Xarita</span>
      <b>T · C · H · K · N</b><span>Taksi · Kamera · Signal · Surat · Vaqt</span>
      <b>Sichqoncha</b><span>Piyodada kamerani aylantirish (bosib suring), gʻildirak — masofa</span>
    </div>
`, true);

/* ---------------- save data and money ---------------- */
span("let S={money:5000,owned:[{id:'chevrolet-damas',color:0,plate:randomPlate()}],cur:0,trips:0,earned:0,sound:true};", "function persist(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}\n", read('save.js'), true);
rep("function updMoney(){const v=UNLIMITED?'∞ Cheksiz':fmt(S.money);", "function updMoney(){const v=S.unlimited?'∞ Cheksiz':fmt(S.money);");
rep('S.money+=pay;S.earned+=pay;S.trips++;persist();', 'earn(pay);S.trips++;persist();');
rep('for(const c of CASH){if(Math.abs(c.x-P.x)<3.6&&Math.abs(c.z-P.z)<3.6){S.money+=c.val;S.earned+=c.val;persist();', 'for(const c of CASH){if(Math.abs(c.x-P.x)<3.6&&Math.abs(c.z-P.z)<3.6){earn(c.val);persist();');
rep("${S.money<c.price?' poor':''}", "${!canPay(c.price)?' poor':''}");
rep('can=S.money>=sp.price;', 'can=canPay(sp.price);');
rep('${changed?(S.money>=300?', '${changed?(canPay(300)?');
rep("if(id==='buy'){const sp=CAR[ST.sel];if(S.money<sp.price)return;S.money-=sp.price;", "if(id==='buy'){const sp=CAR[ST.sel];if(!pay(sp.price))return;");
rep("garajingizda','good');setPlayerCar();renderStageUI();}", "garajingizda','good');useOwnedCar();renderStageUI();}");
rep("if(id==='paint'){if(S.money<300)return;S.money-=300;S.owned[ST.gsel].color=ST.gcolor;persist();updMoney();if(ST.gsel===S.cur)setPlayerCar();",
  "if(id==='paint'){if(!pay(300))return;S.owned[ST.gsel].color=ST.gcolor;persist();updMoney();if(ST.gsel===S.cur&&!P.stolen)useOwnedCar();");
rep("if(id==='drive'){S.cur=ST.gsel;persist();setPlayerCar();closeStage();}", "if(id==='drive'){S.cur=ST.gsel;persist();useOwnedCar();closeStage();}");
rep('v=Math.round(sp.price*.6);S.money+=v;const curId', 'v=Math.round(sp.price*.6);earn(v);const curId');
rep('S.cur=Math.max(0,S.owned.indexOf(curId));persist();updMoney();setPlayerCar();', 'S.cur=Math.max(0,S.owned.indexOf(curId));persist();updMoney();if(!P.stolen)useOwnedCar();');

/* ---------------- world: colliders, police HQ, hospital ---------------- */
rep("const hemi=new THREE.HemisphereLight(C('#dbe9ff'),C('#6b6150'),.62);scene.add(hemi);", `const hemi=new THREE.HemisphereLight(C('#dbe9ff'),C('#6b6150'),.62);scene.add(hemi);
// Solid footprints for walking and camera collision: [x0,z0,x1,z1,top] in a 32 m hash grid
const COLL=[],CG=new Map(),CGS=32;
function addColl(x0,z0,x1,z1,top){const b=[x0,z0,x1,z1,top];COLL.push(b);for(let i=Math.floor(x0/CGS);i<=Math.floor(x1/CGS);i++)for(let j=Math.floor(z0/CGS);j<=Math.floor(z1/CGS);j++){const k=i*4096+j;let a=CG.get(k);if(!a)CG.set(k,a=[]);a.push(b);}}
function collAt(x,z){return CG.get(Math.floor(x/CGS)*4096+Math.floor(z/CGS))||[];}`);
rep('  box(cx,y0,cz,w,h,d,col,su,sv,roof){const x0=cx-w/2,x1=cx+w/2,z0=cz-d/2,z1=cz+d/2,y1=y0+h,o=.02;', '  box(cx,y0,cz,w,h,d,col,su,sv,roof){const x0=cx-w/2,x1=cx+w/2,z0=cz-d/2,z1=cz+d/2,y1=y0+h,o=.02;if(h>=1.5)addColl(x0,z0,x1,z1,y1);');
rep('function m(geo,ma,x,y,z,parent){const o=new THREE.Mesh(geo,ma);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;(parent||scene).add(o);return o;}',
  'function m(geo,ma,x,y,z,parent){const o=new THREE.Mesh(geo,ma);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;if(!parent)o.userData.col=1;(parent||scene).add(o);return o;}');
rep("'5,4':'salon'};", "'5,4':'salon','6,3':'police','6,5':'hosp'};");
rep('// mountains (Chimgan) far to the north-east', `// Police headquarters and hospital (respawn points)
{const b=blockOf('police'),x=b.cx,z=b.cz;
  m(box(60,13,26),mat('#eef0f2'),x,6.5,z-10);m(box(61,1.6,27),mat('#1f4fa0'),x,9.5,z-10);m(box(16,16,10),mat('#d9dde2'),x,8,z+6);
  const sg=new THREE.Mesh(new THREE.PlaneGeometry(22,3.6),new THREE.MeshBasicMaterial({map:signTex('POLITSIYA','#163f86','#ffffff')}));sg.position.set(x,13.4,z+11.05);scene.add(sg);
  m(box(70,.3,30),mat('#3f4448',{roughness:.6}),x,.3,z+32);
  LM.police={x,z,name:'Politsiya boshqarmasi'};}
{const b=blockOf('hosp'),x=b.cx,z=b.cz;
  m(box(70,20,24),mat('#f3f3ef'),x,10,z-14);m(box(26,28,20),mat('#e9ece8'),x+12,14,z-10);m(box(71,1.2,25),mat('#2f9e5a'),x,16,z-14);
  const sg=new THREE.Mesh(new THREE.PlaneGeometry(24,3.6),new THREE.MeshBasicMaterial({map:signTex('SHIFOXONA','#1f7a48','#ffffff')}));sg.position.set(x-14,17.8,z-1.9);scene.add(sg);
  m(box(70,.3,30),mat('#3f4448',{roughness:.6}),x,.3,z+30);
  LM.hosp={x,z,name:'Shahar shifoxonasi'};}
// register ground-standing landmark meshes as walking/camera colliders
scene.updateMatrixWorld(true);
{const bb=new THREE.Box3();scene.children.forEach(o=>{if(!o.isMesh||!o.userData.col)return;const r=o.rotation;if(Math.abs(r.x)>.01||Math.abs(r.z)>.01)return;bb.setFromObject(o);
  if(bb.min.y<2&&bb.max.y-bb.min.y>1.2&&bb.max.x-bb.min.x<140)addColl(bb.min.x,bb.min.z,bb.max.x,bb.max.z,bb.max.y);});}
// mountains (Chimgan) far to the north-east`);

/* ---------------- traffic, pedestrians, collisions ---------------- */
rep("const sp=CAR[pick(TCARS)],mesh=buildCar(sp,pick(TCOLS),{lod:true,proc:true,plate:randomPlate()});scene.add(mesh);\n  const t={axis,road:ROADS[i],lat,dir,pos:rnd(-700,700),speed:0,cruise:rnd(11,17),mesh,wait:0,",
  "const sp=CAR[pick(TCARS)],ci=pick(TCOLS),plate=randomPlate(),mesh=buildCar(sp,ci,{lod:true,proc:true,plate});scene.add(mesh);\n  const t={axis,road:ROADS[i],lat,dir,pos:rnd(-700,700),speed:0,cruise:rnd(11,17),mesh,ci,plate,gone:0,wait:0,");
rep('function updateTraffic(dt){\n  updateLights(dt);\n  for(const t of TRAFFIC){if(!t.mesh.visible)continue;', `let trafficCap=38,RAIN_N=2600;
function updateTraffic(dt){
  updateLights(dt);
  for(let i=0;i<TRAFFIC.length;i++){const t=TRAFFIC[i];
    // carjacked cars come back later somewhere out of sight; at night fewer cars are out
    if(t.gone>0){t.gone-=dt;if(t.gone<=0){let tries=0;do{t.pos=rnd(-700,700);placeT(t);tries++;}while(tries<20&&Math.hypot(t.x-cam.position.x,t.z-cam.position.z)<220);t.speed=0;t.mesh.visible=i<trafficCap;}continue;}
    const want=i<trafficCap;if(t.mesh.visible!==want){if(!want&&Math.hypot(t.x-cam.position.x,t.z-cam.position.z)>160)t.mesh.visible=false;else if(want)t.mesh.visible=true;}
    if(!t.mesh.visible)continue;`);
rep("    for(const o of TRAFFIC)if(o!==t&&o.mesh.visible)chk(o.x,o.z,15);\n    if(mode==='drive')chk(P.x,P.z,16);",
  "    for(const o of TRAFFIC)if(o!==t&&o.mesh.visible&&!o.gone)chk(o.x,o.z,15);\n    if(mode==='drive'||mode==='foot')chk(P.x,P.z,16);\n    if(mode==='foot')chk(HERO.x,HERO.z,12);\n    for(const a of AGENTS)if(a.on)chk(a.x,a.z,15);");
rep('function updatePeople(dt){const cx=cam.position.x,cz=cam.position.z;\n  for(let i=0;i<PEOPLE.length;i++){const p=PEOPLE[i];let x,z,h;\n    if(p.walk){const pv=V2.pedV(p,dt);p.s+=pv*p.dir*dt;p.ph+=pv*dt*5.4;[x,z,h]=perim(p);}else{x=p.x;z=p.z;h=p.h;p.ph+=dt*.6;}\n    if(Math.abs(x-cx)>PR||Math.abs(z-cz)>PR||(PSTEP>1&&i%PSTEP)){',
`function updatePeople(dt){const cx=cam.position.x,cz=cam.position.z;
  const nightSkip=ENV.night>.6?2:1;
  for(let i=0;i<PEOPLE.length;i++){const p=PEOPLE[i];let x,z,h;
    // knocked down: lie still, then get up and run (panic) for a while
    if(p.down>0){p.down-=dt;if(p.down<=0)p.panic=7;}else if(p.panic>0)p.panic-=dt;
    if(p.walk){const pv=p.down>0?0:p.panic>0?p.v*3.4:V2.pedV(p,dt);p.s+=pv*p.dir*dt;p.ph+=pv*dt*5.4;[x,z,h]=perim(p);}
    else if(p.panic>0&&!(p.down>0)){p.walk=true;p.b=BLOCKS.find(b=>p.x>=b.x0&&p.x<=b.x1&&p.z>=b.z0&&p.z<=b.z1)||BLOCKS[0];p.off=1.5;p.W=p.b.x1-p.b.x0-3;p.D=p.b.z1-p.b.z0-3;p.L=2*(p.W+p.D);p.s=0;p.dir=1;p.v=1.3;[x,z,h]=perim(p);}
    else{x=p.x;z=p.z;h=p.h;p.ph+=dt*.6;}
    p.cx=x;p.cz=z;
    if(Math.abs(x-cx)>PR||Math.abs(z-cz)>PR||(PSTEP>1&&i%PSTEP)||(nightSkip>1&&i%3===1&&!(p.down>0))){`);
rep('const a=p.walk&&!(p.pz>0)?Math.sin(p.ph)*.5:0,bob=p.walk?Math.abs(Math.cos(p.ph))*.03:Math.sin(p.ph)*.004;\n    _pp.set(x,.22,z);_pq.setFromAxisAngle(_pY,h);_ps.setScalar(p.sc);_pb.compose(_pp,_pq,_ps);',
  `const run=p.panic>0?1.5:1,a=p.down>0?0:p.walk&&!(p.pz>0)?Math.sin(p.ph)*.5*run:0,bob=p.down>0?0:p.walk?Math.abs(Math.cos(p.ph))*.03*run:Math.sin(p.ph)*.004;
    if(p.down>0){_pp.set(x,.24,z);_pq.setFromAxisAngle(_pY,h).multiply(_pqX);}else{_pp.set(x,.22,z);_pq.setFromAxisAngle(_pY,h);}
    _ps.setScalar(p.sc);_pb.compose(_pp,_pq,_ps);`);
rep(',_p0=new THREE.Matrix4().makeScale(0,0,0);', ',_p0=new THREE.Matrix4().makeScale(0,0,0),_pqX=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);');
rep('function crash(v){if(v<4)return;P.shake=Math.min(1,v/20);thud(v);', 'function crash(v){if(v<4)return;P.shake=Math.min(1,v/20);thud(v);if(MS.cur&&MS.d)MS.d.dmg=(MS.d.dmg||0)+v;');
rep('P.vx*=.6;P.vz*=.6;t.speed=0;crash(-vn);}}}\n}', `P.vx*=.6;P.vz*=.6;t.speed=0;crash(-vn);}}}
  for(const a of AGENTS){if(!a.on)continue;const dx=P.x-a.x,dz=P.z-a.z,d=Math.hypot(dx,dz);if(d<3.2&&d>.01){const nx=dx/d,nz=dz/d,push=(3.2-d)/2;P.x+=nx*push;P.z+=nz*push;a.x-=nx*push;a.z-=nz*push;
    const vn=(P.vx-a.vx)*nx+(P.vz-a.vz)*nz;if(vn<0){P.vx-=nx*vn*.9;P.vz-=nz*vn*.9;P.vx*=.75;P.vz*=.75;a.speed*=.4;a.hits+=-vn;crash(-vn);if(a.onHit)a.onHit(-vn);}}}
}`);

/* ---------------- player car, driving, HUD ---------------- */
rep('  const o=S.owned[S.cur];P.sp=CAR[o.id];P.mesh=buildCar(P.sp,o.color,{plate:o.plate});scene.add(P.mesh);',
  '  const o=P.veh||S.owned[S.cur];P.sp=CAR[o.id];P.mesh=buildCar(P.sp,o.color,{plate:o.plate});scene.add(P.mesh);P.mesh.position.set(P.x,0,P.z);P.mesh.rotation.y=P.h;');
rep('P.mesh.add(P.taxi);V2.onCar();\n}', "P.mesh.add(P.taxi);V2.onCar();\n}\n// P.veh is the car in use: normally a garage car, but it can be a carjacked or mission car\nfunction useOwnedCar(){P.veh=S.owned[S.cur];P.stolen=false;P.missionCar=null;setPlayerCar();}");
rep('6.5*t.grip*V2.gripMul())*dt);', '6.5*t.grip*V2.gripMul()*ENV.grip)*dt);');
span('function drawMini(){', '\nfunction drawSpeedo(', read('minimap.js'));
rep("  $('#street').textContent=where(P.x,P.z);$('#district').textContent=district(P.x,P.z)+' tumani · '+P.sp.brand+' '+P.sp.model;",
  "  hudExtra();\n  $('#street').textContent=where(px(),pz());$('#district').textContent=district(px(),pz())+' tumani · '+(mode==='foot'?'piyoda':P.sp.brand+' '+P.sp.model);");
rep('const dx=tgt.x-P.x,dz=tgt.z-P.z,d=Math.hypot(dx,dz);let ang=Math.atan2(dx,dz)-P.h;', 'const dx=tgt.x-px(),dz=tgt.z-pz(),d=Math.hypot(dx,dz);let ang=Math.atan2(dx,dz)-ph();');

/* ---------------- stage, flow, input ---------------- */
rep("function openStage(m){ST.mode=m;mode='stage';", "function openStage(m){if(mode!=='menu'&&!stageAllowed())return;if(mode==='foot')bringCarToHero();closePhone();ST.mode=m;mode='stage';");
rep("function startDrive(){camSnap=true;initAudio();if(A&&A.ac.state==='suspended')A.ac.resume();mode='drive';", "function startDrive(){camSnap=true;initAudio();if(A&&A.ac.state==='suspended')A.ac.resume();mode='drive';HERO.mesh.visible=false;document.body.classList.remove('foot');");
rep("canvas.addEventListener('wheel',e=>{if(mode!=='stage')return;", "canvas.addEventListener('wheel',e=>{if(mode==='foot'){e.preventDefault();FC.dist=clamp(FC.dist*(1+e.deltaY*.001),2.2,9);return;}if(mode!=='stage')return;");
span("$('#play').addEventListener('click',()=>{goLandscape();startDrive();});", "b.addEventListener('pointerleave',off);});\n", read('input.js'), true);
rep('TACT=G.traffic;TRAFFIC.forEach((tr,i)=>tr.mesh.visible=i<TACT);', 'TACT=G.traffic;trafficCap=TACT;RAIN_N={phone:900,pc:2600,ultra:4500}[k]||2600;');

/* ---------------- v2 hooks: weather over time-of-day, shops on foot, money setting ---------------- */
rep('  if(spot)spot.intensity=n*2.4;}', '  if(spot)spot.intensity=n*2.4;if(window.__TD_WORLD)weatherOverlay();}');
rep("    updParticles(dt);\n    if(mode!=='drive')return;", "    updParticles(dt);\n    if(mode!=='drive'&&mode!=='foot')return;");
rep("if(W.night>.05&&S.gfx!=='phone'){", "if(W.night>.05&&S.gfx!=='phone'&&mode==='drive'){");
rep('if(Math.hypot(P.vx,P.vz)<2.5)for(const s of SHOPPTS){const d=Math.abs(s.x-P.x)+Math.abs(s.z-P.z);', "if(mode==='foot'||Math.hypot(P.vx,P.vz)<2.5)for(const s of SHOPPTS){const d=Math.abs(s.x-px())+Math.abs(s.z-pz());");
rep("enterShop(){if(mode!=='drive'||!nearShop)return;curShop=nearShop;mode='shop';",
  "enterShop(){if((mode!=='drive'&&mode!=='foot')||!nearShop||PAUSED)return;if(WANT.lvl){toast('Qidiruvdasiz — doʻkonga kirib boʻlmaydi','bad');return;}closePhone();V2.prev=mode;curShop=nearShop;mode='shop';");
rep("closeShop(){$('#shopUI').hidden=true;curShop=null;startDrive();}", "closeShop(){if(mode!=='shop')return;$('#shopUI').hidden=true;curShop=null;if(V2.prev==='foot')startFoot();else startDrive();}");
rep("const own=it.e[0]==='up'&&S.up[it.e[1]],can=S.money>=it.p;", "const own=it.e[0]==='up'&&S.up[it.e[1]],can=canPay(it.p);");
rep("function buy(k){const c=CAT[curShop.name]||CAT['OZIQ-OVQAT'],it=c.items[k];if(!it||S.money<it.p)return;", "function buy(k){const c=CAT[curShop.name]||CAT['OZIQ-OVQAT'],it=c.items[k];if(!it||!canPay(it.p))return;");
rep('  S.money-=it.p;if(ty===', '  pay(it.p);if(ty===');
rep("+Math.abs(tp)+'°';}", "+Math.abs(tp)+'°'+(window.__TD_WORLD?' · '+WEATHERS[WX.cur].n:'');}");

/* ---------------- the open-world systems and the new frame loop replace the v2 tail ---------------- */
span('V2.init();setPlayerCar();\nP.mesh.position.set(P.x,0,P.z);P.mesh.rotation.y=P.h;', '})();\n</script>', read('world.js'));

fs.writeFileSync(dst, s);
if (copy) fs.writeFileSync(copy, s);
console.log('built', dst, s.length);
