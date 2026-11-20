// v1 save + open-world fields; every field is validated so an old or damaged save cannot break the game
const HERO_DEF={skin:1,hair:0,hairC:0,top:0,topC:1,legsC:0,shoeC:0,glasses:false};
function freshSave(){return {money:25000,owned:[{id:'chevrolet-damas',color:0,plate:randomPlate()}],cur:0,trips:0,earned:0,sound:true,unlimited:false,
  hero:Object.assign({},HERO_DEF),story:0,done:{},best:{},photos:{},collect:{},disc:'',lmd:{},msgs:[],tod:9.5,weather:'clear',inv:{},up:{},buff:{},todMode:'auto',seasonMode:'auto',pos:null,onFoot:false,hp:100,
  sub:{on:true,size:1,bg:.6,cyr:false},played:0};}
let S=freshSave();
// a saved game is sanitised field by field so that an old or damaged save can never break the game
function sanitize(d){const s=freshSave();if(!d||typeof d!=='object')return s;
  if(Array.isArray(d.owned)){const o=d.owned.filter(x=>x&&CAR[x.id]).map(x=>({id:x.id,color:clamp(x.color|0,0,COLORS.length-1),plate:x.plate&&typeof x.plate.reg==='string'&&typeof x.plate.txt==='string'?{reg:x.plate.reg.slice(0,3),txt:x.plate.txt.slice(0,12)}:randomPlate()}));if(o.length)s.owned=o;}
  s.cur=clamp(d.cur|0,0,s.owned.length-1);
  if(d.igBonus===true)s.igBonus=true;
  for(const k of ['money','trips','earned','story','tod','hp','played'])if(typeof d[k]==='number'&&isFinite(d[k]))s[k]=d[k];
  if(!(s.money<1e9))s.money=25000; // saves from the old "unlimited" build stored 1e12
  for(const k of ['sound','unlimited','onFoot'])if(typeof d[k]==='boolean')s[k]=d[k];
  for(const k of ['done','best','photos','collect','lmd','inv','up','buff'])if(d[k]&&typeof d[k]==='object'&&!Array.isArray(d[k]))s[k]=d[k];
  if(typeof d.disc==='string')s.disc=d.disc;if(typeof d.weather==='string')s.weather=d.weather;if(typeof d.gfx==='string')s.gfx=d.gfx;if(typeof d.todMode==='string')s.todMode=d.todMode;if(typeof d.seasonMode==='string')s.seasonMode=d.seasonMode;
  if(Array.isArray(d.msgs))s.msgs=d.msgs.filter(m=>m&&typeof m.f==='string'&&typeof m.t==='string').slice(-40).map(m=>({f:m.f.slice(0,40),t:m.t.slice(0,400),h:+m.h||0,r:!!m.r,a:typeof m.a==='string'?m.a.slice(0,20):''}));
  if(typeof d.miniRot==='boolean')s.miniRot=d.miniRot;
  if(d.hero&&typeof d.hero==='object')for(const k in HERO_DEF){if(typeof d.hero[k]===typeof HERO_DEF[k])s.hero[k]=d.hero[k];}
  if(d.sub&&typeof d.sub==='object')for(const k in s.sub){if(typeof d.sub[k]===typeof s.sub[k])s.sub[k]=d.sub[k];}
  if(d.pos&&isFinite(d.pos.x)&&isFinite(d.pos.z))s.pos={x:clamp(+d.pos.x,-725,725),z:clamp(+d.pos.z,-725,725),h:+d.pos.h||0};
  if(d.hpos&&isFinite(d.hpos.x)&&isFinite(d.hpos.z))s.hpos={x:clamp(+d.hpos.x,-755,755),z:clamp(+d.hpos.z,-755,755),h:+d.hpos.h||0};
  s.tod=((s.tod%24)+24)%24;s.hp=clamp(s.hp,1,100);s.story=clamp(s.story|0,0,99);
  return s;}
try{const raw=localStorage.getItem(KEY);if(raw)S=sanitize(JSON.parse(raw));}catch(e){S=freshSave();}
const canPay=v=>S.unlimited||S.money>=v;
function pay(v){if(S.unlimited)return true;if(S.money<v)return false;S.money-=v;return true;}
function earn(v){S.money+=v;S.earned+=v;}
let persistHook=null,NO_SAVE=false;
function persist(){if(NO_SAVE)return;try{if(persistHook)persistHook();localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
