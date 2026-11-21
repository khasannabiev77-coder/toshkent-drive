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

/* ---------------- touch devices, installable app (PWA), Instagram bonus ---------------- */
rep('</style>', read('mobile.css') + '</style>');
// decide the touch layout before first paint; Settings → "Sensor tugmalar" can force it on/off
rep('<body>\n', `<body>
<script>(function(){function mm(q){try{return matchMedia(q).matches}catch(e){return false}}
window.__tdTouch=function(p){if(p==='on')return true;if(p==='off')return false;var t=navigator.maxTouchPoints>0||'ontouchstart' in window;
  return mm('(pointer:coarse)')||(t&&!mm('(any-pointer:fine)'))||(t&&/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));};
var p='auto';try{p=localStorage.getItem('td-touch')||'auto'}catch(e){}if(window.__tdTouch(p))document.body.classList.add('mob');
window.TOUCHUI=function(){return document.body.classList.contains('mob')};})();</script>
`);
rep('<title>Toshkent Drive</title>\n', `<title>Toshkent Drive</title>
<meta name="theme-color" content="#071015">
<meta name="description" content="Toshkent Drive — Toshkent koʻchalarida ochiq dunyo: piyoda yuring, mashina haydang, missiyalar, politsiya, kun-tun va ob-havo.">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/apple-180.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Toshkent Drive">
`);
// the phone layout follows body.mob instead of the (pointer:coarse) media query, which some phones and in-app browsers misreport
{ const i = s.indexOf('<style>'), j = s.indexOf('</style>'); let css = s.slice(i, j), out = '', k = 0, n = 0;
  const pre = sel => sel.split(',').map(x => { x = x.trim(); return x.startsWith('body') ? 'body.mob' + x.slice(4) : 'body.mob ' + x; }).join(',');
  for (;;) { const a = css.indexOf('@media (pointer:coarse){', k); if (a < 0) break; let d = 0, b = a + 23;
    for (; b < css.length; b++) { if (css[b] === '{') d++; else if (css[b] === '}' && --d === 0) break; }
    const inner = css.slice(a + 24, b).replace(/([^{}]+)\{([^{}]*)\}/g, (m0, sel, decl) => '\n' + pre(sel) + '{' + decl + '}');
    out += css.slice(k, a) + inner + '\n'; k = b + 1; n++; }
  if (n < 3) throw new Error('coarse media blocks: ' + n);
  s = s.slice(0, i) + out + css.slice(k) + s.slice(j); }
s = s.split("matchMedia('(pointer:coarse)').matches").join('TOUCHUI()');
rep("bs.setProperty('--W',w+'px');", "document.body.classList.toggle('short',h<380);document.body.classList.toggle('tiny',h<330);bs.setProperty('--W',w+'px');");
// phones: cap the render resolution and react sooner to dropped frames
rep('Math.min(dp,3,Math.max(1.5,1080/short))', 'Math.min(dp,2,Math.max(1.25,760/short))');
rep('if(fps<27)nd=Math.max(.55,dyn-.12);else if(fps>52&&dyn<1)nd=Math.min(1,dyn+.06);', 'if(fps<(TOUCHUI()?40:27))nd=Math.max(.5,dyn-.12);else if(fps>55&&dyn<1)nd=Math.min(1,dyn+.05);');
// icon buttons in the compact top bar
{ const IC = { bPhone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    bMap: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>',
    bTaxi: '<path d="M5 16h14l-1.5-5.5h-11zM7 10.5 8.5 7h7l1.5 3.5M7 16v2.5M17 16v2.5M10 4.5h4"/>',
    bCam: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    bSound: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>' };
  for (const id in IC) { const re = new RegExp('<button class="hbtn" id="' + id + '">([^<]+?)( <kbd>[^<]*</kbd>)?</button>'); const m = s.match(re); if (!m) throw new Error('hbtn ' + id);
    const t = m[1].trim(); s = s.replace(re, () => `<button class="hbtn" id="${id}" aria-label="${t}"><svg class="hi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[id]}</svg><span class="hl">${t}</span>${m[2] || ''}</button>`); } }
rep('<div class="tb" id="tExit" data-a="enter">CHIQISH</div>', '<div class="tb" id="tExit" data-a="enter"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/></svg>TUSHISH</div>');
rep('<div class="tb" id="tAct" data-a="act">E</div>', '<div class="tb" id="tAct" data-a="act">OK</div>');
rep('<button class="ph-home-btn" id="phHome"', '<button class="ph-x" id="phX" aria-label="Telefonni yopish">✕</button><button class="ph-home-btn" id="phHome"');
rep('    <div class="row" id="slotRow" style="gap:6px" hidden></div>\n', `    <div class="row" id="slotRow" style="gap:6px" hidden></div>
    <button class="ig-banner" id="igBanner" hidden><i class="igi"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></svg></i><span>Instagramda <b style="all:unset;font-weight:700">@azamowc</b> ga obuna boʻling — <em>$50,000</em> bonus</span><b id="igBtnT">Obuna boʻlish</b></button>
    <div class="row" id="installRow" hidden><button class="btn ghost" id="installBtn">Ilovani oʻrnatish</button><span class="stat-line" id="installHint"></span></div>
`);
// service worker (offline play, faster second start) and the install button
rep('</body>', `<script>
(function(){var row=document.getElementById('installRow'),btn=document.getElementById('installBtn'),hint=document.getElementById('installHint'),ev=null;
  var standalone=matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||navigator.standalone;
  if('serviceWorker' in navigator&&location.protocol!=='file:'&&!window.__TD_TEST)addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){});});
  addEventListener('beforeinstallprompt',function(e){e.preventDefault();ev=e;if(!standalone){row.hidden=false;hint.textContent='';}});
  addEventListener('appinstalled',function(){row.hidden=true;if(window.__tdHit)window.__tdHit('install');});
  if(!standalone&&/iPhone|iPad|iPod/.test(navigator.userAgent)){row.hidden=false;btn.hidden=true;hint.textContent='Ilova qilish: Safari → «Ulashish» → «Bosh ekranga qoʻshish»';}
  btn.addEventListener('click',function(){if(!ev)return;ev.prompt();ev.userChoice.then(function(){ev=null;row.hidden=true;});});})();
</script>
</body>`);

// promo-code hashes (tools/v2/world/promo.js)
rep('const PROMO=__PROMO__,', 'const PROMO=' + (fs.existsSync(path.join(HERE, 'promo.json')) ? JSON.stringify(JSON.parse(read('promo.json')).map(p => ({ h: p.h, sum: p.sum, until: p.until || '' }))) : '[]') + ',');
/* ---------------- phone graphics: light copies of the car models (tools/v2/world/lite.mjs → models-lite/) ---------------- */
{ const idx = path.join(path.dirname(dst), 'models-lite', '_index.json');
  const LITE = fs.existsSync(idx) ? JSON.parse(fs.readFileSync(idx, 'utf8')) : {};
  rep('<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/DRACOLoader.js"></script>\n',
    '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/DRACOLoader.js"></script>\n<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/meshopt_decoder.js"></script>\n<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/utils/SkeletonUtils.js"></script>\n');
  rep('function modelData(d){const k=d.key+\'@\'+MODEL_VER;',
    'const LITE=' + JSON.stringify(LITE) + ';\n// phones load the light copy (fewer triangles, smaller textures); computers keep the full model\nconst useLite=d=>!!(d&&d.key&&LITE[d.key])&&S.gfx===\'phone\';\nfunction modelData(d){const lite=useLite(d),k=d.key+(lite?\'@lite\':\'\')+\'@\'+MODEL_VER,base=lite?\'models-lite/\':\'models/\',np=lite?1:d.n;');
  rep("for(let i=0;i<d.n;i++)parts.push(fetch('models/'+d.key+'.part'+i+'.txt')", "for(let i=0;i<np;i++)parts.push(fetch(base+d.key+'.part'+i+'.txt')");
  rep("toast(c.brand+' '+c.model+': 3D model yuklanmoqda (~'+d.mb+' MB)…');\n  const ld=new THREE.GLTFLoader();",
    "toast(c.brand+' '+c.model+': 3D model yuklanmoqda (~'+(useLite(d)?LITE[d.key].mb:d.mb)+' MB)…');\n  const ld=new THREE.GLTFLoader();if(window.MeshoptDecoder&&ld.setMeshoptDecoder)ld.setMeshoptDecoder(window.MeshoptDecoder);");
  // light models store positions/normals/uvs as normalised integers; three r128 does not scale those in getX, so merge does
  rep('    list.forEach(o=>{const g=o.geometry,p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv,m=o.matrixWorld,flipW=m.determinant()<0;nm.getNormalMatrix(m);\n      for(let i=0;i<p.count;i++){const k=(vo+i)*3;v.fromBufferAttribute(p,i).applyMatrix4(m);',
    '    const dn=a=>{if(!a||!a.normalized)return 1;const A=a.array;return A instanceof Int8Array?1/127:A instanceof Uint8Array?1/255:A instanceof Int16Array?1/32767:A instanceof Uint16Array?1/65535:1;};\n    list.forEach(o=>{const g=o.geometry,p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv,m=o.matrixWorld,flipW=m.determinant()<0,sp=dn(p),su=dn(u);nm.getNormalMatrix(m);\n      for(let i=0;i<p.count;i++){const k=(vo+i)*3;v.fromBufferAttribute(p,i).multiplyScalar(sp).applyMatrix4(m);');
  rep('if(U&&u){U[(vo+i)*2]=u.getX(i);U[(vo+i)*2+1]=u.getY(i);}}', 'if(U&&u){U[(vo+i)*2]=u.getX(i)*su;U[(vo+i)*2+1]=u.getY(i)*su;}}'); }

/* ---------------- open-world driving: cars hit buildings (the per-building collider grid), not whole city blocks ---------------- */
rep("function collidePoint(px,pz,r){\n  let hit=null;\n  for(const b of BLOCKS){if(px>b.x0-r&&px<b.x1+r&&pz>b.z0-r&&pz<b.z1+r){\n    const pen=[[px-(b.x0-r),-1,0],[(b.x1+r)-px,1,0],[pz-(b.z0-r),0,-1],[(b.z1+r)-pz,0,1]].sort((a,c)=>a[0]-c[0])[0];\n    hit={d:pen[0],nx:pen[1],nz:pen[2]};break;}}",
  "const _cpSeen=new Set();\nfunction collidePoint(px,pz,r){\n  let hit=null;_cpSeen.clear();\n  for(const cx of [px-r,px+r])for(const cz of [pz-r,pz+r])for(const b of collAt(cx,cz)){if(_cpSeen.has(b))continue;_cpSeen.add(b);if(b[4]<.6)continue;\n    if(px>b[0]-r&&px<b[2]+r&&pz>b[1]-r&&pz<b[3]+r){const pen=[[px-(b[0]-r),-1,0],[(b[2]+r)-px,1,0],[pz-(b[1]-r),0,-1],[(b[3]+r)-pz,0,1]].sort((a,c)=>a[0]-c[0])[0];\n      if(!hit||pen[0]<hit.d)hit={d:pen[0],nx:pen[1],nz:pen[2]};}}");
// surface-aware grip and rolling drag (SURFACES table in world.js)
rep("  const up=keys.up,dn=keys.down,hb=keys.hb;\n  let braking=false;", "  const up=keys.up,dn=keys.down,hb=keys.hb;updateSurface();\n  let braking=false;");
rep("  vF=Math.min(vF,vmax);\n  vL*=Math.exp(-(hb?1.1:6.5*t.grip*V2.gripMul()*ENV.grip)*dt);",
  "  vF=Math.min(vF,vmax*SURF.cur.top);vF-=Math.sign(vF)*Math.min(Math.abs(vF),SURF.cur.drag*Math.abs(vF)*dt);\n  vL*=Math.exp(-(hb?1.1:6.5*t.grip*V2.gripMul()*ENV.grip*SURF.cur.grip)*dt);");

// soft ground does not screech like asphalt
rep("updateAudio(rpmS,up?1:0,Math.abs(vL),true,", "updateAudio(rpmS,up?1:0,Math.abs(vL)*(SURF.key==='grass'||SURF.key==='dirt'?.35:1),true,");
/* ---------------- vehicle physics: the two-axle tyre model (carDynamics in world.js) replaces the arcade yaw ---------------- */
rep("  let vF=P.vx*fx+P.vz*fz,vL=P.vx*rx+P.vz*rz;", "  let vF=P.vx*fx+P.vz*fz,vL=P.vx*rx+P.vz*rz;const vF0=vF;");
span("  vL*=Math.exp(-(hb?1.1:6.5*t.grip*V2.gripMul()*ENV.grip*SURF.cur.grip)*dt);", "  collide();",
  "  const target=(keys.left?1:0)-(keys.right?1:0);\n  P.steer+=(target-P.steer)*Math.min(1,dt*(target===0?7:4.5));\n  const D=carDynamics(dt,sp,vF,vL,vF0,{hb,up,dn});vF=D.vF;vL=D.vL;const steerAng=D.steerAng,yaw=D.yaw;P.slipR=D.slip;\n");

/* ---------------- engine audio: sub-octave layer, gear-shift dip, rev limiter, engine braking ---------------- */
rep(",true,{v:speed,brake:braking,hb:hb});", ",true,{v:speed,brake:braking,hb:hb,gear:gi});");
rep("b.connect(A.pre);b.start();A.src=b;A.key=key;}",
  "b.connect(A.pre);b.start();A.src=b;A.key=key;if(A.src2){try{A.src2.stop();}catch(e){}A.src2.disconnect();}if(!A.lowG){A.lowG=ac.createGain();A.lowG.gain.value=0;A.lowG.connect(A.pre);}const b2=ac.createBufferSource();b2.buffer=b.buffer;b2.loop=true;b2.connect(A.lowG);b2.start(0,b.buffer.duration*.37);A.src2=b2;}");
rep("    Q(A.src.playbackRate,real/120*8192/ac.sampleRate,.035);",
  "    Q(A.src.playbackRate,real/120*8192/ac.sampleRate,.035);if(A.src2){Q(A.src2.playbackRate,real/120*8192/ac.sampleRate*.5,.035);Q(A.lowG.gain,(.5*(1-rpm)+.1)*(thr?1:.7),.08);}");
rep("    Q(A.lp.frequency,500+rpm*2600+thr*(900+rpm*3200),.06);", "    Q(A.lp.frequency,(!thr&&v>5&&rpm>.35?.7:1)*(500+rpm*2600)+thr*(900+rpm*3200),.06);");
rep("    Q(A.eng.gain,(.11+rpm*.13)*(thr?1:.55)*pr.loud,.06);",
  "    const dtA=Math.min(.1,t-(A.lt||t));A.lt=t;if(x.gear!==undefined){if(A.gear!==undefined&&x.gear>A.gear&&thr)A.shift=.16;A.gear=x.gear;}A.shift=Math.max(0,(A.shift||0)-dtA);\n    const lim=thr&&rpm>.965?.55+.45*Math.sin(t*90):1,cut=A.shift>0?.3:1;\n    Q(A.eng.gain,(.11+rpm*.13)*(thr?1:.55)*pr.loud*lim*cut,A.shift>0?.015:.06);");
rep("  }else{if(A.src){try{A.src.stop();}catch(e){}A.src.disconnect();A.src=null;A.key='';}",
  "  }else{if(A.src){try{A.src.stop();}catch(e){}A.src.disconnect();A.src=null;A.key='';}if(A.src2){try{A.src2.stop();}catch(e){}A.src2.disconnect();A.src2=null;}");

/* ---------------- driving camera: pulls back with speed, lags on acceleration/braking, shows the drift angle ---------------- */
rep("  const camD=[{d:7.2+sp.L*.3,h:2.3+sp.H*.3,l:1.1},{d:12.5,h:4.4,l:1.4}][camMode];",
  "  const camD=[{d:7.2+sp.L*.3,h:2.3+sp.H*.3,l:1.1},{d:12.5,h:4.4,l:1.4}][camMode];\n  if(camD){const ax=clamp((vF-vF0)/Math.max(dt,1e-3),-12,12);P.camLag=(P.camLag||0)+(ax*.07-(P.camLag||0))*Math.min(1,dt*2.5);camD.d+=Math.min(3.2,speed*.05)+P.camLag;camD.h-=Math.min(.45,speed*.008);}");
rep("const ch=vF<-1?P.h:P.h+Math.atan2(Math.sin(vh-P.h),Math.cos(vh-P.h))*.35;", "const ch=vF<-1?P.h:P.h+Math.atan2(Math.sin(vh-P.h),Math.cos(vh-P.h))*(.35+.3*clamp(Math.abs(vL)/8,0,1));");

/* ---------------- facades: detailed window tile with depth (normal map) and glass/plaster roughness; split ACs and roof antennas ---------------- */
// The window opening keeps the same place in the tile as before, so the night-light atlas still lines up.
rep("const windowTex=ctex(64,64,(x)=>{x.fillStyle='#ffffff';x.fillRect(0,0,64,64);const g=x.createLinearGradient(0,14,0,50);g.addColorStop(0,'#5e7488');g.addColorStop(1,'#26323e');x.fillStyle=g;x.fillRect(12,14,40,34);x.fillStyle='rgba(255,255,255,.55)';x.fillRect(12,46,40,4);x.fillStyle='#d6d2c8';x.fillRect(31,14,2,34);},true);",
`// height map → tangent-space normal map (canvas, done once at start)
function nrmFromHeight(cv,k){const w=cv.width,h=cv.height,src=cv.getContext('2d').getImageData(0,0,w,h).data,out=document.createElement('canvas');out.width=w;out.height=h;const o=out.getContext('2d'),img=o.createImageData(w,h),d=img.data,H=(x,y)=>src[(((y+h)%h)*w+((x+w)%w))*4]/255;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const dx=(H(x+1,y)-H(x-1,y))*k,dy=(H(x,y+1)-H(x,y-1))*k,l=Math.hypot(dx,dy,1),i=(y*w+x)*4;d[i]=(-dx/l*.5+.5)*255;d[i+1]=(dy/l*.5+.5)*255;d[i+2]=(1/l*.5+.5)*255;d[i+3]=255;}
  o.putImageData(img,0,0);const t=new THREE.CanvasTexture(out);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=maxAniso;return t;}
function tileTex(draw,size){const cv=document.createElement('canvas');cv.width=cv.height=size;draw(cv.getContext('2d'),size);return cv;}
const WT=128,wO=[24,28,80,68]; // window opening x,y,w,h in a 128 px tile (same fractions as the night atlas)
const windowTex=(()=>{const cv=tileTex((x,s)=>{x.fillStyle='#ffffff';x.fillRect(0,0,s,s);
    for(let k=0;k<1400;k++){const g=232+Math.random()*23|0;x.fillStyle='rgba('+g+','+g+','+(g-4)+',.5)';x.fillRect(Math.random()*s,Math.random()*s,2,2);} // plaster
    x.fillStyle='rgba(0,0,0,.10)';x.fillRect(wO[0]-6,wO[1]-8,wO[2]+12,6);                       // lintel shadow
    x.fillStyle='#e9e6df';x.fillRect(wO[0]-4,wO[1]-4,wO[2]+8,wO[3]+8);                          // frame
    const g=x.createLinearGradient(0,wO[1],0,wO[1]+wO[3]);g.addColorStop(0,'#6f879c');g.addColorStop(.55,'#3a4b5b');g.addColorStop(1,'#26323e');x.fillStyle=g;x.fillRect(wO[0],wO[1],wO[2],wO[3]);
    x.fillStyle='rgba(235,226,205,.55)';x.fillRect(wO[0]+2,wO[1]+2,16,wO[3]-4);x.fillRect(wO[0]+wO[2]-18,wO[1]+2,16,wO[3]-4); // curtains
    x.fillStyle='rgba(255,255,255,.18)';x.beginPath();x.moveTo(wO[0]+20,wO[1]);x.lineTo(wO[0]+44,wO[1]);x.lineTo(wO[0]+26,wO[1]+wO[3]);x.lineTo(wO[0]+4,wO[1]+wO[3]);x.closePath();x.fill(); // reflection streak
    x.fillStyle='#d6d2c8';x.fillRect(wO[0]+wO[2]/2-2,wO[1],4,wO[3]);x.fillRect(wO[0],wO[1]+22,wO[2],3);  // mullions
    x.fillStyle='#cfcac0';x.fillRect(wO[0]-8,wO[1]+wO[3]+3,wO[2]+16,6);x.fillStyle='rgba(0,0,0,.16)';x.fillRect(wO[0]-8,wO[1]+wO[3]+9,wO[2]+16,4);},WT); // sill + its shadow
  const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;t.anisotropy=maxAniso;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;})();
const windowNrm=nrmFromHeight(tileTex((x,s)=>{x.fillStyle='#808080';x.fillRect(0,0,s,s);for(let k=0;k<2500;k++){const g=118+Math.random()*20|0;x.fillStyle='rgb('+g+','+g+','+g+')';x.fillRect(Math.random()*s,Math.random()*s,2,2);}
  x.fillStyle='#a8a8a8';x.fillRect(wO[0]-4,wO[1]-4,wO[2]+8,wO[3]+8);x.fillStyle='#303030';x.fillRect(wO[0],wO[1],wO[2],wO[3]);x.fillStyle='#707070';x.fillRect(wO[0]+wO[2]/2-2,wO[1],4,wO[3]);x.fillRect(wO[0],wO[1]+22,wO[2],3);
  x.fillStyle='#d0d0d0';x.fillRect(wO[0]-8,wO[1]+wO[3]+3,wO[2]+16,6);},WT),3.2);
const windowRgh=(()=>{const cv=tileTex((x,s)=>{x.fillStyle='#ececec';x.fillRect(0,0,s,s);x.fillStyle='#8a8a8a';x.fillRect(wO[0]-4,wO[1]-4,wO[2]+8,wO[3]+8);x.fillStyle='#262626';x.fillRect(wO[0],wO[1],wO[2],wO[3]);x.fillStyle='#909090';x.fillRect(wO[0]+wO[2]/2-2,wO[1],4,wO[3]);},WT);
  const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;})();`);
rep("const wallMat=new THREE.MeshStandardMaterial({map:windowTex,vertexColors:true,roughness:.85});",
  "const wallMat=new THREE.MeshStandardMaterial({map:windowTex,normalMap:windowNrm,normalScale:new THREE.Vector2(.9,.9),roughnessMap:windowRgh,vertexColors:true,roughness:1,envMapIntensity:.9});");
// split air conditioners under some windows and antennas / dishes on panel roofs (merged into the props mesh)
rep("function towerExtras(x,z,w,h,d,podium){", `function acUnits(x,z,w,d,h,su,sv,p){const c1=C('#e9ebec'),c2=C('#c9ccce');
  for(const [dir,len] of [['S',w],['N',w],['E',d],['W',d]]){const nu=Math.floor(len/su),nf=Math.floor((h-3)/sv);if(nu<1||nf<1)continue;
    for(let f=1;f<nf;f++)for(let u=0;u<nu;u++){if(R2()>p)continue;const t=-len/2+su*(u+.5)+su*.18,y=.28+f*sv-sv*.08;
      if(dir==='S')gProp.box(x+t,y,z+d/2+.17,.78,.52,.32,c1,0,0,c2);else if(dir==='N')gProp.box(x-t,y,z-d/2-.17,.78,.52,.32,c1,0,0,c2);
      else if(dir==='E')gProp.box(x+w/2+.17,y,z+t,.32,.52,.78,c1,0,0,c2);else gProp.box(x-w/2-.17,y,z-t,.32,.52,.78,c1,0,0,c2);}}}
function roofClutter(x,z,w,d,h){const st=C('#9aa1a7'),n=1+Math.floor(R2()*3);for(let k=0;k<n;k++){const ax=x+r2(-w*.35,w*.35),az=z+r2(-d*.35,d*.35);gProp.box(ax,.68+h,az,.08,r2(2.2,4.5),.08,st,0,0,st);gProp.box(ax,.68+h+1.4,az,1.1,.05,.05,st,0,0,st);}
  if(R2()<.7){const dx=x+r2(-w*.3,w*.3),dz=z+r2(-d*.3,d*.3);gProp.box(dx,.68+h,dz,.1,.7,.1,st,0,0,st);gProp.box(dx,.68+h+.7,dz,.9,.9,.12,C('#dfe2e4'),0,0,C('#dfe2e4'));}}
function towerExtras(x,z,w,h,d,podium){`);
rep("gW.box(lx,.28,lz,fw,h,fd,cc,3.4,3.3,C('#8e8c86'));centerExtras(lx,lz,fw,fd,h,cc);", "gW.box(lx,.28,lz,fw,h,fd,cc,3.4,3.3,C('#8e8c86'));centerExtras(lx,lz,fw,fd,h,cc);acUnits(lx,lz,fw,fd,h,3.4,3.3,.07);");
rep("gb.box(lx,.28,lz,fw,h,fd,pc,3.2,2.9,C('#8e8c86'));panelExtras(gb,lx,lz,len,dep,h,along,pc);", "gb.box(lx,.28,lz,fw,h,fd,pc,3.2,2.9,C('#8e8c86'));panelExtras(gb,lx,lz,len,dep,h,along,pc);if(gb===gW)acUnits(lx,lz,fw,fd,h,3.2,2.9,.06);roofClutter(lx,lz,fw,fd,h);");

/* ---------------- graphics presets: Very low / Low / Medium / High / Ultra, auto-detected, with an FPS guard ---------------- */
rep(" phone:{name:'Telefon',", " vlow:{name:'Juda past',dpr:1,sh:512,soft:false,area:45,trees:false,ppl:55,pstep:3,traffic:14,fog:[130,620],far:1200,pshadow:false,shadows:false},\n phone:{name:'Past',");
rep(" pc:{name:'Kompyuter',", " medium:{name:'Oʻrta',dpr:1.5,sh:1024,soft:false,area:75,trees:false,ppl:130,pstep:1,traffic:30,fog:[220,1150],far:3500,pshadow:false},\n pc:{name:'Yuqori',");
rep("RAIN_N={phone:900,pc:2600,ultra:4500}[k]||2600;", "RAIN_N={vlow:400,phone:900,medium:1700,pc:2600,ultra:4500}[k]||2600;");
rep("  sun.shadow.mapSize.set(G.sh,G.sh);", "  sun.castShadow=G.shadows!==false;sun.shadow.mapSize.set(G.sh,G.sh);");
rep("$('#bGfx').addEventListener('click',()=>{const o=['phone','pc','ultra'];applyGfx(o[(o.indexOf(S.gfx)+1)%3],true);});", "$('#bGfx').addEventListener('click',()=>{const o=Object.keys(GFX);S.gfxAuto=false;applyGfx(o[(o.indexOf(S.gfx)+1)%o.length],true);});");
rep("document.querySelectorAll('[data-gfx]').forEach(b=>b.addEventListener('click',()=>applyGfx(b.dataset.gfx,true)));", "document.querySelectorAll('[data-gfx]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.gfx==='auto'){S.gfxAuto=true;applyGfx(detectGfx(),true);}else{S.gfxAuto=false;applyGfx(b.dataset.gfx,true);}}));");
rep(" if(!S.gfx&&!TOUCHUI()&&(navigator.hardwareConcurrency||8)<=4)S.gfx='phone';}", "}");
rep("applyGfx(S.gfx||(TOUCHUI()?'phone':'pc'));", "if(!S.gfx||!GFX[S.gfx])S.gfxAuto=true;applyGfx(S.gfx&&GFX[S.gfx]?S.gfx:detectGfx());");
rep('<span class="stat-line">Grafika:</span><button class="chip" data-gfx="phone">Telefon (yengil)</button><button class="chip" data-gfx="pc">Kompyuter</button><button class="chip" data-gfx="ultra">Ultra (kuchli kompyuter)</button>',
  '<span class="stat-line">Grafika:</span><button class="chip" data-gfx="auto">Avto</button><button class="chip" data-gfx="vlow">Juda past</button><button class="chip" data-gfx="phone">Past</button><button class="chip" data-gfx="medium">Oʻrta</button><button class="chip" data-gfx="pc">Yuqori</button><button class="chip" data-gfx="ultra">Ultra</button>');
rep('#err{position:fixed;', '#fps{position:fixed;left:50%;top:calc(4px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:40;padding:2px 8px;border-radius:6px;background:rgba(0,0,0,.55);color:#9ef0b8;font:600 11px/1.4 var(--f-body);pointer-events:none}\n#err{position:fixed;');
// every "is this the light preset" check now covers both light presets
s = s.split("S.gfx!=='phone'").join('!LOWG()').split("S.gfx==='phone'").join('LOWG()');

/* ---------------- pedestrians: crossing roads at the lights (pedCorner/pedCross in world.js); cars give way ---------------- */
rep("    if(p.walk){const pv=p.down>0?0:p.panic>0?p.v*3.4:V2.pedV(p,dt);p.s+=pv*p.dir*dt;p.ph+=pv*dt*5.4;[x,z,h]=perim(p);}",
  "    if(p.walk&&p.cross&&!(p.down>0)&&!(p.panic>0)){[x,z,h]=pedCross(p,dt);}\n    else if(p.walk){if(p.cross){XW.delete(p);p.cross=null;}const pv=p.down>0?0:p.panic>0?p.v*3.4:V2.pedV(p,dt);p.s+=pv*p.dir*dt;p.ph+=pv*dt*5.4;[x,z,h]=perim(p);pedCorner(p,x,z);}");
rep("    if(mode==='foot')chk(HERO.x,HERO.z,12);", "    if(mode==='foot')chk(HERO.x,HERO.z,12);\n    for(const q of XW)chk(q.cx,q.cz,14);");

/* ---------------- draw only visible trees and pedestrians (packTrees / pcol / pedCounts in world.js) ---------------- */
rep("function applySeason(){const s=W.season=", "function applySeason(){if(window.__TD_WORLD)unpackTrees();const s=W.season=");
rep("    crown.setColorAt(k,col);}\n  crown.instanceColor.needsUpdate=true;", "    crown.setColorAt(k,col);}\n  crown.instanceColor.needsUpdate=true;if(window.__TD_WORLD)repackTrees();");
rep("  const nightSkip=ENV.night>.6?2:1;\n  for(let i=0;i<PEOPLE.length;i++){", "  const nightSkip=ENV.night>.6?2:1;let vi=0;packInit();\n  for(let i=0;i<PEOPLE.length;i++){");
rep("{if(!p.hid){p.hid=true;PI_.torso.setMatrixAt(i,_p0);PI_.head.setMatrixAt(i,_p0);PI_.hair.setMatrixAt(i,_p0);for(const j of [0,1]){PI_.legs.setMatrixAt(i*2+j,_p0);PI_.shoes.setMatrixAt(i*2+j,_p0);PI_.arms.setMatrixAt(i*2+j,_p0);}}continue;}", "{p.hid=true;continue;}");
rep("    pset(PI_.torso,i,0,1.13+bob,0);pset(PI_.head,i,0,1.565+bob,0);pset(PI_.hair,i,0,1.575+bob,0);\n    pset(PI_.legs,i*2,-.1,.86+bob,0,a);pset(PI_.legs,i*2+1,.1,.86+bob,0,-a);pset(PI_.shoes,i*2,-.1,.86+bob,0,a);pset(PI_.shoes,i*2+1,.1,.86+bob,0,-a);\n    pset(PI_.arms,i*2,-.25,1.4+bob,0,-a*.8);pset(PI_.arms,i*2+1,.25,1.4+bob,0,a*.8);}\n  Object.values(PI_).forEach(m=>m.instanceMatrix.needsUpdate=true);}",
  "    pset(PI_.torso,vi,0,1.13+bob,0);pset(PI_.head,vi,0,1.565+bob,0);pset(PI_.hair,vi,0,1.575+bob,0);\n    pset(PI_.legs,vi*2,-.1,.86+bob,0,a);pset(PI_.legs,vi*2+1,.1,.86+bob,0,-a);pset(PI_.shoes,vi*2,-.1,.86+bob,0,a);pset(PI_.shoes,vi*2+1,.1,.86+bob,0,-a);\n    pset(PI_.arms,vi*2,-.25,1.4+bob,0,-a*.8);pset(PI_.arms,vi*2+1,.25,1.4+bob,0,a*.8);pcol(i,vi);vi++;}\n  pedCounts(vi);Object.values(PI_).forEach(m=>m.instanceMatrix.needsUpdate=true);}");

// refuse to write a page whose inline scripts do not parse
{ const re = /<script>([\s\S]*?)<\/script>/g; let m, i = 0; while ((m = re.exec(s))) { i++; try { new Function(m[1]); } catch (e) { throw new Error('inline script ' + i + ': ' + e.message); } } }
fs.writeFileSync(dst, s);
if (copy) fs.writeFileSync(copy, s);
// the service worker next to the page, versioned by the page content so phones pick up each new build
{ const ver = require('crypto').createHash('sha1').update(s).digest('hex').slice(0, 10);
  fs.writeFileSync(path.join(path.dirname(dst), 'sw.js'), read('sw.template.js').replace('__VER__', ver)); }
console.log('built', dst, s.length);
