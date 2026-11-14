#!/usr/bin/env python3
"""Build Toshkent Drive v2 from the v1 base: applies source patches and injects v2.js, CSS and markup.
usage: build.py base_index.html out_index.html [--local]   (--local: load three.js from lib/ and models via <script>)"""
import sys, re, os
HERE = os.path.dirname(os.path.abspath(__file__))
src, dst = sys.argv[1], sys.argv[2]
LOCAL = '--local' in sys.argv
s = open(src, encoding='utf-8', newline='').read().replace('\r\n', '\n')

def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, (old[:70], c)
    s = s.replace(old, new)

def line(prefix, new):
    global s
    L = s.split('\n'); hit = [i for i, l in enumerate(L) if l.startswith(prefix)]
    assert len(hit) == 1, (prefix, len(hit))
    L[hit[0]] = new; s = '\n'.join(L)

# ---- sky with time-of-day uniforms
line("const SKY_FS=", "const SKY_FS='varying vec3 vP;uniform vec3 sunDir,cTop,cHor,cSun;uniform float sunI;void main(){float h=vP.y;vec3 c=mix(cHor,cTop,pow(clamp(h,.0001,1.),.55));if(h<0.)c=mix(cHor*.8,cHor*.42,clamp(-h*5.,0.,1.));float s=clamp(dot(vP,sunDir),.0001,1.);c+=cSun*sunI*(pow(s,600.)*6.+pow(s,8.)*.18);gl_FragColor=vec4(c,1.);}';")
line("function skyMat(){", "const SKYU={sunDir:{value:SUN},cTop:{value:new THREE.Color(.16,.38,.78)},cHor:{value:new THREE.Color(.78,.86,.93)},cSun:{value:new THREE.Color(1,.9,.7)},sunI:{value:1}};\nfunction skyMat(){return new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:SKYU,vertexShader:SKY_VS,fragmentShader:SKY_FS});}")
rep("scene.add(new THREE.HemisphereLight(C('#dbe9ff'),C('#6b6150'),.62));", "const hemi=new THREE.HemisphereLight(C('#dbe9ff'),C('#6b6150'),.62);scene.add(hemi);")
# ---- crisper road markings
rep("[1,2,3].forEach(n=>{roadTex[n]=ctex(256,256,(x,w,h)=>{asphalt(x,w,h);", "[1,2,3].forEach(n=>{roadTex[n]=ctex(512,512,(x,w,h)=>{x.save();x.scale(2,2);w=256;h=256;asphalt(x,w,h);")
rep("for(let k=1;k<n;k++){const o=128*k/n;x.fillRect(128-o-2,0,4,110);x.fillRect(128+o-2,0,4,110);}}},true);});", "for(let k=1;k<n;k++){const o=128*k/n;x.fillRect(128-o-2,0,4,110);x.fillRect(128+o-2,0,4,110);}}x.restore();},true);});")
# ---- references the environment code needs
rep("const LEN=EDGE*2;", "const LEN=EDGE*2,ROADM=[],ENVM={};")
rep("const mat=new THREE.MeshStandardMaterial({map:roadTex[LANES(i)],roughness:.9});", "const mat=new THREE.MeshStandardMaterial({map:roadTex[LANES(i)],roughness:.9});ROADM.push(mat);")
rep("gWb.mesh(new THREE.", "gWb.mesh(ENVM.balc=new THREE.")
rep("gLawn.mesh(new THREE.", "gLawn.mesh(ENVM.lawn=new THREE.")
rep("gFront.mesh(new THREE.", "gFront.mesh(ENVM.front=new THREE.")
rep("gSign.mesh(new THREE.", "gSign.mesh(ENVM.sign=new THREE.")
rep("box(.4,.14,.7),mat('#f5f2e0'", "box(.4,.14,.7),ENVM.lamp=mat('#f5f2e0'")
rep("const TREE_MESHES=[];", "const TREE_MESHES=[],TREE_POP=[];")
rep("const pop=R2()<.2;", "const pop=R2()<.2;TREE_POP.push(pop);")
rep("sn=new THREE.MeshBasicMaterial({color:C('#e6edf3'),fog:false});", "sn=new THREE.MeshBasicMaterial({color:C('#e6edf3'),fog:false});ENVM.mt=[mm,sn];")
# ---- map: landmarks placed by their real directions from Amir Temur square, real street names
rep("const SPECIAL={'4,3':'temur','3,3':'mustaqillik','3,4':'city','2,4':'city2','5,1':'tv','1,4':'chorsu','1,2':'imom','5,4':'salon','4,4':'park'};",
    "const SPECIAL={'4,3':'temur','5,3':'hotel','3,3':'mustaqillik','2,2':'city','1,2':'city2','2,3':'park','4,0':'tv','3,0':'minor','0,1':'chorsu','0,0':'imom','3,4':'navoi','2,5':'humo','1,6':'magic','5,4':'salon'};")
line("const VN=[", "const VN=['Kichik halqa yoʻli (gʻarb)','Furqat koʻchasi','Olmazor koʻchasi','Sharof Rashidov shoh koʻchasi','Amir Temur shoh koʻchasi','Shahrisabz koʻchasi','Nukus koʻchasi','Mirobod koʻchasi','Kichik halqa yoʻli (sharq)'];")
line("const HN=[", "const HN=['Kichik halqa yoʻli (shimol)','Abdulla Qodiriy koʻchasi','Navoiy shoh koʻchasi','Islom Karimov koʻchasi','Mustaqillik shoh koʻchasi','Afrosiyob koʻchasi','Bobur koʻchasi','Bunyodkor shoh koʻchasi','Kichik halqa yoʻli (janub)'];")
line("VN[0]=", "")
rep("const green=['park','temur','mustaqillik','city','city2','tv','imom'].includes(b.kind);", "const green=['park','temur','mustaqillik','city','city2','tv','imom','minor','navoi','humo','magic','hotel'].includes(b.kind);")
rep("['park','temur','mustaqillik','imom','tv'].includes(b.kind)?'#2a4a32'", "['park','temur','mustaqillik','imom','tv','minor','navoi','humo','magic','hotel'].includes(b.kind)?'#2a4a32'")
rep("LM.city={x:-90,z:90,name:'Tashkent City'};", "{const b=blockOf('city');LM.city={x:b.cx,z:b.cz,name:'Tashkent City'};}")
rep("const PLACES=[LM.temur,LM.must,LM.city,LM.tv,LM.chorsu,LM.imom,LM.salon,LM.park].map(", "const PLACES=Object.values(LM).map(")
rep("// mountains (Chimgan) far to the north-east", open(os.path.join(HERE, 'landmarks.js'), encoding='utf-8').read() + "\n// mountains (Chimgan) far to the north-east")
# ---- real economy
rep("const UNLIMITED=true;if(UNLIMITED)S.money=1e12;", "const UNLIMITED=false;if(!(S.money<1e9))S.money=25000;")
rep("$('#money2').textContent=v;}", "$('#money2').textContent=v;const m3=$('#money3');if(m3)m3.textContent=v;}")
# ---- taxi modifiers
rep("taxi.limit=Math.round(dist/11+22);", "taxi.limit=Math.round((dist/11+22)*V2.limitMul());")
rep("taxi.fare=(120+dist*1.1)*(1+P.sp.price/100000);", "taxi.fare=(120+dist*1.1)*(1+P.sp.price/100000)*V2.fareMul();")
rep("if(taxi.stage==='drop'&&v>7){", "if(taxi.stage==='drop'&&v>7&&!S.up.kit){")
# ---- driving physics
rep("const sp=P.sp,vmax=sp.top/3.6,acc=27.8/sp.acc*1.2,t=T[sp.type];", "const sp=P.sp,vmax=sp.top/3.6*V2.vmaxMul(),acc=27.8/sp.acc*1.2*V2.accMul(),t=T[sp.type];")
rep("if(dn){if(vF>.5){vF-=15*dt;braking=true;}", "if(dn){if(vF>.5){vF-=15*V2.brakeMul()*dt;braking=true;}")
rep("vL*=Math.exp(-(hb?1.1:6.5*t.grip)*dt);", "vL*=Math.exp(-(hb?1.1:6.5*t.grip*V2.gripMul())*dt);")
rep("g.rotation.set(clamp(-(up?1:0)*.008+(braking?.015:0),-.03,.03),P.h,clamp(-yaw*vF*.0035,-.06,.06));", "V2.body(g,dt,yaw,vF);")
rep("P.taxi.visible=taxi.on;P.mesh.add(P.taxi);\n}", "P.taxi.visible=taxi.on;P.mesh.add(P.taxi);V2.onCar();\n}")
# ---- traffic turns at junctions
rep("t.speed+=clamp(desired-t.speed,-9*dt,3*dt);", "desired=V2.plan(t,desired);t.speed+=clamp(desired-t.speed,-9*dt,3*dt);")
rep("placeT(t);t.mesh.position.set(t.x,0,t.z);t.mesh.rotation.y=t.h;", "V2.turn(t);placeT(t);t.mesh.position.set(t.x,0,t.z);t.mesh.rotation.y=V2.head(t,dt);")
# ---- pedestrians
rep("if(p.walk){p.s+=p.v*p.dir*dt;p.ph+=p.v*dt*5.4;[x,z,h]=perim(p);}", "if(p.walk){const pv=V2.pedV(p,dt);p.s+=pv*p.dir*dt;p.ph+=pv*dt*5.4;[x,z,h]=perim(p);}")
rep("    p.hid=false;\n", "    p.hid=false;if(mode==='drive'&&p.walk){const q=V2.pedDodge(p,x,z,dt);x=q[0];z=q[1];}\n")
rep("const a=p.walk?Math.sin(p.ph)*.5:0,", "const a=p.walk&&!(p.pz>0)?Math.sin(p.ph)*.5:0,")
# ---- minimap route, keys, frame loop, quality
rep("mctx.translate(W/2,W/2);mctx.rotate(Math.PI-P.h);", "V2.nav(mctx,W,s);mctx.translate(W/2,W/2);mctx.rotate(Math.PI-P.h);")
rep("if(e.code==='Escape'&&mode==='stage')closeStage();return;}", "if(e.code==='Escape'&&mode==='stage')closeStage();if((e.code==='Escape'||e.code==='KeyE')&&mode==='shop'&&!e.repeat)V2.closeShop();return;}")
rep("  if(e.code==='KeyH')horn();", "  if(e.code==='KeyH')horn();\n  if(e.code==='KeyE')V2.enterShop();\n  if(e.code==='KeyN')V2.nextTime();\n  if(e.code==='ShiftLeft'||e.code==='ShiftRight')V2.nitro();")
rep("  if(mode==='drive'){updateTraffic(dt);updatePeople(dt);updateDrive(dt);sky.position.copy(cam.position);renderer.render(scene,cam);}",
    "  V2.tick(dt);\n  if(mode==='drive'){updateTraffic(dt);updatePeople(dt);updateDrive(dt);sky.position.copy(cam.position);renderer.render(scene,cam);}\n  else if(mode==='shop'){renderer.render(scene,cam);}")
rep("  renderer.setPixelRatio(Math.min(devicePixelRatio||1,G.dpr));\n  const type=", "  V2.setDpr(G,k);\n  const type=")
rep("\nsetPlayerCar();\nP.mesh.position.set(P.x,0,P.z);", "\nV2.init();setPlayerCar();\nP.mesh.position.set(P.x,0,P.z);")
rep("if(window.__TD_TEST)window.__td={", "if(window.__TD_TEST)window.__td={V2,W,SHOPPTS2:SHOPPTS,LM,applySeason,startDrive,resetToRoad,setPlayerCar,BLOCKS,updateTraffic,updatePeople,updateDrive,ROADS,")
rep("menuA+=dt*.05;const cx=40,cz=-20;cam.position.set(cx+Math.cos(menuA)*230,95,cz+Math.sin(menuA)*230);cam.lookAt(cx,25,cz);", "menuA+=dt*.05;const cx=V2.cam?V2.cam[3]:40,cz=V2.cam?V2.cam[5]:-20;cam.position.set(cx+Math.cos(menuA)*230,95,cz+Math.sin(menuA)*230);cam.lookAt(cx,25,cz);if(V2.cam){cam.position.set(V2.cam[0],V2.cam[1],V2.cam[2]);cam.lookAt(V2.cam[3],V2.cam[4],V2.cam[5]);}")
rep("/* ================= GRAPHICS PRESETS ================= */", open(os.path.join(HERE, 'v2.js'), encoding='utf-8').read() + "\n/* ================= GRAPHICS PRESETS ================= */")
# ---- markup
logo = '<svg viewBox="0 0 640 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Toshkent Drive">' + open(os.path.join(HERE, 'logo_inner.svg'), encoding='utf-8').read() + '</svg>'
SOC = '<div class="social"><a href="https://instagram.com/azamowc" target="_blank" rel="noopener"><i>Instagram</i><b>@azamowc</b></a><a href="https://t.me/azamowic" target="_blank" rel="noopener"><i>Telegram</i><b>@azamowic</b></a></div>'
rep("</style>", open(os.path.join(HERE, 'logo.css'), encoding='utf-8').read() + open(os.path.join(HERE, 'v2.css'), encoding='utf-8').read() + "</style>")
rep('<canvas id="gl" tabindex="0"></canvas>', '<canvas id="gl" tabindex="0"></canvas>\n<div id="splash"><div class="sp-in">' + logo + '<div class="sp-sub">Poytaxt koʻchalarida haydash simulyatori</div>' + SOC + '</div></div>')
rep('    <div class="card" id="taxi">', '    <div class="card" id="envChip">09:30 · Yoz</div>\n    <div class="card" id="taxi">')
rep('    </div>\n  </div>\n  <div id="tr" class="card">', '    </div>\n    <div id="buffs"></div>\n  </div>\n  <button id="prompt" class="card" hidden></button>\n  <div id="tr" class="card">')
rep('    <button class="hbtn" id="bGfx">Grafika</button>', '    <button class="hbtn" id="bTime">Vaqt <kbd>N</kbd></button>\n    <button class="hbtn" id="bSeason">Fasl</button>\n    <button class="hbtn" id="bGfx">Grafika</button>')
rep('  <div class="tb" id="tHb" data-k="hb">DRIFT</div>', '  <div class="tb" id="tHb" data-k="hb">DRIFT</div>\n  <div class="tb" id="tNitro" style="display:none">NITRO</div>')
rep('<div id="menu">\n  <div class="menu-in">\n    <div class="eyebrow">Toshkent · Haydash simulyatori</div>\n    <h1 class="logo">TOSHKENT<br><em>DRIVE</em></h1>',
    '<div id="shopUI" hidden><div class="shop-card card"><div class="shop-head"><div><div class="eyebrow" id="shopKind"></div><h2 id="shopName"></h2><p id="shopHello"></p></div><div class="sp"></div><div class="card money"><span id="money3">$0</span></div><button class="btn ghost" id="shopClose">Chiqish</button></div><div id="shopItems"></div></div></div>\n'
    '<div id="menu">\n  <div class="menu-in">\n    <div class="menu-logo">' + logo + '</div>')
rep('<p class="lead">Poytaxt koʻchalarida haydang, taksida pul ishlang, avtosalondan yangi mashina sotib oling va shaxsiy garajingizni toʻldiring. 59 ta haqiqiy 3D mashina modeli, 18 xil rang.</p>',
    '<p class="lead">Poytaxt koʻchalarida haydang, taksida pul ishlang, doʻkonlardan xarid qiling va garajingizni toʻldiring. Kun va tun, toʻrt fasl, 59 ta haqiqiy 3D mashina.</p>')
rep('    <div class="keys">', '    <div class="row" style="gap:6px"><span class="stat-line">Vaqt:</span><button class="chip" data-tod="auto">Avto</button><button class="chip" data-tod="morning">Ertalab</button><button class="chip" data-tod="day">Kunduz</button><button class="chip" data-tod="evening">Kechqurun</button><button class="chip" data-tod="night">Tun</button></div>\n'
    '    <div class="row" style="gap:6px"><span class="stat-line">Fasl:</span><button class="chip" data-season="auto">Avto</button><button class="chip" data-season="spring">Bahor</button><button class="chip" data-season="summer">Yoz</button><button class="chip" data-season="autumn">Kuz</button><button class="chip" data-season="winter">Qish</button></div>\n    <div class="keys">')
rep('      <b>T · C · H</b><span>Taksi · Kamera · Signal</span>', '      <b>T · C · H</b><span>Taksi · Kamera · Signal</span>\n      <b>E · Shift · N</b><span>Doʻkonga kirish · Nitro · Vaqt</span>')
rep('    <div class="stat-line" id="credits" style="font-size:11.5px;line-height:1.5;max-width:60ch"></div>', '    ' + SOC + '\n    <div class="stat-line" id="credits" style="font-size:11.5px;line-height:1.5;max-width:60ch"></div>')
if LOCAL:
    rep('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>', '<script src="lib/three.min.js"></script>')
    rep('<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>', '<script src="lib/GLTFLoader.js"></script>')
    rep('<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/DRACOLoader.js"></script>', '<script src="lib/DRACOLoader.js"></script>')
    # opened from disk (file://) fetch() is blocked, so models come in as scripts
    rep("const parts=[];for(let i=0;i<d.n;i++)parts.push(fetch('models/'+d.key+'.part'+i+'.txt').then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.text();}));",
        "const parts=[new Promise((res,rej)=>{const sc=document.createElement('script');sc.src='models/'+d.key+'.js';sc.onload=()=>{const v=(window.TDM||{})[d.key];if(v){delete window.TDM[d.key];res(v);}else rej(new Error('empty'));sc.remove();};sc.onerror=()=>rej(new Error('load'));document.head.appendChild(sc);})];")
    rep("'ferrari-458-italia':{url:'models/ferrari.json',mb:2,", "'ferrari-458-italia':{url:window.TD_FERRARI||'models/ferrari.json',mb:2,")
    rep('<script src="lib/DRACOLoader.js"></script>', '<script src="lib/DRACOLoader.js"></script>\n<script src="models/ferrari.js"></script>')
    rep("dl.setDecoderConfig({type:'js'});", "dl.setDecoderConfig({type:'js'});if(window.TD_DRACO_SRC)dl._loadLibrary=()=>Promise.resolve(window.TD_DRACO_SRC);")
    rep('<script src="models/ferrari.js"></script>', '<script src="models/ferrari.js"></script>\n<script src="lib/draco_src.js"></script>')
open(dst, 'w', encoding='utf-8', newline='').write(s)
print('built', dst, len(s))
