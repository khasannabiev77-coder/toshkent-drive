/* ================= V2: time of day, seasons, shops, traffic & pedestrian behaviour, quality ================= */
const lerp=(a,b,t)=>a+(b-a)*t,sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
S.inv=S.inv||{};S.up=S.up||{};S.buff=S.buff||{};
if(!S.todMode)S.todMode='auto';if(!S.seasonMode)S.seasonMode='auto';
{const hs=(location.hash||'').replace('#','');if(hs==='telefon')S.gfx='phone';else if(hs==='kompyuter')S.gfx='pc';else if(hs==='ultra')S.gfx='ultra';
 if(!S.gfx&&!matchMedia('(pointer:coarse)').matches&&(navigator.hardwareConcurrency||8)<=4)S.gfx='phone';}
const SEASONS=['spring','summer','autumn','winter'],SEASON_NAME={auto:'Avto',spring:'Bahor',summer:'Yoz',autumn:'Kuz',winter:'Qish'};
const TODS={morning:7.3,day:13,evening:18.7,night:23},TOD_NAME={auto:'Avto',morning:'Ertalab',day:'Kunduz',evening:'Kechqurun',night:'Tun'};
const SEAS={spring:{el:.85,temp:[19,9],grass:[.96,1.08,.9],fog:1},summer:{el:1,temp:[34,22],grass:[1,1,1],fog:1},autumn:{el:.78,temp:[13,5],grass:[1.14,.98,.72],fog:.9},winter:{el:.55,temp:[-2,-8],grass:[1,1,1],fog:.62}};
const W={tod:typeof S.tod==='number'?S.tod:9.5,season:'summer',night:0};
function autoSeason(){const m=new Date().getMonth();return m<2||m===11?'winter':m<5?'spring':m<8?'summer':'autumn';}

/* ---- night lighting helpers ---- */
function litMat(mt,tex){mt.emissive=new THREE.Color(1,1,1);mt.emissiveMap=tex;mt.emissiveIntensity=0;
  mt.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <emissivemap_fragment>','#ifdef USE_EMISSIVEMAP\n vec4 emissiveColor = texture2D( emissiveMap, vUv*0.25 );\n emissiveColor.rgb = emissiveMapTexelToLinear( emissiveColor ).rgb;\n totalEmissiveRadiance *= emissiveColor.rgb;\n#endif');};mt.needsUpdate=true;}
function litTex(x0,y0,w,h,p,seed){return ctex(256,256,(x)=>{x.fillStyle='#000';x.fillRect(0,0,256,256);const r=mulberry(seed);
  for(let i=0;i<4;i++)for(let j=0;j<4;j++){const q=r(),a=r();if(q>p)continue;x.globalAlpha=.5+a*.5;x.fillStyle=q<p*.6?'#ffd9a0':q<p*.9?'#fff1cf':'#bcd8ff';x.fillRect(i*64+x0,j*64+y0,w,h);}x.globalAlpha=1;},true);}
litMat(wallMat,litTex(12,14,40,34,.5,77));litMat(ENVM.balc,litTex(14,6,36,28,.55,91));litMat(glassBMat,litTex(2,0,62,58,.38,55));
const ENVS={day:worldEnv};
function mkEnv(top,hor,gr,sunC){const s=new THREE.Scene(),g=new THREE.SphereGeometry(50,32,16),p=g.attributes.position,cols=[],c=new THREE.Color();
  for(let i=0;i<p.count;i++){const h=p.getY(i)/50;if(h>=0)c.copy(hor).lerp(top,Math.pow(h,.55));else c.copy(gr);cols.push(c.r,c.g,c.b);}
  g.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));s.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide})));
  const sm2=new THREE.Mesh(new THREE.SphereGeometry(3,16,8),new THREE.MeshBasicMaterial({color:sunC}));sm2.position.set(.8,.25,.38).normalize().multiplyScalar(40);s.add(sm2);return pmrem.fromScene(s,0.02).texture;}
ENVS.dusk=mkEnv(new THREE.Color(.1,.16,.36),new THREE.Color(.75,.42,.24),new THREE.Color(.14,.13,.13),new THREE.Color(7,3.4,1.4));
ENVS.night=mkEnv(new THREE.Color(.006,.01,.03),new THREE.Color(.03,.045,.09),new THREE.Color(.02,.02,.025),new THREE.Color(.5,.6,.9));
// stars
const stars=(()=>{const n=800,a=new Float32Array(n*3),r=mulberry(4242);for(let i=0;i<n;i++){const u=r()*6.283,v=Math.acos(r()*.96+.02),R0=2400;a[i*3]=Math.sin(v)*Math.cos(u)*R0;a[i*3+1]=Math.cos(v)*R0;a[i*3+2]=Math.sin(v)*Math.sin(u)*R0;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(a,3));const p=new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:2.2,sizeAttenuation:false,transparent:true,opacity:0,depthWrite:false,fog:false}));p.frustumCulled=false;p.visible=false;sky.add(p);return p;})();
// light pools under street lamps
const pools=(()=>{const tex=ctex(64,64,(x)=>{const g=x.createRadialGradient(32,32,2,32,32,32);g.addColorStop(0,'rgba(255,232,180,1)');g.addColorStop(1,'rgba(255,232,180,0)');x.fillStyle=g;x.fillRect(0,0,64,64);});
  const im=new THREE.InstancedMesh(new THREE.PlaneGeometry(15,15).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}),LAMPS.length),o=new THREE.Object3D();
  LAMPS.forEach(([x,z,ry],k)=>{o.position.set(x,.3,z+(ry===0?-1:1)*2.2);o.updateMatrix();im.setMatrixAt(k,o.matrix);});im.frustumCulled=false;im.visible=false;im.renderOrder=2;scene.add(im);return im;})();
// headlight glow on the road (shared by player and traffic)
MAT.beam=new THREE.MeshBasicMaterial({map:ctex(64,128,(x)=>{const g=x.createLinearGradient(0,0,0,128);g.addColorStop(0,'rgba(255,244,214,.95)');g.addColorStop(1,'rgba(255,244,214,0)');x.fillStyle=g;x.fillRect(0,0,64,128);
  const s=x.createLinearGradient(0,0,64,0);s.addColorStop(0,'rgba(0,0,0,1)');s.addColorStop(.3,'rgba(0,0,0,0)');s.addColorStop(.7,'rgba(0,0,0,0)');s.addColorStop(1,'rgba(0,0,0,1)');x.globalCompositeOperation='destination-out';x.fillStyle=s;x.fillRect(0,0,64,128);}),
  transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});MAT.beam.visible=false;
const beamGeo=keepG(new THREE.PlaneGeometry(5,12).rotateX(-Math.PI/2));
function addBeam(mesh,L){const b=new THREE.Mesh(beamGeo,MAT.beam);b.position.set(0,.13,L/2+6);b.renderOrder=3;mesh.add(b);}
TRAFFIC.forEach(t=>addBeam(t.mesh,t.mesh.userData.sp.L));
let spot=null;
const MT0=ENVM.mt?ENVM.mt.map(m0=>m0.color.clone()):[];

/* ---- time of day ---- */
const TK=[[0,'#04070f','#0b1322','#9fb4e8',.2,.22,'#0a1120',.85],[5.2,'#0a1124','#1c2540','#9fb4e8',.2,.22,'#141c30',.85],[6.4,'#3b5f9a','#f2a56b','#ffb070',.8,.42,'#d6a888',.97],[8,'#2a62c4','#c9dcec','#fff1dc',1.4,.58,'#c3d1db',1.05],
 [13,'#2961c7','#c7dbee','#fff4e2',1.55,.62,'#c3d1db',1.05],[17.3,'#2a5cb8','#d5d6dc','#ffe6c0',1.35,.58,'#c9cfd6',1.03],[18.9,'#34508f','#f39a5a','#ff9a55',.8,.42,'#d99e7c',.96],[20.1,'#0d1630','#3a3350','#9fb4e8',.24,.25,'#1a2036',.88],[24,'#04070f','#0b1322','#9fb4e8',.2,.22,'#0a1120',.85]];
const _ca=new THREE.Color(),_cb=new THREE.Color(),GREY=new THREE.Color(.72,.76,.8);
function applyTime(){const tod=W.tod;let i=0;while(i<TK.length-2&&tod>=TK[i+1][0])i++;const A0=TK[i],B0=TK[i+1],f=clamp((tod-A0[0])/(B0[0]-A0[0]),0,1),mix=(k,out)=>out.copy(_ca.set(A0[k])).lerp(_cb.set(B0[k]),f);
  const n=W.night=Math.max(1-sstep(5.3,6.7,tod),sstep(18.7,20.1,tod)),se=SEAS[W.season],day=1-n;
  mix(1,SKYU.cTop.value);mix(2,SKYU.cHor.value);mix(3,SKYU.cSun.value);
  if(W.season==='winter'){SKYU.cTop.value.lerp(GREY,.4*day);SKYU.cHor.value.lerp(GREY,.3*day);}
  if(n<.999){const a=clamp((tod-5.8)/13.4,0,1)*Math.PI;SUN.set(Math.cos(a)*.85,Math.sin(a)*se.el+.04,.38).normalize();}else SUN.set(-.42,.72,.3).normalize();
  if(n>.999){SKYU.sunI.value=.55;}else SKYU.sunI.value=1;
  mix(3,sun.color).convertSRGBToLinear();sun.intensity=lerp(A0[4],B0[4],f)*(W.season==='winter'?.85:1);
  hemi.intensity=lerp(A0[5],B0[5],f);hemi.color.set('#dbe9ff').lerp(_ca.set('#5a6f9c'),n).convertSRGBToLinear();
  mix(6,scene.fog.color);if(W.season==='winter')scene.fog.color.lerp(_ca.set('#dfe6ec'),.5*day);scene.fog.color.convertSRGBToLinear();
  renderer.toneMappingExposure=lerp(A0[7],B0[7],f);
  const G=GFX[S.gfx]||GFX.pc;scene.fog.near=G.fog[0]*se.fog;scene.fog.far=G.fog[1]*se.fog;
  const dusk=(tod>5.6&&tod<7.2)||(tod>17.9&&tod<19.7),env=n>.6?ENVS.night:dusk?ENVS.dusk:ENVS.day;if(scene.environment!==env)scene.environment=env;
  ENVM.lamp.emissiveIntensity=.25+n*3.2;pools.visible=n>.03;pools.material.opacity=n*.5;
  wallMat.emissiveIntensity=n*1.05;ENVM.balc.emissiveIntensity=n*1.05;glassBMat.emissiveIntensity=n*.9;ENVM.front.emissiveIntensity=.3+n*.9;ENVM.sign.emissiveIntensity=.25+n*1.1;
  MAT.head.emissiveIntensity=1.2+n*1.6;MAT.beam.visible=n>.03;MAT.beam.opacity=n*.55;
  stars.visible=n>.05;stars.material.opacity=n*.9;
  const cl=lerp(1,.1,n);CLOUDS.material.color.setRGB(cl,cl,cl*1.05);CLOUDS.material.emissiveIntensity=.35*day;
  if(ENVM.mt)ENVM.mt.forEach((m0,k)=>m0.color.copy(MT0[k]).multiplyScalar(lerp(1,.12,n)));
  if(spot)spot.intensity=n*2.4;}

/* ---- seasons ---- */
const snowTex=ctex(256,256,(x,w,h)=>{x.fillStyle='#eef2f6';x.fillRect(0,0,w,h);for(let k=0;k<2600;k++){const g=Math.random();x.fillStyle=g<.6?'rgba(190,205,222,.35)':'rgba(255,255,255,.7)';x.fillRect(Math.random()*w,Math.random()*h,2+Math.random()*4,2+Math.random()*4);}},true);
const snowLawn=new THREE.CanvasTexture(snowTex.image);snowLawn.wrapS=snowLawn.wrapT=THREE.RepeatWrapping;snowLawn.encoding=THREE.sRGBEncoding;snowTex.repeat.set(600,600);
const PN=1600,pPos=new Float32Array(PN*3),pSeed=new Float32Array(PN),pGeo=new THREE.BufferGeometry();
for(let i=0;i<PN;i++){pPos[i*3]=rnd(-40,40);pPos[i*3+1]=rnd(0,30);pPos[i*3+2]=rnd(-40,40);pSeed[i]=Math.random();}
pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));
const pPts=new THREE.Points(pGeo,new THREE.PointsMaterial({size:.2,color:0xffffff,transparent:true,opacity:.9,depthWrite:false}));pPts.frustumCulled=false;pPts.visible=false;scene.add(pPts);
const PCFG={fall:2,wind:.6,sway:.5};let pcx=0,pcz=0,vT=0;
function updParticles(dt){if(!pPts.visible)return;const dx=cam.position.x-pcx,dz=cam.position.z-pcz;pcx=cam.position.x;pcz=cam.position.z;pPts.position.set(pcx,0,pcz);
  const n=pGeo.drawRange.count,w80=v=>((v+40)%80+80)%80-40;
  for(let i=0;i<n;i++){const k=i*3,sd=pSeed[i];let y=pPos[k+1]-PCFG.fall*(.7+sd*.6)*dt;if(y<0)y+=30;
    pPos[k]=w80(pPos[k]-dx+(PCFG.wind+Math.sin(vT*1.3+sd*6.28)*PCFG.sway)*dt);pPos[k+1]=y;pPos[k+2]=w80(pPos[k+2]-dz+Math.cos(vT+sd*9)*PCFG.sway*dt);}
  pGeo.attributes.position.needsUpdate=true;}
function applySeason(){const s=W.season=S.seasonMode==='auto'?autoSeason():S.seasonMode,se=SEAS[s],crown=TREE_MESHES[1],col=new THREE.Color(),r=mulberry(1234);
  for(let k=0;k<TREE_POP.length;k++){const pop=TREE_POP[k],a=r(),b=r(),c=r();
    if(s==='summer')col.setHSL(lerp(.22,.3,a),lerp(.35,.5,b),pop?lerp(.16,.22,c):lerp(.22,.32,c));
    else if(s==='spring'){if(!pop&&a<.24)col.setHSL(a<.09?.1:lerp(.9,.97,b),a<.09?.2:.6,lerp(.74,.86,c));else col.setHSL(lerp(.24,.31,a),lerp(.5,.66,b),pop?lerp(.24,.3,c):lerp(.3,.42,c));}
    else if(s==='autumn'){if(pop)col.setHSL(lerp(.11,.15,a),.72,lerp(.38,.48,c));else col.setHSL(lerp(.02,.15,a),lerp(.6,.85,b),lerp(.3,.46,c));}
    else{if(pop)col.setHSL(.08,.14,lerp(.26,.34,c));else col.setHSL(.58,.1,lerp(.8,.95,c));}
    crown.setColorAt(k,col);}
  crown.instanceColor.needsUpdate=true;
  const win=s==='winter';ground.material.map=win?snowTex:grassTex;ground.material.color.setRGB(se.grass[0],se.grass[1],se.grass[2]);ground.material.needsUpdate=true;
  ENVM.lawn.map=win?snowLawn:lawnTex;ENVM.lawn.color.setRGB(se.grass[0],se.grass[1],se.grass[2]);ENVM.lawn.needsUpdate=true;
  ROADM.forEach(m0=>{m0.color.setScalar(win?1.3:1);m0.roughness=win?.75:.9;});
  const cnt=PN*(GFX[S.gfx]&&S.gfx==='phone'?.45:1);
  if(s==='summer')pPts.visible=false;else{pPts.visible=true;const pm=pPts.material;
    if(win){pm.color.set('#ffffff');pm.size=.17;pGeo.setDrawRange(0,Math.floor(cnt));PCFG.fall=2.3;PCFG.wind=.8;PCFG.sway=.5;}
    else if(s==='autumn'){pm.color.set('#e08a2a');pm.size=.24;pGeo.setDrawRange(0,Math.floor(cnt*.22));PCFG.fall=1.3;PCFG.wind=1.2;PCFG.sway=1.4;}
    else{pm.color.set('#ffd3e2');pm.size=.2;pGeo.setDrawRange(0,Math.floor(cnt*.18));PCFG.fall=.8;PCFG.wind=.9;PCFG.sway=1.2;}}
  document.querySelectorAll('[data-season]').forEach(b=>b.classList.toggle('on',b.dataset.season===S.seasonMode));
  document.querySelectorAll('[data-tod]').forEach(b=>b.classList.toggle('on',b.dataset.tod===S.todMode));
  applyTime();}

/* ---- shops ---- */
// effect: ['buff',key,seconds] | ['inv',key,count] | ['up',key]
const F=(n,p,d,min)=>({n,p,d:d+' Taksi daromadi +10% ('+min+' daqiqa).',e:['buff','food',min*60]}),K=(n,p,d,min)=>({n,p,d:d+' Bonus vaqti +25% ('+min+' daqiqa).',e:['buff','focus',min*60]});
const SWEET={n:'Yoʻlovchiga shirinlik',p:5,d:'Keyingi safar haqi +15%.',e:['inv','sweet',1]};
const GROC=[K('Suv',1,'Muzdek buloq suvi.',4),F('Mevalar',6,'Mavsumiy mevalar savati.',12),K('Energetik ichimlik',4,'Uyqu qochadi.',12),SWEET];
const CAT={
 'NON':{hi:'Tandirdan hozir uzilgan!',items:[F('Issiq non',2,'Tandir noni.',5),F('Patir',3,'Sutli, yogʻli patir.',8)]},
 'SOMSA':{hi:'Somsa issiq, olib keting!',items:[F('Tandir somsa',4,'Bir dona, qoʻy goʻshtidan.',8),F('Somsa, 2 dona',7,'Toʻyimli tushlik.',15)]},
 'OSH MARKAZI':{hi:'Oshga marhamat!',items:[F('Toʻy oshi',12,'Qazi va tuxum bilan.',25),K('Koʻk choy',1,'Choynakda.',5)]},
 'KAFE':{hi:'Xush kelibsiz! Nima buyurasiz?',items:[K('Kofe',5,'Yangi qovurilgan dondan.',10),F('Lagʻmon',9,'Qoʻlda choʻzilgan.',20),F('Burger',8,'Mol goʻshtidan.',15)]},
 'CHOYXONA':{hi:'Choy damlab qoʻydik, oʻtiring.',items:[K('Koʻk choy',2,'Limon bilan.',8),F('Shashlik',10,'Koʻmirda, 3 six.',20)]},
 'OZIQ-OVQAT':{hi:'Hamma narsa yangi.',items:GROC},'SUPERMARKET':{hi:'Aksiyalar bugun ham davom etmoqda.',items:GROC},
 'MEVA-SABZAVOT':{hi:'Bozordan bugun kelgan.',items:[F('Mevalar',5,'Mavsumiy mevalar.',12),F('Quruq meva',7,'Yongʻoq, mayiz, turshak.',15)]},
 'DORIXONA':{hi:'Salomat boʻling.',items:[{n:'Vitaminlar',p:15,d:'Daromad +10% va bonus vaqti +25% (30 daqiqa).',e:['buff','vit',1800]},{n:'Birinchi yordam qutisi',p:40,d:'Avariyada yoʻlovchi haqdan chegirmaydi. Doimiy.',e:['up','kit']}]},
 'GULLAR':{hi:'Eng chiroyli guldastalar bizda.',items:[{n:'Guldasta',p:20,d:'Keyingi safar haqi +30%.',e:['inv','flowers',1]}]},
 'KIYIM-KECHAK':{hi:'Yangi kolleksiya keldi.',items:[{n:'Haydovchi formasi',p:180,d:'Taksi daromadi +8%. Doimiy.',e:['up','suit']}]},
 'POYABZAL':{hi:'Oyoqqa qulay, uzoq yoʻlga mos.',items:[{n:'Qulay poyabzal',p:90,d:'Taksi daromadi +5%. Doimiy.',e:['up','shoes']}]},
 'TELEFONLAR':{hi:'Eng soʻnggi modellar.',items:[{n:'Navigator',p:350,d:'Xaritada manzilgacha yoʻnalish chizigʻi. Doimiy.',e:['up','nav']},{n:'Taksi ilovasi Pro',p:900,d:'Taksi daromadi +15%. Doimiy.',e:['up','pro']}]},
 'AVTO EHTIYOT QISMLARI':{hi:'Mashinangizga nima kerak?',items:[{n:'Nitro balloni ×3',p:250,d:'Shift tugmasi: 3,5 soniya kuchli tezlanish.',e:['inv','nitro',3]},{n:'Qishki shinalar',p:800,d:'Qishda sirpanmaydi. Doimiy.',e:['up','winter']},{n:'Sport shinalar',p:1200,d:'Burilishda ushlash +12%. Doimiy.',e:['up','tyres']},{n:'Chip-tyuning',p:3500,d:'Tezlanish +10%. Doimiy.',e:['up','chip']}]},
 'BANK':{hi:'Xizmatingizga tayyormiz.',items:[{n:'Keshbek kartasi',p:500,d:'Har bir safardan +5% qoʻshimcha. Doimiy.',e:['up','card']}]},
 'SARTAROSHXONA':{hi:'Oʻtiring, usta boʻsh.',items:[{n:'Soch olish',p:15,d:'Koʻrkam haydovchi: daromad +5% (30 daqiqa).',e:['buff','style',1800]}]}
};
const BUFF_NAME={food:'Toʻq',focus:'Tetik',vit:'Vitamin',style:'Koʻrkam'};
let nearShop=null,curShop=null,shopT=0,saveT=0;
function renderShop(){const c=CAT[curShop.name]||CAT['OZIQ-OVQAT'];$('#shopKind').textContent='Doʻkon · '+where(P.x,P.z);$('#shopName').textContent=curShop.name;$('#shopHello').textContent='— '+c.hi;
  $('#shopItems').innerHTML=c.items.map((it,k)=>{const own=it.e[0]==='up'&&S.up[it.e[1]],can=S.money>=it.p;
    return `<div class="s-item"><div><div class="s-n">${it.n}</div><div class="s-d">${it.d}</div></div><button class="btn ${own?'ghost':can?'gold':''}" data-k="${k}" ${own||!can?'disabled':''}>${own?'Sizda bor':can?fmt(it.p):'Yetmaydi · '+fmt(it.p)}</button></div>`;}).join('');updMoney();}
function buy(k){const c=CAT[curShop.name]||CAT['OZIQ-OVQAT'],it=c.items[k];if(!it||S.money<it.p)return;const [ty,key,v]=it.e;if(ty==='up'&&S.up[key])return;
  S.money-=it.p;if(ty==='buff')S.buff[key]=Math.max(S.buff[key]||0,0)+v;else if(ty==='inv')S.inv[key]=(S.inv[key]||0)+v;else S.up[key]=1;
  persist();beep(880,.08);toast(it.n+' sotib olindi','good');renderShop();updBuffs();}
$('#shopItems').addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(b)buy(+b.dataset.k);});
function updBuffs(){const a=[];for(const k in BUFF_NAME)if(S.buff[k]>0){const s=Math.ceil(S.buff[k]);a.push(BUFF_NAME[k]+' '+Math.floor(s/60)+':'+String(s%60).padStart(2,'0'));}
  if(S.inv.nitro>0)a.push('Nitro ×'+S.inv.nitro);if(S.inv.flowers>0)a.push('Guldasta ×'+S.inv.flowers);if(S.inv.sweet>0)a.push('Shirinlik ×'+S.inv.sweet);
  $('#buffs').innerHTML=a.map(t=>'<span>'+t+'</span>').join('');const tn=$('#tNitro');if(tn)tn.style.display=S.inv.nitro>0?'':'none';}

/* ---- adaptive resolution ---- */
let baseDpr=1,dyn=1,fpsN=0,fpsT=0;

const V2={nT:0,dirty:true,tA:0,hT:0,
  // headlight lamp is made up front: adding a light later recompiles every material and freezes the game for a moment
  mkSpot(){spot=new THREE.SpotLight(C('#fff2d6'),0,70,.5,.6,1.2);scene.add(spot);scene.add(spot.target);},
  init(){applySeason();updBuffs();V2.chip();if(S.gfx!=='phone')V2.mkSpot();},
  chip(){const h=Math.floor(W.tod),mi=Math.floor((W.tod-h)*60),se=SEAS[W.season],tp=Math.round(lerp(se.temp[0],se.temp[1],W.night));
    $('#envChip').textContent=String(h).padStart(2,'0')+':'+String(mi).padStart(2,'0')+' · '+SEASON_NAME[W.season]+' · '+(tp>0?'+':tp<0?'−':'')+Math.abs(tp)+'°';},
  setDpr(G,k){const short=Math.max(1,Math.min(innerWidth,innerHeight)),dp=devicePixelRatio||1;
    if(k!=='phone'&&!spot)V2.mkSpot();baseDpr=k==='phone'&&matchMedia('(pointer:coarse)').matches?Math.min(dp,3,Math.max(1.5,1080/short)):Math.min(dp,G.dpr);dyn=1;renderer.setPixelRatio(baseDpr);V2.dirty=true;},
  fareMul(){let m=1+(S.buff.food>0?.1:0)+(S.buff.vit>0?.1:0)+(S.buff.style>0?.05:0)+(S.up.pro?.15:0)+(S.up.suit?.08:0)+(S.up.shoes?.05:0)+(S.up.card?.05:0);
    if(S.inv.flowers>0){S.inv.flowers--;m*=1.3;toast('Guldasta yoʻlovchiga yoqdi: +30%','gold');}else if(S.inv.sweet>0){S.inv.sweet--;m*=1.15;toast('Shirinlik uchun rahmat: +15%','gold');}updBuffs();return m;},
  limitMul(){return S.buff.focus>0||S.buff.vit>0?1.25:1;},
  slip(){return W.season==='winter'&&!S.up.winter;},
  gripMul(){return (V2.slip()?.66:1)*(S.up.tyres?1.12:1);},brakeMul(){return V2.slip()?.68:1;},
  accMul(){return (S.up.chip?1.1:1)*(V2.nT>0?1.9:1)*(V2.slip()?.85:1);},vmaxMul(){return V2.nT>0?1.12:1;},
  nitro(){if(mode!=='drive'||V2.nT>0)return;if(!(S.inv.nitro>0)){toast('Nitro yoʻq — avto ehtiyot qismlari doʻkonidan oling');return;}S.inv.nitro--;V2.nT=3.5;P.shake=.35;toast('Nitro!','gold');beep(1320,.12);persist();updBuffs();},
  // smoothed body pitch / roll (weight transfer)
  body(g,dt,yaw,vF){const a=(vF-(V2.pv||0))/Math.max(dt,.001);V2.pv=vF;const tp=clamp(-a*.0032,-.04,.05),tr=clamp(-yaw*vF*.0048,-.085,.085),k=Math.min(1,dt*6);
    V2.bp=(V2.bp||0)+(tp-(V2.bp||0))*k;V2.br=(V2.br||0)+(tr-(V2.br||0))*k;g.rotation.set(V2.bp,P.h,V2.br);},
  onCar(){if(P.mesh&&P.sp)addBeam(P.mesh,P.sp.L);},
  // traffic: decide at each junction whether to turn, slow down for the turn, then switch road
  plan(t,desired){let best=-1,bd=1e9;for(let j=0;j<9;j++){const da=(ROADS[j]-t.pos)*t.dir;if(da>16&&da<bd){bd=da;best=j;}}
    if(best>=0&&bd<48&&t.tj!==best){t.tj=best;t.tn=null;if(Math.random()<.32){const ax=t.axis==='z'?'x':'z',d2=Math.random()<.5?1:-1,ln=LANES(best),lw=RW(best)/2/ln,lane=ri(0,ln-1);t.tn={j:best,ax,d2,lat:lw*(lane+.5)*(ax==='z'?-d2:d2)};}}
    if(t.tn&&bd<26)desired=Math.min(desired,6.5);return desired;},
  turn(t){const tn=t.tn;if(!tn)return;if((t.pos-(ROADS[tn.j]+tn.lat))*t.dir<0)return;const cross=t.road+t.lat;
    t.road=ROADS[tn.j];t.lat=tn.lat;t.axis=tn.ax;t.dir=tn.d2;t.pos=clamp(cross,-EDGE+6,EDGE-6);t.h=tn.ax==='z'?(tn.d2>0?0:Math.PI):(tn.d2>0?Math.PI/2:-Math.PI/2);t.tn=null;t.tj=-1;},
  head(t,dt){if(t.hv===undefined)t.hv=t.h;let d=t.h-t.hv;d=Math.atan2(Math.sin(d),Math.cos(d));t.hv+=d*Math.min(1,dt*3.4);return t.hv;},
  // pedestrians: stop now and then, step away from a fast car
  pedV(p,dt){if(p.pz>0){p.pz-=dt;return 0;}if(Math.random()<dt*.03)p.pz=2+Math.random()*5;return p.v*(p.run?2.3:1);},
  pedDodge(p,x,z,dt){const dx=x-P.x,dz=z-P.z,d=Math.hypot(dx,dz),near=d<7&&Math.hypot(P.vx,P.vz)>3;p.run=near;p.dg=(p.dg||0)+((near?1.6:0)-(p.dg||0))*Math.min(1,dt*6);
    if(near)p.pz=0;if(p.dg>.02&&d>.01){x+=dx/d*p.dg;z+=dz/d*p.dg;}return [x,z];},
  nav(c,Wd,s){if(!S.up.nav)return;const tg=taxi.stage==='pickup'?taxi.pick:taxi.stage==='drop'?taxi.drop:null;if(!tg)return;let dx=(tg.x-P.x)*s,dz=(tg.z-P.z)*s;const d=Math.hypot(dx,dz),m2=Wd/2-12;if(d>m2){dx*=m2/d;dz*=m2/d;}
    c.save();c.strokeStyle=taxi.stage==='pickup'?'#f0b83e':'#1fc1c4';c.lineWidth=5;c.setLineDash([14,10]);c.beginPath();c.moveTo(Wd/2,Wd/2);c.lineTo(Wd/2+dx,Wd/2+dz);c.stroke();c.restore();},
  nextTime(){const o=['auto','morning','day','evening','night'];V2.setTime(o[(o.indexOf(S.todMode)+1)%o.length],true);},
  setTime(k,say){S.todMode=k;persist();V2.dirty=true;document.querySelectorAll('[data-tod]').forEach(b=>b.classList.toggle('on',b.dataset.tod===k));if(say)toast('Vaqt: '+TOD_NAME[k]);},
  nextSeason(){const o=['auto'].concat(SEASONS);V2.setSeason(o[(o.indexOf(S.seasonMode)+1)%o.length],true);},
  setSeason(k,say){S.seasonMode=k;persist();applySeason();if(say)toast('Fasl: '+SEASON_NAME[W.season]+(k==='auto'?' (avto)':''));if(say&&V2.slip())toast('Qishda yoʻl sirpanchiq — qishki shinalar oling','bad');V2.chip();},
  enterShop(){if(mode!=='drive'||!nearShop)return;curShop=nearShop;mode='shop';for(const k in keys)keys[k]=false;P.vx=P.vz=0;updateAudio(0,0,0,false);
    $('#hud').hidden=true;$('#touch').style.visibility='hidden';$('#shopUI').hidden=false;
    let nx=0,nz=0,bd=1e9;for(const r of ROADS){const ax=r-curShop.x,az=r-curShop.z;if(Math.abs(ax)<bd){bd=Math.abs(ax);nx=Math.sign(ax);nz=0;}if(Math.abs(az)<bd){bd=Math.abs(az);nz=Math.sign(az);nx=0;}}cam.position.set(curShop.x+nx*11,2.7,curShop.z+nz*11);cam.lookAt(curShop.x+nz*4.5,2.3,curShop.z-nx*4.5);renderShop();},
  closeShop(){$('#shopUI').hidden=true;curShop=null;startDrive();},
  forceShop(s){if(mode!=='drive')startDrive();nearShop=s;V2.enterShop();},
  tick(dt){vT+=dt;
    if(S.todMode==='auto')W.tod=(W.tod+dt/60)%24;else{let d=TODS[S.todMode]-W.tod;d=((d+36)%24)-12;if(Math.abs(d)>.01){W.tod=(W.tod+d*Math.min(1,dt*1.6)+24)%24;V2.dirty=true;}}
    V2.tA+=dt;if(V2.tA>.25||V2.dirty){V2.tA=0;V2.dirty=false;applyTime();}
    if(ENVM.wheel)ENVM.wheel.rotation.z+=dt*.07;
    updParticles(dt);
    if(mode!=='drive')return;
    if(V2.nT>0)V2.nT-=dt;
    let ch=false;for(const k in S.buff)if(S.buff[k]>0){S.buff[k]-=dt;if(S.buff[k]<=0){S.buff[k]=0;ch=true;toast(BUFF_NAME[k]+' taʼsiri tugadi');}}
    saveT+=dt;if(saveT>12){saveT=0;S.tod=W.tod;persist();}
    // headlight
    if(W.night>.05&&S.gfx!=='phone'){if(!spot)V2.mkSpot();
      const fx=Math.sin(P.h),fz=Math.cos(P.h),L=P.sp.L/2;spot.position.set(P.x+fx*L,1,P.z+fz*L);spot.target.position.set(P.x+fx*(L+18),0,P.z+fz*(L+18));spot.intensity=W.night*2.4;}else if(spot)spot.intensity=0;
    // shop prompt
    shopT+=dt;if(shopT>.2){shopT=0;let b=null,bd=15;if(Math.hypot(P.vx,P.vz)<2.5)for(const s of SHOPPTS){const d=Math.abs(s.x-P.x)+Math.abs(s.z-P.z);if(d<bd){bd=d;b=s;}}
      if(b!==nearShop){nearShop=b;const pr=$('#prompt');pr.hidden=!b;if(b)pr.innerHTML=(matchMedia('(pointer:coarse)').matches?'':'<kbd>E</kbd> ')+'«'+b.name+'» doʻkoniga kirish';}}
    // hud chip
    V2.hT+=dt;if(V2.hT>.5||ch){V2.hT=0;V2.chip();updBuffs();}
    // keep the frame rate up: lower the render resolution when the device struggles, raise it back when it copes
    fpsN++;fpsT+=dt;if(fpsT>2){const fps=fpsN/fpsT;fpsN=0;fpsT=0;let nd=dyn;if(fps<27)nd=Math.max(.55,dyn-.12);else if(fps>52&&dyn<1)nd=Math.min(1,dyn+.06);
      if(nd!==dyn){dyn=nd;renderer.setPixelRatio(baseDpr*dyn);}}
  }};
$('#shopClose').addEventListener('click',()=>V2.closeShop());
$('#prompt').addEventListener('click',()=>V2.enterShop());
$('#bTime').addEventListener('click',()=>V2.nextTime());$('#bSeason').addEventListener('click',()=>V2.nextSeason());
{const tn=$('#tNitro');if(tn)tn.addEventListener('pointerdown',e=>{e.preventDefault();V2.nitro();});}
document.querySelectorAll('[data-tod]').forEach(b=>b.addEventListener('click',()=>V2.setTime(b.dataset.tod,true)));
document.querySelectorAll('[data-season]').forEach(b=>b.addEventListener('click',()=>V2.setSeason(b.dataset.season,true)));
{const sp=$('#splash');if(sp){const off=()=>{sp.classList.add('out');setTimeout(()=>sp.remove(),600);};setTimeout(off,2600);sp.addEventListener('pointerdown',off);}}
// iOS Safari ignores user-scalable=no: block pinch and double-tap zoom by hand
['gesturestart','gesturechange','gestureend'].forEach(t=>document.addEventListener(t,e=>e.preventDefault(),{passive:false}));
document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});
{let lastT=0;document.addEventListener('touchend',e=>{const now=e.timeStamp;if(now-lastT<350&&!e.target.closest('button,a,input,select,textarea,[data-k],[data-id]'))e.preventDefault();lastT=now;},{passive:false});}
document.addEventListener('touchmove',e=>{if(e.touches.length>1)e.preventDefault();},{passive:false});
