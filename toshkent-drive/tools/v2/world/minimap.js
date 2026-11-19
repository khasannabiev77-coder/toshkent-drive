// minimap: GPS route, police, mission markers; click to zoom, optional heading-up rotation
const MZ=[170,260,420];let mzi=1;
mini.addEventListener('click',()=>{mzi=(mzi+1)%MZ.length;drawMini();});
mini.style.pointerEvents='auto';mini.style.cursor='zoom-in';mini.title='Bosing — masshtab';
function drawMini(){const W=mini.width,R=MZ[mzi],s=W/(2*R),X=px(),Z=pz(),H=ph(),c=mctx;c.save();c.clearRect(0,0,W,W);c.beginPath();c.arc(W/2,W/2,W/2,0,7);c.clip();
  c.fillStyle='#1b2a22';c.fillRect(0,0,W,W);
  c.translate(W/2,W/2);const rot=S.miniRot?-(Math.PI-H):0;c.rotate(rot);
  const E=R*1.45;c.drawImage(mapBase,X+1200-E,Z+1200-E,E*2,E*2,-E*s,-E*s,E*2*s,E*2*s);
  // GPS route
  if(GPS.route.length>1){c.strokeStyle='#b46cff';c.lineWidth=7;c.lineJoin='round';c.lineCap='round';c.beginPath();GPS.route.forEach((p,i)=>{const x=(p.x-X)*s,y=(p.z-Z)*s;i?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();}
  const lim=W/2-12;
  const mark=(x,z,col,r,txt)=>{let dx=(x-X)*s,dz=(z-Z)*s;const d=Math.hypot(dx,dz);if(d>lim){dx*=lim/d;dz*=lim/d;}c.fillStyle=col;c.strokeStyle='#071015';c.lineWidth=3;c.beginPath();c.arc(dx,dz,r||9,0,7);c.fill();c.stroke();
    if(txt){c.save();c.translate(dx,dz);c.rotate(-rot);c.fillStyle='#071015';c.font='bold 12px Manrope, Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(txt,0,1);c.restore();}};
  const dot=(x,z,col,r)=>{const dx=(x-X)*s,dz=(z-Z)*s;if(dx*dx+dz*dz<lim*lim){c.fillStyle=col;c.beginPath();c.arc(dx,dz,r,0,7);c.fill();}};
  for(const q of CASH){const dx=(q.x-X)*s,dz=(q.z-Z)*s;if(Math.abs(dx)<W/2&&Math.abs(dz)<W/2){c.fillStyle='#4fd18b';c.fillRect(dx-3,dz-3,6,6);}}
  for(const q of ANOR)if(!S.collect[q.k]&&q.seen)dot(q.x,q.z,'#ffd24a',5);
  for(const a of AGENTS)if(a.on&&a.mesh.visible){const pol=a.kind==='police'||a.kind==='block'||a.kind==='chaser';dot(a.x,a.z,pol?(Math.floor(performance.now()/250)%2?'#ff5b4d':'#4f8cff'):a.kind==='rival'?'#ff9f43':a.kind==='flee'?'#ff5b4d':'#e6e6e6',pol?7:6);}
  for(const h of HELIS)if(h.on)dot(h.x,h.z,'#ff5b4d',8);
  if(WANT.lvl&&WANT.lost>1.5){c.strokeStyle='rgba(255,91,77,.7)';c.lineWidth=3;c.beginPath();c.arc((WANT.lastX-X)*s,(WANT.lastZ-Z)*s,(60+WANT.lvl*20)*s,0,7);c.stroke();}
  const sm2=storyMarker();if(sm2&&!MS.cur)mark(sm2.x,sm2.z,'#f0b83e',11,'S');
  if(EVT.cur&&EVT.cur.pt&&!MS.cur)mark(EVT.cur.pt.x,EVT.cur.pt.z,'#4fd18b',10,'?');
  for(const k of MS.marks||[])mark(k.x,k.z,k.col||'#f0b83e',10,k.txt);
  if(taxi.stage==='pickup')mark(taxi.pick.x,taxi.pick.z,'#f0b83e');if(taxi.stage==='drop')mark(taxi.drop.x,taxi.drop.z,'#1fc1c4');
  if(GPS.wp)mark(GPS.wp.x,GPS.wp.z,'#b46cff',9);
  if(mode==='foot'&&!P.stolen)mark(P.x,P.z,'#1fc1c4',6);
  c.rotate(-rot);c.rotate(S.miniRot?0:Math.PI-H);c.fillStyle='#ffffff';c.strokeStyle='#071015';c.lineWidth=3;c.beginPath();c.moveTo(0,-14);c.lineTo(10,12);c.lineTo(0,6);c.lineTo(-10,12);c.closePath();c.stroke();c.fill();
  c.restore();}