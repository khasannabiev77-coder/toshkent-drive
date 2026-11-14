// ---- more of today's Tashkent ----
// Hotel Uzbekistan, facing Amir Temur square from the east
{const b=blockOf('hotel'),x=b.cx,z=b.cz;m(box(34,5,92),M2.granite,x-20,2.8,z);m(box(16,58,82),mat('#cdbf9f'),x-20,34.3,z);
  for(let k=0;k<18;k++)m(box(17.4,58,.7),M2.white,x-20,34.3,z-39.5+k*4.65);for(let k=0;k<15;k++)m(box(17,.5,82.6),M2.white,x-20,8+k*3.7,z);
  m(box(18,3,84),M2.white,x-20,64.8,z);for(let t=0;t<16;t++)TREES.push([x+rr(10,60),z+rr(-60,60)]);
  LM.hotel={x,z,name:'Oʻzbekiston mehmonxonasi'};}
// Alisher Navoi opera and ballet theatre with its fountain
{const b=blockOf('navoi'),x=b.cx,z=b.cz;m(box(104,.3,112),M2.paving,x,.3,z);m(box(62,18,44),M2.sand,x,9.3,z-16);m(box(66,2,48),M2.stone,x,19.3,z-16);m(box(40,8,30),M2.sand,x,24.3,z-20);m(box(44,1.4,34),M2.stone,x,29,z-20);
  for(let k=0;k<3;k++)m(box(9,13,1.2),M2.blue,x-13+k*13,7.5,z+6.4);for(let k=0;k<4;k++)m(cyl(1.1,1.1,16,12),M2.stone,x-19.5+k*13,8.3,z+7.6);
  m(cyl(13,13,.9,40),M2.stone,x,.75,z+34);m(cyl(12,12,.5,40),M2.water,x,1.1,z+34);for(let k=0;k<7;k++){const a=k/7*6.283;jet(x+Math.cos(a)*7,1.3,z+34+Math.sin(a)*7,3);}jet(x,1.3,z+34,6.5);
  for(let k=0;k<9;k++){TREES.push([x-48,z-50+k*12]);TREES.push([x+48,z-50+k*12]);}
  LM.navoi={x,z,name:'Navoiy teatri'};}
// Minor mosque (white marble, turquoise dome)
{const b=blockOf('minor'),x=b.cx,z=b.cz;m(box(104,.3,92),M2.paving,x,.3,z);m(box(54,15,34),M2.white,x,7.8,z-8);m(cyl(11,11,5,32),M2.white,x,17.8,z-8);const d=m(dome(11),M2.tile,x,20.3,z-8);d.scale.y=1.2;m(cyl(.4,.15,4,8),M2.gold,x,35,z-8);
  m(box(18,22,4),M2.white,x,11.3,z+10);m(box(10,15,.6),M2.tile,x,8.5,z+12.2);
  [-1,1].forEach(s=>{m(cyl(2,2.4,40,16),M2.white,x+s*13,20.3,z+10);m(cyl(2.8,2.8,3,16),M2.tile,x+s*13,41.5,z+10);m(dome(2.4),M2.tile,x+s*13,43,z+10);});
  for(let k=0;k<8;k++){TREES.push([x-46+k*13,z+38]);}
  LM.minor={x,z,name:'Minor masjidi'};}
// Humo Arena
{const b=blockOf('humo'),x=b.cx,z=b.cz;m(box(124,.3,112),M2.paving,x,.3,z);m(cyl(44,46,12,56),M2.dglass,x,6.3,z);const d=m(new THREE.SphereGeometry(46,48,20,0,6.283,0,Math.PI/2),M2.steel,x,12,z);d.scale.y=.42;m(cyl(47,47,1.2,56),M2.white,x,12.3,z);
  LM.humo={x,z,name:'Humo Arena'};}
// Magic City park
{const b=blockOf('magic'),x=b.cx,z=b.cz,cols=['#e86a8a','#5aa9e6','#f2c14e','#7bc47f'];m(box(124,.3,124),M2.paving,x,.3,z);
  m(box(34,16,22),mat('#f3e9d8'),x-20,8.3,z-25);m(new THREE.ConeGeometry(7,14,16),mat('#5aa9e6'),x-20,23.3,z-25);
  [[-37,-36],[-3,-36],[-37,-14],[-3,-14]].forEach(([dx,dz],k)=>{m(cyl(4,4,24,16),mat('#f6efe2'),x+dx,12.3,z+dz);m(new THREE.ConeGeometry(5.2,11,16),mat(cols[k]),x+dx,29.8,z+dz);});
  const wh=new THREE.Group();wh.position.set(x+26,31,z+18);scene.add(wh);m(new THREE.TorusGeometry(26,.7,8,48),M2.white,0,0,0,wh);m(new THREE.TorusGeometry(21,.4,8,48),M2.white,0,0,0,wh);m(cyl(2,2,3,16).rotateX(Math.PI/2),M2.steel,0,0,0,wh);
  for(let k=0;k<6;k++){const s2=m(box(.35,52,.35),M2.steel,0,0,0,wh);s2.rotation.z=k/6*Math.PI;}
  for(let k=0;k<12;k++){const a=k/12*6.283;m(box(3,3.4,3),mat(cols[k%4]),Math.cos(a)*26,Math.sin(a)*26,0,wh);}
  [-1,1].forEach(s=>{const l=m(box(1.2,36,1.2),M2.steel,x+26+s*8,15.5,z+18);l.rotation.z=s*.24;});ENVM.wheel=wh;
  for(let t=0;t<22;t++)TREES.push([x+rr(-55,55),z+rr(36,58)]);
  LM.magic={x,z,name:'Magic City'};}
