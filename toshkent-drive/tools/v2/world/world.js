/* =====================================================================
   OPEN-WORLD SYSTEMS
   ENV clock/sun/weather · HERO on foot · WANT + AGENTS police & AI cars
   MS missions · DLG dialogue · phone · map/GPS · events · saves
   ===================================================================== */
const wrapA=a=>Math.atan2(Math.sin(a),Math.cos(a));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const resolve=(v,d,x)=>typeof v==='function'?v(d,x):v;
let PAUSED=false,phoneOpen=false,mapOpen=false,GOD=false,WORLD_READY=false;
const DEBUG=/debug/.test(location.hash);
function px(){return mode==='foot'?HERO.x:P.x;}
function pz(){return mode==='foot'?HERO.z:P.z;}
function ph(){return mode==='foot'?HERO.h:P.h;}
function playerSpeed(){return mode==='drive'?Math.hypot(P.vx,P.vz):HERO.spd;}
function toView(e){return ROT?{x:e.clientY,y:innerWidth-e.clientX}:{x:e.clientX,y:e.clientY};}

/* ---------- road helpers ---------- */
function roadOf(v){for(let i=0;i<9;i++)if(Math.abs(v-ROADS[i])<RW(i)/2+1.5)return i;return -1;}
function nearestRoadIdx(v){let b=0;for(let i=1;i<9;i++)if(Math.abs(v-ROADS[i])<Math.abs(v-ROADS[b]))b=i;return b;}
function blockAt(x,z){for(const b of BLOCKS)if(x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1)return b;return null;}
function groundAt(x,z){const b=blockAt(x,z);if(!b)return .03;if(x>b.x0+4.5&&x<b.x1-4.5&&z>b.z0+4.5&&z<b.z1-4.5)return .284;return .224;}
// closest point on the road grid, a quarter of the road width off the centre line, with a heading along the road
function snapRoad(x,z){const i=nearestRoadIdx(x),j=nearestRoadIdx(z),L=EDGE-8;
  if(Math.abs(x-ROADS[i])<Math.abs(z-ROADS[j]))return {x:ROADS[i]+RW(i)*.28*(x>=ROADS[i]?1:-1),z:clamp(z,-L,L),h:x>=ROADS[i]?Math.PI:0};
  return {x:clamp(x,-L,L),z:ROADS[j]+RW(j)*.28*(z>=ROADS[j]?1:-1),h:z>=ROADS[j]?Math.PI/2:-Math.PI/2};}
function roadsidePoint(p){const vi=roadOf(p.x),hj=roadOf(p.z);
  if(vi>=0&&(hj<0||Math.random()<.5)){const s=p.x>=ROADS[vi]?1:-1;return {x:ROADS[vi]+s*(RW(vi)/2+1.6),z:p.z,h:p.h};}
  if(hj>=0){const s=p.z>=ROADS[hj]?1:-1;return {x:p.x,z:ROADS[hj]+s*(RW(hj)/2+1.6),h:p.h};}return p;}
// road point in front of a landmark block (its southern street)
function lmRoad(k,dx){const l=LM[k],b=blockAt(l.x,l.z)||BLOCKS[0],j=Math.min(8,b.j+1);return {x:clamp(l.x+(dx||0),b.x0+6,b.x1-6),z:ROADS[j]-RW(j)*.28,h:Math.PI/2};}
// a road point min..max metres from the player, preferably out of the camera's view
const _cf=new THREE.Vector3();
function spawnPoint(minD,maxD,anyView){const X=px(),Z=pz();cam.getWorldDirection(_cf);
  for(let k=0;k<50;k++){const i=ri(0,8),vert=Math.random()<.5,t=(vert?Z:X)+rnd(-maxD,maxD),L=EDGE-10;
    const p=vert?{x:ROADS[i]+RW(i)*.25*(Math.random()<.5?-1:1),z:clamp(t,-L,L)}:{x:clamp(t,-L,L),z:ROADS[i]+RW(i)*.25*(Math.random()<.5?-1:1)};
    const d=Math.hypot(p.x-X,p.z-Z);if(d<minD||d>maxD)continue;
    if(!anyView&&k<35){const vx=p.x-cam.position.x,vz=p.z-cam.position.z,vd=Math.hypot(vx,vz)||1;if((vx*_cf.x+vz*_cf.z)/vd>.5)continue;}
    p.h=vert?(p.z<Z?0:Math.PI):(p.x<X?Math.PI/2:-Math.PI/2);return p;}
  return snapRoad(X+rnd(-maxD,maxD),Z+rnd(-maxD,maxD));}
function farPoint(x,z){for(let k=0;k<40;k++){const p=roadPoint();if(Math.hypot(p.x-x,p.z-z)>350)return p;}return roadPoint();}
function clearLine(x0,z0,x1,z1){const d=Math.hypot(x1-x0,z1-z0),n=Math.ceil(d/5);for(let i=1;i<n;i++){const t=i/n;if(collidePoint(x0+(x1-x0)*t,z0+(z1-z0)*t,.4))return false;}return true;}
// next point to steer at when driving on the grid towards (tx,tz)
function navTarget(x,z,tx,tz){const vi=roadOf(x),hj=roadOf(z),dx=tx-x,dz=tz-z,ti=nearestRoadIdx(tx),tj=nearestRoadIdx(tz);
  if(vi>=0&&hj>=0){
    if((Math.abs(dx)>Math.abs(dz)&&ti!==vi)||(tj===hj&&ti!==vi))return {x:x+Math.sign(dx)*25,z:ROADS[hj]+Math.sign(dx)*RW(hj)*.22};
    if(tj!==hj)return {x:ROADS[vi]-Math.sign(dz)*RW(vi)*.22,z:z+Math.sign(dz)*25};
    return {x:tx,z:tz};}
  if(vi>=0){let gz=ROADS[tj];if(Math.abs(tx-ROADS[vi])<RW(vi)/2+10)gz=tz;return {x:ROADS[vi]-Math.sign(gz-z||1)*RW(vi)*.22,z:gz};}
  if(hj>=0){let gx=ROADS[ti];if(Math.abs(tz-ROADS[hj])<RW(hj)/2+10)gx=tx;return {x:gx,z:ROADS[hj]+Math.sign(gx-x||1)*RW(hj)*.22};}
  const i=nearestRoadIdx(x),j=nearestRoadIdx(z);return Math.abs(x-ROADS[i])<Math.abs(z-ROADS[j])?{x:ROADS[i],z}:{x,z:ROADS[j]};}

/* ================= WEATHER (laid over the v2 time-of-day and seasons) ================= */
// v2 owns the clock (W.tod), sun, sky, night lights and seasons; weather only modifies what applyTime() produced.
const ENV={night:0,grip:1,wet:0,cloud:0,rain:0,flash:0};
const WEATHERS={
  clear:{n:'Ochiq',cloud:0,rain:0,fog:1,w:.4},
  cloudy:{n:'Bulutli',cloud:.7,rain:0,fog:.85,w:.24},
  rain:{n:'Yomgʻir',cloud:.88,rain:.55,fog:.55,w:.16},
  storm:{n:'Momaqaldiroq',cloud:1,rain:1,fog:.42,w:.07},
  fog:{n:'Tuman',cloud:.5,rain:0,fog:.15,w:.13}};
const WX={cur:'clear',next:200,p:{cloud:0,rain:0,fog:1}};
function setWeather(k,instant){if(!WEATHERS[k])return;WX.cur=k;S.weather=k;WX.next=160+Math.random()*260;const w=WEATHERS[k];if(instant){WX.p.cloud=w.cloud;WX.p.rain=w.rain;WX.p.fog=w.fog;ENV.wet=w.rain>.1?.7:0;}V2.dirty=true;}
// in winter v2 already shows snowfall, so no rain or thunderstorms then
function rollWeather(){const win=W.season==='winter',r=Math.random()*(win?.77:1);let a=0;for(const k in WEATHERS){if(win&&WEATHERS[k].rain)continue;a+=WEATHERS[k].w;if(r<a)return k;}return 'clear';}
function clockStr(t){const h=Math.floor(t),m=Math.floor((t-h)*60);return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');}
function inHours(t,w){return w[0]<w[1]?t>=w[0]&&t<w[1]:t>=w[0]||t<w[1];}
function skipTo(h){V2.setTime('auto');W.tod=h%24;V2.dirty=true;V2.chip();toast('Vaqt: '+clockStr(W.tod));persist();}
// rain streaks follow the camera
const RAIN_MAX=4500,rainPos=new Float32Array(RAIN_MAX*6),rainSeed=new Float32Array(RAIN_MAX*3);
for(let i=0;i<RAIN_MAX;i++){rainSeed[i*3]=Math.random()*90-45;rainSeed[i*3+1]=Math.random()*36;rainSeed[i*3+2]=Math.random()*90-45;}
const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPos,3).setUsage(THREE.DynamicDrawUsage));
const rainMesh=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:C('#b9c6d3'),transparent:true,opacity:.42,depthWrite:false,fog:false}));
rainMesh.frustumCulled=false;rainMesh.visible=false;scene.add(rainMesh);
function updateRain(dt){const n=Math.floor(RAIN_N*ENV.rain);rainMesh.visible=n>0&&mode!=='shop';if(!n)return;rainGeo.setDrawRange(0,n*2);
  const cx=cam.position.x,cy=cam.position.y-12,cz=cam.position.z,f=dt*24,len=.9+ENV.rain*.5,wx=.25+WX.p.cloud*.2;
  for(let i=0;i<n;i++){let y=rainSeed[i*3+1]-f;if(y<0)y+=36;rainSeed[i*3+1]=y;const x=cx+rainSeed[i*3],z=cz+rainSeed[i*3+2],yy=cy+y,o=i*6;
    rainPos[o]=x;rainPos[o+1]=yy;rainPos[o+2]=z;rainPos[o+3]=x+wx;rainPos[o+4]=yy-len;rainPos[o+5]=z;}
  rainGeo.attributes.position.needsUpdate=true;}
function updateWeather(dt,adv){
  if(adv){WX.next-=dt;if(WX.next<=0){const k=rollWeather();if(k!==WX.cur){setWeather(k);toast('Ob-havo oʻzgarmoqda: '+WEATHERS[k].n);}else WX.next=120+Math.random()*200;}}
  const w=WEATHERS[WX.cur],k=Math.min(1,dt*.07),c0=WX.p.cloud,f0=WX.p.fog;WX.p.cloud=lerp(WX.p.cloud,w.cloud,k);WX.p.rain=lerp(WX.p.rain,w.rain,k);WX.p.fog=lerp(WX.p.fog,w.fog,k);
  ENV.cloud=WX.p.cloud;ENV.rain=WX.p.rain>.04?WX.p.rain:0;ENV.night=W.night;
  ENV.wet=clamp(ENV.wet+(ENV.rain>.1?dt*.06:-dt*.008),0,1);ENV.grip=1-ENV.wet*.32;
  if(adv&&WX.cur==='storm'&&Math.random()<dt*.09){ENV.flash=1;thunder(.4+Math.random()*1.6);}
  ENV.flash=clamp(ENV.flash-dt*3.5,0,1);
  if(ENV.flash>0||Math.abs(WX.p.cloud-c0)>1e-5||Math.abs(WX.p.fog-f0)>1e-5||ENV.wet>0)V2.dirty=true;
  trafficCap=Math.round(TACT*(1-.45*W.night));
  updateRain(dt);}
// called at the end of v2 applyTime(): grey the sky, dim the sun, thicken the fog, wet the roads, flash for lightning
const _wc=new THREE.Color();
function weatherOverlay(){const cl=ENV.cloud,fg=WX.p.fog,day=1-W.night,fl=ENV.flash>.5?ENV.flash:ENV.flash*.3,gb=.12+.88*day;
  SKYU.cTop.value.lerp(_wc.setRGB(.46*gb,.49*gb,.54*gb),cl*.85);SKYU.cHor.value.lerp(_wc.setRGB(.64*gb,.66*gb,.69*gb),cl*.85);
  SKYU.cHor.value.lerp(_wc.setRGB(.72*gb,.74*gb,.76*gb),(1-fg)*.85);SKYU.sunI.value*=1-cl*.92;
  sun.intensity*=1-cl*.7;hemi.intensity=hemi.intensity*(1-cl*.15)+fl*1.6;
  const haze=Math.max(cl*.8,1-fg);if(haze>.01)scene.fog.color.lerp(_wc.copy(SKYU.cHor.value).convertSRGBToLinear(),haze*.8);
  if(fl>0){SKYU.cTop.value.lerp(_wc.setRGB(.8,.82,.9),fl*.6);SKYU.cHor.value.lerp(_wc.setRGB(.85,.86,.92),fl*.6);}
  stars.material.opacity*=1-cl;
  const fk=fg*(1-ENV.rain*.25);scene.fog.near*=fk*(fg<.3?.2:1);scene.fog.far*=fk;
  const win=W.season==='winter';for(const m of ROADM){m.roughness=(win?.75:.9)-ENV.wet*.55;m.color.setScalar((win?1.3:1)*(1-ENV.wet*.38));}}

/* ================= HUMANS (player, officers, event NPCs) ================= */
const SKINS=['#f3d5b5','#e2b58f','#c99169','#9d6845','#6f4631'],HAIRC=['#16110d','#3a281b','#6b3b1d','#a8742e','#d9c08a','#8c8c8c'];
const CLOTH=['#f2f0ea','#1d2430','#7a1f2b','#2f5d8a','#d9b44a','#3d6b4a','#202020','#b45a3c','#6b4f8a','#c8ccd1','#0f5a6b','#e07a5f'];
const HAIRS=['Qisqa','Uzun','Kepka','Doʻppi','Kal'],TOPS=['Futbolka','Kurtka','Chopon'];
const HG={torso:new THREE.CylinderGeometry(.2,.16,.56,14).scale(1,1,.62),pelvis:new THREE.CylinderGeometry(.165,.17,.18,12).scale(1,1,.7),
  thigh:new THREE.CylinderGeometry(.082,.066,.46,10).translate(0,-.23,0),shin:new THREE.CylinderGeometry(.064,.05,.44,10).translate(0,-.22,0),
  shoe:new THREE.BoxGeometry(.11,.08,.27).translate(0,-.46,.045),uarm:new THREE.CylinderGeometry(.06,.05,.3,9).translate(0,-.15,0),
  farm:new THREE.CylinderGeometry(.05,.04,.27,9).translate(0,-.135,0),hand:new THREE.SphereGeometry(.048,10,8).translate(0,-.3,0),
  neck:new THREE.CylinderGeometry(.05,.055,.1,8),head:new THREE.SphereGeometry(.118,18,14).scale(.92,1.08,1),
  hairS:new THREE.SphereGeometry(.127,16,8,0,Math.PI*2,0,Math.PI*.55),hairL:new THREE.BoxGeometry(.24,.26,.08),
  cap:new THREE.CylinderGeometry(.128,.128,.08,16),brim:new THREE.BoxGeometry(.2,.015,.12),
  doppi:new THREE.CylinderGeometry(.122,.126,.085,4).rotateY(Math.PI/4),doppiP:new THREE.CylinderGeometry(.124,.124,.02,4).rotateY(Math.PI/4),
  glasses:new THREE.BoxGeometry(.2,.04,.02),robe:new THREE.CylinderGeometry(.215,.29,.78,14,1,true).scale(1,1,.72),
  eye:new THREE.SphereGeometry(.014,6,6),nose:new THREE.BoxGeometry(.03,.05,.04)};
Object.values(HG).forEach(g=>KEEPG.add(g));
const _stripe={};
function stripeTex(c){return _stripe[c]||(_stripe[c]=ctex(128,128,(x)=>{const cols=[c,'#f0d27a','#1d4f8a','#a3262a',c,'#2f7a4a'];for(let i=0;i<16;i++){x.fillStyle=cols[i%cols.length];x.fillRect(i*8,0,8,128);}},true));}
/* ---------- 3D hero avatar (models/sardor.glb — “Cool Man (Rigged)” by NABEEL619, CC BY 4.0) ----------
   The procedural pose below writes angles into proxy joints in character space; avatarPose turns them into
   bone rotations relative to the bind pose, so walking, running, jumping, punching and working drive the real skeleton. */
const AV={tpl:null,req:false,BONES:{hips:'Hips',spine:'Spine1',head:'Head',lA:'LeftArm',lE:'LeftForeArm',rA:'RightArm',rE:'RightForeArm',lT:'LeftUpLeg',lK:'LeftLeg',rT:'RightUpLeg',rK:'RightLeg'}};
function loadAvatar(){if(AV.req||!THREE.GLTFLoader||!THREE.SkeletonUtils)return;AV.req=true;
  new THREE.GLTFLoader().load('models/sardor.glb',gl=>{AV.tpl=gl.scene;AV.tpl.traverse(o=>{if(o.isMesh&&o.geometry)KEEPG.add(o.geometry);});rebuildHero();},undefined,e=>{console.warn('3D qahramon yuklanmadi',e);});}
const _avAttach=(g,bone,mesh,wx,wy,wz)=>{const root=g.userData.root;root.updateMatrixWorld(true);const want=new THREE.Matrix4().makeTranslation(wx,wy,wz),
  inv=new THREE.Matrix4().copy(bone.matrixWorld).invert(),loc=inv.multiply(want);loc.decompose(mesh.position,mesh.quaternion,mesh.scale);mesh.castShadow=true;bone.add(mesh);return mesh;};
function buildAvatar(L,hero){const root=THREE.SkeletonUtils.clone(AV.tpl),g=new THREE.Group();g.add(root);root.updateMatrixWorld(true);
  const bones={},mats={};root.traverse(o=>{if(o.isBone){const n=(o.name||'').replace(/_\d+$/,'');if(!bones[n])bones[n]=o;}
    if(o.isMesh){o.castShadow=true;o.frustumCulled=false;const m=o.material.clone();o.material=m;(mats[m.name]=mats[m.name]||[]).push(o);}});
  const bb=new THREE.Box3().setFromObject(root);root.scale.multiplyScalar(1.78/(bb.max.y-bb.min.y));root.updateMatrixWorld(true);
  const bb2=new THREE.Box3().setFromObject(root);root.position.y-=bb2.min.y;root.updateMatrixWorld(true);
  const inv=root.getWorldQuaternion(new THREE.Quaternion()).invert(),J={},H={};
  // rest pose for the arms: both segments hanging down (slightly out), measured from the model's own bones
  const wpos=n=>bones[n]?bones[n].getWorldPosition(new THREE.Vector3()).applyQuaternion(inv):null;
  const hang=(a,b,sx)=>{const pa=wpos(a),pb=wpos(b);return pa&&pb?new THREE.Quaternion().setFromUnitVectors(pb.sub(pa).normalize(),new THREE.Vector3(sx*.1,-1,0).normalize()):new THREE.Quaternion();};
  const rest={lA:hang('LeftArm','LeftForeArm',1),lE:hang('LeftForeArm','LeftHand',1),rA:hang('RightArm','RightForeArm',-1),rE:hang('RightForeArm','RightHand',-1)};
  for(const k in AV.BONES){const b=bones[AV.BONES[k]];if(!b)continue;H[k]=new THREE.Object3D();
    J[k]={b,rest:rest[k]||null,wb:inv.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion())),wpi:inv.clone().multiply(b.parent.getWorldQuaternion(new THREE.Quaternion())).invert()};}
  if(J.lE)J.lE.pinv=rest.lA.clone().invert();if(J.rE)J.rE.pinv=rest.rA.clone().invert();
  H.hips=H.hips||new THREE.Object3D();H.hips.position.y=.97;g.userData={H,J,root,rootY:root.position.y,av:true};
  // looks: the original outfit, or the colours and extras chosen in the phone's «Qahramon» app
  const col=(n,c)=>(mats[n]||[]).forEach(o=>o.material.color.set(c));L=L||{};
  if(L.tint){col('Wolf3D_Outfit_Top',CLOTH[L.topC]||CLOTH[0]);col('Wolf3D_Outfit_Bottom',CLOTH[L.legsC]||CLOTH[1]);col('Wolf3D_Outfit_Footwear',CLOTH[L.shoeC]||CLOTH[6]);
    col('Wolf3D_Hair',HAIRC[L.hairC]||HAIRC[0]);col('Wolf3D_Skin',SKINS[L.skin]||SKINS[1]);col('Wolf3D_Body',SKINS[L.skin]||SKINS[1]);
    (mats.Wolf3D_Glasses||[]).forEach(o=>o.visible=!!L.glasses);
    const hs=L.hair|0,head=bones.Head;if(hs>=2)(mats.Wolf3D_Hair||[]).forEach(o=>o.visible=false);
    if(head){const hp=head.getWorldPosition(new THREE.Vector3()),M=c=>new THREE.MeshStandardMaterial({color:C(c),roughness:.8});
      if(hs===2){const cm=M(CLOTH[((L.topC|0)+3)%CLOTH.length]);_avAttach(g,head,new THREE.Mesh(HG.cap,cm),hp.x,hp.y+.17,hp.z);_avAttach(g,head,new THREE.Mesh(HG.brim,cm),hp.x,hp.y+.14,hp.z+.12);}
      if(hs===3){_avAttach(g,head,new THREE.Mesh(HG.doppi,M('#13161a')),hp.x,hp.y+.185,hp.z);_avAttach(g,head,new THREE.Mesh(HG.doppiP,M('#e8e4d8')),hp.x,hp.y+.16,hp.z);}}
    if((L.top|0)===2&&bones.Hips){const hp=bones.Hips.getWorldPosition(new THREE.Vector3());_avAttach(g,bones.Hips,new THREE.Mesh(HG.robe,new THREE.MeshStandardMaterial({map:stripeTex(CLOTH[L.topC]||CLOTH[0]),roughness:.85,side:THREE.DoubleSide})),hp.x,hp.y+.06,hp.z);}}
  return g;}
const _avQ=new THREE.Quaternion(),_avE=new THREE.Euler();
function avatarPose(g){const {H,J,root,rootY}=g.userData;
  for(const k in J){const j=J[k],r=H[k].rotation;_avE.set(r.x,r.y,r.z,'YXZ');_avQ.setFromEuler(_avE);
    if(j.rest)_avQ.multiply(j.rest);if(j.pinv)_avQ.premultiply(j.pinv); // segment = pose · rest · bind; a forearm undoes its upper arm's rest
    j.b.quaternion.copy(j.wpi).multiply(_avQ).multiply(j.wb);}
  root.position.y=rootY+(H.hips.position.y-.97);}
function buildHuman(L,hero){if(hero&&AV.tpl)return buildAvatar(L,hero);
  const g=new THREE.Group(),M=c=>new THREE.MeshStandardMaterial({color:C(c),roughness:.8});
  const skin=M(SKINS[L.skin]||SKINS[1]),top=M(CLOTH[L.topC]||CLOTH[0]),legs=M(CLOTH[L.legsC]||CLOTH[1]),shoe=M(CLOTH[L.shoeC]||CLOTH[6]),hair=M(HAIRC[L.hairC]||HAIRC[0]),dark=M('#111111');
  const part=(geo,mt,par,x,y,z)=>{const o=new THREE.Mesh(geo,mt);o.position.set(x||0,y||0,z||0);o.castShadow=true;par.add(o);return o;};
  const grp=(par,x,y,z)=>{const o=new THREE.Group();o.position.set(x,y,z);par.add(o);return o;};
  const hips=grp(g,0,.97,0);part(HG.pelvis,legs,hips);
  const spine=grp(hips,0,.06,0);part(HG.torso,top,spine,0,.29,0);part(HG.neck,skin,spine,0,.6,0);
  const head=grp(spine,0,.66,0);part(HG.head,skin,head,0,.12,0);part(HG.eye,dark,head,-.04,.14,.104);part(HG.eye,dark,head,.04,.14,.104);part(HG.nose,skin,head,0,.1,.112);
  const hs=L.hair|0;
  if(hs===0||hs===1)part(HG.hairS,hair,head,0,.135,-.004);
  if(hs===1)part(HG.hairL,hair,head,0,.04,-.075);
  if(hs===2){const cm=M(CLOTH[((L.topC|0)+3)%CLOTH.length]);part(HG.cap,cm,head,0,.2,0);part(HG.brim,cm,head,0,.17,.12);}
  if(hs===3){part(HG.doppi,M('#13161a'),head,0,.215,0);part(HG.doppiP,M('#e8e4d8'),head,0,.19,0);}
  if(L.glasses)part(HG.glasses,dark,head,0,.145,.115);
  const sleeves=(L.top|0)>=1;
  const arm=sx=>{const sh=grp(spine,sx*.235,.5,0);part(HG.uarm,top,sh);const el=grp(sh,0,-.3,0);part(HG.farm,sleeves?top:skin,el);part(HG.hand,skin,el);return [sh,el];};
  const [lA,lE]=arm(1),[rA,rE]=arm(-1);
  const leg=sx=>{const hp=grp(hips,sx*.095,-.02,0);part(HG.thigh,legs,hp);const kn=grp(hp,0,-.46,0);part(HG.shin,legs,kn);part(HG.shoe,shoe,kn);return [hp,kn];};
  const [lT,lK]=leg(1),[rT,rK]=leg(-1);
  if((L.top|0)===2)part(HG.robe,new THREE.MeshStandardMaterial({map:stripeTex(CLOTH[L.topC]||CLOTH[0]),roughness:.85,side:THREE.DoubleSide}),spine,0,-.02,0);
  g.userData.H={hips,spine,head,lA,lE,rA,rE,lT,lK,rT,rK};return g;}
// procedural pose: ph = gait phase, amp = stride (0 idle … ~.8 sprint)
function poseHuman(g,ph,amp,o){const H=g.userData.H;o=o||{};const s=Math.sin(ph);
  if(o.air){H.lT.rotation.x=-.7;H.rT.rotation.x=-.25;H.lK.rotation.x=1;H.rK.rotation.x=.5;H.lA.rotation.x=-.4;H.rA.rotation.x=.3;H.lE.rotation.x=-.6;H.rE.rotation.x=-.6;}
  else{H.lT.rotation.x=-s*amp;H.rT.rotation.x=s*amp;H.lK.rotation.x=Math.max(0,Math.sin(ph+1.4))*amp*1.5+.04;H.rK.rotation.x=Math.max(0,Math.sin(ph+1.4+Math.PI))*amp*1.5+.04;
    H.lA.rotation.x=s*amp*.85;H.rA.rotation.x=-s*amp*.85;H.lE.rotation.x=-(.2+amp*.7);H.rE.rotation.x=-(.2+amp*.7);}
  H.lA.rotation.z=.08;H.rA.rotation.z=-.08;H.spine.rotation.y=0;
  if(o.punch>0){const p=o.punch;H.rA.rotation.x=-1.55*p;H.rE.rotation.x=-.3*(1-p);H.rA.rotation.z=-.08-.2*p;H.spine.rotation.y=-.35*p;}
  if(o.work){H.lA.rotation.x=H.rA.rotation.x=-1.1+Math.sin(o.work)*.15;H.lE.rotation.x=H.rE.rotation.x=-.9;}
  H.spine.rotation.x=o.lean||0;H.hips.position.y=.97+(o.air?0:Math.abs(Math.cos(ph))*.035*amp);H.head.rotation.x=-(o.lean||0)*.5;
  if(o.sit){const k=o.sit,st=(o.steer||0)*.28;H.lT.rotation.x=H.rT.rotation.x=-1.3*k;H.lK.rotation.x=H.rK.rotation.x=1.75*k;
    H.lA.rotation.x=-.62*k+st;H.rA.rotation.x=-.62*k-st;H.lE.rotation.x=H.rE.rotation.x=-1.05*k;H.lA.rotation.z=.08+.18*k;H.rA.rotation.z=-.08-.18*k;
    H.hips.position.y=.97-.86*k;H.spine.rotation.x=-.06*k;H.head.rotation.x=0;}
  if(g.userData.av)avatarPose(g);}
function randLook(){return {skin:ri(0,4),hair:ri(0,4),hairC:ri(0,5),top:ri(0,1),topC:ri(0,11),legsC:ri(0,11),shoeC:ri(0,11),glasses:Math.random()<.2};}
function makeNPC(L,x,z,h,lying){const g=buildHuman(L);poseHuman(g,0,0,{});g.rotation.order='YXZ';g.position.set(x,lying?.18:groundAt(x,z),z);g.rotation.set(lying?-Math.PI/2:0,h||0,0);scene.add(g);return g;}
function removeNPC(g){if(!g)return;scene.remove(g);disposeCar(g);}

/* ================= HERO: walking, running, jumping ================= */
const HERO={x:0,z:0,y:.25,vy:0,h:0,spd:0,ph:0,air:false,punchT:0,punched:false,hp:100,jumpReq:false,mesh:null,hitCD:0,regen:0,work:0};
function rebuildHero(){const v=HERO.mesh?HERO.mesh.visible:false;if(HERO.mesh){scene.remove(HERO.mesh);disposeCar(HERO.mesh);}HERO.mesh=buildHuman(S.hero,true);HERO.mesh.visible=v;scene.add(HERO.mesh);if(HERO.mesh.userData.av)poseHuman(HERO.mesh,HERO.ph||0,0,{});}
rebuildHero();
const JOY={x:0,y:0};
const FC={yaw:Math.PI,pitch:.3,dist:4.6,lastDrag:-9};
function cycleFootCam(){FC.dist=FC.dist<4?4.6:FC.dist<6?7:3.2;}
const _seen=new Set();
// push a walker {x,z} out of building footprints
function solidPush(o,r,y){let hit=false;_seen.clear();
  for(const cx of [o.x-r,o.x+r])for(const cz of [o.z-r,o.z+r])for(const b of collAt(cx,cz)){if(_seen.has(b))continue;_seen.add(b);if(y!==undefined&&y>b[4]-.05)continue;
    const qx=clamp(o.x,b[0],b[2]),qz=clamp(o.z,b[1],b[3]),dx=o.x-qx,dz=o.z-qz,d=Math.hypot(dx,dz);
    if(d<r){hit=true;if(d>1e-4){o.x+=dx/d*(r-d);o.z+=dz/d*(r-d);}else{const pen=[[o.x-b[0]+r,-1,0],[b[2]-o.x+r,1,0],[o.z-b[1]+r,0,-1],[b[3]-o.z+r,0,1]].sort((a,c)=>a[0]-c[0])[0];o.x+=pen[1]*pen[0];o.z+=pen[2]*pen[0];}}}
  const L=EDGE+40;o.x=clamp(o.x,-L,L);o.z=clamp(o.z,-L,L);return hit;}
function insideSolid(x,z,y){for(const b of collAt(x,z))if(x>b[0]&&x<b[2]&&z>b[1]&&z<b[3]&&y<b[4])return true;return false;}
function hurt(n){if(GOD||PAUSED)return;HERO.hp-=n;HERO.regen=0;P.shake=Math.min(1,n/30);thud(n);if(HERO.hp<=0){HERO.hp=0;wasted();}}
function updateFoot(dt){const H=HERO;
  const fwd=(keys.up?1:0)-(keys.down?1:0)-JOY.y,str=(keys.right?1:0)-(keys.left?1:0)+JOY.x,mag=Math.min(1,Math.hypot(fwd,str));
  const fx=-Math.sin(FC.yaw),fz=-Math.cos(FC.yaw),rx=-fz,rz=fx,mx=fx*fwd+rx*str,mz=fz*fwd+rz*str;
  const busy=H.punchT>0||H.work>0;
  const tgt=busy?0:mag*(keys.sprint?7.2:4.2);
  H.spd=lerp(H.spd,tgt,Math.min(1,dt*(tgt>H.spd?6:9)));
  if(mag>.1&&!busy)H.h+=wrapA(Math.atan2(mx,mz)-H.h)*Math.min(1,dt*12);
  H.x+=Math.sin(H.h)*H.spd*dt;H.z+=Math.cos(H.h)*H.spd*dt;
  const gy=groundAt(H.x,H.z);
  if(H.jumpReq&&!H.air&&!busy){H.vy=4.6;H.air=true;}H.jumpReq=false;
  if(H.air||H.y>gy+.03){H.vy-=13*dt;H.y+=H.vy*dt;if(H.y<=gy){H.y=gy;H.vy=0;H.air=false;}}else H.y=lerp(H.y,gy,Math.min(1,dt*14));
  solidPush(H,.32,H.y);
  // cars are solid; a moving car knocks the hero down
  H.hitCD-=dt;
  const carHit=(x,z,h,L,W,v,src)=>{const sx=Math.sin(h),sz=Math.cos(h);for(const s of [-L*.28,0,L*.28]){const cx=x+sx*s,cz=z+sz*s,r=W/2+.25,dx=H.x-cx,dz=H.z-cz,d=Math.hypot(dx,dz);
    if(d<r&&d>1e-4){H.x=cx+dx/d*r;H.z=cz+dz/d*r;if(Math.abs(v)>4.5&&H.hitCD<=0){H.hitCD=1;H.vy=3.2;H.air=true;H.x+=dx/d*1.2;H.z+=dz/d*1.2;if(src)src.speed=0;hurt(Math.abs(v)*2.6);}return;}}};
  if(P.mesh)carHit(P.x,P.z,P.h,P.sp.L,P.sp.W,0);
  for(const t of TRAFFIC)if(t.mesh.visible&&!t.gone&&Math.abs(t.x-H.x)<8&&Math.abs(t.z-H.z)<8){const sp=t.mesh.userData.sp;carHit(t.x,t.z,t.h,sp.L,sp.W,t.speed,t);}
  for(const a of AGENTS)if(a.on&&Math.abs(a.x-H.x)<8&&Math.abs(a.z-H.z)<8)carHit(a.x,a.z,a.h,a.sp.L,a.sp.W,a.speed,a);
  H.ph+=H.spd*dt*(H.spd>5?2.2:2.6);
  if(H.punchT>0){H.punchT-=dt;if(!H.punched&&H.punchT<.25){H.punched=true;resolvePunch();}}
  if(H.work>0)H.work+=dt*6;
  poseHuman(H.mesh,H.ph,clamp(H.spd/4.2,0,1.25)*.62,{air:H.air,punch:H.punchT>0?Math.sin(clamp((.45-H.punchT)/.45,0,1)*Math.PI):0,lean:H.spd>5?.18:H.spd*.02,work:H.work});
  H.mesh.position.set(H.x,H.y,H.z);H.mesh.rotation.set(0,H.h,0);H.mesh.visible=true;
  if(H.hp<100){H.regen+=dt;if(H.regen>4)H.hp=Math.min(100,H.hp+dt*2.5);}
  footCam(dt);}
function footCam(dt){const H=HERO;
  // third-person orbit camera that swings behind the hero and never goes through walls
  if(performance.now()/1000-FC.lastDrag>1.8&&H.spd>1.5)FC.yaw+=wrapA(H.h+Math.PI-FC.yaw)*Math.min(1,dt*1.6);
  const hx=H.x,hy=H.y+1.55,hz=H.z,cp=Math.cos(FC.pitch),dX=Math.sin(FC.yaw)*cp,dY=Math.sin(FC.pitch),dZ=Math.cos(FC.yaw)*cp;
  let dist=FC.dist;for(let s=.5;s<=FC.dist;s+=.35){const y=hy+dY*s;if(y<.35||insideSolid(hx+dX*s,hz+dZ*s,y)){dist=Math.max(.6,s-.4);break;}}
  const tx=hx+dX*dist,ty=Math.max(.4,hy+dY*dist),tz=hz+dZ*dist,k=1-Math.exp(-dt*14);
  if(Math.hypot(cam.position.x-tx,cam.position.z-tz)>12||dist<FC.dist-.1)cam.position.set(tx,ty,tz);
  else{cam.position.x+=(tx-cam.position.x)*k;cam.position.y+=(ty-cam.position.y)*k;cam.position.z+=(tz-cam.position.z)*k;}
  if(P.shake>0){cam.position.x+=(Math.random()-.5)*P.shake*.3;cam.position.y+=(Math.random()-.5)*P.shake*.2;P.shake=Math.max(0,P.shake-dt*2.5);}
  cam.lookAt(hx,hy-.1,hz);
  if(Math.abs(cam.fov-60)>.05){cam.fov+=(60-cam.fov)*Math.min(1,dt*4);cam.updateProjectionMatrix();}
  sun.position.set(hx+SUN.x*200,SUN.y*200,hz+SUN.z*200);sun.target.position.set(hx,0,hz);
  for(const c of CASH){if(Math.abs(c.x-H.x)<1.6&&Math.abs(c.z-H.z)<1.6){earn(c.val);persist();toast('+'+fmt(c.val)+' pul topildi','gold');beep(1040,.07);placeCash(c);}}
  updateAudio(0,0,0,false);
  updateHUD(dt,0,0,'');}
function punch(){if(mode!=='foot'||HERO.punchT>0||PAUSED)return;HERO.punchT=.45;HERO.punched=false;}
function resolvePunch(){const H=HERO,fx=Math.sin(H.h),fz=Math.cos(H.h);
  for(const o of OFFICERS)if(o.on&&!(o.down>0)&&Math.hypot(o.x-H.x,o.z-H.z)<1.7){o.down=3;thud(12);addWanted(1,'Politsiyachiga hujum');return;}
  let best=null,bd=1.6;for(const p of PEOPLE){if(p.down>0||p.cx===undefined)continue;const dx=p.cx-H.x,dz=p.cz-H.z,d=Math.hypot(dx,dz);if(d<bd&&(dx*fx+dz*fz)/(d||1)>.3){bd=d;best=p;}}
  if(!best){beep(220,.04);return;}
  best.down=3.2;thud(10);for(const p of PEOPLE)if(p!==best&&p.cx!==undefined&&Math.abs(p.cx-H.x)<18&&Math.abs(p.cz-H.z)<18)p.panic=6;
  if(!WANT.lvl)addWanted(1,'Jamoat tartibini buzish');}
function nearPed(r){let best=null,bd=r;for(const p of PEOPLE){if(p.down>0||p.cx===undefined)continue;const d=Math.hypot(p.cx-HERO.x,p.cz-HERO.z);if(d<bd){bd=d;best=p;}}return best;}
const GREET=['Vaalaykum assalom, ukam!','Yaxshimisiz? Ishlar joyidami?','Bugun havo zoʻr-a?','Kechirasiz, shoshyapman.','Somsa yeysizmi? Anavi doʻkonda zoʻr!','Ehtiyot boʻling, koʻchada mashinalar koʻp.','Chorsuga qanday borsam boʻladi? ...Ha, rahmat!','Taksi chaqirib berolmaysizmi?'];
function greet(p){p.panic=0;say([['Sardor',ENV.night>.6?'Xayrli kech!':'Assalomu alaykum!'],['Yoʻlovchi',pick(GREET)]]);}

/* ---------- getting in and out of cars ---------- */
function nearestEnterable(){const H=HERO;let best=null,bd=4.4;const c=(x,z,o)=>{const d=Math.hypot(x-H.x,z-H.z);if(d<bd){bd=d;best=o;}};
  if(P.mesh)c(P.x,P.z,{kind:'own'});
  for(const a of AGENTS)if(a.on&&a.enterable)c(a.x,a.z,{kind:'agent',a});
  for(const t of TRAFFIC)if(t.mesh.visible&&!t.gone)c(t.x,t.z,{kind:'traffic',t});
  return best;}
/* ---------- getting in and out: walk to the driver's door, face the car, sit down; the reverse on the way out ---------- */
const TRANS={on:false};
const instantTrans=()=>window.__TD_TEST&&!window.__TD_ANIM;
function carRef(n){if(n.kind==='own')return {x:P.x,z:P.z,h:P.h,sp:P.sp};if(n.kind==='traffic')return {x:n.t.x,z:n.t.z,h:n.t.h,sp:n.t.mesh.userData.sp};return {x:n.a.x,z:n.a.z,h:n.a.h,sp:n.a.sp};}
function carSide(c,side,out,fwd){const lx=Math.cos(c.h),lz=-Math.sin(c.h),fx=Math.sin(c.h),fz=Math.cos(c.h);return {x:c.x+lx*out*side+fx*c.sp.L*fwd,z:c.z+lz*out*side+fz*c.sp.L*fwd};}
// driver seat by body type: vans sit far forward and high, cars a little behind the middle
const SEAT={van:[.25,.36],box:[.2,.33],suv:[-.02,.27],cyber:[-.02,.27],wagon:[-.04,.21],sedan:[-.05,.2],hatch:[-.02,.21],coupe:[-.07,.17],sport:[-.07,.16]};
const seatOf=sp=>SEAT[sp.type]||[-.04,.2];
const doorPoint=(c,side)=>carSide(c,side,c.sp.W/2+.5,seatOf(c.sp)[0]+.06),seatPoint=(c,side)=>carSide(c,side||1,c.sp.W*.21,seatOf(c.sp)[0]);
function startEnter(n){const c=carRef(n);let side=1,d=doorPoint(c,1);if(insideSolid(d.x,d.z,1)||collidePoint(d.x,d.z,.1)){side=-1;d=doorPoint(c,-1);}
  if(n.kind==='traffic')n.t.speed=0;for(const k in keys)keys[k]=false;JOY.x=JOY.y=0;Object.assign(TRANS,{on:true,kind:'in',n,c,side,door:d,ph:'walk',t:0});}
function startExit(){exitCar();const H=HERO,lx=Math.cos(P.h),lz=-Math.sin(P.h),side=((H.x-P.x)*lx+(H.z-P.z)*lz)>=0?1:-1;if(instantTrans())return;
  Object.assign(TRANS,{on:true,kind:'out',side,door:{x:H.x,z:H.z},t:0,c:{x:P.x,z:P.z,h:P.h,sp:P.sp}});}
function updateTrans(dt){const T_=TRANS,H=HERO,c=T_.c;T_.t+=dt;let sit=0,amp=0;
  if(T_.kind==='in'){
    if(T_.n.kind==='traffic'&&!T_.n.t.gone){c.x=T_.n.t.x;c.z=T_.n.t.z;c.h=T_.n.t.h;T_.n.t.speed=0;T_.door=doorPoint(c,T_.side);}
    if(T_.ph==='walk'){const dx=T_.door.x-H.x,dz=T_.door.z-H.z,d=Math.hypot(dx,dz);
      if(d<.2||T_.t>2.4){T_.ph='turn';T_.t=0;}else{const v=Math.min(3.4,d*4+.8);H.h+=wrapA(Math.atan2(dx,dz)-H.h)*Math.min(1,dt*12);H.x+=Math.sin(H.h)*v*dt;H.z+=Math.cos(H.h)*v*dt;H.ph+=v*dt*2.6;amp=clamp(v/4.2,0,1)*.6;}}
    else if(T_.ph==='turn'){H.h+=wrapA(c.h-Math.PI/2*T_.side-H.h)*Math.min(1,dt*12);if(T_.t>.3){T_.ph='sit';T_.t=0;T_.sx=H.x;T_.sz=H.z;}}
    else{const k=Math.min(1,T_.t/.4),seat=seatPoint(c,T_.side);H.x=T_.sx+(seat.x-T_.sx)*k;H.z=T_.sz+(seat.z-T_.sz)*k;H.h+=wrapA(c.h-H.h)*Math.min(1,dt*8);sit=k;
      if(k>=1){T_.on=false;finishEnter(T_.n);return;}}}
  else{const k=Math.min(1,T_.t/.5),seat=seatPoint(c,T_.side);H.x=seat.x+(T_.door.x-seat.x)*k;H.z=seat.z+(T_.door.z-seat.z)*k;sit=1-k;
    H.h=k<.6?c.h+Math.PI/2*T_.side*Math.min(1,k/.3):H.h+wrapA(c.h-H.h)*Math.min(1,dt*6);if(k>=1&&T_.t>.75){T_.on=false;H.h=c.h;}}
  H.y=groundAt(H.x,H.z)+sit*c.sp.H*seatOf(c.sp)[1];H.spd=0;poseHuman(H.mesh,H.ph,amp,sit?{sit}:{});H.mesh.position.set(H.x,H.y,H.z);H.mesh.rotation.set(0,H.h,0);H.mesh.visible=true;footCam(dt);}
// while driving the hero sits at the wheel (hidden in the cockpit view)
function seatHero(){const H=HERO;if(mode!=='drive'||!P.mesh)return;if(camMode===2||!S.showDriver&&S.showDriver!==undefined){H.mesh.visible=false;return;}
  const s=seatPoint({x:P.x,z:P.z,h:P.h,sp:P.sp},1);H.mesh.visible=P.mesh.visible;H.mesh.position.set(s.x,P.sp.H*seatOf(P.sp)[1],s.z);H.mesh.rotation.set(0,P.h,0);poseHuman(H.mesh,0,0,{sit:1,steer:P.steer});}
function finishEnter(n){if(n.kind==='own')enterCar();
  else if(n.kind==='traffic')carjack(n.t);
  else{const a=n.a,cb=a.onEnter;P.x=a.x;P.z=a.z;P.h=a.h;P.veh={id:a.id,color:a.ci,plate:a.plate||randomPlate()};P.stolen=true;P.missionCar=a.tag||'x';freeAgent(a);setPlayerCar();enterCar();if(cb)cb();}}
function toggleVehicle(){if(PAUSED||TRANS.on)return;
  if(mode==='drive'){if(Math.hypot(P.vx,P.vz)>4){toast('Avval toʻxtang');return;}startExit();return;}
  if(mode!=='foot')return;const n=nearestEnterable();if(!n){toast('Yaqinda mashina yoʻq');return;}
  if(!instantTrans()){startEnter(n);return;}
  if(n.kind==='own')enterCar();
  else if(n.kind==='traffic')carjack(n.t);
  else{const a=n.a,cb=a.onEnter;P.x=a.x;P.z=a.z;P.h=a.h;P.veh={id:a.id,color:a.ci,plate:a.plate||randomPlate()};P.stolen=true;P.missionCar=a.tag||'x';freeAgent(a);setPlayerCar();enterCar();if(cb)cb();}}
function enterCar(){mode='drive';P.vx=P.vz=0;HERO.mesh.visible=false;HERO.work=0;document.body.classList.remove('foot');for(const k in keys)keys[k]=false;beep(520,.05);}
function exitCar(){const rx=Math.cos(P.h),rz=-Math.sin(P.h),off=P.sp.W/2+.55;let side=-1;
  for(const s of [1,-1]){if(!insideSolid(P.x+rx*off*s,P.z+rz*off*s,1)&&!collidePoint(P.x+rx*off*s,P.z+rz*off*s,.1)){side=s;break;}}
  HERO.x=P.x+rx*off*side;HERO.z=P.z+rz*off*side;HERO.y=groundAt(HERO.x,HERO.z);HERO.vy=0;HERO.air=false;HERO.h=P.h;HERO.spd=0;
  FC.yaw=P.h+Math.PI;P.vx=P.vz=0;mode='foot';document.body.classList.add('foot');HERO.mesh.visible=true;for(const k in keys)keys[k]=false;updateAudio(0,0,0,false);
  if(taxi.on&&taxi.stage==='drop')toast('Yoʻlovchi kutmoqda — mashinaga qayting','gold');}
function carjack(t){const own=!P.stolen;P.x=t.x;P.z=t.z;P.h=t.h;P.veh={id:t.mesh.userData.sp.id,color:t.ci,plate:t.plate};P.stolen=true;P.missionCar=null;setPlayerCar();t.mesh.visible=false;t.gone=30;enterCar();
  toast('Mashina olib qochildi!'+(own?' Oʻz mashinangiz garajga qaytdi.':''),'bad');addWanted(1,'Mashina oʻgʻirlash');}
function bringCarToHero(){const p=snapRoad(HERO.x,HERO.z);P.x=p.x;P.z=p.z;P.h=p.h;P.vx=P.vz=0;if(P.mesh){P.mesh.position.set(P.x,0,P.z);P.mesh.rotation.set(0,P.h,0);}}
function stageAllowed(){if(WANT.lvl){toast('Qidiruvdasiz — avval politsiyadan qutuling','bad');return false;}if(MS.cur){toast('Missiya davomida mumkin emas','bad');return false;}return true;}

/* ================= POLICE, WANTED LEVEL AND AI CARS ================= */
const AGENTS=[],HELIS=[],OFFICERS=[];
const WANT={lvl:0,lost:0,lastX:0,lastZ:0,esc:0,blockT:0,bust:0,seen:false,ramCD:0};
const POL_N=[0,2,3,4,6,8],HELI_N=[0,0,0,1,1,2],BLOCK_N=[0,0,1,1,2,3];
function addWanted(n,why){if(n<=0)return;const old=WANT.lvl;WANT.lvl=Math.min(5,WANT.lvl+n);WANT.lost=0;WANT.seen=true;WANT.esc=0;WANT.lastX=px();WANT.lastZ=pz();
  if(WANT.lvl>old){toast((why?why+' — ':'')+'qidiruv: '+'★'.repeat(WANT.lvl),'bad');if(!old)WANT.blockT=10;}}
function setWanted(n){if(n>WANT.lvl)addWanted(n-WANT.lvl);}
function clearWanted(msg){if(!WANT.lvl)return;WANT.lvl=0;WANT.bust=0;for(const a of AGENTS)if(a.on&&(a.kind==='police'||a.kind==='block')){a.kind='police';a.leave=true;a.goal=null;}
  for(const h of HELIS)h.leave=true;if(msg){toast(msg,'good');beep(660,.08);setTimeout(()=>beep(990,.1),110);}}
function policeHit(v){if(v>4&&WANT.ramCD<=0){WANT.ramCD=2.5;if(!WANT.lvl)addWanted(1,'Politsiya mashinasini urish');}}
function policeMesh(){const sp=CAR['chevrolet-cobalt'],g=buildProcCar(sp,0,{lod:true,plate:{reg:'01',txt:'P '+String(ri(100,999))+' PP'}});
  const st=new THREE.Mesh(box(sp.W*.995,.16,sp.L*.62),new THREE.MeshStandardMaterial({color:C('#1f4fa0'),roughness:.4}));st.position.y=sp.H*.5;g.add(st);
  const bar=new THREE.Mesh(box(1.1,.1,.28),MAT.trim);bar.position.set(0,sp.H+.02,-.1);g.add(bar);
  const r=new THREE.MeshStandardMaterial({color:C('#440000'),emissive:C('#ff2a2a'),emissiveIntensity:0}),b=new THREE.MeshStandardMaterial({color:C('#000044'),emissive:C('#2a5cff'),emissiveIntensity:0});
  const l1=new THREE.Mesh(box(.46,.12,.24),r);l1.position.set(-.28,sp.H+.07,-.1);g.add(l1);const l2=new THREE.Mesh(box(.46,.12,.24),b);l2.position.set(.28,sp.H+.07,-.1);g.add(l2);
  g.userData.lights=[r,b];return g;}
function makeAgent(kind,id,ci,x,z,h,o){o=o||{};const pol=kind==='police'||kind==='block'||kind==='chaser';let a=pol?AGENTS.find(q=>!q.on&&!q.dead&&q.pool==='police'):null;
  if(!a){const plate=pol?null:randomPlate(),mesh=pol?policeMesh():realTpl[id]&&REAL[id]?realCarFor(CAR[id],ci,plate,!LOWG()):buildCar(CAR[id],ci,{lod:true,proc:true,quiet:true,plate});if(!pol&&!realTpl[id]&&REAL[id])loadReal(id,false);if(mesh.parent!==scene)scene.add(mesh);a={pool:pol?'police':'civ',mesh,id:pol?'chevrolet-cobalt':id,ci:pol?0:ci,plate};AGENTS.push(a);}
  Object.assign(a,{on:true,dead:false,kind,x,z,h:h||0,speed:0,vx:0,vz:0,hits:0,stuck:0,rev:0,leave:false,goal:null,siren:pol,sees:false,offCD:3,
    enterable:!!o.enterable,tag:o.tag||null,onEnter:o.onEnter||null,onHit:o.onHit||(pol?policeHit:null),max:o.max||30,acc:o.acc||9,route:o.route||null,ri:0,done:false,hold:false,
    hazard:!!o.hazard,target:o.target||null,life:o.life||0,mission:!!o.mission});
  a.sp=CAR[a.id];a.mesh.visible=true;a.mesh.position.set(x,0,z);a.mesh.rotation.set(0,a.h,0);return a;}
function freeAgent(a){a.on=false;a.mesh.visible=false;a.enterable=false;a.onEnter=null;a.target=null;if(a.pool==='civ')a.dead=true;}
function sweepAgents(){for(let i=AGENTS.length-1;i>=0;i--){const a=AGENTS[i];if(a.dead){scene.remove(a.mesh);disposeCar(a.mesh);AGENTS.splice(i,1);}}}
function distCam(o){return Math.hypot(o.x-cam.position.x,o.z-cam.position.z);}
function searchPoint(){const r=60+WANT.lvl*20;return snapRoad(WANT.lastX+rnd(-r,r),WANT.lastZ+rnd(-r,r));}
function agentTarget(a){const X=px(),Z=pz();
  switch(a.kind){
    case 'police':if(a.leave)return a.goal||(a.goal=farPoint(a.x,a.z));if(WANT.seen)return {x:X,z:Z};if(!a.goal||Math.hypot(a.goal.x-a.x,a.goal.z-a.z)<18)a.goal=searchPoint();return a.goal;
    case 'rival':return a.route[Math.min(a.ri,a.route.length-1)];
    case 'flee':if(!a.goal||Math.hypot(a.goal.x-a.x,a.goal.z-a.z)<30)a.goal=farPoint(X,Z);return a.goal;
    case 'chaser':if(a.target&&a.target.on)return {x:a.target.x,z:a.target.z};return a.goal||(a.goal=farPoint(a.x,a.z));}
  return null;}
function driveAgent(a,dt,tp,maxV){const dx=tp.x-a.x,dz=tp.z-a.z,dh=wrapA(Math.atan2(dx,dz)-a.h);let ts=0;
  if(a.rev>0){a.rev-=dt;a.speed=lerp(a.speed,-6,Math.min(1,dt*3));a.h-=clamp(dh,-dt,dt)*.6;}
  else{const turn=2.6*dt*clamp(.4+Math.abs(a.speed)/12,0,1.2);a.h+=clamp(dh,-turn,turn);ts=maxV*(1-Math.min(.8,Math.abs(dh)/1.4));
    if(Math.hypot(dx,dz)<6&&a.kind!=='police')ts=Math.min(ts,Math.hypot(dx,dz)*1.5);a.speed+=clamp(ts-a.speed,-16*dt,a.acc*dt);}
  a.h=wrapA(a.h);const fx=Math.sin(a.h),fz=Math.cos(a.h);a.vx=fx*a.speed;a.vz=fz*a.speed;a.x+=a.vx*dt;a.z+=a.vz*dt;
  const hit=collidePoint(a.x,a.z,1.25);if(hit){a.x+=hit.nx*hit.d;a.z+=hit.nz*hit.d;a.speed*=.85;}
  for(const t of TRAFFIC){if(!t.mesh.visible||t.gone)continue;const ex=a.x-t.x,ez=a.z-t.z,d=Math.hypot(ex,ez);if(d<3.1&&d>.01){a.x+=ex/d*(3.1-d);a.z+=ez/d*(3.1-d);a.speed*=.8;t.speed=0;}}
  if(Math.abs(a.speed)<1.2&&ts>4)a.stuck+=dt;else a.stuck=Math.max(0,a.stuck-dt);if(a.stuck>2.2){a.stuck=0;a.rev=1.1;}}
let seeTick=0;
function updateAgents(dt){const X=px(),Z=pz();seeTick-=dt;const look=seeTick<=0;if(look)seeTick=.25;let seen=false;const now=performance.now();
  for(const a of AGENTS){if(!a.on)continue;
    if(a.life>0){a.life-=dt;if(a.life<=0&&distCam(a)>90){freeAgent(a);continue;}if(a.life<=0)a.life=.5;}
    if(a.kind==='block'){if(!WANT.lvl){a.kind='police';a.leave=true;}else if(Math.hypot(X-a.x,Z-a.z)<22)a.kind='police';else if(Math.hypot(X-a.x,Z-a.z)>360){freeAgent(a);continue;}}
    if(a.kind==='parked'||a.kind==='block'){a.speed=0;a.vx=a.vz=0;}
    else{let maxV=a.max;const tp=agentTarget(a);
      if(a.kind==='police'){const d=Math.hypot(X-a.x,Z-a.z);
        if(a.leave){if(distCam(a)>170){freeAgent(a);continue;}maxV=16;}
        else{if(WANT.lvl&&d>330&&distCam(a)>150){ // stragglers re-enter near you only while they can see you; otherwise near where you were last seen
          const p=WANT.seen?spawnPoint(140,230):snapRoad(WANT.lastX+rnd(-120,120),WANT.lastZ+rnd(-120,120));if(Math.hypot(p.x-X,p.z-Z)>110)Object.assign(a,{x:p.x,z:p.z,h:p.h,speed:0,goal:null});}
          if(mode==='foot'&&d<26)maxV=d<12?0:6;maxV*=.78+WANT.lvl*.06;}}
      if(a.kind==='rival'){if(a.hold)maxV=0;else if(a.ri<a.route.length){const c=a.route[a.ri];if(Math.hypot(c.x-a.x,c.z-a.z)<16){a.ri++;if(a.ri>=a.route.length)a.done=true;}}if(a.done)maxV=0;}
      if(tp){const near=Math.hypot(tp.x-a.x,tp.z-a.z)<45&&clearLine(a.x,a.z,tp.x,tp.z);driveAgent(a,dt,near?tp:navTarget(a.x,a.z,tp.x,tp.z),maxV);}}
    for(const b of AGENTS){if(b===a||!b.on)continue;const ex=a.x-b.x,ez=a.z-b.z,d=Math.hypot(ex,ez);if(d<3&&d>.01){a.x+=ex/d*(3-d)*.5;a.z+=ez/d*(3-d)*.5;}}
    const pol=(a.kind==='police'||a.kind==='block')&&!a.leave;
    if(pol&&WANT.lvl&&look){const d=Math.hypot(X-a.x,Z-a.z);a.sees=d<70+WANT.lvl*14&&(d<14||clearLine(a.x,a.z,X,Z));}
    if(pol&&a.sees)seen=true;
    if(a.kind==='police'&&!a.leave&&WANT.lvl&&mode==='foot'){a.offCD-=dt;if(a.offCD<=0&&Math.hypot(X-a.x,Z-a.z)<30&&OFFICERS.filter(o=>o.on).length<1+WANT.lvl){a.offCD=12;spawnOfficer(a);}}
    a.mesh.position.set(a.x,0,a.z);a.mesh.rotation.y=a.h;const u=a.mesh.userData;for(const w of u.wheels)w.rotation.x+=a.speed/u.r*dt;
    if(u.lights){const f=Math.floor(now/160)%2,on=(a.kind==='police'||a.kind==='block'||a.kind==='chaser')&&!a.leave?1:0;u.lights[0].emissiveIntensity=on*(f?3:.2);u.lights[1].emissiveIntensity=on*(f?.2:3);}
    if(u.tail)u.tail.emissiveIntensity=a.hazard?(Math.floor(now/400)%2?2.4:.3):a.speed<2&&!a.hazard?1.6:.55;}
  sweepAgents();
  if(look&&WANT.lvl){for(const h of HELIS)if(h.on&&!h.leave&&Math.hypot(h.x-X,h.z-Z)<150)seen=true;for(const o of OFFICERS)if(o.on&&!(o.down>0)&&Math.hypot(o.x-X,o.z-Z)<40)seen=true;WANT.seen=seen;}}
function placeRoadblock(){const vx=P.vx,vz=P.vz;if(Math.hypot(vx,vz)<8)return;const vi=roadOf(P.x),hj=roadOf(P.z);
  if(vi>=0&&Math.abs(vz)>Math.abs(vx)){const s=Math.sign(vz);let best=-1;for(let j=0;j<9;j++){const d=(ROADS[j]-P.z)*s;if(d>110&&d<260&&(best<0||d<(ROADS[best]-P.z)*s))best=j;}if(best<0)return;
    const z=ROADS[best]-s*(RW(best)/2+5);[-1,1].forEach(k=>makeAgent('block','chevrolet-cobalt',0,ROADS[vi]+k*RW(vi)*.24,z,Math.PI/2+k*.3));}
  else if(hj>=0){const s=Math.sign(vx);let best=-1;for(let i=0;i<9;i++){const d=(ROADS[i]-P.x)*s;if(d>110&&d<260&&(best<0||d<(ROADS[best]-P.x)*s))best=i;}if(best<0)return;
    const x=ROADS[best]-s*(RW(best)/2+5);[-1,1].forEach(k=>makeAgent('block','chevrolet-cobalt',0,x,ROADS[hj]+k*RW(hj)*.24,k*.3));}
  else return;
  toast('Oldinda politsiya toʻsigʻi!','bad');}
function buildHeli(){const g=new THREE.Group(),w=mat('#f2f3f5',{metalness:.3,roughness:.4}),b=mat('#1f4fa0',{roughness:.4}),dk=MAT.trim;g.rotation.order='YXZ';
  const body=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),w);body.scale.set(1.25,1.15,2.3);g.add(body);
  const stripe=new THREE.Mesh(new THREE.SphereGeometry(1.01,20,14,0,Math.PI*2,Math.PI*.42,Math.PI*.16),b);stripe.scale.copy(body.scale);g.add(stripe);
  const gl=new THREE.Mesh(new THREE.SphereGeometry(.95,16,10,0,Math.PI*2,0,Math.PI*.5),MAT.glass);gl.scale.set(1.1,.9,1.3);gl.position.set(0,.25,1.1);gl.rotation.x=.5;g.add(gl);
  const tail=new THREE.Mesh(new THREE.CylinderGeometry(.18,.34,5,10).rotateX(Math.PI/2),w);tail.position.set(0,.35,-4.2);g.add(tail);
  const fin=new THREE.Mesh(box(.12,1.4,.9),b);fin.position.set(0,1,-6.5);g.add(fin);
  [-1,1].forEach(s=>{const sk=new THREE.Mesh(box(.1,.1,3.4),dk);sk.position.set(s*.95,-1.45,.2);g.add(sk);[-.9,.9].forEach(z=>{const q=new THREE.Mesh(box(.08,.5,.08),dk);q.position.set(s*.8,-1.15,z);g.add(q);});});
  const rot=new THREE.Group();rot.position.y=1.35;g.add(rot);for(let k=0;k<2;k++){const bl=new THREE.Mesh(box(11,.05,.32),dk);bl.rotation.y=k*Math.PI/2;rot.add(bl);}
  const tr=new THREE.Group();tr.position.set(.2,1,-6.5);g.add(tr);tr.add(new THREE.Mesh(box(.04,1.6,.14),dk));
  const cone=new THREE.Mesh(new THREE.ConeGeometry(6,40,24,1,true).translate(0,-20,0),new THREE.MeshBasicMaterial({color:C('#fff6dc'),transparent:true,opacity:.11,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,fog:false}));
  cone.visible=false;scene.add(cone);g.visible=false;scene.add(g);return {g,rot,tr,cone,on:false,x:0,z:0,y:60,h:0,a:0,leave:false};}
function spawnHeli(){let h=HELIS.find(q=>!q.on);if(!h){if(HELIS.length>=2)return;h=buildHeli();HELIS.push(h);}const p=WANT.seen?spawnPoint(150,250,true):snapRoad(WANT.lastX+rnd(-200,200),WANT.lastZ+rnd(-200,200));Object.assign(h,{on:true,leave:false,x:p.x,z:p.z,y:70,a:Math.random()*6});h.g.visible=true;toast('Politsiya vertolyoti yetib keldi','bad');}
const _up=new THREE.Vector3(0,-1,0),_dir=new THREE.Vector3();
function updateHelis(dt){const X=px(),Z=pz();for(const h of HELIS){if(!h.on)continue;let tx,tz,ty=44;
    if(h.leave||!WANT.lvl){h.leave=true;tx=h.x+(h.x-X);tz=h.z+(h.z-Z);ty=95;if(Math.hypot(h.x-X,h.z-Z)>420){h.on=false;h.g.visible=false;h.cone.visible=false;continue;}}
    else{const bx=WANT.seen?X:WANT.lastX,bz=WANT.seen?Z:WANT.lastZ;h.a+=dt*.32;tx=bx+Math.cos(h.a)*32;tz=bz+Math.sin(h.a)*32;}
    const dx=tx-h.x,dz=tz-h.z,d=Math.hypot(dx,dz),v=Math.min(38,d*1.2);if(d>.1){h.x+=dx/d*v*dt;h.z+=dz/d*v*dt;}h.y=lerp(h.y,ty,Math.min(1,dt*.8));
    h.h+=wrapA(Math.atan2(X-h.x,Z-h.z)-h.h)*Math.min(1,dt*1.5);
    h.g.position.set(h.x,h.y,h.z);h.g.rotation.set(Math.min(.25,v/150),h.h,0);h.rot.rotation.y+=dt*28;h.tr.rotation.x+=dt*40;
    h.cone.visible=ENV.night>.3&&!h.leave;if(h.cone.visible){h.cone.position.set(h.x,h.y-1.2,h.z);_dir.set(X-h.x,-h.y,Z-h.z);const L=_dir.length();_dir.normalize();h.cone.quaternion.setFromUnitVectors(_up,_dir);h.cone.scale.set(1,L/40,1);}}}
function spawnOfficer(a){let o=OFFICERS.find(q=>!q.on);if(!o){if(OFFICERS.length>=6)return;o={mesh:buildHuman({skin:ri(0,3),hair:2,hairC:0,top:1,topC:1,legsC:1,shoeC:6,glasses:false})};o.mesh.rotation.order='YXZ';scene.add(o.mesh);OFFICERS.push(o);}
  Object.assign(o,{on:true,x:a.x+Math.cos(a.h)*1.6,z:a.z-Math.sin(a.h)*1.6,y:.05,h:a.h,ph:0,down:0,life:0,spd:0});o.mesh.visible=true;}
function updateOfficers(dt){const X=px(),Z=pz();for(const o of OFFICERS){if(!o.on)continue;
    if(o.down>0){o.down-=dt;o.mesh.position.set(o.x,.2,o.z);o.mesh.rotation.set(-Math.PI/2,o.h,0);continue;}
    const dx=X-o.x,dz=Z-o.z,d=Math.hypot(dx,dz),chase=WANT.lvl>0&&mode==='foot';
    if(!chase){o.life+=dt;o.spd=lerp(o.spd,0,Math.min(1,dt*4));if(o.life>5&&distCam(o)>35){o.on=false;o.mesh.visible=false;continue;}}
    else{o.life=0;o.h+=wrapA(Math.atan2(dx,dz)-o.h)*Math.min(1,dt*8);o.spd=lerp(o.spd,d>1.2?5.4:0,Math.min(1,dt*5));}
    o.x+=Math.sin(o.h)*o.spd*dt;o.z+=Math.cos(o.h)*o.spd*dt;solidPush(o,.32,o.y);o.y=groundAt(o.x,o.z);o.ph+=o.spd*dt*2.4;
    poseHuman(o.mesh,o.ph,clamp(o.spd/4.2,0,1.2)*.6,{lean:o.spd>4?.15:0});o.mesh.position.set(o.x,o.y,o.z);o.mesh.rotation.set(0,o.h,0);}}
function updateWanted(dt){WANT.ramCD-=dt;if(!WANT.lvl){WANT.bust=0;return;}const X=px(),Z=pz();
  if(WANT.seen){WANT.lost=0;WANT.lastX=X;WANT.lastZ=Z;WANT.esc+=dt;if(WANT.lvl<4&&WANT.esc>55){WANT.esc=0;WANT.lvl++;toast('Politsiya kuch qoʻshmoqda: '+'★'.repeat(WANT.lvl),'bad');}}
  else{WANT.lost+=dt;if(WANT.lost>7+WANT.lvl*3.5){clearWanted('Politsiyadan qutuldingiz!');return;}}
  if(AGENTS.filter(a=>a.on&&a.kind==='police'&&!a.leave).length<POL_N[WANT.lvl]&&Math.random()<dt*1.5){const p=spawnPoint(120,230);makeAgent('police','chevrolet-cobalt',0,p.x,p.z,p.h,{max:31+WANT.lvl*2,acc:10});}
  if(HELIS.filter(h=>h.on&&!h.leave).length<HELI_N[WANT.lvl])spawnHeli();
  WANT.blockT-=dt;if(WANT.blockT<=0&&mode==='drive'){WANT.blockT=16;if(AGENTS.filter(a=>a.on&&a.kind==='block').length<BLOCK_N[WANT.lvl]*2)placeRoadblock();}
  let near=false;const ps=playerSpeed(),R=mode==='drive'?6.5:4;
  for(const a of AGENTS)if(a.on&&(a.kind==='police'||a.kind==='block')&&!a.leave&&Math.hypot(a.x-X,a.z-Z)<R)near=true;
  let off=false;for(const o of OFFICERS)if(o.on&&!(o.down>0)&&Math.hypot(o.x-X,o.z-Z)<1.5)off=true;
  if((mode==='drive'&&near&&ps<2.5)||(mode==='foot'&&(off||(near&&ps<1.5))))WANT.bust+=dt;else WANT.bust=Math.max(0,WANT.bust-dt*1.5);
  if(WANT.bust>(mode==='drive'?2.6:1.6))busted();}

/* ---------- busted / hospital ---------- */
function bigScreen(title,sub,cb,col){PAUSED=true;const t=$('#fadeT');t.textContent=title;t.style.color=col||'';$('#fadeP').textContent=sub;$('#fade').classList.add('on');
  setTimeout(()=>{try{cb();}catch(e){console.error(e);}setTimeout(()=>{$('#fade').classList.remove('on');PAUSED=phoneOpen||mapOpen;},900);},1400);}
function resetLaw(){WANT.lvl=0;WANT.lost=0;WANT.bust=0;for(const a of AGENTS)if(a.on&&a.pool==='police')freeAgent(a);for(const h of HELIS){h.on=false;h.g.visible=false;h.cone.visible=false;}for(const o of OFFICERS){o.on=false;o.mesh.visible=false;}if(taxi.on)toggleTaxi();}
function respawnAt(lm){const b=blockAt(lm.x,lm.z),j=Math.min(8,b.j+1);HERO.x=lm.x;HERO.z=b.z1-2.4;HERO.y=.224;HERO.h=0;HERO.spd=0;FC.yaw=Math.PI;
  useOwnedCar();P.x=lm.x+9;P.z=ROADS[j]-RW(j)*.28;P.h=Math.PI/2;P.vx=P.vz=0;P.mesh.position.set(P.x,0,P.z);P.mesh.rotation.set(0,P.h,0);
  mode='foot';document.body.classList.add('foot');HERO.mesh.visible=true;cam.position.set(HERO.x,3,HERO.z-5);persist();}
function busted(){if(MS.cur)failMission('Qoʻlga olindingiz');const fine=S.unlimited?0:Math.min(S.money,300+WANT.lvl*350);WANT.bust=0;
  bigScreen('QOʻLGA OLINDINGIZ',fine?'Jarima: '+fmt(fine):'Inspektor ogohlantirish bilan qoʻyib yubordi',()=>{S.money-=fine;resetLaw();respawnAt(LM.police);});}
function wasted(){if(MS.cur)failMission('Sogʻligʻingiz tugadi');const fee=S.unlimited?0:Math.min(S.money,250);
  bigScreen('SHIFOXONADA',fee?'Davolanish: '+fmt(fee):'Shifokorlar sizni oyoqqa turgʻazdi',()=>{S.money-=fee;resetLaw();HERO.hp=100;respawnAt(LM.hosp);});}


/* ---------- extra sounds: rain, police siren, thunder, speech blips (own nodes on the shared audio context) ---------- */
let WA=null;
function worldAudio(){if(WA||!A||!A.ac)return WA;const ac=A.ac;try{const len=ac.sampleRate*2,buf=ac.createBuffer(1,len,ac.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
  const rn=ac.createBufferSource();rn.buffer=buf;rn.loop=true;const rlp=ac.createBiquadFilter();rlp.type='lowpass';rlp.frequency.value=2600;const rg=ac.createGain();rg.gain.value=0;rn.connect(rlp);rlp.connect(rg);rg.connect(ac.destination);rn.start();
  const so=ac.createOscillator();so.type='square';so.frequency.value=700;const slp=ac.createBiquadFilter();slp.type='lowpass';slp.frequency.value=1800;const sg=ac.createGain();sg.gain.value=0;so.connect(slp);slp.connect(sg);sg.connect(ac.destination);so.start();
  const gn=ac.createBufferSource();gn.buffer=buf;gn.loop=true;gn.playbackRate.value=.7;const gbp=ac.createBiquadFilter();gbp.type='bandpass';gbp.frequency.value=520;gbp.Q.value=.8;const gg=ac.createGain();gg.gain.value=0;gn.connect(gbp);gbp.connect(gg);gg.connect(ac.destination);gn.start();
  const wn=ac.createBufferSource();wn.buffer=buf;wn.loop=true;const whp=ac.createBiquadFilter();whp.type='highpass';whp.frequency.value=2400;const wg=ac.createGain();wg.gain.value=0;wn.connect(whp);whp.connect(wg);wg.connect(ac.destination);wn.start();
  WA={ac,buf,rg,so,sg,gg,gbp,wg};}catch(e){WA=null;}return WA;}
function thunder(d){const w=worldAudio();if(!w||!S.sound)return;const t=w.ac.currentTime+d,n=w.ac.createBufferSource();n.buffer=w.buf;const f=w.ac.createBiquadFilter();f.type='lowpass';f.frequency.value=260;const g=w.ac.createGain();
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.5,t+.08);g.gain.setTargetAtTime(0,t+.3,.6);n.connect(f);f.connect(g);g.connect(w.ac.destination);n.start(t);n.stop(t+3);}
function babble(who){const w=worldAudio();if(!w||!S.sound)return;const base=VOICE[who]||170,t0=w.ac.currentTime;for(let k=0;k<6;k++){const o=w.ac.createOscillator(),g=w.ac.createGain(),t=t0+k*.09;o.type='triangle';o.frequency.setValueAtTime(base*(.85+Math.random()*.4),t);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.035,t+.02);g.gain.linearRampToValueAtTime(0,t+.08);o.connect(g);g.connect(w.ac.destination);o.start(t);o.stop(t+.1);}}
function updateAmbience(){const w=worldAudio();if(!w)return;const t=w.ac.currentTime,on=S.sound&&(mode==='drive'||mode==='foot')&&!PAUSED;
  w.rg.gain.setTargetAtTime(on?ENV.rain*.09:0,t,.3);
  const dv=on&&mode==='drive'?Math.hypot(P.vx,P.vz):0,soft=SURF.key==='grass'||SURF.key==='dirt',sl=Math.abs(P.vx*Math.cos(P.h)-P.vz*Math.sin(P.h));
  w.gg.gain.setTargetAtTime(soft?Math.min(.16,dv*.006+sl*.012):0,t,.12);w.gbp.frequency.setTargetAtTime(SURF.key==='dirt'?420+dv*8:300+dv*5,t,.2);
  w.wg.gain.setTargetAtTime(!soft&&ENV.wet>.2?Math.min(.06,dv*.0018)*ENV.wet:0,t,.2);
  let d=1e9;for(const a of AGENTS)if(a.on&&(a.kind==='police'||a.kind==='chaser')&&a.siren&&!a.leave)d=Math.min(d,Math.hypot(a.x-px(),a.z-pz()));
  const sv=on?clamp(1-d/170,0,1)*.045:0;w.sg.gain.setTargetAtTime(sv,t,.1);if(sv>0)w.so.frequency.setTargetAtTime(760+380*Math.sin(performance.now()/1000*Math.PI*1.3),t,.05);}

/* ================= DIALOGUE & SUBTITLES ================= */
const VOICE={'Botir aka':118,'Lola':262,'Kamron':150,'Inspektor Rahimov':108,'Sardor':165,'Mijoz':205,'Sayyoh':232,'Yoʻlovchi':190,'Haydovchi':140,'Jabrlanuvchi':175,'Doʻkonchi':150};
const DLG={q:[],cur:null,t:0,done:null,log:[]};
function say(lines,done){for(const l of lines)DLG.q.push({who:l[0],txt:l[1]});if(done){const prev=DLG.done;DLG.done=prev?()=>{prev();done();}:done;}if(!DLG.cur)nextLine();}
function nextLine(){const l=DLG.q.shift();if(!l){DLG.cur=null;showSub(null);const f=DLG.done;DLG.done=null;if(f)f();return;}
  DLG.cur=l;DLG.t=clamp(l.txt.length*.06,2.6,9);DLG.log.push(l);if(DLG.log.length>60)DLG.log.shift();showSub(l);babble(l.who);}
function updateDialog(dt){if(DLG.cur){DLG.t-=dt;if(DLG.t<=0)nextLine();}}
const CY={a:'а',b:'б',d:'д',e:'е',f:'ф',g:'г',h:'ҳ',i:'и',j:'ж',k:'к',l:'л',m:'м',n:'н',o:'о',p:'п',q:'қ',r:'р',s:'с',t:'т',u:'у',v:'в',x:'х',y:'й',z:'з',c:'с',w:'в','ʼ':'ъ',"'":'ъ'};
const CYD={'oʻ':'ў','gʻ':'ғ','sh':'ш','ch':'ч','yo':'ё','yu':'ю','ya':'я','ye':'е'};
// Uzbek Latin → Cyrillic for the subtitle language option
function tr(s){if(!S.sub.cyr)return s;return s.replace(/(oʻ|gʻ|sh|ch|yo|yu|ya|ye)|[a-zʼ]/gi,(m,dg,off,str)=>{const lo=m.toLowerCase(),start=off===0||!/[a-zʻʼ]/i.test(str[off-1]);
  let r=CYD[lo]||(lo==='e'&&start?'э':CY[lo])||m;if(m[0]!==m[0].toLowerCase())r=r[0].toUpperCase()+r.slice(1);return r;});}
function showSub(l){const el=$('#subs');if(!l||!S.sub.on){el.classList.remove('on');return;}el.firstElementChild.innerHTML='<b>'+esc(tr(l.who))+':</b>'+esc(tr(l.txt));el.classList.add('on');}
function applySubStyle(){const r=document.documentElement.style;r.setProperty('--subsz',S.sub.size);r.setProperty('--subbg',S.sub.bg);}
function addMsg(f,t,act){S.msgs.push({f,t,h:W.tod,r:false,a:act||''});if(S.msgs.length>40)S.msgs.shift();toast('Yangi xabar: '+f+' (P — telefon)','gold');beep(990,.05);setTimeout(()=>beep(1320,.05),90);persist();if(phoneOpen&&phApp==='msgs')renderPhone();}

/* ================= MISSIONS ================= */
const objBeam=beam('#f0b83e'),cpBeam=beam('#ff9f43'),cpBeam2=beam('#ff9f43'),storyBeam=beam('#f0b83e'),evtBeam=beam('#4fd18b');
cpBeam2.scale.set(.6,.6,.6);storyBeam.scale.set(.7,1,.7);evtBeam.scale.set(.5,.5,.5);
const MS={cur:null,si:0,st:null,t:0,d:null,goal:null,marks:[],flag:false,txt:'',sub:'',hintE:null};
const STEPS={
  talk:{init:st=>{say(st.lines,()=>{if(MS.st===st)MS.flag=true;});},upd:()=>MS.flag},
  func:{init:(st,d)=>{st.run(d);},upd:()=>true},
  wait:{init:()=>{},upd:st=>MS.t>st.s},
  needcar:{init:()=>{MS.txt='Mashinaga oʻtiring (F)';},upd:()=>{if(mode==='drive')return true;MS.goal={x:P.x,z:P.z};MS.sub=Math.round(Math.hypot(P.x-px(),P.z-pz()))+' m';return false;}},
  goto:{init:(st,d)=>{st._p=resolve(st.at,d);const dist=Math.hypot(st._p.x-px(),st._p.z-pz());st._L=st.limit?resolve(st.limit,d,dist):0;MS.goal=st._p;},
    upd:(st,d)=>{const p=st._p,dist=Math.hypot(p.x-px(),p.z-pz()),spd=mode==='drive'?Math.hypot(P.vx,P.vz):0;let ok=true;MS.goal=p;
      if(st.need==='mcar'&&P.missionCar!==st.tag)return 'Missiya mashinasi yoʻqoldi';
      if(st.need==='car'&&mode!=='drive'){ok=false;MS.txt='Mashinaga oʻtiring (F)';}
      else if(st.need==='mcar'&&mode!=='drive'){ok=false;MS.txt='Missiya mashinasiga qayting (F)';MS.goal={x:P.x,z:P.z};}
      else if(st.need==='foot'&&mode!=='foot'){ok=false;MS.txt='Mashinadan tushing (F)';}
      else MS.txt=resolve(st.txt,d)||'';
      MS.sub=Math.round(dist)+' m'+(st._L?' · '+Math.max(0,Math.ceil(st._L-MS.t))+' s':'')+(st.slow&&dist<st.r*2.5&&spd>6?' · toʻxtang':'');
      if(st._L&&MS.t>st._L)return 'Vaqt tugadi';
      return ok&&dist<st.r&&(!st.slow||spd<6);}},
  enter:{init:(st,d)=>{const s=st.spawn,p=resolve(s.at,d);d[st.tag]=makeAgent('parked',s.id,s.ci,p.x,p.z,p.h||0,{enterable:true,tag:st.tag,mission:true,onEnter:()=>{if(st.onEnter)st.onEnter(d);}});MS.goal={x:p.x,z:p.z};},
    upd:(st,d)=>{if(mode==='drive'&&P.missionCar===st.tag)return true;const a=d[st.tag];if(a&&a.on)MS.goal={x:a.x,z:a.z};else if(P.missionCar!==st.tag)return 'Missiya mashinasi yoʻqoldi';
      MS.txt=resolve(st.txt,d);MS.sub=Math.round(Math.hypot(MS.goal.x-px(),MS.goal.z-pz()))+' m';return false;}},
  escape:{init:st=>{if(st.lvl)setWanted(st.lvl);MS.goal=null;},upd:()=>{MS.goal=null;MS.sub=WANT.lvl?'★'.repeat(WANT.lvl)+(WANT.lost>1?' · izlashmoqda':' · koʻrinib turibsiz'):'';return MS.t>.5&&WANT.lvl===0;}},
  pickup:{init:(st,d)=>{st._p=resolve(st.at,d);MS.goal=st._p;},
    upd:(st,d)=>{const p=st._p,dist=Math.hypot(p.x-px(),p.z-pz());MS.sub=Math.round(dist)+' m';
      MS.hintE=mode==='foot'&&dist<2.8?{txt:st.act||'Olish',fn:()=>{MS.flag=true;MS.hintE=null;beep(880,.06);}}:null;
      MS.txt=mode!=='foot'&&dist<14?'Mashinadan tushing (F)':resolve(st.txt,d);return MS.flag;},end:()=>{MS.hintE=null;}},
  photo:{init:(st,d)=>{st._k=resolve(st.lm,d);MS.goal=lmRoad(st._k);},upd:st=>{const l=LM[st._k],dist=Math.hypot(l.x-px(),l.z-pz());MS.sub=l.name+' · '+Math.round(dist)+' m';return MS.flag;}},
  drift:{init:(st,d)=>{d.score=0;},upd:(st,d,dt)=>{if(mode==='drive'){const lat=Math.abs(P.vx*Math.cos(P.h)-P.vz*Math.sin(P.h)),sp=Math.hypot(P.vx,P.vz);if(lat>2.2&&sp>7)d.score+=lat*sp*dt*.9;}
    MS.sub='Ochko: '+Math.round(d.score)+' / '+st.need+' · '+Math.max(0,Math.ceil(st.dur-MS.t))+' s'+(d.score>=st.need?' · bajarildi, rekord uchun davom eting':'');if(MS.t>st.dur)return d.score>=st.need?true:'Ochko yetmadi';return false;}},
  chase:{init:(st,d)=>{const q=snapRoad(P.x+Math.sin(P.h)*95,P.z+Math.cos(P.h)*95);const a=makeAgent('flee',st.spawn.id,st.spawn.ci,q.x,q.z,q.h,{max:st.max||26,acc:8,mission:true});a.hits=0;d.target=a;d.lost=0;},
    upd:(st,d,dt)=>{const a=d.target;if(!a||!a.on)return 'Nishon yoʻqoldi';MS.goal={x:a.x,z:a.z};const dist=Math.hypot(a.x-px(),a.z-pz());
      MS.sub='Zarba: '+Math.min(100,Math.round(a.hits/st.need*100))+'% · '+Math.round(dist)+' m';
      if(dist>400){d.lost+=dt;if(d.lost>9)return 'Nishon qochib ketdi';}else d.lost=0;
      if(a.hits>=st.need){a.kind='parked';a.hazard=true;a.speed=0;toast('Nishon toʻxtadi!','good');return true;}return false;}},
  race:{init:(st,d)=>{d.cps=resolve(st.cps,d);d.pi=0;d.cd=3.5;d.rv=[];d.total=0;let lx=px(),lz=pz();for(const c of d.cps){d.total+=Math.abs(c.x-lx)+Math.abs(c.z-lz);lx=c.x;lz=c.z;}
      st._L=st.limit?st.limit(d):0;const rx=Math.cos(P.h),rz=-Math.sin(P.h),fx=Math.sin(P.h),fz=Math.cos(P.h);
      (st.rivals||[]).forEach(([id,ci],k)=>{const s=k%2?1:-1,x=P.x+rx*s*3.4-fx*(4+k*3),z=P.z+rz*s*3.4-fz*(4+k*3);const a=makeAgent('rival',id,ci,x,z,P.h,{route:d.cps,mission:true,acc:10});a.hold=true;d.rv.push(a);});},
    upd:(st,d,dt)=>{MS.txt=mode!=='drive'?'Mashinaga qayting (F)':resolve(st.txt,d);let pre='';
      if(d.cd>0){d.cd-=dt;MS.t=0;pre='Start: '+Math.max(1,Math.ceil(d.cd))+' · ';if(Math.ceil(d.cd)!==d.lastC){d.lastC=Math.ceil(d.cd);beep(d.cd<=0?1200:700,.12);}
        if(d.cd<=0){const vm=clamp(P.sp.top/3.6*.8,24,47);d.rv.forEach(a=>{a.hold=false;a.max=vm;});toast('START!','gold');}}
      const c=d.cps[d.pi];if(!c)return true;
      if(mode==='drive'&&Math.hypot(c.x-px(),c.z-pz())<16){d.pi++;beep(1040,.06);if(d.pi>=d.cps.length){d.time=MS.t;return true;}}
      for(const a of d.rv)if(a.done)return 'Raqib birinchi keldi';
      const n=d.cps[d.pi],n2=d.cps[d.pi+1];cpBeam.position.set(n.x,0,n.z);cpBeam.visible=true;if(n2){cpBeam2.position.set(n2.x,0,n2.z);cpBeam2.visible=true;}else cpBeam2.visible=false;MS.goal=n;
      let place=1;const myD=Math.hypot(n.x-px(),n.z-pz());for(const a of d.rv)if(a.ri>d.pi||(a.ri===d.pi&&Math.hypot(n.x-a.x,n.z-a.z)<myD))place++;
      MS.sub=pre+'Nuqta '+(d.pi+1)+'/'+d.cps.length+(d.rv.length?' · '+place+'-oʻrin':'')+(st._L?' · '+Math.max(0,Math.ceil(st._L-MS.t))+' s':' · '+MS.t.toFixed(1)+' s');
      if(st._L&&MS.t>st._L)return 'Vaqt tugadi';return false;},
    end:()=>{cpBeam.visible=cpBeam2.visible=false;}}
};
function startMission(def){if(MS.cur){toast('Avval joriy missiyani tugating');return false;}if(WANT.lvl&&!def.wantedOK){toast('Avval politsiyadan qutuling','bad');return false;}
  if(taxi.on)toggleTaxi();closePhone();MS.cur=def;MS.d={};MS.si=-1;MS.st=null;MS.marks=[];toast((def.story?'Hikoya missiyasi: ':'Ish: ')+def.title,'gold');nextStep();return true;}
function nextStep(){const def=MS.cur;if(!def)return;if(MS.st&&STEPS[MS.st.t].end)STEPS[MS.st.t].end(MS.st,MS.d);MS.si++;MS.t=0;MS.flag=false;MS.hintE=null;MS.goal=null;
  if(MS.si>=def.steps.length){completeMission();return;}MS.st=def.steps[MS.si];MS.txt=resolve(MS.st.txt,MS.d)||'';MS.sub='';STEPS[MS.st.t].init(MS.st,MS.d);}
function updateMission(dt){const sm2=storyMarker();storyBeam.visible=!!sm2;if(sm2)storyBeam.position.set(sm2.x,0,sm2.z);storyBeam.rotation.y+=dt;
  if(!MS.cur||!MS.st){objBeam.visible=false;return;}MS.t+=dt;let r;
  try{r=STEPS[MS.st.t].upd(MS.st,MS.d,dt);}catch(e){console.error(e);r='Missiyada xatolik';}
  const g=MS.goal;if(g&&MS.st&&MS.st.t!=='race'){objBeam.position.set(g.x,0,g.z);objBeam.visible=true;}else objBeam.visible=false;
  if(r===true)nextStep();else if(typeof r==='string')failMission(r);}
function cleanupMission(){const def=MS.cur;if(MS.st&&STEPS[MS.st.t].end)STEPS[MS.st.t].end(MS.st,MS.d);for(const a of AGENTS)if(a.on&&a.mission&&a.kind!=='parked')freeAgent(a);else if(a.on&&a.mission){a.mission=false;a.enterable=false;a.life=20;}
  if(def&&def.cleanup)try{def.cleanup(MS.d);}catch(e){}MS.cur=null;MS.st=null;MS.goal=null;MS.marks=[];MS.hintE=null;objBeam.visible=cpBeam.visible=cpBeam2.visible=false;}
function failMission(why){const t=MS.cur?MS.cur.title:'';cleanupMission();DLG.q.length=0;toast('Missiya muvaffaqiyatsiz: '+why,'bad');beep(300,.2);}
function completeMission(){const def=MS.cur,d=MS.d,pay=Math.round(resolve(def.reward,d)||0);cleanupMission();if(pay>0)earn(pay);S.done[def.id]=(S.done[def.id]||0)+1;
  if(def.story)S.story=Math.max(S.story,def.idx+1);if(P.missionCar){P.missionCar=null;}
  if(def.after)try{def.after(d);}catch(e){console.error(e);}persist();updMoney();
  toast('MISSIYA BAJARILDI: '+def.title+(pay>0?' · +'+fmt(pay):''),'good');beep(660,.1);setTimeout(()=>beep(880,.1),120);setTimeout(()=>beep(1320,.18),240);}
const R_=ROADS;
const STORY=[
  {id:'s1',idx:0,story:true,title:'Yangi boshlanish',giver:'Botir aka',at:()=>lmRoad('chorsu',-20),reward:1500,
    desc:'Botir akaning ustaxonasiga yordam bering: ehtiyot qismlarni Yunusobodga vaqtida yetkazing.',
    steps:[
      {t:'talk',lines:[['Botir aka','Sardor! Keldingmi, ukam? Qoʻqondan yoʻl qanday boʻldi?'],['Sardor','Yaxshi, aka. Ish boʻlsa bas — men tayyorman.'],['Botir aka','Unda gap koʻp emas. Yunusoboddagi mijozga ehtiyot qismlar kerak. Mening Damasimni ol.'],['Botir aka','Faqat tez boʻl — mijoz kutib oʻtirmaydi.']]},
      {t:'enter',txt:'Botir akaning Damasiga oʻtiring (F)',tag:'damas',spawn:{id:'chevrolet-damas',ci:0,at:()=>lmRoad('chorsu',10)}},
      {t:'goto',txt:'Ehtiyot qismlarni Yunusobodga yetkazing',need:'mcar',tag:'damas',at:{x:R_[4]+7,z:-450},r:10,slow:true,limit:(d,dist)=>Math.round(dist/12+35)},
      {t:'talk',lines:[['Mijoz','Oʻz vaqtida! Botir akaga katta rahmat ayting.'],['Sardor','Aytaman. Yana kerak boʻlsa — chaqiring.']]}],
    after:()=>addMsg('Botir aka','Barakalla, Sardor! Pulingni oʻtkazdim. Kamron degan bola seni soʻrayapti — kechqurun Tashkent City yonida. Ehtiyot boʻl, u poygachi.')},
  {id:'s2',idx:1,story:true,title:'Tungi poyga',giver:'Kamron',hours:[20,5],at:()=>lmRoad('city'),reward:3000,
    desc:'Kamron sizni sinamoqchi: shahar markazi boʻylab tungi poygada uning odamlaridan oʻzing.',
    steps:[
      {t:'talk',lines:[['Kamron','Botir akaning yangi shogirdi senmisan? Gapirishdan oldin koʻrsat-chi, nima qila olasan.'],['Sardor','Qanday qilib?'],['Kamron','Poyga. Shahar boʻylab yetti nuqta. Mening bolalarimdan oʻzsang — gaplashamiz.']]},
      {t:'needcar'},
      {t:'race',txt:'Raqiblardan oldin marraga yeting',cps:()=>[{x:R_[3],z:R_[3]},{x:R_[3],z:R_[1]},{x:R_[1],z:R_[1]},{x:R_[1],z:R_[4]},{x:R_[4],z:R_[4]},{x:R_[4],z:R_[3]},lmRoad('city')],rivals:[['bmw-m4',1],['chevrolet-camaro-ss',8]]},
      {t:'talk',lines:[['Kamron','Hm... Yomon emas.'],['Kamron','Lekin bu shaharda faqat tezlik yetmaydi, ukam. Koʻrishguncha.']]}],
    after:()=>setTimeout(()=>addMsg('Botir aka','Sardor, tezda ustaxonaga kel! Falokat yuz berdi.'),4000)},
  {id:'s3',idx:2,story:true,title:'Oʻgʻirlangan Nexia',giver:'Botir aka',at:()=>lmRoad('chorsu',-20),reward:4000,
    desc:'Botir akaning mashinasi oʻgʻirlandi. Uni Olmazordagi omborxonadan qaytarib keling.',
    steps:[
      {t:'talk',lines:[['Botir aka','Sardor, falokat! Kecha kechasi ustaxonadan mijozning Nexiasini olib ketishibdi.'],['Botir aka','Lola degan qiz — taksi dispetcheri — uni Olmazordagi omborxona yonida koʻrgan ekan.'],['Sardor','Kamronning ishi boʻlsa kerak.'],['Botir aka','Kim boʻlsa ham, mashinani qaytar. Lekin ehtiyot boʻl — u yerda signalizatsiya bor.']]},
      {t:'goto',txt:'Olmazordagi omborxonaga boring',at:{x:R_[1]+4,z:-470},r:35},
      {t:'enter',txt:'Oʻgʻirlangan Nexiaga oʻtiring (F)',tag:'nexia',spawn:{id:'chevrolet-nexia-3',ci:6,at:{x:R_[1]+4,z:-485,h:0}},
        onEnter:()=>{setWanted(2);say([['Sardor','Signalizatsiya! Politsiya yoʻlda — tezroq ketish kerak.']]);}},
      {t:'escape',txt:'Politsiyadan qutuling'},
      {t:'goto',txt:'Nexiani Botir akaning ustaxonasiga olib boring',need:'mcar',tag:'nexia',at:()=>lmRoad('chorsu',-10),r:10,slow:true},
      {t:'talk',lines:[['Botir aka','Qaytardingmi?! Oʻgʻlim, sen haqiqiy usta ekansan.'],['Botir aka','Raqamlari almashtirilgan... Bu oddiy oʻgʻrilik emas. Lola bilan gaplash — u koʻp narsani biladi.']]}],
    after:()=>{if(mode==='drive')exitCar();useOwnedCar();bringCarToHero();addMsg('Lola','Salom, Sardor. Men Lola. Mustaqillik maydoni yonida uchrashamiz — Kamron haqida aytadigan gapim bor.');}},
  {id:'s4',idx:3,story:true,title:'Kuryer',giver:'Lola',at:()=>lmRoad('must'),reward:5000,
    desc:'Kamronning kuryerini toʻxtatib, soxta hujjatlarni qoʻlga kiriting.',
    steps:[
      {t:'talk',lines:[['Lola','Kamron oddiy poygachi emas. Uning odamlari oʻgʻirlangan mashinalarga soxta hujjat qilib sotadi.'],['Lola','Hozir uning kuryeri hujjatlar bilan shahar boʻylab yuribdi. Qora BMW. Uni toʻxtat — hujjatlar bizga dalil boʻladi.'],['Sardor','Qayerda u?'],['Lola','GPSingga yubordim. Tez boʻl!']]},
      {t:'needcar'},
      {t:'chase',txt:'Kuryer mashinasini urib toʻxtating',spawn:{id:'bmw-5-series',ci:1},need:45,max:26},
      {t:'pickup',txt:'Mashinadan tushing va hujjatlarni oling',act:'Hujjatlarni olish',at:d=>({x:d.target.x,z:d.target.z})},
      {t:'goto',txt:'Hujjatlarni Lolaga olib boring',at:()=>lmRoad('must'),r:10},
      {t:'talk',lines:[['Lola','Mana! Soxta raqamlar, soxta texpasportlar... va imzo — Kamron.'],['Lola','Lekin bu yetmaydi. Bizga uning oʻzini savdo paytida ushlash kerak.']]}],
    after:()=>addMsg('Lola','Kamron kechqurun teleminora yonida katta savdo qiladi. Tayyor boʻlsang — Mustaqillik maydonida kutaman (19:00 dan keyin).')},
  {id:'s5',idx:4,story:true,title:'Teleminora',giver:'Lola',hours:[19,4],at:()=>lmRoad('must'),reward:15000,
    desc:'Kamronning savdosini suratga oling va dalillarni Inspektor Rahimovga yetkazing.',
    steps:[
      {t:'talk',lines:[['Lola','Savdo teleminora tagida boʻladi. Yaqinlashib surat ol — yuzlar va raqamlar koʻrinsin.'],['Lola','Keyin toʻgʻri Inspektor Rahimovga bor. U halol odam — dalillarni oʻzi koʻradi.'],['Sardor','Kamron meni koʻrib qolsa-chi?'],['Lola','Unda qoch. Tez qoch.']]},
      {t:'goto',txt:'Teleminoraga boring',at:()=>lmRoad('tv'),r:45},
      {t:'photo',lm:'tv',r:150,txt:'Mashinadan tushib, teleminorani suratga oling (K)'},
      {t:'func',run:()=>{setWanted(4);say([['Kamron','(telefonda) Sardor... Katta xato qilding. Politsiya allaqachon seni qidiryapti!']]);}},
      {t:'escape',txt:'Kamron sizni politsiyaga sotdi — qutuling!'},
      {t:'goto',txt:'Dalillarni Inspektor Rahimovga olib boring',at:()=>lmRoad('police'),r:10},
      {t:'talk',lines:[['Inspektor Rahimov','Sardor... Lola siz haqingizda aytgan edi. Koʻraylik-chi.'],['Inspektor Rahimov','Surat, hujjatlar, raqamlar... Bu yetarli. Kamron bugun tunda qoʻlga olinadi.'],['Inspektor Rahimov','Sizga qarzdormiz. Shaharga siz kabi odamlar kerak.'],['Sardor','Men faqat Botir akaning mashinasini qaytarmoqchi edim, xolos.']]}],
    after:()=>{addMsg('Botir aka','Eshitdim, eshitdim! Kamron qamaldi. Ustaxonada senga doim joy bor, Sardor.');setTimeout(()=>addMsg('Inspektor Rahimov','Sardor, Kamron yolgʻiz ishlamagan ekan. Politsiya boshqarmasiga keling — gaplashamiz. (2-bob)'),6000);}},
  /* ---------- 2-bob: Yangi tahdid ---------- */
  {id:'s6',idx:5,story:true,chapter:2,title:'Yashirin yuk',giver:'Inspektor Rahimov',at:()=>lmRoad('police'),reward:6000,
    desc:'Kamronning odamlari Magic City yonida yuk tashiyapti. Shubhali Tahoeni toʻxtatib, yukni tekshiring.',
    steps:[
      {t:'talk',lines:[['Inspektor Rahimov','Kamron qamoqda, lekin mashina oʻgʻirlash toʻxtamadi. Demak, uning ortida kimdir bor.'],['Inspektor Rahimov','Bugun Magic City yonida qora Tahoe yuk olib ketyapti. Bizning mashinalarni ular uzoqdan taniydi — siz esa oddiy haydovchisiz.'],['Sardor','Toʻxtatib, nima olib ketayotganini koʻraman.']]},
      {t:'needcar'},
      {t:'goto',txt:'Magic City yoniga boring',at:()=>lmRoad('magic'),r:40},
      {t:'chase',txt:'Qora Tahoeni urib toʻxtating',spawn:{id:'chevrolet-tahoe',ci:1},need:50,max:24},
      {t:'pickup',txt:'Mashinadan tushib, yukni tekshiring',act:'Yukni tekshirish',at:d=>({x:d.target.x,z:d.target.z})},
      {t:'goto',txt:'Topilgan raqam va hujjatlarni Inspektor Rahimovga olib boring',at:()=>lmRoad('police'),r:10},
      {t:'talk',lines:[['Inspektor Rahimov','Oʻnlab soxta raqam... va bitta ism: «Shef».'],['Inspektor Rahimov','Hech kim uni koʻrmagan. Lekin poygachilar orasida u haqida gap yuradi.']]}],
    after:()=>addMsg('Jasur','Sen Kamronni yengan bolamisan? Men Jasur, drift qiroliman. Shef haqida bilaman — lekin avval Humo Arena yonida meni yeng (20:00 dan keyin).')},
  {id:'s7',idx:6,story:true,chapter:2,title:'Drift qiroli',giver:'Jasur',hours:[20,5],at:()=>lmRoad('humo'),reward:5000,
    desc:'Jasur faqat oʻzidan kuchlilar bilan gaplashadi: bir daqiqada 4 000 drift ochko toʻplang.',
    steps:[
      {t:'talk',lines:[['Jasur','Tezlik — bu hali hammasi emas. Haqiqiy haydovchi mashinani yonboshlab boshqaradi.'],['Jasur','Bir daqiqada 4 000 ochko. Uddalasang — Shef haqida bilganimni aytaman.'],['Sardor','Kelishdik.']]},
      {t:'needcar'},
      {t:'drift',dur:60,need:4000,txt:'Bir daqiqada 4 000 drift ochko toʻplang (Probel)'},
      {t:'talk',lines:[['Jasur','Ha-ha! Kamron bekorga sendan qoʻrqmagan ekan.'],['Jasur','Shefning odamlari mashinalarni Hazrati Imom yonidagi bozorda sotadi.'],['Jasur','Botir akadan soʻra — u bozordagilarni yaxshi taniydi.']]}],
    after:d=>{const v=Math.round(d.score||0);if(v>(S.best.drift||0)){S.best.drift=v;API.submit('drift',v);}addMsg('Botir aka','Sardor, Jasur menga qoʻngʻiroq qildi. Ustaxonaga kel — bozor haqida gaplashamiz.');}},
  {id:'s8',idx:7,story:true,chapter:2,title:'Bozordagi kuzatuv',giver:'Botir aka',at:()=>lmRoad('chorsu',-20),reward:6000,
    desc:'Hazrati Imom yonidagi savdoni suratga olib, dalillarni Botir akaga keltiring.',
    steps:[
      {t:'talk',lines:[['Botir aka','Hazrati Imom yonida mashina bozori bor. Ostida — oʻgʻirlangan mashinalar savdosi.'],['Botir aka','Yaqinlashib surat ol. Lekin hech kimga koʻrinma, ular xavfli odamlar.']]},
      {t:'goto',txt:'Hazrati Imom majmuasiga boring',at:()=>lmRoad('imom'),r:45},
      {t:'photo',lm:'imom',r:150,txt:'Mashinadan tushib, savdo joyini suratga oling (K)'},
      {t:'func',run:()=>{setWanted(2);say([['Sardor','Meni koʻrib qolishdi! Ularning politsiyada ham odami bor ekan — tezroq ketish kerak.']]);}},
      {t:'escape',txt:'Shefning odamlaridan qutuling'},
      {t:'goto',txt:'Suratlarni Botir akaga olib boring',at:()=>lmRoad('chorsu',-10),r:10},
      {t:'talk',lines:[['Botir aka','Mana bu odamni taniyman... U Lolaning taksi parkida ishlaydi!'],['Botir aka','Lolaga ehtiyot boʻlib ayt. Balki u hech narsani bilmas.']]}],
    after:()=>addMsg('Lola','Sardor, taksi parkimizda gʻalati ishlar boʻlyapti. Bugun «Shef»ning odamlari pulli poyga uyushtiradi. Mustaqillik maydonida uchrashamiz.')},
  {id:'s9',idx:8,story:true,chapter:2,title:'Katta pul poygasi',giver:'Lola',at:()=>lmRoad('must'),reward:8000,
    desc:'Shefning poygasida gʻolib boʻling — gʻolib unga shaxsan tanishtiriladi.',
    steps:[
      {t:'talk',lines:[['Lola','Shefning odamlari poyga uyushtiradi. Gʻolibni Shefning oʻzi qabul qiladi — boshqa yoʻl bilan unga yetib boʻlmaydi.'],['Sardor','Demak, yutish kerak.'],['Lola','Ha. Raqiblar kuchli — AMG GT va M4. Ehtiyot boʻl.']]},
      {t:'needcar'},
      {t:'race',txt:'Shefning poygasida birinchi keling',cps:()=>[lmRoad('navoi'),lmRoad('temur'),lmRoad('hotel'),lmRoad('minor'),lmRoad('park'),lmRoad('must')],rivals:[['mercedes-amg-gt',0],['bmw-m4',3]]},
      {t:'talk',lines:[['Lola','Yutding! Shefning odami aytdi: u seni bugun kechasi teleminora yonida kutadi.'],['Sardor','Rahimovga aytish kerak.'],['Lola','Ehtiyot boʻl, Sardor. Botir aka aytgan odam — mening oʻrinbosarim ekan. Uni allaqachon ishdan haydadim.']]}],
    after:()=>addMsg('Inspektor Rahimov','Lola hammasini aytdi. Bugun tunda Shefni qoʻlga olamiz — siz bilan. Boshqarmaga keling (19:00 dan keyin).')},
  {id:'s10',idx:9,story:true,chapter:2,title:'Shefning oxiri',giver:'Inspektor Rahimov',hours:[19,4],at:()=>lmRoad('police'),reward:25000,
    desc:'Shefning Urusini quvib yetib toʻxtating va uni adolatga topshiring.',
    steps:[
      {t:'talk',lines:[['Inspektor Rahimov','Shef sizni teleminora yonida kutadi. Biz yaqinda boʻlamiz.'],['Inspektor Rahimov','U qochishga urinsa — toʻxtating. U sariq Urusda boʻladi.'],['Sardor','Bu safar qochib qutulolmaydi.']]},
      {t:'needcar'},
      {t:'goto',txt:'Teleminoraga boring',at:()=>lmRoad('tv'),r:45},
      {t:'func',run:()=>say([['Shef','Demak, Kamronni sen qamatding... Sen bilan keyinroq gaplashamiz!']])},
      {t:'chase',txt:'Shefning Urusini urib toʻxtating',spawn:{id:'lamborghini-urus',ci:8},need:70,max:30},
      {t:'func',run:()=>{setWanted(3);say([['Inspektor Rahimov','Shef qoʻlga olindi! Lekin uning politsiyadagi odamlari sizni quvyapti — qutuling, keyin boshqarmaga keling.']]);}},
      {t:'escape',txt:'Sotqin politsiyachilardan qutuling'},
      {t:'goto',txt:'Inspektor Rahimovning oldiga boring',at:()=>lmRoad('police'),r:10},
      {t:'talk',lines:[['Inspektor Rahimov','Shef va uning sotqin odamlari qamoqda. Shahar sizga qarzdor, Sardor.'],['Lola','Rahmat, Sardor. Taksi parkimni qutqarding.'],['Botir aka','Qoʻqondan kelgan bola butun Toshkentni tozaladi!'],['Sardor','Men faqat toʻgʻri ishni qildim.']]}],
    after:()=>addMsg('Botir aka','2-bob tugadi! Endi sen Toshkentning eng mashhur haydovchisisan, Sardor. Davomi bor...')}
];
function storyMarker(){const def=STORY[S.story];if(!def||MS.cur)return null;return def._p||(def._p=def.at());}
/* ---------- side activities ---------- */
function gridRoute(n){let i=nearestRoadIdx(px()),j=nearestRoadIdx(pz());const pts=[],used=new Set([i+','+j]);
  for(let k=0;k<n;k++)for(let tr2=0;tr2<24;tr2++){const hz=Math.random()<.5,st=(Math.random()<.5?-1:1)*ri(1,2),ni=hz?clamp(i+st,0,8):i,nj=hz?j:clamp(j+st,0,8);
    if((ni===i&&nj===j)||used.has(ni+','+nj))continue;i=ni;j=nj;used.add(i+','+j);pts.push({x:ROADS[i],z:ROADS[j]});break;}
  return pts;}
function nearestShop(){let b=SHOPPTS[0],bd=1e9;for(const s of SHOPPTS){const d=Math.hypot(s.x-px(),s.z-pz());if(d<bd&&d>40){bd=d;b=s;}}return b;}
function nearestUnphotographed(){let b=null,bd=1e9;for(const k in LM){if(S.photos[k])continue;const d=Math.hypot(LM[k].x-px(),LM[k].z-pz());if(d<bd){bd=d;b=k;}}return b;}
const SIDE=[
  {id:'taxi',title:'Taksi',desc:'Yoʻlovchilarni manzilga yetkazing. Tez yetkazsangiz +40% bonus.',start:()=>{if(mode!=='drive'){toast('Taksi uchun mashinaga oʻtiring');return;}closePhone();if(!taxi.on)toggleTaxi();}},
  {id:'deliv',title:'Yetkazib berish',desc:'Doʻkondan yukni olib, belgilangan vaqtda mijozga eltib bering.',make:()=>{const shop=nearestShop();return {id:'deliv',title:'Yetkazib berish',reward:d=>350+(d.dist||0)*.9,steps:[
    {t:'needcar'},
    {t:'goto',txt:'“'+shop.name+'” doʻkoniga boring',at:snapRoad(shop.x,shop.z),r:12,slow:true,need:'car'},
    {t:'func',run:d=>{d.dest=spawnPoint(380,800,true);d.dist=Math.hypot(d.dest.x-px(),d.dest.z-pz());say([['Doʻkonchi','Mana yuk. Mijoz kutyapti — kechikmang!']]);}},
    {t:'goto',txt:'Yukni mijozga yetkazing',at:d=>d.dest,r:10,slow:true,need:'car',limit:(d,dist)=>Math.round(dist/13+28)}]};}},
  {id:'race',title:'Koʻcha poygasi',desc:'Ikki raqib bilan chorrahalar boʻylab poyga. Birinchi kelsangiz — $1 200.',make:()=>({id:'race',title:'Koʻcha poygasi',reward:1200,steps:[
    {t:'needcar'},{t:'race',txt:'Raqiblardan oldin marraga yeting',cps:()=>gridRoute(6),rivals:[['chevrolet-camaro-ss',4],['bmw-m4',1]]}]})},
  {id:'tt',title:'Vaqtga qarshi',desc:'Barcha nazorat nuqtalaridan vaqt tugamasdan oʻting.',make:()=>({id:'tt',title:'Vaqtga qarshi',reward:1000,steps:[
    {t:'needcar'},{t:'race',txt:'Barcha nuqtalardan vaqtida oʻting',cps:()=>gridRoute(7),rivals:[],limit:d=>Math.round(d.total/24+14)}],
    after:d=>{if(d.time&&(!S.best.tt||d.time<S.best.tt)){S.best.tt=+d.time.toFixed(1);toast('Yangi rekord: '+S.best.tt+' s','gold');}}})},
  {id:'vdel',title:'Mashina yetkazish',desc:'Avtosalon buyurtmasi: mijozning mashinasini tirnalmagan holda salonga olib keling.',make:()=>{const id=pick(['audi-r8','bmw-m8','mercedes-amg-gt','porsche-911-carrera-s','lamborghini-urus']);return {id:'vdel',title:'Mashina yetkazish',
    reward:d=>Math.max(400,2600-(d.dmg||0)*22),steps:[
    {t:'func',run:d=>{d.p=spawnPoint(250,520,true);}},
    {t:'enter',txt:'Mijozning mashinasini toping va oʻtiring (F)',tag:'vd',spawn:{id,ci:ri(0,17),at:d=>d.p},onEnter:d=>{d.dmg=0;say([['Lola','(telefonda) Salon mashinani tirnalmagan holda kutyapti. Har bir zarba haqingizdan ayriladi.']]);}},
    {t:'goto',txt:'Mashinani avtosalonga yetkazing — ehtiyot boʻling!',at:()=>lmRoad('salon'),r:12,slow:true,need:'mcar',tag:'vd'}],
    after:()=>{if(mode==='drive')exitCar();useOwnedCar();bringCarToHero();toast('Mashina topshirildi');}};}},
  {id:'resc',title:'Tez yordam',desc:'Jabrlanuvchini topib, shifoxonaga silliq va tez olib boring.',make:()=>({id:'resc',title:'Tez yordam',reward:d=>Math.max(300,1900-(d.dmg||0)*18),steps:[
    {t:'needcar'},
    {t:'func',run:d=>{d.p=roadsidePoint(spawnPoint(160,420,true));d.npc=makeNPC(randLook(),d.p.x,d.p.z,0,true);}},
    {t:'goto',txt:'Jabrlanuvchining yoniga boring va toʻxtang',at:d=>d.p,r:9,slow:true,need:'car',limit:(d,dist)=>Math.round(dist/12+35)},
    {t:'func',run:d=>{removeNPC(d.npc);d.npc=null;d.dmg=0;say([['Jabrlanuvchi','Oh... rahmat... tezroq, iltimos...']]);}},
    {t:'goto',txt:'Shifoxonaga ehtiyotkorlik bilan olib boring',at:()=>lmRoad('hosp'),r:12,slow:true,need:'car',limit:(d,dist)=>Math.round(dist/12+40)}],
    cleanup:d=>{if(d.npc)removeNPC(d.npc);}})},
  {id:'esc',title:'Qochish',desc:'Uch yulduzli qidiruvni boshlang va politsiyadan qutuling.',make:()=>({id:'esc',title:'Qochish',wantedOK:true,reward:2000,steps:[
    {t:'func',run:()=>setWanted(3)},{t:'escape',txt:'Uch yulduzli qidiruvdan qutuling'}]})},
  {id:'drift',title:'Drift sinovi',desc:'60 soniyada 3 000 drift ochko yigʻing (Probel — qoʻl tormozi).',make:()=>({id:'drift',title:'Drift sinovi',reward:1500,steps:[
    {t:'needcar'},{t:'drift',dur:60,need:3000,txt:'Yon tomonga sirpanib ochko yigʻing (Probel)'}],
    after:d=>{const v=Math.round(d.score||0);if(v>(S.best.drift||0)){S.best.drift=v;toast('Drift rekordi: '+v+' ochko','gold');API.submit('drift',v);}}})},
  {id:'photo',title:'Surat ovi',desc:'Diqqatga sazovor joylarni suratga oling: har bir yangi surat $500.',make:()=>{if(!nearestUnphotographed()){toast('Barcha joylar suratga olingan!','good');return null;}return {id:'photo',title:'Surat ovi',reward:0,steps:[
    {t:'func',run:d=>{d.lm=nearestUnphotographed();}},
    {t:'goto',txt:d=>LM[d.lm].name+' yoniga boring',at:d=>lmRoad(d.lm),r:60},
    {t:'photo',lm:d=>d.lm,r:150,txt:'Mashinadan tushib, joyni suratga oling (K)'}]};}},
  {id:'anor',title:'Oltin anorlar',desc:'Shahar boʻylab 20 ta oltin anor yashiringan. Har biri $250, hammasi — $10 000 bonus.',start:()=>{let b=null,bd=1e9;for(const a of ANOR){if(S.collect[a.k])continue;const d=Math.hypot(a.x-px(),a.z-pz());if(d<bd){bd=d;b=a;}}
    if(!b){toast('Hammasi topilgan!','good');return;}GPS.wp={x:b.x,z:b.z};b.seen=true;closePhone();toast('GPS: eng yaqin oltin anor ~'+Math.round(bd)+' m','gold');}}
];

/* ================= RANDOM WORLD EVENTS ================= */
const EVT={cur:null,t:75};
function endEvent(){const e=EVT.cur;if(!e)return;removeNPC(e.npc);for(const a of e.agents||[])if(a.on){if(a.kind!=='parked'){a.kind='flee';a.max=14;}a.hazard=false;a.enterable=false;a.life=a.kind==='parked'?25:15;}EVT.cur=null;evtBeam.visible=false;}
function startEvent(k){const X=px(),Z=pz();
  if(k==='race'){addMsg('Nomaʼlum raqam','Koʻcha poygasi bor. Yuraging yetsa — qabul qil.','race');return;}
  if(k==='delivery'){addMsg('Doʻkonchi Hamid','Shoshilinch yuk bor, yetkazib berolasizmi? Yaxshi haq toʻlayman.','deliv');return;}
  if(k==='tourist'){const p=roadsidePoint(spawnPoint(50,120,true)),npc=makeNPC(Object.assign(randLook(),{hair:2,topC:4}),p.x,p.z,0,false),
      dests=Object.keys(LM).filter(q=>Math.hypot(LM[q].x-X,LM[q].z-Z)>300),dest=dests.length?pick(dests):'temur';
    EVT.cur={k,pt:p,npc,t:0,ttl:150,txt:'Adashgan sayyoh yordam soʻrayapti',act:'Sayyoh bilan gaplashish',near:()=>Math.hypot(p.x-px(),p.z-pz())<(mode==='foot'?3:9),
      onE:()=>{endEvent();say([['Sayyoh','Kechirasiz, adashib qoldim... '+LM[dest].name+'ga qanday borsam boʻladi?'],['Sardor','Mashinaga oʻtiring, olib borib qoʻyaman.']]);
        startMission({id:'tour',title:'Adashgan sayyoh',reward:700,steps:[{t:'needcar'},{t:'goto',txt:'Sayyohni '+LM[dest].name+'ga olib boring',at:lmRoad(dest),r:12,slow:true,need:'car'},{t:'talk',lines:[['Sayyoh','Rahmat! Toshkent odamlari juda mehmondoʻst ekan!']]}]});}};
    toast('Yaqin atrofda kimdir yordam soʻrayapti (yashil belgi)','gold');return;}
  if(k==='breakdown'){const p=spawnPoint(60,150,true),a=makeAgent('parked',pick(['chevrolet-nexia-3','chevrolet-cobalt','chevrolet-spark','chevrolet-gentra']),ri(0,5),p.x,p.z,p.h,{hazard:true});
    const np={x:p.x+Math.cos(p.h)*2.3,z:p.z-Math.sin(p.h)*2.3},npc=makeNPC(randLook(),np.x,np.z,p.h-Math.PI/2,false);
    EVT.cur={k,pt:np,npc,agents:[a],t:0,ttl:160,fix:0,txt:'Mashinasi buzilgan haydovchi yordam kutmoqda',act:'Taʼmirlashga yordam berish',
      near:()=>mode==='foot'&&!EVT.cur.fixing&&Math.hypot(np.x-HERO.x,np.z-HERO.z)<3.2,onE:()=>{EVT.cur.fixing=true;HERO.work=.01;},
      upd:dt=>{const e=EVT.cur;if(!e.fixing)return;if(mode!=='foot'||Math.hypot(np.x-HERO.x,np.z-HERO.z)>4){e.fixing=false;e.fix=0;HERO.work=0;e.txt='Taʼmir toʻxtadi — haydovchi yoniga qayting';return;}
        e.fix+=dt;e.txt='Taʼmirlanmoqda…';e.sub=Math.round(e.fix/4*100)+'%';if(e.fix>=4){HERO.work=0;earn(400);say([['Haydovchi','Ishladi! Katta rahmat, ukam!']]);toast('Yordam berdingiz +'+fmt(400),'good');a.hazard=false;endEvent();}}};
    toast('Yaqinda mashinasi buzilgan haydovchi bor','gold');return;}
  if(k==='pursuit'){const p=spawnPoint(110,200,true),crim=makeAgent('flee','chevrolet-malibu',1,p.x,p.z,p.h,{max:25,acc:8});crim.hits=0;const ag=[crim];
    for(let n=0;n<2;n++)ag.push(makeAgent('chaser','chevrolet-cobalt',0,p.x-Math.sin(p.h)*(12+n*9),p.z-Math.cos(p.h)*(12+n*9),p.h,{max:26,acc:9,target:crim,onHit:policeHit}));
    EVT.cur={k,pt:{x:p.x,z:p.z},agents:ag,t:0,ttl:110,txt:'Politsiya jinoyatchini quvmoqda — urib toʻxtating',
      upd:()=>{const e=EVT.cur;e.pt={x:crim.x,z:crim.z};e.sub='Zarba: '+Math.min(100,Math.round(crim.hits/30*100))+'%';
        if(crim.hits>=30){crim.kind='parked';crim.hazard=true;for(const c of ag)if(c!==crim)c.kind='parked';earn(900);toast('Jinoyatchi toʻxtatildi! Politsiya minnatdor +'+fmt(900),'good');endEvent();}}};
    toast('Yaqinda politsiya quvuvi!','bad');return;}
  if(k==='accident'){const p=spawnPoint(70,160,true),a1=makeAgent('parked',pick(TCARS),pick(TCOLS),p.x,p.z,p.h+.5,{hazard:true}),a2=makeAgent('parked',pick(TCARS),pick(TCOLS),p.x+Math.sin(p.h)*4.4,p.z+Math.cos(p.h)*4.4,p.h-.4,{hazard:true});
    const np={x:p.x+Math.cos(p.h)*3,z:p.z-Math.sin(p.h)*3},npc=makeNPC(randLook(),np.x,np.z,p.h,false);
    EVT.cur={k,pt:np,npc,agents:[a1,a2],t:0,ttl:120,txt:'Yoʻl-transport hodisasi',act:'Tez yordam chaqirish',near:()=>Math.hypot(np.x-px(),np.z-pz())<(mode==='foot'?3.5:9),
      onE:()=>{earn(250);say([['Haydovchi','Rahmat! Telefonim sinib qolgan edi...'],['Sardor','Tez yordam va YHXB yoʻlda.']]);toast('Yordam chaqirildi +'+fmt(250),'good');endEvent();}};
    toast('Oldinda avariya','gold');}}
function updateEvents(dt){const e=EVT.cur;
  if(e){e.t+=dt;if(e.upd)e.upd(dt);if(!EVT.cur)return;if(e.pt){evtBeam.position.set(e.pt.x,0,e.pt.z);evtBeam.visible=true;}
    if(e.t>e.ttl||(e.pt&&Math.hypot(e.pt.x-px(),e.pt.z-pz())>520))endEvent();return;}
  if(MS.cur||WANT.lvl)return;EVT.t-=dt;if(EVT.t>0)return;EVT.t=110+Math.random()*130;startEvent(pick(['tourist','breakdown','pursuit','race','delivery','accident']));}

/* ================= COLLECTIBLES, PHOTOS, MAP DISCOVERY ================= */
const ANOR=[];
{const r=mulberry(4242),geo=new THREE.SphereGeometry(.36,16,12),cg=new THREE.ConeGeometry(.15,.22,6),mt=new THREE.MeshStandardMaterial({color:C('#d9a92e'),metalness:1,roughness:.22,emissive:C('#5a3a00'),emissiveIntensity:.7});
  for(let k=0;ANOR.length<20&&k<400;k++){const b=BLOCKS[Math.floor(r()*BLOCKS.length)],side=Math.floor(r()*4),u=r();let x,z;
    if(side<2){x=b.x0+4+u*(b.x1-b.x0-8);z=side?b.z1-3.4:b.z0+3.4;}else{z=b.z0+4+u*(b.z1-b.z0-8);x=side===3?b.x1-3.4:b.x0+3.4;}
    if(insideSolid(x,z,1)||ANOR.some(a=>Math.hypot(a.x-x,a.z-z)<150))continue;
    const g=new THREE.Group();g.add(new THREE.Mesh(geo,mt));const c=new THREE.Mesh(cg,mt);c.position.y=.38;g.add(c);g.position.set(x,1.1,z);scene.add(g);const key='a'+ANOR.length;g.visible=!S.collect[key];ANOR.push({k:key,x,z,g,seen:false});}}
function updateAnor(dt){const X=px(),Z=pz(),t=performance.now()/500;for(const a of ANOR){if(S.collect[a.k])continue;const d=Math.hypot(a.x-X,a.z-Z);if(d>150)continue;
    a.g.rotation.y+=dt*2;a.g.position.y=1.1+Math.sin(t)*.12;if(d<50)a.seen=true;
    if(d<(mode==='foot'?1.5:2.8)){S.collect[a.k]=1;a.g.visible=false;const n=Object.keys(S.collect).length;earn(250);toast('Oltin anor topildi ('+n+'/20) +'+fmt(250),'gold');beep(1200,.08);
      if(GPS.wp&&Math.hypot(GPS.wp.x-a.x,GPS.wp.z-a.z)<3)GPS.wp=null;if(n>=20){earn(10000);toast('Barcha oltin anorlar topildi! +'+fmt(10000),'good');}persist();}}}
const PHOTOS=[];
function takePhoto(){if(PAUSED||(mode!=='foot'&&mode!=='drive'))return;
  renderer.render(scene,cam);let url='';try{url=canvas.toDataURL('image/jpeg',.82);}catch(e){}
  const f=$('#flash');f.style.transition='none';f.style.opacity=.85;requestAnimationFrame(()=>requestAnimationFrame(()=>{f.style.transition='opacity .4s';f.style.opacity=0;}));beep(1600,.03);
  if(url&&url.length>2000){PHOTOS.unshift(url);if(PHOTOS.length>8)PHOTOS.pop();}
  cam.getWorldDirection(_cf);let best=null,bs=.78;
  for(const k in LM){const l=LM[k],dx=l.x-cam.position.x,dz=l.z-cam.position.z,d=Math.hypot(dx,dz);if(d>170)continue;const dot=(dx*_cf.x+dz*_cf.z)/(d*(Math.hypot(_cf.x,_cf.z)||1));if(dot>bs){bs=dot;best=k;}}
  if(MS.cur&&MS.st&&MS.st.t==='photo'){const k=MS.st._k;if(mode==='foot'&&best===k){MS.flag=true;toast('Dalil surati olindi','good');}else toast(mode!=='foot'?'Surat uchun mashinadan tushing':'Kerakli joy kadrga tushmadi — '+LM[k].name+' tomonga qarang','bad');}
  if(best&&!S.photos[best]){S.photos[best]=1;earn(500);toast('Yangi surat: '+LM[best].name+' +'+fmt(500),'gold');persist();}
  else if(!(MS.cur&&MS.st&&MS.st.t==='photo'))toast('Surat olindi (Telefon → Kamera)');}
const DG=40,DN=40,DOFF=800;
if(S.disc.length!==DN*DN)S.disc='0'.repeat(DN*DN);
const discArr=S.disc.split('');let discT=0;
function updateDiscovery(dt){discT-=dt;if(discT>0)return;discT=.5;const X=px(),Z=pz(),ci=Math.floor((X+DOFF)/DG),cj=Math.floor((Z+DOFF)/DG);let ch=false;
  for(let i=ci-3;i<=ci+3;i++)for(let j=cj-3;j<=cj+3;j++){if(i<0||j<0||i>=DN||j>=DN||(i-ci)**2+(j-cj)**2>10)continue;const k=j*DN+i;if(discArr[k]!=='1'){discArr[k]='1';ch=true;}}
  if(ch)S.disc=discArr.join('');
  for(const k in LM){if(S.lmd[k])continue;const l=LM[k];if(Math.hypot(l.x-X,l.z-Z)<150){S.lmd[k]=1;toast('Yangi joy ochildi: '+l.name+' · tez sayohat mumkin','good');persist();}}}

/* ================= GPS ================= */
const GPS={wp:null,route:[],t:0};
function gpsTarget(){if(MS.cur&&MS.goal)return MS.goal;if(S.up.nav&&taxi.on&&taxi.stage==='pickup')return taxi.pick;if(S.up.nav&&taxi.on&&taxi.stage==='drop')return taxi.drop;
  if(GPS.wp)return GPS.wp;if(EVT.cur&&EVT.cur.pt)return null;return storyMarker();}
// Manhattan route along the street grid: current road → turn road → destination road → target
function buildRoute(x,z,tx,tz){const pts=[{x,z}];let vi=roadOf(x),hj=roadOf(z);
  if(vi<0&&hj<0){const s=snapRoad(x,z);pts.push(s);x=s.x;z=s.z;vi=roadOf(x);hj=roadOf(z);}
  const ti=nearestRoadIdx(tx),tj=nearestRoadIdx(tz),vert=Math.abs(tx-ROADS[ti])<Math.abs(tz-ROADS[tj]),de=vert?{x:ROADS[ti],z:tz}:{x:tx,z:ROADS[tj]};
  if(vi>=0){if(vert&&ti===vi)pts.push(de);else if(vert){pts.push({x:ROADS[vi],z:ROADS[tj]},{x:ROADS[ti],z:ROADS[tj]},de);}else pts.push({x:ROADS[vi],z:ROADS[tj]},de);}
  else{if(!vert&&tj===hj)pts.push(de);else if(!vert){pts.push({x:ROADS[ti],z:ROADS[hj]},{x:ROADS[ti],z:ROADS[tj]},de);}else pts.push({x:ROADS[ti],z:ROADS[hj]},de);}
  pts.push({x:tx,z:tz});return pts;}
function updateGPS(dt){GPS.t-=dt;if(GPS.t>0)return;GPS.t=.4;
  if(GPS.wp&&Math.hypot(GPS.wp.x-px(),GPS.wp.z-pz())<22){GPS.wp=null;toast('Manzilga yetdingiz','good');}
  const t=gpsTarget();GPS.route=t?buildRoute(px(),pz(),t.x,t.z):[];}

/* ================= HUD: stars, clock, objective, hints ================= */
const starsEl=$('#stars');starsEl.innerHTML=Array.from({length:5},()=>'<svg viewBox="0 0 24 24"><path class="s" d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>').join('');
const starP=[...starsEl.querySelectorAll('.s')];
function hudExtra(){starP.forEach((p,i)=>p.classList.toggle('on',i<WANT.lvl));starsEl.classList.toggle('search',WANT.lvl>0&&WANT.lost>1.5);starsEl.classList.toggle('hot',WANT.lvl>0&&WANT.seen);starsEl.style.visibility=WANT.lvl?'visible':'hidden';
  
  const u=$('#hpU');u.style.width=Math.round(HERO.hp)+'%';u.style.background=HERO.hp<30?'var(--red)':HERO.hp<60?'var(--gold)':'var(--green)';
  const o=$('#obj');if(MS.cur){o.classList.add('on');$('#objT').textContent=(MS.cur.story?'Hikoya · ':'Ish · ')+MS.cur.title;$('#objX').textContent=MS.txt;$('#objZ').textContent=MS.sub||'';}
  else if(EVT.cur&&EVT.cur.txt){o.classList.add('on');$('#objT').textContent='Hodisa';$('#objX').textContent=EVT.cur.txt;$('#objZ').textContent=EVT.cur.sub||(EVT.cur.pt?Math.round(Math.hypot(EVT.cur.pt.x-px(),EVT.cur.pt.z-pz()))+' m':'');}
  else o.classList.remove('on');
  $('#taxi').style.display=(MS.cur||EVT.cur)&&!taxi.on?'none':'';}
let ACT=null,lastHint='';
let hintKey='',actLab='';
function updateHints(){let txt='',key='',fn=null,lab='OK';const X=px(),Z=pz();
  if(DLG.cur){key='E';txt='Keyingi gap';fn=()=>nextLine();lab='KEYINGI';}
  else if(WANT.bust>.2)txt='Qoʻlga olinmoqda… '+Math.min(100,Math.round(WANT.bust/(mode==='drive'?2.6:1.6)*100))+'%';
  else if(MS.hintE){key='E';txt=MS.hintE.txt;fn=MS.hintE.fn;lab='BAJARISH';}
  else{const smk=storyMarker();
    if(smk&&Math.hypot(smk.x-X,smk.z-Z)<9){const def=STORY[S.story];if(def.hours&&!inHours(W.tod,def.hours))txt=def.giver+' '+def.hours[0]+':00 dan keyin keladi (Telefon → Ob-havo → kutish)';else{key='E';txt='Missiya: '+def.title;fn=()=>startMission(def);lab='MISSIYA';}}
    else if(EVT.cur&&EVT.cur.near&&EVT.cur.near()){key='E';txt=EVT.cur.act;fn=()=>EVT.cur.onE();lab='YORDAM';}
    else if(mode==='foot'){const n=nearestEnterable();if(n){key='F';txt=n.kind==='traffic'?'Mashinani olib qochish (jinoyat!)':'Mashinaga oʻtirish';}else if(!nearShop){const p=nearPed(2.2);if(p){key='E';txt=TOUCHUI()?'Salomlashish':'Salomlashish · Q — musht';fn=()=>greet(p);lab='SALOM';}}}
    else if(mode==='drive'&&Math.hypot(P.vx,P.vz)<1){key='F';txt='Mashinadan tushish';}}
  ACT=fn;hintKey=key;const h=$('#hint'),s=key+'|'+txt;if(s!==lastHint){lastHint=s;if(txt){h.innerHTML=(key?'<kbd>'+key+'</kbd>':'')+esc(txt);h.classList.add('on');h.classList.toggle('tap',!!key);}else h.classList.remove('on');}
  if(!fn&&nearShop&&!PAUSED)lab='KIRISH';const on=!!fn||(!!nearShop&&!WANT.lvl),ta=$('#tAct');ta.classList.toggle('on',on);if(on&&lab!==actLab){actLab=lab;ta.textContent=lab;}}
$('#hint').addEventListener('click',()=>{if(PAUSED)return;if(hintKey==='F')toggleVehicle();else if(hintKey==='E')interact();});
function interact(){if(PAUSED)return;if(ACT)ACT();else if(nearShop)V2.enterShop();}
function touchAction(a){if(a==='enter')toggleVehicle();else if(a==='jump')HERO.jumpReq=true;else if(a==='punch')punch();else if(a==='act')interact();}

/* ---------- touch joystick and camera drag ---------- */
{const joy=$('#joy'),k=$('#joyK');let id=null,c=null;
  joy.addEventListener('pointerdown',e=>{e.preventDefault();id=e.pointerId;c=toView(e);try{joy.setPointerCapture(id);}catch(_){}});
  joy.addEventListener('pointermove',e=>{if(e.pointerId!==id)return;const p=toView(e);let dx=p.x-c.x,dy=p.y-c.y;const d=Math.hypot(dx,dy),R=50;if(d>R){dx*=R/d;dy*=R/d;}JOY.x=dx/R;JOY.y=dy/R;k.style.transform=`translate(${dx}px,${dy}px)`;});
  const end=e=>{if(e.pointerId!==id)return;id=null;JOY.x=JOY.y=0;k.style.transform='';};joy.addEventListener('pointerup',end);joy.addEventListener('pointercancel',end);}
let fdrag=null;
canvas.addEventListener('pointerdown',e=>{if(mode!=='foot'||PAUSED)return;fdrag={id:e.pointerId,p:toView(e),t:performance.now(),moved:0,mouse:e.pointerType==='mouse'};try{canvas.setPointerCapture(e.pointerId);}catch(_){}});
canvas.addEventListener('pointermove',e=>{if(!fdrag||e.pointerId!==fdrag.id)return;const p=toView(e),dx=p.x-fdrag.p.x,dy=p.y-fdrag.p.y;fdrag.p=p;fdrag.moved+=Math.abs(dx)+Math.abs(dy);
  FC.yaw-=dx*.0065;FC.pitch=clamp(FC.pitch+dy*.0045,-.2,1.15);FC.lastDrag=performance.now()/1000;});
canvas.addEventListener('pointerup',e=>{if(!fdrag||e.pointerId!==fdrag.id)return;if(fdrag.mouse&&fdrag.moved<6&&performance.now()-fdrag.t<350&&e.button===0)punch();fdrag=null;});

/* ================= PHONE ================= */
let phApp='home';
const SVGI=p=>'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';
const APPS=[
  ['map','Xarita','#1f7a48','<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>'],
  ['missions','Missiyalar','#b7791f','<path d="M5 21V4h11l-2 4 2 4H5"/>'],
  ['jobs','Ishlar','#1d4fa3','<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 13h18"/>'],
  ['msgs','Xabarlar','#0f766e','<path d="M4 5h16v11H8l-4 4z"/>'],
  ['contacts','Kontaktlar','#6b4f8a','<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>'],
  ['hero','Qahramon','#b45a3c','<path d="M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3c-1 2-2 3-4 3S9 5 8 3z"/>'],
  ['camera','Kamera','#374151','<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l2-3h4l2 3"/>'],
  ['weather','Ob-havo','#2563eb','<circle cx="8" cy="8" r="3"/><path d="M8 20h9a4 4 0 0 0 0-8 5 5 0 0 0-9 1 3.5 3.5 0 0 0 0 7z"/>'],
  ['bonus','Bonus','linear-gradient(45deg,#f09433,#dc2743 50%,#bc1888)','<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>'],
  ['rank','Reyting','#a16207','<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>'],
  ['shop','Avtosalon','#0e7490','<path d="M5 17h14l-1.5-6h-11zM7 11l1.5-4h7L17 11M7 17v2M17 17v2"/>'],
  ['garage','Garaj','#475569','<path d="M3 15l2-6h14l2 6v4H3zM7 19v2M17 19v2M6.5 15h.01M17.5 15h.01"/>'],
  ['settings','Sozlamalar','#4b5563','<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>'],
  ['debug','Debug','#7f1d1d','<path d="M8 8h8v10H8zM12 4v4M4 12h4M16 12h4"/>']];
function openPhone(app){if(mode!=='drive'&&mode!=='foot')return;if(mapOpen)closeMap();phoneOpen=true;PAUSED=true;for(const k in keys)keys[k]=false;phApp=app||'home';renderPhone();$('#phone').classList.add('on');}
function closePhone(){if(!phoneOpen)return;phoneOpen=false;PAUSED=mapOpen||$('#fade').classList.contains('on');$('#phone').classList.remove('on');canvas.focus();}
const chip=(on,act,label)=>`<button class="chip${on?' on':''}" data-act="${act}">${label}</button>`;
const swRow=(arr,cur,key)=>`<div class="ph-sw">${arr.map((c,i)=>`<button class="sw${i===cur?' on':''}" style="background:${c}" data-act="hero:${key}:${i}" aria-label="${key} ${i+1}"></button>`).join('')}</div>`;
function renderPhone(){$('#phClock').textContent=clockStr(W.tod);$('#phWx').textContent=WEATHERS[WX.cur].n+' · '+(S.unlimited?'∞':fmt(S.money));
  const back=t=>`<div class="ph-title"><button class="ph-back" data-act="home" aria-label="Orqaga">‹</button>${t}</div>`;let h='';
  switch(phApp){
  case 'home':{const un=S.msgs.filter(m=>!m.r).length;h=`<div class="ph-home">`+APPS.filter(a=>a[0]!=='debug'||DEBUG).map(a=>`<button class="app" data-act="app:${a[0]}"><i style="background:${a[2]}">${SVGI(a[3])}</i>${a[1]}${a[0]==='msgs'&&un?`<em>${un}</em>`:a[0]==='bonus'&&!INSTA.got()?'<em>!</em>':''}</button>`).join('')+`</div>`;
    h+=`<div class="ph-card" style="margin-top:8px"><div class="meta2">Hikoya</div><p>${S.story>=STORY.length?'2-bob yakunlandi. Davomi kutilmoqda!':(STORY[S.story].chapter||1)+'-bob · '+esc(STORY[S.story].title)+' — '+esc(STORY[S.story].giver)}</p></div>`;break;}
  case 'missions':{h=back('Missiyalar');
    if(MS.cur)h+=`<div class="ph-card cur"><div class="meta2">Joriy</div><h4>${esc(MS.cur.title)}</h4><p>${esc(MS.txt)}</p><button class="btn danger" data-act="mcancel">Bekor qilish</button></div>`;
    STORY.forEach((d,i)=>{const done=i<S.story,cur=i===S.story;h+=`<div class="ph-card${done?' done':cur?' cur':''}"><div class="meta2">${i+1}-missiya · ${esc(d.giver)}${done?' · bajarildi':cur?'':' · yopiq'}</div><h4>${esc(d.title)}</h4>`;
      if(done||cur)h+=`<p>${esc(d.desc)}</p>`;
      if(cur&&!MS.cur){if(d.hours&&!inHours(W.tod,d.hours))h+=`<p style="color:var(--gold)">${esc(d.giver)} faqat ${d.hours[0]}:00 dan ${d.hours[1]}:00 gacha keladi.</p><div class="row"><button class="btn ghost" data-act="wait:${d.hours[0]}">${d.hours[0]}:00 gacha kutish</button></div>`;
        h+=`<button class="btn" data-act="sgps">GPS: uchrashuv joyi</button>`;}
      h+=`</div>`;});
    if(DLG.log.length)h+=`<div class="ph-card"><div class="meta2">Soʻnggi suhbatlar</div>${DLG.log.slice(-6).map(l=>`<p><b style="color:var(--gold)">${esc(tr(l.who))}:</b> ${esc(tr(l.txt))}</p>`).join('')}</div>`;break;}
  case 'jobs':{h=back('Ishlar');SIDE.forEach(j=>{let extra='';if(j.id==='anor')extra=' · '+Object.keys(S.collect).length+'/20';if(j.id==='photo')extra=' · '+Object.keys(S.photos).length+'/'+Object.keys(LM).length;if(j.id==='tt'&&S.best.tt)extra=' · rekord '+S.best.tt+' s';if(S.done[j.id])extra+=' · '+S.done[j.id]+' marta';
      h+=`<div class="ph-card"><div class="meta2">${esc(j.title)}${extra}</div><p>${esc(j.desc)}</p><button class="btn" data-act="job:${j.id}"${MS.cur?' disabled':''}>${j.id==='anor'?'Eng yaqinini koʻrsatish':j.id==='taxi'?(taxi.on?'Taksi yoqilgan':'Taksini yoqish'):'Boshlash'}</button></div>`;});break;}
  case 'msgs':{h=back('Xabarlar');if(!S.msgs.length)h+='<p class="stat-line">Hozircha xabar yoʻq.</p>';
    S.msgs.slice().reverse().forEach((m,ri2)=>{const i=S.msgs.length-1-ri2;h+=`<div class="msg"><b>${esc(m.f)}</b><span>${esc(tr(m.t))}</span><small>${clockStr(m.h)}</small>${m.a&&!MS.cur?`<button class="btn" style="padding:7px 12px;font-size:13px;align-self:flex-start" data-act="macc:${i}">Qabul qilish</button>`:''}</div>`;m.r=true;});break;}
  case 'contacts':{h=back('Kontaktlar');const C2=[['botir','Botir aka','Ustaxona, Chorsu',true],['lola','Lola','Taksi dispetcheri',S.story>=3],['mech','Usta Anvar','Mexanik: mashinangizni yoningizga olib keladi ($100)',true],['taxi','Taksi dispetcheri','Taksi buyurtmalari',true],['rah','Inspektor Rahimov','Politsiya',S.story>=5],['jasur','Jasur','Drift qiroli, Humo Arena',S.story>=6]];
    C2.forEach(c=>{if(c[3])h+=`<div class="ph-card"><h4>${c[1]}</h4><p>${c[2]}</p><button class="btn ghost" data-act="call:${c[0]}">Qoʻngʻiroq</button></div>`;});break;}
  case 'hero':{const L=S.hero;h=back('Qahramon')+`<div class="ph-card"><div class="ph-row"><span>Kiyim</span>${chip(!L.tint,'hero:orig:1','Asl koʻrinish')}</div><p class="stat-line">Rang yoki kiyim tanlasangiz, oʻzingizning koʻrinishingiz yoqiladi.</p></div><div class="ph-card"><div class="meta2">Teri rangi</div>${swRow(SKINS,L.skin,'skin')}</div>
      <div class="ph-card"><div class="meta2">Soch turmagi</div><div class="ph-opt">${HAIRS.map((n,i)=>chip(L.hair===i,'hero:hair:'+i,n)).join('')}</div>${swRow(HAIRC,L.hairC,'hairC')}</div>
      <div class="ph-card"><div class="meta2">Ustki kiyim</div><div class="ph-opt">${TOPS.map((n,i)=>chip(L.top===i,'hero:top:'+i,n)).join('')}</div>${swRow(CLOTH,L.topC,'topC')}</div>
      <div class="ph-card"><div class="meta2">Shim</div>${swRow(CLOTH,L.legsC,'legsC')}</div>
      <div class="ph-card"><div class="meta2">Poyabzal</div>${swRow(CLOTH,L.shoeC,'shoeC')}</div>
      <div class="ph-card"><div class="ph-row"><span>Quyosh koʻzoynagi</span>${chip(L.glasses,'hero:glasses:'+(L.glasses?0:1),L.glasses?'Bor':'Yoʻq')}</div></div>`;break;}
  case 'camera':{h=back('Kamera')+`<button class="btn" data-act="photo">Surat olish (K)</button><p class="stat-line">Diqqatga sazovor joyni birinchi marta suratga olsangiz — $500. Olingan: ${Object.keys(S.photos).length}/${Object.keys(LM).length}</p>`;
    h+=PHOTOS.length?`<div class="ph-gal">${PHOTOS.map((u,i)=>`<a href="${u}" download="toshkent-surat-${i+1}.jpg" title="Yuklab olish"><img src="${u}" alt="Surat ${i+1}"></a>`).join('')}</div>`:'<p class="stat-line">Galereya boʻsh.</p>';break;}
  case 'weather':{const busy=MS.cur||WANT.lvl;h=back('Ob-havo')+`<div class="ph-card"><div class="meta2">Hozir</div><h4 style="font-size:28px">${clockStr(W.tod)}</h4><p>${SEASON_NAME[W.season]} · ${WEATHERS[WX.cur].n} · yoʻl ilashuvi ${Math.round(ENV.grip*100)}%${ENV.wet>.2?' · yoʻllar hoʻl':''}</p></div>
      <div class="ph-card"><div class="meta2">Vaqtni oʻtkazish</div><div class="ph-opt">${[8,13,19,22].map(t=>`<button class="chip" data-act="wait:${t}"${busy?' disabled':''}>${t}:00</button>`).join('')}</div>${busy?'<p>Missiya yoki qidiruv paytida mumkin emas.</p>':''}</div>`;break;}
  case 'rank':{if(LB.rows===null&&!LB.err&&!LB.busy){LB.busy=1;LB.load();setTimeout(()=>{LB.busy=0;},300);}
    const nm={drift:'Drift (60 s, ochko)',earned:'Jami topilgan pul'},val=v=>LB.tab==='earned'?fmt(v):Math.round(v)+' ochko';
    h=back('Reyting')+`<div class="ph-card"><div class="meta2">Ismingiz (reytingda koʻrinadi)</div><div class="row" style="gap:6px;flex-wrap:nowrap"><input id="nickIn" class="ph-input" maxlength="16" autocomplete="off" spellcheck="false" placeholder="Ism" value="${esc(S.nick||'')}" style="text-transform:none;letter-spacing:0"><button class="btn" data-act="nick">Saqlash</button></div><p class="stat-line">Sizning rekordlaringiz: drift ${S.best.drift||0} ochko · topilgan ${fmt(S.earned||0)}</p></div>`+
      `<div class="ph-opt">${Object.keys(nm).map(k=>chip(LB.tab===k,'lbtab:'+k,nm[k])).join('')}</div>`+
      (LB.err?'<p class="stat-line">Reyting faqat internet orqali, oʻyinning asosiy saytida ishlaydi.</p>':LB.rows===null?'<p class="stat-line">Yuklanmoqda…</p>':!LB.rows.length?'<p class="stat-line">Hali hech kim yoʻq — birinchi boʻling!</p>':
      `<div class="ph-card">${LB.rows.map((r,i)=>`<div class="ph-row"${API.dev.startsWith(r.me)?' style="color:var(--gold)"':''}><span>${i+1}. ${esc(r.n)}</span><b>${val(r.v)}</b></div>`).join('')}</div>`)+
      (LB.tab==='drift'?'<p class="stat-line">Drift rekordi: Telefon → Ishlar → «Drift sinovi».</p>':'');break;}
  case 'bonus':{const got=INSTA.got();h=back('Bonus')+`<div class="ph-card ig-card"><div class="meta2">Instagram bonusi</div><h4>${fmt(INSTA.SUM)}</h4><p>Instagram sahifamiz <b>@${INSTA.USER}</b> ga obuna boʻling va oʻyin hisobingizga bir martalik bonus oling.</p>`+
      (got?'<p style="color:var(--green);font-weight:700">Bonus olingan. Obuna uchun rahmat!</p>':INSTA.ready()?`<button class="btn" data-act="ig:claim">${fmt(INSTA.SUM)} bonusni olish</button>`:`<button class="btn ig-btn" data-act="ig:open">Instagramda obuna boʻlish</button>${INSTA.opened?'<p class="stat-line">Obuna boʻlgach, oʻyinga qayting.</p>':''}`)+
      `</div><div class="ph-card"><div class="meta2">Promo-kod</div><p>Instagram story'larimizda e'lon qilinadigan kodni kiriting.</p><div class="row" style="gap:6px;flex-wrap:nowrap"><input id="promoIn" class="ph-input" maxlength="24" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="KOD"><button class="btn" data-act="promo">Olish</button></div></div><p class="stat-line">Bonus har bir qurilmada bir marta beriladi.</p>`;break;}
  case 'settings':{const s=S.sub;h=back('Sozlamalar')+`<div class="ph-card"><div class="ph-row"><span>Ovoz</span>${chip(S.sound,'set:sound',S.sound?'Yoqilgan':'Oʻchiq')}</div><div class="ph-row"><span>Cheksiz pul</span>${chip(S.unlimited,'set:unl',S.unlimited?'Yoqilgan':'Oʻchiq')}</div><div class="ph-row"><span>Mini-xarita aylansin</span>${chip(!!S.miniRot,'set:rot',S.miniRot?'Ha':'Yoʻq')}</div><div class="ph-row"><span>Yoʻl qoidalari (jarimalar)</span>${chip(S.rules!==false,'set:rules',S.rules!==false?'Yoqilgan':'Oʻchiq')}</div><div class="ph-row"><span>FPS koʻrsatkichi</span>${chip(!!S.showFps,'set:fps',S.showFps?'Ha':'Yoʻq')}</div><div class="ph-row"><span>Sensor tugmalar</span><div class="ph-opt">${[['auto','Avto'],['on','Ha'],['off','Yoʻq']].map(([v,n])=>chip(touchPref()===v,'touch:'+v,n)).join('')}</div></div></div>
      <div class="ph-card"><div class="meta2">Subtitrlar</div><div class="ph-row"><span>Holat</span>${chip(s.on,'set:sub',s.on?'Yoqilgan':'Oʻchiq')}</div>
        <div class="ph-row"><span>Shrift</span><div class="ph-opt">${[[.85,'S'],[1,'M'],[1.2,'L'],[1.4,'XL']].map(([v,n])=>chip(s.size===v,'set:size:'+v,n)).join('')}</div></div>
        <div class="ph-row"><span>Fon</span><div class="ph-opt">${[[0,'0%'],[.35,'35%'],[.6,'60%'],[.85,'85%']].map(([v,n])=>chip(s.bg===v,'set:bg:'+v,n)).join('')}</div></div>
        <div class="ph-row"><span>Til</span><div class="ph-opt">${chip(!s.cyr,'set:cyr:0','Lotin')}${chip(s.cyr,'set:cyr:1','Кирилл')}</div></div></div>
      <div class="ph-card"><div class="meta2">Grafika</div><div class="ph-opt">${chip(!!S.gfxAuto,'gfx:auto','Avto')}${Object.keys(GFX).map(k=>chip(S.gfx===k&&!S.gfxAuto,'gfx:'+k,GFX[k].name)).join('')}</div></div>
      <div class="ph-card"><div class="meta2">Saqlash (avto-saqlash har 20 soniyada)</div>${[1,2,3].map(n=>{const m=slotMeta(n);return `<div class="ph-row"><span>${n}-slot: ${m?'hikoya '+m.story+'/'+STORY.length+' · '+new Date(m.when).toLocaleString('uz'):'boʻsh'}</span><button class="chip" data-act="save:${n}">Saqlash</button></div>`;}).join('')}</div>
      <button class="btn ghost" data-act="tomenu">Asosiy menyuga chiqish</button>`;break;}
  case 'debug':{h=back('Debug')+`<div class="ph-card"><div class="meta2">Teleport</div><div class="ph-opt">${Object.keys(LM).map(k=>chip(false,'dbg:tp:'+k,LM[k].name.split(' ')[0])).join('')}</div></div>
      <div class="ph-card"><div class="meta2">Vaqt / ob-havo</div><div class="ph-opt">${[6,12,18,22,2].map(t=>chip(false,'dbg:time:'+t,t+':00')).join('')}</div><div class="ph-opt">${Object.keys(WEATHERS).map(k=>chip(WX.cur===k,'dbg:wx:'+k,WEATHERS[k].n)).join('')}</div></div>
      <div class="ph-card"><div class="meta2">Qidiruv</div><div class="ph-opt">${[0,1,2,3,4,5].map(n=>chip(WANT.lvl===n,'dbg:want:'+n,n+'★')).join('')}</div></div>
      <div class="ph-card"><div class="ph-opt">${chip(false,'dbg:money','+$10 000')}${chip(GOD,'dbg:god','Oʻlmaslik')}${chip(false,'dbg:skip','Qadamni oʻtkazish')}${chip(false,'dbg:story','Hikoyani nolga')}${chip(false,'dbg:npc','NPC chaqirish')}${chip(false,'dbg:evt','Hodisa')}</div></div>`;break;}
  }
  $('#phBody').innerHTML=h;}
$('#phX').addEventListener('click',()=>closePhone());
$('#phHome').addEventListener('click',()=>{if(phApp==='home')closePhone();else{phApp='home';renderPhone();}});
$('#phBody').addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b||b.disabled)return;const [a,x,y]=b.dataset.act.split(':');
  switch(a){
    case 'home':phApp='home';break;
    case 'app':if(x==='map'){openMap();return;}if(x==='garage'||x==='shop'){closePhone();openStage(x);return;}phApp=x;break;
    case 'ig':if(x==='open')INSTA.open();else INSTA.claim();break;
    case 'lbtab':LB.tab=x;LB.load();break;
    case 'nick':{const i=$('#nickIn'),n=String(i&&i.value||'').normalize('NFC').replace(/[^p{L}p{N} _.-]/gu,'').replace(/s+/g,' ').trim().slice(0,16);if(!n){toast('Ism kiriting','bad');return;}S.nick=n;persist();toast('Ism saqlandi: '+n,'good');if(S.best.drift)API.submit('drift',S.best.drift);if(S.earned)API.submit('earned',S.earned);setTimeout(()=>LB.load(),1200);break;}
    case 'promo':{const i=$('#promoIn');redeemPromo(i&&i.value);return;}
    case 'touch':setTouchPref(x);break;
    case 'mcancel':failMission('Bekor qilindi');break;
    case 'sgps':{const m=storyMarker();if(m){GPS.wp={x:m.x,z:m.z};toast('GPS oʻrnatildi','gold');closePhone();}return;}
    case 'wait':if(MS.cur||WANT.lvl)return;closePhone();bigScreen('VAQT OʻTMOQDA',x+':00 gacha',()=>skipTo(+x),'#eaf3f3');return;
    case 'job':{const j=SIDE.find(q=>q.id===x);if(!j)return;if(j.start){j.start();return;}const def=j.make();if(def)startMission(def);return;}
    case 'macc':{const m=S.msgs[+x];if(!m||!m.a)return;const j=SIDE.find(q=>q.id===m.a);m.a='';if(j&&j.make){const def=j.make();if(def)startMission(def);}return;}
    case 'call':closePhone();callContact(x);return;
    case 'hero':{const L=S.hero;if(x==='orig'){L.tint=false;rebuildHero();if(mode==='foot')HERO.mesh.visible=true;persist();break;}L.tint=true;if(x==='glasses')L.glasses=y==='1';else L[x]=+y;rebuildHero();if(mode==='foot')HERO.mesh.visible=true;persist();break;}
    case 'photo':closePhone();setTimeout(takePhoto,180);return;
    case 'set':if(x==='sound'){S.sound=!S.sound;syncSnd();}else if(x==='unl'){S.unlimited=!S.unlimited;updMoney();}else if(x==='rot')S.miniRot=!S.miniRot;else if(x==='rules')S.rules=S.rules===false;else if(x==='fps')S.showFps=!S.showFps;else if(x==='sub')S.sub.on=!S.sub.on;
      else if(x==='size')S.sub.size=+y;else if(x==='bg')S.sub.bg=+y;else if(x==='cyr')S.sub.cyr=y==='1';applySubStyle();persist();break;
    case 'gfx':if(x==='auto'){S.gfxAuto=true;applyGfx(detectGfx(),true);}else{S.gfxAuto=false;applyGfx(x,true);}break;
    case 'save':saveSlot(+x);break;
    case 'tomenu':persist();NO_SAVE=true;location.reload();return;
    case 'dbg':debugAct(x,y);break;}
  renderPhone();});
function callContact(k){const st=S.story;
  if(k==='botir')say([['Botir aka',st<1?'Chorsuga kel, ukam, ish bor!':st<3?'Ustaxonada ish koʻp, lekin sen koʻchada kerakroqsan.':'Doim kutib qolaman, Sardor!']]);
  else if(k==='jasur')say([['Jasur',st<7?'Humo Arena yonida, kechqurun. Kutaman!':st<10?'Shefni tutsang — senga yangi drift yoʻlini koʻrsataman.':'Sen endi haqiqiy afsonasan, Sardor!']]);
  else if(k==='lola')say([['Lola',st<5?'Ehtiyot boʻl, Sardor. Kamronning odamlari hamma joyda.':'Shahar tinchroq boʻlib qoldi. Rahmat senga.']]);
  else if(k==='mech'){if(mode!=='foot'){say([['Usta Anvar','Siz allaqachon mashinadasiz-ku!']]);return;}if(!pay(100)){say([['Usta Anvar','Avval $100 tayyorlab qoʻying.']]);return;}
    bringCarToHero();updMoney();say([['Usta Anvar','Mashinangiz yaqindagi yoʻlda turibdi. Xizmatga tayyormiz!']]);}
  else if(k==='taxi'){say([['Dispetcher',mode==='drive'?'Buyurtmalarni yoqdim, omad!':'Avval mashinaga oʻtiring, keyin buyurtma beraman.']]);if(mode==='drive'&&!taxi.on)toggleTaxi();}
  else if(k==='rah')say([['Inspektor Rahimov','Shahar tinch. Kamron ishi sudga topshirildi. Yana bir bor rahmat, Sardor.']]);}
function debugAct(x,y){
  if(x==='tp'){const p=lmRoad(y);if(mode==='foot'){HERO.x=p.x;HERO.z=p.z+RW(4)*.5;}else{P.x=p.x;P.z=p.z;P.h=p.h;P.vx=P.vz=0;}}
  else if(x==='time')skipTo(+y);else if(x==='wx')setWeather(y,true);else if(x==='want'){if(+y===0)clearWanted('');else{WANT.lvl=0;addWanted(+y,'Debug');}}
  else if(x==='money'){earn(10000);updMoney();}else if(x==='god')GOD=!GOD;else if(x==='skip'){if(MS.cur)nextStep();}else if(x==='story'){S.story=0;STORY.forEach(d=>d._p=null);}
  else if(x==='npc'){const n=makeNPC(randLook(),HERO.x+2,HERO.z+2,0,false);setTimeout(()=>removeNPC(n),15000);}else if(x==='evt'){endEvent();startEvent(pick(['tourist','breakdown','pursuit','accident']));}}

/* ================= FULL MAP ================= */
const bigmap=$('#bigmap'),bctx=bigmap.getContext('2d');
const MV={cx:0,cz:0,s:.6,dpr:1,sel:null,drag:null};
function openMap(){if(mode!=='drive'&&mode!=='foot')return;if(phoneOpen){phoneOpen=false;$('#phone').classList.remove('on');}mapOpen=true;PAUSED=true;for(const k in keys)keys[k]=false;
  $('#mapv').classList.add('on');MV.cx=px();MV.cz=pz();MV.sel=null;$('#mvInfo').classList.remove('on');sizeMap();drawMap();}
function closeMap(){mapOpen=false;PAUSED=phoneOpen||$('#fade').classList.contains('on');$('#mapv').classList.remove('on');canvas.focus();}
function sizeMap(){const d=Math.min(2,devicePixelRatio||1);MV.dpr=d;bigmap.width=Math.max(1,bigmap.clientWidth*d);bigmap.height=Math.max(1,bigmap.clientHeight*d);}
function w2m(x,z){const s=MV.s*MV.dpr;return [bigmap.width/2+(x-MV.cx)*s,bigmap.height/2+(z-MV.cz)*s];}
function m2w(mx,my){const s=MV.s;return {x:MV.cx+(mx-bigmap.clientWidth/2)/s,z:MV.cz+(my-bigmap.clientHeight/2)/s};}
function drawMap(){const c=bctx,W=bigmap.width,H=bigmap.height,s=MV.s*MV.dpr,d=MV.dpr;c.setTransform(1,0,0,1,0,0);c.fillStyle='#0a1418';c.fillRect(0,0,W,H);
  c.save();c.translate(W/2-MV.cx*s,H/2-MV.cz*s);c.scale(s,s);c.drawImage(mapBase,-1200,-1200,2400,2400);
  c.fillStyle='rgba(6,12,15,.88)';for(let j=0;j<DN;j++)for(let i=0;i<DN;i++)if(discArr[j*DN+i]!=='1')c.fillRect(i*DG-DOFF-.5,j*DG-DOFF-.5,DG+1,DG+1);
  if(GPS.route.length>1){c.strokeStyle='#b46cff';c.lineWidth=7/MV.s;c.lineJoin=c.lineCap='round';c.beginPath();GPS.route.forEach((p,i)=>i?c.lineTo(p.x,p.z):c.moveTo(p.x,p.z));c.stroke();}
  c.restore();
  const mk=(x,z,col,r,txt)=>{const [mx,my]=w2m(x,z);c.fillStyle=col;c.strokeStyle='#071015';c.lineWidth=3*d;c.beginPath();c.arc(mx,my,r*d,0,7);c.fill();c.stroke();if(txt){c.fillStyle='#071015';c.font=`bold ${12*d}px Manrope, Arial`;c.textAlign='center';c.textBaseline='middle';c.fillText(txt,mx,my+d);}};
  c.font=`700 ${13*d}px Manrope, Arial`;c.textAlign='center';
  for(const k in LM){if(!S.lmd[k])continue;const l=LM[k],[mx,my]=w2m(l.x,l.z);c.fillStyle=MV.sel===k?'#ffffff':'#1fc1c4';c.beginPath();c.arc(mx,my,(MV.sel===k?9:7)*d,0,7);c.fill();c.fillStyle='#eaf3f3';c.fillText(l.name+(S.photos[k]?' ✓':''),mx,my-14*d);}
  for(const a of ANOR)if(!S.collect[a.k]&&a.seen)mk(a.x,a.z,'#ffd24a',5);
  for(const a of AGENTS)if(a.on&&(a.kind==='police'||a.kind==='block'))mk(a.x,a.z,'#ff5b4d',5);
  const smk=storyMarker();if(smk)mk(smk.x,smk.z,'#f0b83e',11,'S');
  if(EVT.cur&&EVT.cur.pt)mk(EVT.cur.pt.x,EVT.cur.pt.z,'#4fd18b',9,'?');
  if(MS.goal)mk(MS.goal.x,MS.goal.z,'#f0b83e',9);
  if(GPS.wp)mk(GPS.wp.x,GPS.wp.z,'#b46cff',9);
  if(mode==='foot')mk(P.x,P.z,'#1fc1c4',6);
  const [pxm,pym]=w2m(px(),pz());c.save();c.translate(pxm,pym);c.rotate(Math.PI-ph());c.scale(d,d);c.fillStyle='#fff';c.strokeStyle='#071015';c.lineWidth=3;c.beginPath();c.moveTo(0,-14);c.lineTo(10,12);c.lineTo(0,6);c.lineTo(-10,12);c.closePath();c.stroke();c.fill();c.restore();
  $('#mvSub').textContent='Ochilgan hudud: '+Math.round(discArr.filter(v=>v==='1').length/discArr.length*100)+'% · bosing — GPS nuqta';}
function mapSelect(k){MV.sel=k;const l=LM[k],el=$('#mvInfo');el.innerHTML=`<div class="d-brand">${esc(district(l.x,l.z))} tumani</div><div class="d-model" style="font-size:22px">${esc(l.name)}</div>
  <div class="stat-line">${S.photos[k]?'Suratga olingan ✓':'Hali suratga olinmagan ($500)'}</div><button class="btn ghost" data-mv="gps">GPS nuqta</button><button class="btn" data-mv="ft">Tez sayohat</button>`;el.classList.add('on');drawMap();}
$('#mvInfo').addEventListener('click',e=>{const b=e.target.closest('[data-mv]');if(!b||!MV.sel)return;const k=MV.sel;if(b.dataset.mv==='gps'){const p=lmRoad(k);GPS.wp={x:p.x,z:p.z};toast('GPS: '+LM[k].name,'gold');closeMap();}else fastTravel(k);});
function fastTravel(k){if(WANT.lvl){toast('Qidiruvdaligingizda tez sayohat mumkin emas','bad');return;}if(MS.cur){toast('Missiya davomida mumkin emas','bad');return;}
  closeMap();const p=lmRoad(k,rnd(-15,15));bigScreen('TEZ SAYOHAT',LM[k].name,()=>{P.x=p.x;P.z=p.z;P.h=p.h;P.vx=P.vz=0;if(P.mesh){P.mesh.position.set(P.x,0,P.z);P.mesh.rotation.set(0,P.h,0);}
    if(mode==='foot')enterCar();cam.position.set(P.x-8,4,P.z);W.tod=(W.tod+.5)%24;V2.dirty=true;persist();},'#eaf3f3');}
bigmap.addEventListener('pointerdown',e=>{const p=toView(e);MV.drag={id:e.pointerId,p,moved:0};try{bigmap.setPointerCapture(e.pointerId);}catch(_){}});
bigmap.addEventListener('pointermove',e=>{const g=MV.drag;if(!g||g.id!==e.pointerId)return;const p=toView(e),dx=p.x-g.p.x,dy=p.y-g.p.y;g.p=p;g.moved+=Math.abs(dx)+Math.abs(dy);if(g.moved>5){MV.cx-=dx/MV.s;MV.cz-=dy/MV.s;drawMap();}});
bigmap.addEventListener('pointerup',e=>{const g=MV.drag;MV.drag=null;if(!g||g.moved>5)return;const p=toView(e),w=m2w(p.x,p.y);
  let best=null,bd=24/MV.s;for(const k in LM){if(!S.lmd[k])continue;const d=Math.hypot(LM[k].x-w.x,LM[k].z-w.z);if(d<bd){bd=d;best=k;}}
  if(best){mapSelect(best);return;}MV.sel=null;$('#mvInfo').classList.remove('on');GPS.wp={x:clamp(w.x,-EDGE,EDGE),z:clamp(w.z,-EDGE,EDGE)};GPS.t=0;updateGPS(1);drawMap();toast('GPS nuqta oʻrnatildi','gold');});
bigmap.addEventListener('wheel',e=>{e.preventDefault();MV.s=clamp(MV.s*(1-e.deltaY*.0012),.18,3);drawMap();},{passive:false});
$('#mvIn').addEventListener('click',()=>{MV.s=Math.min(3,MV.s*1.35);drawMap();});
$('#mvOut').addEventListener('click',()=>{MV.s=Math.max(.18,MV.s/1.35);drawMap();});
$('#mvMe').addEventListener('click',()=>{MV.cx=px();MV.cz=pz();drawMap();});
$('#mvClr').addEventListener('click',()=>{GPS.wp=null;GPS.t=0;updateGPS(1);drawMap();});
$('#mvClose').addEventListener('click',closeMap);
addEventListener('resize',()=>{if(mapOpen){sizeMap();drawMap();}});

/* ================= 3D cars in the street: the nearest traffic and every mission car use the real models ================= */
// Far cars stay light (they are a few pixels anyway); the nearest K switch to the 3D model of the same car, colour and plate.
const T3D={t:3,loading:null,ids:null};
function realCarFor(sp,ci,plate,shadow){const m=buildCar(sp,ci,{lod:true,quiet:true,plate});m.userData.sp=m.userData.sp||sp;m.traverse(o=>{if(o.isMesh){o.castShadow=shadow;}});scene.add(m);return m;}
function swapMesh(o,target){if(o.mesh===target)return;target.position.copy(o.mesh.position);target.rotation.copy(o.mesh.rotation);target.visible=o.mesh.visible;o.mesh.visible=false;o.mesh=target;}
function update3DCars(dt){T3D.t-=dt;if(T3D.t>0)return;T3D.t=.5;if(mode!=='drive'&&mode!=='foot')return;
  const lv=GFXN(),phone=lv<=1,K=[3,6,9,12,16][lv],R2=(phone?160:220)**2,shadow=lv>=3;
  if(!T3D.ids){const cnt={};TCARS.forEach(id=>cnt[id]=(cnt[id]||0)+1);T3D.ids=Object.keys(cnt).filter(id=>REAL[id]&&REAL[id].key).sort((a,b)=>cnt[b]-cnt[a]);if(phone)T3D.ids=T3D.ids.slice(0,7);}
  // download one model at a time, most common cars first, mission cars before all
  if(!T3D.loading||realTpl[T3D.loading]||!realReq[T3D.loading]){const need=AGENTS.filter(a=>a.on&&a.pool==='civ'&&REAL[a.id]&&!realTpl[a.id]).map(a=>a.id).concat(T3D.ids).find(id=>!realTpl[id]);
    if(need){T3D.loading=need;loadReal(need,false);}else T3D.loading=null;}
  const cx=cam.position.x,cz=cam.position.z,list=[];
  for(const t of TRAFFIC){if(!t.proc){t.proc=t.mesh;t.sp=t.mesh.userData.sp;}list.push([t,t.gone?1e12:(t.x-cx)**2+(t.z-cz)**2]);}
  list.sort((a,b)=>a[1]-b[1]);let n=0;
  for(const [t,d2] of list){const want=n<K&&d2<R2&&!!realTpl[t.sp.id];
    if(want){n++;if(!t.real)t.real=realCarFor(t.sp,t.ci,t.plate,shadow);swapMesh(t,t.real);}else if(t.mesh!==t.proc)swapMesh(t,t.proc);}
  for(const a of AGENTS)if(a.on&&a.pool==='civ'&&realTpl[a.id]&&!a.mesh.userData.real){const old=a.mesh,m=realCarFor(CAR[a.id],a.ci,a.plate,shadow);swapMesh(a,m);scene.remove(old);disposeCar(old);}}

/* ================= graphics: hardware detection, light-preset test, FPS guard and counter ================= */
function LOWG(){return ['phone','vlow'].indexOf(S.gfx)>=0;}
function GFXN(){const v=({vlow:0,phone:1,medium:2,pc:3,ultra:4})[S.gfx];return v===undefined?3:v;}
// first start: pick a preset from the GPU name, memory, CPU threads and phone/desktop
function detectGfx(){const mob=TOUCHUI(),mem=navigator.deviceMemory||4,cpu=navigator.hardwareConcurrency||4;let g='';
  try{const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');g=String(ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'').toLowerCase();}catch(e){}
  if(/swiftshader|llvmpipe|software|microsoft basic/.test(g))return 'vlow';
  if(mob){if(mem<=3||cpu<=4||/adreno \(tm\) [1-5]\d\d|mali-[4t]|powervr/.test(g))return 'vlow';
    if(mem>=6&&/apple gpu|adreno \(tm\) (7[3-9]\d|8\d\d)|mali-g(7[1-9]|[6-9]\d\d)|immortalis|xclipse/.test(g))return 'medium';return 'phone';}
  if(/rtx|radeon rx ?[67]\d{3}|arc a7/.test(g))return mem>=8?'ultra':'pc';
  if(/gtx|radeon rx|radeon pro|apple m[1-9]/.test(g))return 'pc';
  if(/intel/.test(g))return cpu>=8?'medium':'phone';
  return cpu<=4||mem<=4?'medium':'pc';}
// FPS guard: a long, steady drop (not one hitch) steps the automatic preset down one level
const FPSG={t:0,n:0,bad:0,cool:20,el:null};
function fpsGuard(dt){const now=performance.now()/1000;if(!FPSG.t0)FPSG.t0=now;FPSG.n++;const el=now-FPSG.t0;if(el<1)return;FPSG.cool-=el;const fps=FPSG.n/el;FPSG.t0=now;FPSG.n=0;
  if(S.showFps){if(!FPSG.el){FPSG.el=document.createElement('div');FPSG.el.id='fps';document.body.appendChild(FPSG.el);}FPSG.el.textContent=Math.round(fps)+' FPS · '+GFX[S.gfx].name+(S.gfxAuto?' (avto)':'');FPSG.el.hidden=false;}else if(FPSG.el)FPSG.el.hidden=true;
  if(!S.gfxAuto||PAUSED||document.hidden||window.__TD_TEST){FPSG.bad=0;return;}
  FPSG.bad=fps<(TOUCHUI()?24:28)?FPSG.bad+1:Math.max(0,FPSG.bad-2);
  if(FPSG.bad>=8&&FPSG.cool<=0&&GFXN()>0){const o=Object.keys(GFX),k=o[Math.max(0,o.indexOf(S.gfx)-1)];FPSG.bad=0;FPSG.cool=45;applyGfx(k);toast('Silliq oʻyin uchun grafika avtomatik pasaytirildi: '+GFX[k].name);}}

/* ================= pedestrians crossing at the lights =================
   At a block corner a walker sometimes decides to cross to the neighbouring block, waits for red on that road,
   walks over and carries on along the next pavement. Cars give way to anyone on a crossing (only those are checked). */
const XW=new Set();
function pedCorner(p,x,z){p.cc=(p.cc||0)-1/60;if(p.cc>0||p.panic>0||p.down>0)return;const b=p.b,o=p.off;
  for(const c of [[b.x0+o,b.z0+o,'NW'],[b.x1-o,b.z0+o,'NE'],[b.x1-o,b.z1-o,'SE'],[b.x0+o,b.z1-o,'SW']]){if(Math.abs(x-c[0])>.5||Math.abs(z-c[1])>.5)continue;
    p.cc=8;if(Math.random()>.35)return;const opts=[];
    if(c[2][1]==='E'&&b.i<7)opts.push(['x',1]);if(c[2][1]==='W'&&b.i>0)opts.push(['x',-1]);if(c[2][0]==='N'&&b.j>0)opts.push(['z',-1]);if(c[2][0]==='S'&&b.j<7)opts.push(['z',1]);
    if(!opts.length)return;const [ax,dr]=opts[Math.random()*opts.length|0],nb=BLOCKS.find(q=>q.i===b.i+(ax==='x'?dr:0)&&q.j===b.j+(ax==='z'?dr:0));if(!nb)return;
    const tx=ax==='x'?(dr>0?nb.x0+o:nb.x1-o):x,tz=ax==='z'?(dr>0?nb.z0+o:nb.z1-o):z;
    p.cross={x0:x,z0:z,x1:tx,z1:tz,road:ax==='x'?'z':'x',t:0,wait:0,nb,go:false};return;}}
function pedCross(p,dt){const c=p.cross,h=Math.atan2(c.x1-c.x0,c.z1-c.z0);
  if(!c.go){c.wait+=dt;if(TL[c.road]==='r'||c.wait>30)c.go=true;else return [c.x0,c.z0,h];}
  XW.add(p);const d=Math.max(1,Math.hypot(c.x1-c.x0,c.z1-c.z0));c.t+=p.v*1.15*dt/d;p.ph+=p.v*dt*5.4;const k=Math.min(1,c.t),x=c.x0+(c.x1-c.x0)*k,z=c.z0+(c.z1-c.z0)*k;
  if(k>=1){const nb=c.nb,o=p.off;p.b=nb;p.W=nb.x1-nb.x0-2*o;p.D=nb.z1-nb.z0-2*o;p.L=2*(p.W+p.D);let best=0,bd=1e9;
    [[nb.x0+o,nb.z0+o,0],[nb.x1-o,nb.z0+o,p.W],[nb.x1-o,nb.z1-o,p.W+p.D],[nb.x0+o,nb.z1-o,2*p.W+p.D]].forEach(q=>{const dd=Math.hypot(q[0]-x,q[1]-z);if(dd<bd){bd=dd;best=q[2];}});
    p.s=best;p.cross=null;p.cc=10;XW.delete(p);}
  return [x,z,h];}

/* ================= draw only what can be seen =================
   Trees (≈5 000) and pedestrians (≈1 200) are instanced; hidden instances still cost vertex work, so the visible ones are
   packed into the front of each buffer and the draw count is cut to them. Masters keep the full data (seasons recolour them). */
const PACK={pmc:null,tr:null,t:0};
function packInit(){if(PACK.tr)return;const [tr,cr]=TREE_MESHES;PACK.tr={n:TREES.length,mt:tr.instanceMatrix.array.slice(),mc:cr.instanceMatrix.array.slice(),cc:cr.instanceColor?cr.instanceColor.array.slice():null};
  PACK.pmc={};for(const k in PI_)if(PI_[k].instanceColor)PACK.pmc[k]=PI_[k].instanceColor.array.slice();}
function unpackTrees(){packInit();const T_=PACK.tr,[tr,cr]=TREE_MESHES;tr.instanceMatrix.array.set(T_.mt);cr.instanceMatrix.array.set(T_.mc);if(T_.cc)cr.instanceColor.array.set(T_.cc);tr.count=cr.count=T_.n;tr.instanceMatrix.needsUpdate=cr.instanceMatrix.needsUpdate=true;}
function repackTrees(){const cr=TREE_MESHES[1];if(PACK.tr&&cr.instanceColor)PACK.tr.cc=cr.instanceColor.array.slice();PACK.t=0;}
const _pkF=new THREE.Vector3();
function packTrees(dt){PACK.t-=dt;if(PACK.t>0)return;PACK.t=.2;packInit();const T_=PACK.tr,[tr,cr]=TREE_MESHES,cx=cam.position.x,cz=cam.position.z;
  cam.getWorldDirection(_pkF);const fl=Math.hypot(_pkF.x,_pkF.z)||1,fx=_pkF.x/fl,fz=_pkF.z/fl,far=(scene.fog?scene.fog.far:900)+30,lim=Math.cos(Math.min(Math.PI*.95,(cam.fov*Math.max(1,cam.aspect)/2+32)*Math.PI/180));
  const TM=tr.instanceMatrix.array,CM=cr.instanceMatrix.array,CC=T_.cc&&cr.instanceColor.array;let n=0;
  for(let k=0;k<T_.n;k++){const p=TREES[k],dx=p[0]-cx,dz=p[1]-cz,d=Math.hypot(dx,dz);if(d>far||(d>45&&(dx*fx+dz*fz)/d<lim))continue;
    for(let q=0;q<16;q++){TM[n*16+q]=T_.mt[k*16+q];CM[n*16+q]=T_.mc[k*16+q];}if(CC){CC[n*3]=T_.cc[k*3];CC[n*3+1]=T_.cc[k*3+1];CC[n*3+2]=T_.cc[k*3+2];}n++;}
  tr.count=cr.count=n;tr.instanceMatrix.needsUpdate=cr.instanceMatrix.needsUpdate=true;if(CC)cr.instanceColor.needsUpdate=true;}
function pcol(i,vi){const M=PACK.pmc;for(const k of ['torso','head','hair']){const a=M[k];if(a){const d=PI_[k].instanceColor.array;d[vi*3]=a[i*3];d[vi*3+1]=a[i*3+1];d[vi*3+2]=a[i*3+2];}}
  for(const k of ['legs','shoes','arms']){const a=M[k];if(a){const d=PI_[k].instanceColor.array;for(let j=0;j<6;j++)d[vi*6+j]=a[i*6+j];}}}
function pedCounts(vi){for(const k of ['torso','head','hair']){PI_[k].count=vi;if(PI_[k].instanceColor)PI_[k].instanceColor.needsUpdate=true;}for(const k of ['legs','shoes','arms']){PI_[k].count=vi*2;if(PI_[k].instanceColor)PI_[k].instanceColor.needsUpdate=true;}}

/* ================= car dynamics: two-axle tyre model with weight transfer (tunable per car) =================
   Each axle makes sideways force from its slip angle (magic-formula curve), limited by the load on it and by the
   ground; braking moves load to the front, accelerating to the rear; engine force uses up the driven axle's grip;
   the handbrake takes most of the rear grip away. Momentum is kept in the body frame, so a car really slides. */
const PHYS={g:9.81,B:9,C:1.2,Chb:1.5,steerMax:.6,steerSpeed:9,steerPow:1.35,hbRear:.3,assist:1.6,scrub:.45,substeps:4};
// per-car overrides, e.g. VEH_OVR['bmw-m4-competition']={drive:'rwd',mass:1725,mu:1.15}
const VEH_OVR={'chevrolet-damas':{mass:900},'tesla-cybertruck':{mass:3100},'honda-indycar-2015':{mass:750,mu:1.6,drive:'rwd'}};
const LUXRWD=/^(bmw|mercedes|lamborghini-(hurac|aventador)|ferrari|porsche-911|pagani|arash|chevrolet-(camaro|corvette)|toyota-land)/;
function vehParams(sp){if(sp._vp)return sp._vp;const o=VEH_OVR[sp.id]||{},ty=sp.type;
  const drive=o.drive||(sp.ev||ty==='suv'||ty==='cyber'?'awd':ty==='sport'||ty==='coupe'||LUXRWD.test(sp.id)?'rwd':'fwd');
  const mass=o.mass||Math.round((({hatch:1150,sedan:1400,wagon:1550,suv:2100,box:1500,coupe:1500,sport:1450,van:1300,cyber:3000})[ty]||1400)*clamp(sp.L/4.6,.75,1.3));
  const Lw=sp.L*.6,a=Lw*(drive==='fwd'?.42:drive==='rwd'?.52:.48);
  return sp._vp={drive,mass,Lw,a,b:Lw-a,h:sp.H*.36,I:mass*(sp.L*sp.L+sp.W*sp.W)/12*.95,mu:(o.mu||1.05)*((T[ty]&&T[ty].grip)||1)};}
function carDynamics(dt,sp,vF,vL,vF0,c){const V=vehParams(sp),n=PHYS.substeps,h=dt/n,g=PHYS.g,spd=Math.abs(vF);
  const delta=P.steer*PHYS.steerMax/(1+Math.pow(spd/PHYS.steerSpeed,PHYS.steerPow)),gm=V2.gripMul()*ENV.grip*SURF.cur.grip;
  const muF=V.mu*gm,muR=V.mu*gm*(c.hb?PHYS.hbRear:1),ax=clamp((vF-vF0)/Math.max(dt,1e-3),-14,14);
  const dN=V.mass*ax*V.h/V.Lw,Nf=Math.max(V.mass*g*.18,V.mass*g*V.b/V.Lw-dN),Nr=Math.max(V.mass*g*.18,V.mass*g*V.a/V.Lw+dN);
  const Fx=c.up?V.mass*Math.max(0,ax):0,useR=V.drive==='rwd'?1:V.drive==='awd'?.55:0;
  const capR=Math.sqrt(Math.max(.2,1-Math.pow(Fx*useR/(muR*Nr+1),2))),capF=Math.sqrt(Math.max(.2,1-Math.pow(Fx*(1-useR)/(muF*Nf+1),2)));
  const tyre=(al,mu,N,C)=>-mu*N*Math.sin(C*Math.atan(PHYS.B*al));
  const kin=clamp((spd-1.5)/3,0,1),sg=vF<0?-1:1;let r=P.yawR||0,slip=0;
  for(let i=0;i<n;i++){const u=Math.max(spd,.6),af=Math.atan2(vL+V.a*r,u)-delta*sg,ar=Math.atan2(vL-V.b*r,u);
    const Ff=tyre(af,muF*capF,Nf,PHYS.C),Fr=tyre(ar,muR*capR,Nr,c.hb?PHYS.Chb:PHYS.C),cd=Math.cos(delta),sd=Math.sin(delta);
    vF+=(vL*r-Ff*sd*sg*PHYS.scrub/V.mass)*h;vL+=((Ff*cd+Fr)/V.mass-vF*r)*h;r+=((V.a*Ff*cd-V.b*Fr)/V.I)*h;
    const rk=vF*Math.tan(delta)/V.Lw;r=r*kin+rk*(1-kin);if(kin<1)vL*=1-(1-kin)*Math.min(1,h*12);
    if(!c.hb&&spd>8)r-=(r-rk)*Math.min(1,h*PHYS.assist*(1+4*Math.abs(ar))); // stability assist, stronger as the rear slides (off on the handbrake)
    r=clamp(r,-4,4);slip=Math.max(slip,Math.abs(ar));
    P.h+=r*h;const fx=Math.sin(P.h),fz=Math.cos(P.h),lx=Math.cos(P.h),lz=-Math.sin(P.h);P.vx=fx*vF+lx*vL;P.vz=fz*vF+lz*vL;P.x+=P.vx*h;P.z+=P.vz*h;}
  P.yawR=r;return {vF,vL,yaw:r,steerAng:delta,slip};}

/* ================= tyre marks and smoke =================
   Rear wheels leave a mark while they slide (drift, handbrake, wheelspin, hard braking); marks live in a ring buffer
   and are cleared after 30 s. Smoke is a small particle pool with per-particle fade (one draw call each). */
const FX={skN:0,skI:0,sk:null,skT:null,last:[null,null],smoke:null,sm:[],smN:0,sweep:0};
function fxInit(){if(FX.sk)return;const phone=LOWG();FX.skN=phone?420:900;FX.smN=phone?70:160;
  const g=new THREE.PlaneGeometry(.24,1).rotateX(-Math.PI/2);keepG(g);
  FX.sk=new THREE.InstancedMesh(g,new THREE.MeshBasicMaterial({color:0x0b0b0b,transparent:true,opacity:.55,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}),FX.skN);
  FX.sk.instanceMatrix.setUsage(THREE.DynamicDrawUsage);FX.sk.frustumCulled=false;FX.skT=new Float32Array(FX.skN).fill(-1);const z=new THREE.Matrix4().makeScale(0,0,0);for(let i=0;i<FX.skN;i++)FX.sk.setMatrixAt(i,z);scene.add(FX.sk);
  const n=FX.smN,pos=new Float32Array(n*3),al=new Float32Array(n),sz=new Float32Array(n),geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));geo.setAttribute('alpha',new THREE.BufferAttribute(al,1).setUsage(THREE.DynamicDrawUsage));geo.setAttribute('size',new THREE.BufferAttribute(sz,1).setUsage(THREE.DynamicDrawUsage));
  const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{c:{value:new THREE.Color(0xd9dcdf)}},
    vertexShader:'attribute float alpha;attribute float size;varying float va;void main(){va=alpha;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=size*300./max(1.,-mv.z);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'uniform vec3 c;varying float va;void main(){vec2 p=gl_PointCoord-.5;float d=dot(p,p);if(d>.25)discard;gl_FragColor=vec4(c,va*(1.-d*4.));}'});
  FX.smoke=new THREE.Points(geo,mat);FX.smoke.frustumCulled=false;scene.add(FX.smoke);for(let i=0;i<n;i++)FX.sm.push({x:0,y:-9,z:0,vx:0,vy:0,vz:0,life:0,max:1,s:1});}
const _fxM=new THREE.Matrix4(),_fxQ=new THREE.Quaternion(),_fxS=new THREE.Vector3(),_fxP=new THREE.Vector3(),_fxY=new THREE.Vector3(0,1,0);
function puff(x,z,k){const p=FX.sm.find(q=>q.life<=0);if(!p)return;p.x=x+(Math.random()-.5)*.4;p.z=z+(Math.random()-.5)*.4;p.y=groundAt(x,z)+.25;p.vx=(Math.random()-.5)*1.2-P.vx*.05;p.vz=(Math.random()-.5)*1.2-P.vz*.05;p.vy=.6+Math.random()*.6;p.max=p.life=1.4+Math.random()*1.4;p.s=.9+k*1.4;}
function updateSkids(dt){fxInit();const now=performance.now()/1000;
  if(mode==='drive'&&P.sp&&!PAUSED){const sp=P.sp,fx=Math.sin(P.h),fz=Math.cos(P.h),lx=Math.cos(P.h),lz=-Math.sin(P.h),v=Math.hypot(P.vx,P.vz),vL=Math.abs(P.vx*lx+P.vz*lz);
    const soft=SURF.key==='grass'||SURF.key==='dirt',spin=keys.up&&v<9&&sp.acc<7,lock=keys.down&&v>12&&(P.vx*fx+P.vz*fz)>0;
    const k=v<3?0:Math.max(clamp((vL-1.6)/5,0,1),keys.hb&&v>5?.8:0,spin?.7:0,lock?.5:0);
    for(let w=0;w<2;w++){const sx=w?1:-1,wx=P.x-fx*sp.L*.31+lx*sp.W*.4*sx,wz=P.z-fz*sp.L*.31+lz*sp.W*.4*sx,L=FX.last[w];
      if(k>.25){if(L){const dx=wx-L.x,dz=wz-L.z,d=Math.hypot(dx,dz);if(d>.3&&d<4){const i=FX.skI;FX.skI=(FX.skI+1)%FX.skN;
          _fxP.set((wx+L.x)/2,groundAt(wx,wz)+.012,(wz+L.z)/2);_fxQ.setFromAxisAngle(_fxY,Math.atan2(dx,dz));_fxS.set(1,1,d);_fxM.compose(_fxP,_fxQ,_fxS);FX.sk.setMatrixAt(i,_fxM);FX.skT[i]=now;FX.sk.instanceMatrix.needsUpdate=true;FX.last[w]={x:wx,z:wz};}
          else if(d>=4)FX.last[w]={x:wx,z:wz};}else FX.last[w]={x:wx,z:wz};
        if(!soft&&Math.random()<k*dt*(LOWG()?18:34))puff(wx,wz,k);}else FX.last[w]=null;}}
  FX.sweep-=dt;if(FX.sweep<=0){FX.sweep=1;const z=new THREE.Matrix4().makeScale(0,0,0);let ch=false;for(let i=0;i<FX.skN;i++)if(FX.skT[i]>0&&now-FX.skT[i]>30){FX.skT[i]=-1;FX.sk.setMatrixAt(i,z);ch=true;}if(ch)FX.sk.instanceMatrix.needsUpdate=true;}
  const g=FX.smoke.geometry,pa=g.attributes.position.array,aa=g.attributes.alpha.array,sa=g.attributes.size.array;
  FX.sm.forEach((p,i)=>{if(p.life>0){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vx*=.97;p.vz*=.97;const a=p.life/p.max;aa[i]=a*.42;sa[i]=p.s*(1+(1-a)*2.6);}else{aa[i]=0;p.y=-9;}pa[i*3]=p.x;pa[i*3+1]=p.y;pa[i*3+2]=p.z;});
  g.attributes.position.needsUpdate=g.attributes.alpha.needsUpdate=g.attributes.size.needsUpdate=true;}

/* ================= ground surfaces: grip, rolling drag and top-speed share per surface (tunable) ================= */
// grip multiplies sideways grip, drag is extra rolling resistance (1/s), top caps the top speed; rain (ENV.grip) still applies on top.
const SURFACES={asphalt:{n:'Asfalt',grip:1,drag:0,top:1},concrete:{n:'Beton',grip:.92,drag:.012,top:1},grass:{n:'Maysa',grip:.62,drag:.07,top:.7},dirt:{n:'Tuproq',grip:.55,drag:.06,top:.75}};
const SURF={key:'asphalt',cur:SURFACES.asphalt};
function surfaceAt(x,z){const b=blockAt(x,z);if(!b)return 'asphalt';const e=Math.min(x-b.x0,b.x1-x,z-b.z0,b.z1-z);if(e<4.5)return 'concrete';
  return b.kind==='park'||b.kind==='mustaqillik'||b.kind==='panel'?'grass':b.kind==='mahalla'?'dirt':'concrete';}
function updateSurface(){const k=surfaceAt(P.x,P.z);if(k===SURF.key)return;
  // the kerb between road and pavement: a jolt and a little speed lost
  if((SURF.key==='asphalt')!==(k==='asphalt')){const v=Math.hypot(P.vx,P.vz);if(v>5){P.shake=Math.min(1,(P.shake||0)+v*.015);P.vx*=.97;P.vz*=.97;thud(v*.6);}}
  SURF.key=k;SURF.cur=SURFACES[k];}

/* ================= traffic rules: red lights and speed cameras at signalled crossings ================= */
// Fines apply only in free roam (no mission, no police chase) and can be turned off in Settings.
const RULES={inside:false,cool:0,fines:0};
function fine(sum,why){if(!S.unlimited)S.money=Math.max(0,S.money-sum);RULES.fines+=sum;updMoney();toast(why+' — jarima '+fmt(sum),'bad');beep(300,.12);
  if(AGENTS.some(a=>a.on&&a.pool==='police'&&Math.hypot(a.x-P.x,a.z-P.z)<45)){addWanted(1);toast('Politsiya buni koʻrdi!','bad');}}
function updateRules(dt){RULES.cool=Math.max(0,RULES.cool-dt);if(mode!=='drive'||S.rules===false)return;
  const i=nearestRoadIdx(P.x),j=nearestRoadIdx(P.z),inside=Math.abs(P.x-ROADS[i])<RW(i)/2-.5&&Math.abs(P.z-ROADS[j])<RW(j)/2-.5;
  if(inside&&!RULES.inside&&!MS.cur&&!WANT.lvl&&!EVT.cur&&RULES.cool<=0){const sp=Math.hypot(P.vx,P.vz),ax=Math.abs(P.vz)>Math.abs(P.vx)?'z':'x';
    if(TL[ax]==='r'&&sp>5){RULES.cool=6;fine(150,'Qizil chiroqdan oʻtdingiz');}
    else if(sp*3.6>100){RULES.cool=6;fine(100,'Radar: '+Math.round(sp*3.6)+' km/soat (cheklov 100)');}}
  RULES.inside=inside;}

/* ================= online: anonymous usage counts and leaderboards (Netlify functions in netlify/) ================= */
const API={dev:(()=>{try{let d=localStorage.getItem('td-device');if(!d||!/^[a-f0-9]{16}$/.test(d)){d=[...crypto.getRandomValues(new Uint8Array(8))].map(b=>b.toString(16).padStart(2,'0')).join('');localStorage.setItem('td-device',d);}return d;}catch(e){return '';}})(),
  on(){return !window.__TD_TEST&&location.protocol==='https:'&&!/github.io$/.test(location.hostname)&&!!API.dev;},
  post(u,o){try{return fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(o),keepalive:true}).catch(()=>null);}catch(e){return Promise.resolve(null);}},
  hit(e){if(API.on())API.post('/api/hit',{d:API.dev,e});},
  submit(b,v){if(API.on()&&S.nick&&v>0)API.post('/api/lb',{b,d:API.dev,n:S.nick,v:Math.round(v)});},
  async top(b){const r=await fetch('/api/lb?b='+b,{cache:'no-store'});if(!r.ok)throw new Error('lb');const j=await r.json();return j.rows||[];},
  lastE:0,lastT:0};
window.__tdHit=e=>API.hit(e);
const LB={tab:'drift',rows:null,err:false,load(){LB.rows=null;LB.err=false;if(!API.on()){LB.err=true;return;}API.top(LB.tab).then(r=>{LB.rows=r;}).catch(()=>{LB.err=true;}).then(()=>{if(phoneOpen&&phApp==='rank')renderPhone();});}};

/* ================= Instagram follow bonus (once per device) and touch-control preference ================= */
// Instagram gives no way to check a follow from a web page, so the bonus unlocks after the player has opened the profile
// and come back; it is remembered per device (localStorage) and per save.
const INSTA={USER:'azamowc',SUM:50000,K:'toshkent-drive-ig-bonus',opened:false,t:0,
  got(){let d=false;try{d=localStorage.getItem(INSTA.K)==='1';}catch(e){}return d||!!S.igBonus;},
  ready(){return INSTA.opened&&Date.now()-INSTA.t>5000;},
  open(){INSTA.opened=true;INSTA.t=Date.now();try{window.open('https://www.instagram.com/'+INSTA.USER+'/','_blank','noopener');}catch(e){}
    syncIG();setTimeout(()=>{syncIG();if(phoneOpen&&phApp==='bonus')renderPhone();},5200);},
  claim(){if(INSTA.got())return;if(!INSTA.ready()){toast('Avval Instagramda obuna boʻling','bad');return;}
    earn(INSTA.SUM);S.igBonus=true;API.hit('bonus');try{localStorage.setItem(INSTA.K,'1');}catch(e){}persist();updMoney();syncIG();menuStatLine();
    toast('Instagram bonusi: +'+fmt(INSTA.SUM)+' · Obuna uchun rahmat!','gold');}};
// promo codes from Instagram stories: only SHA-256 hashes are in the page (tools/v2/world/promo.js manages them)
const PROMO=__PROMO__,PROMO_K='toshkent-drive-promo-used';
function promoUsed(){try{return JSON.parse(localStorage.getItem(PROMO_K)||'[]');}catch(e){return [];}}
async function redeemPromo(raw){const code=String(raw||'').trim().toUpperCase();if(!code){toast('Kodni kiriting','bad');return;}
  let h='';try{const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('td:'+code));h=[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('');}catch(e){toast('Bu brauzerda kod tekshirib boʻlmadi','bad');return;}
  const p=PROMO.find(x=>x.h===h);if(!p){toast('Bunday kod yoʻq','bad');return;}
  if(p.until&&new Date().toISOString().slice(0,10)>p.until){toast('Bu kodning muddati tugagan','bad');return;}
  const used=promoUsed();if(used.includes(h)||(S.promo||[]).includes(h)){toast('Bu kod allaqachon ishlatilgan','bad');return;}
  used.push(h);try{localStorage.setItem(PROMO_K,JSON.stringify(used));}catch(e){}API.hit('promo');S.promo=(S.promo||[]).concat(h);earn(p.sum);persist();updMoney();
  toast('Promo-kod qabul qilindi: +'+fmt(p.sum),'gold');if(phoneOpen)renderPhone();}
function syncIG(){const b=$('#igBanner');if(!b)return;const got=INSTA.got();b.hidden=got;if(got)return;
  b.classList.toggle('ready',INSTA.ready());$('#igBtnT').textContent=INSTA.ready()?'Bonusni olish':'Obuna boʻlish';}
$('#igBanner').addEventListener('click',()=>{if(INSTA.ready())INSTA.claim();else INSTA.open();});
document.addEventListener('visibilitychange',()=>{if(document.hidden||!INSTA.opened)return;setTimeout(()=>{syncIG();if(phoneOpen&&phApp==='bonus')renderPhone();},Math.max(0,5100-(Date.now()-INSTA.t)));});
syncIG();
function touchPref(){try{return localStorage.getItem('td-touch')||'auto';}catch(e){return 'auto';}}
function setTouchPref(v){try{localStorage.setItem('td-touch',v);}catch(e){}document.body.classList.toggle('mob',window.__tdTouch(v));resize();toast(TOUCHUI()?'Sensor tugmalar yoqildi':'Sensor tugmalar oʻchirildi');}

/* ================= SAVE SLOTS & GAME FLOW ================= */
const slotKey=n=>KEY+'-slot'+n;
function slotMeta(n){try{const d=JSON.parse(localStorage.getItem(slotKey(n))||'null');return d?{story:d.story|0,when:d.savedAt||0}:null;}catch(e){return null;}}
function saveSlot(n){persist();try{const d=JSON.parse(localStorage.getItem(KEY));d.savedAt=Date.now();localStorage.setItem(slotKey(n),JSON.stringify(d));toast(n+'-slotga saqlandi','good');}catch(e){toast('Saqlab boʻlmadi','bad');}}
function loadSlot(n){try{const raw=localStorage.getItem(slotKey(n));if(!raw)return;sanitize(JSON.parse(raw));NO_SAVE=true;localStorage.setItem(KEY,raw);location.reload();}catch(e){toast('Slot buzilgan','bad');}}
persistHook=()=>{if(S.nick&&S.earned>API.lastE+500&&Date.now()-API.lastT>60000){API.lastE=S.earned;API.lastT=Date.now();API.submit('earned',S.earned);}S.tod=W.tod;S.pos={x:P.x,z:P.z,h:P.h};S.hpos={x:HERO.x,z:HERO.z,h:HERO.h};if(mode==='foot'||mode==='drive')S.onFoot=mode==='foot';S.hp=Math.round(HERO.hp);};
addEventListener('pagehide',()=>{if(mode==='drive'||mode==='foot')persist();});
function showGameUI(){$('#touch').style.visibility='visible';$('#menu').hidden=true;$('#stageUI').hidden=true;$('#hud').hidden=false;canvas.focus();updMoney();}
function startFoot(){initAudio();if(A&&A.ac.state==='suspended')A.ac.resume();mode='foot';document.body.classList.add('foot');HERO.mesh.visible=true;showGameUI();}
function startGame(){API.hit('play');if(S.onFoot){HERO.y=groundAt(HERO.x,HERO.z);FC.yaw=HERO.h+Math.PI;startFoot();}else startDrive();
  if(!INSTA.got()&&!INSTA.nag){INSTA.nag=1;setTimeout(()=>{if(!INSTA.got())toast('Telefon → Bonus: Instagramga obuna boʻling va '+fmt(INSTA.SUM)+' oling','gold');},9000);}
  if(!S.played){S.played=1;setTimeout(()=>addMsg('Botir aka','Assalomu alaykum, Sardor! Toshkentga xush kelibsan. Chorsu bozori yonidagi ustaxonamga kel — senga ish bor. (Xaritada S belgisi)'),2500);}persist();}
let newArm=false;
$('#newGame').addEventListener('click',()=>{const b=$('#newGame');if(!newArm){newArm=true;b.textContent='Tasdiqlang: hammasi oʻchadi';setTimeout(()=>{newArm=false;b.textContent='Yangi oʻyin';},3500);return;}
  const f=freshSave();f.gfx=S.gfx;f.sub=S.sub;f.sound=S.sound;NO_SAVE=true;try{localStorage.setItem(KEY,JSON.stringify(f));}catch(e){}location.reload();});
$('#loadGame').addEventListener('click',()=>{const r=$('#slotRow');r.hidden=!r.hidden;if(r.hidden)return;
  r.innerHTML='<span class="stat-line">Slotlar:</span>'+[1,2,3].map(n=>{const m=slotMeta(n);return `<button class="chip" data-slot="${n}"${m?'':' disabled'}>${n}: ${m?'hikoya '+m.story+'/'+STORY.length:'boʻsh'}</button>`;}).join('');});
$('#slotRow').addEventListener('click',e=>{const b=e.target.closest('[data-slot]');if(b&&!b.disabled)loadSlot(+b.dataset.slot);});
function menuStatLine(){$('#menuStat').innerHTML=`Hikoya: <b>${Math.min(S.story,STORY.length)}/${STORY.length}</b> · Hisob: <b>${S.unlimited?'∞ cheksiz':fmt(S.money)}</b> · Garajda: <b>${S.owned.length}</b> ta mashina · Vaqt: <b>${clockStr(W.tod)}</b>`;}
menuStatLine();
if(S.pos){P.x=S.pos.x;P.z=S.pos.z;P.h=S.pos.h;}
if(S.hpos){HERO.x=S.hpos.x;HERO.z=S.hpos.z;HERO.h=S.hpos.h;}else{HERO.x=P.x-3;HERO.z=P.z;}
HERO.y=groundAt(HERO.x,HERO.z);HERO.hp=S.hp;
window.__TD_WORLD=true;API.hit('open');loadAvatar();
V2.init();setWeather(WEATHERS[S.weather]?S.weather:'clear',true);useOwnedCar();applySubStyle();updMoney();
cam.position.set(P.x,4,P.z+10);

let last=performance.now(),menuA=0,autoT=20;
// one simulation tick of the open world (also driven directly by the automated test hook)
function simulate(dt){V2.tick(dt);updateWeather(dt,true);updateTraffic(dt);updatePeople(dt);
  packTrees(dt);
  if(mode==='drive'){updateDrive(dt);seatHero();}else if(TRANS.on)updateTrans(dt);else updateFoot(dt);
  updateAgents(dt);updateHelis(dt);updateOfficers(dt);updateWanted(dt);updateMission(dt);updateDialog(dt);updateEvents(dt);updateAnor(dt);updateDiscovery(dt);updateGPS(dt);updateRules(dt);update3DCars(dt);updateSkids(dt);updateHints();}
function frame(now){
  const dt=clamp((now-last)/1000,0,.05);last=now; // the first rAF stamp can predate the end of the (long) init script
  try{
    for(const c of CASH)c.s.rotation.y+=dt*2;
    pickBeam.rotation.y+=dt;dropBeam.rotation.y+=dt;objBeam.rotation.y+=dt;cpBeam.rotation.y+=dt;evtBeam.rotation.y+=dt;
    if((mode==='drive'||mode==='foot')&&!DISPLAY.req&&Math.hypot(px()-LM.salon.lot[0],pz()-LM.salon.lot[1])<280){DISPLAY.req=1;DISPLAY.forEach(d=>{if(realTpl[d.id])onRealLoaded(d.id);else loadReal(d.id,false);});}
    if(mode==='drive'||mode==='foot'){
      fpsGuard(dt);if(!PAUSED){simulate(dt);autoT-=dt;if(autoT<=0){autoT=20;persist();}}
      else if(mode==='drive')updateAudio(0,0,0,false);
      updateAmbience();sky.position.copy(cam.position);renderer.render(scene,cam);}
    else if(mode==='shop'){V2.tick(dt);updateWeather(dt,false);updateAmbience();renderer.render(scene,cam);}
    else if(mode==='stage'){V2.tick(dt);updateStage(dt);renderer.render(ST.scene,ST.cam);updateAmbience();}
    else{V2.tick(dt);updateWeather(dt,false);updateTraffic(dt);updatePeople(dt);menuA+=dt*.05;const cx=V2.cam?V2.cam[3]:40,cz=V2.cam?V2.cam[5]:-20;cam.position.set(cx+Math.cos(menuA)*230,95,cz+Math.sin(menuA)*230);cam.lookAt(cx,25,cz);
      if(V2.cam){cam.position.set(V2.cam[0],V2.cam[1],V2.cam[2]);cam.lookAt(V2.cam[3],V2.cam[4],V2.cam[5]);}
      sun.position.set(cx+SUN.x*200,SUN.y*200,cz+SUN.z*200);sun.target.position.set(cx,0,cz);sky.position.copy(cam.position);renderer.render(scene,cam);}
  }catch(err){console.error(err);}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if(window.__TD_TEST)window.__td={V2,W,applySeason,startDrive,resetToRoad,setPlayerCar,BLOCKS,updateTraffic,updatePeople,updateDrive,ROADS,CAT,persist,getMode:()=>mode,renderer,scene,TRAFFIC,TL,taxi,get A(){return A;},ST,openStage,showStageCar,CARS,realTpl,P,cam,PEOPLE,SHOPPTS,HERO,WANT,MS,STORY,SIDE,AGENTS,EVT,S,ENV,WX,LM,GPS,DLG,
  scene,renderer,sky,hemi,sun,SKYU,get mode(){return mode;},sim:(dt,n)=>{for(let i=0;i<n;i++)if((mode==='drive'||mode==='foot')&&!PAUSED)simulate(dt);},startMission,startEvent,setWanted,addWanted,toggleVehicle,openPhone,closePhone,openMap,closeMap,takePhoto,interact,keys,loadReal,REAL,TRANS,XW,TREE_MESHES,PI_,BLOCKS,COLL,surf:()=>SURF.key,setWeather,skipTo,nextStep,saveSlot,FC,OFFICERS,HELIS,ANOR,lmRoad,exitCar,enterCar,nextLine,failMission,endEvent,resetLaw,insideSolid,groundAt,punch,renderPhone,drawMap,clearWanted,makeAgent,busted,slotMeta,useOwnedCar,get PAUSED(){return PAUSED;},get phApp(){return phApp;},set phApp(v){phApp=v;}};

