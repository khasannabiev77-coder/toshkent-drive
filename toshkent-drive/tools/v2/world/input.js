$('#play').addEventListener('click',()=>{goLandscape();startGame();});
$('#playShop').addEventListener('click',()=>{goLandscape();initAudio();openStage('shop');});
$('#bShop').addEventListener('click',()=>openStage('shop'));
$('#bGarage').addEventListener('click',()=>openStage('garage'));
$('#bTaxi').addEventListener('click',()=>{if(mode==='drive')toggleTaxi();else toast('Taksi uchun mashinaga oʻtiring');});
$('#bCam').addEventListener('click',()=>{if(mode==='drive')camMode=(camMode+1)%3;else cycleFootCam();});
$('#bPhone').addEventListener('click',()=>openPhone());
$('#bMap').addEventListener('click',()=>openMap());
document.querySelectorAll('.hbtn').forEach(b=>b.addEventListener('click',()=>{b.blur();if(mode==='drive'||mode==='foot')canvas.focus();}));
const sndBtn=$('#bSound');const syncSnd=()=>sndBtn.classList.toggle('active',S.sound);syncSnd();
sndBtn.addEventListener('click',()=>{S.sound=!S.sound;persist();syncSnd();});
$('#credits').textContent='Barcha '+Object.keys(REAL).length+' ta mashina — Sketchfab mualliflarining 3D modellari (Creative Commons). Har bir model muallifi avtosalonda va README faylida koʻrsatilgan.';
const KM={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'hb'};
addEventListener('keydown',e=>{
  if(e.target&&/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)){if(e.code==='Enter'&&e.target.id==='promoIn')redeemPromo(e.target.value);if(e.code==='Escape')e.target.blur();return;}
  if(mode==='stage'){if(e.code==='Escape')closeStage();return;}
  if(mode==='shop'){if((e.code==='Escape'||e.code==='KeyE')&&!e.repeat)V2.closeShop();return;}
  if(mode==='menu')return;
  if(mapOpen){if(e.code==='Escape'||e.code==='KeyM'){closeMap();e.preventDefault();}return;}
  if(phoneOpen){if(e.code==='Escape'||e.code==='KeyP'){closePhone();e.preventDefault();}return;}
  if(KM[e.code]){keys[KM[e.code]]=true;e.preventDefault();}
  if(e.code==='ShiftLeft'||e.code==='ShiftRight'){if(mode==='foot')keys.sprint=true;else if(!e.repeat)V2.nitro();}
  if(e.repeat)return;
  switch(e.code){
    case 'Escape':case 'KeyP':openPhone();break;
    case 'KeyM':openMap();break;
    case 'KeyF':toggleVehicle();break;
    case 'KeyE':case 'Enter':interact();break;
    case 'KeyQ':punch();break;
    case 'KeyK':takePhoto();break;
    case 'KeyC':if(mode==='drive')camMode=(camMode+1)%3;else cycleFootCam();break;
    case 'KeyT':if(mode==='drive')toggleTaxi();break;
    case 'KeyH':horn();break;
    case 'KeyR':if(mode==='drive'){resetToRoad();toast('Mashina yoʻlga qaytarildi');}break;
    case 'KeyG':openStage('garage');break;
    case 'KeyB':openStage('shop');break;
    case 'KeyN':V2.nextTime();break;
    case 'Space':if(mode==='foot')HERO.jumpReq=true;break;
  }});
addEventListener('keyup',e=>{if(KM[e.code])keys[KM[e.code]]=false;if(e.code==='ShiftLeft'||e.code==='ShiftRight')keys.sprint=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
document.querySelectorAll('.tb').forEach(b=>{const k=b.dataset.k,a=b.dataset.a;
  const on=e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId);}catch(_){}b.classList.add('on');if(k)keys[k]=true;if(a)touchAction(a);},off=e=>{if(k)keys[k]=false;b.classList.remove('on');};
  b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('pointerleave',off);});
// safety net: when the last finger leaves the screen every held touch button is released
document.addEventListener('touchend',e=>{if(e.touches.length)return;document.querySelectorAll('.tb.on').forEach(b=>{b.classList.remove('on');if(b.dataset.k)keys[b.dataset.k]=false;});},{passive:true});
