// Builds phone ("lite") copies of the car models: same look, ~25k triangles, meshopt-compressed.
import fs from 'fs';import path from 'path';import zlib from 'zlib';
import {WebIO} from '@gltf-transform/core';import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {weld,simplify,meshopt,dedup,prune,flatten,join,dequantize,compactPrimitive} from '@gltf-transform/functions';
import vm from 'vm';import sharp from 'sharp';import {textureCompress} from '@gltf-transform/functions';
import {MeshoptSimplifier,MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
const [SRC,DST,TARGET='25000',ONLY,PAGE]=process.argv.slice(2);const ERR=+(process.env.ERR||0.01),NW=+(process.env.NW||1),UW=+(process.env.UW||1);
// the REAL table from the game page tells which models keep separate wheel nodes and which parts the game hides
const html=fs.readFileSync(PAGE,'utf8');const i0=html.indexOf('const REAL={');const i1=html.indexOf(String.fromCharCode(10)+'};',i0);
const REAL=vm.runInNewContext('('+html.slice(i0+11,i1+2)+')');const BYKEY={};for(const id in REAL)if(REAL[id].key)BYKEY[REAL[id].key]=REAL[id];
await MeshoptSimplifier.ready;await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new WebIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
fs.mkdirSync(DST,{recursive:true});
const keys=fs.readdirSync(SRC).filter(f=>f.endsWith('.part0.txt')).map(f=>f.replace('.part0.txt','')).filter(k=>!ONLY||k===ONLY);
const out={};let a=0,b=0;
for(const k of keys){let s='';for(let i=0;;i++){const f=path.join(SRC,k+'.part'+i+'.txt');if(!fs.existsSync(f))break;s+=fs.readFileSync(f,'utf8');}
  const glb=zlib.gunzipSync(Buffer.from(s,'base64'));const doc=await io.readBinary(new Uint8Array(glb));
  let tris=0;for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives()){const ix=p.getIndices();tris+=(ix?ix.getCount():p.getAttribute('POSITION').getCount())/3;}
  const ratio=Math.min(1,(+TARGET)/tris);const R=BYKEY[k]||{};
  if(R.hide){for(const n of doc.getRoot().listNodes()){const m=n.getMesh();if(!m)continue;const par=n.getParentNode();
      if(R.hide.test(n.getName()||'')||R.hide.test(m.getName()||'')||(par&&R.hide.test(par.getName()||''))){n.setMesh(null);continue;}
      for(const p of m.listPrimitives()){const mt=p.getMaterial();if(mt&&R.hide.test(mt.getName()||''))m.removePrimitive(p);}}}
  const NOJOIN=['bmw-5-series'];// joining changes which parts the game keeps for these
  const pre=(R.wheels||NOJOIN.includes(k))?[]:[flatten(),join({keepNamed:false})];
  const smartSimplify=()=>doc=>{if(ratio>=1)return;MeshoptSimplifier.useExperimentalFeatures=true;
    for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives()){const ix=p.getIndices(),pa=p.getAttribute('POSITION'),na=p.getAttribute('NORMAL');
      if(!ix||p.getMode()!==4||ix.getCount()<(+(process.env.MINI||9000))||(p.getMaterial()&&p.getMaterial().getAlphaMode()==="BLEND"))continue;
      const I=new Uint32Array(ix.getArray()),P=new Float32Array(pa.getArray());const target=Math.max(300,Math.floor(I.length*ratio/3)*3);
      const ua=p.getAttribute('TEXCOORD_0'),nv=pa.getCount(),N=na&&na.getArray(),U=ua&&ua.getArray(),st=(N?3:0)+(U?2:0);
      let out;if(!st)[out]=MeshoptSimplifier.simplify(I,P,3,target,ERR,[]);
      else{const A=new Float32Array(nv*st),W=[];if(N)W.push(NW,NW,NW);if(U)W.push(UW,UW);
        for(let v=0;v<nv;v++){let o=v*st;if(N){A[o++]=N[v*3];A[o++]=N[v*3+1];A[o++]=N[v*3+2];}if(U){A[o++]=U[v*2];A[o++]=U[v*2+1];}}
        [out]=MeshoptSimplifier.simplifyWithAttributes(I,P,3,A,st,W,null,target,ERR,[]);}
      if(out.length>=I.length)continue;ix.setArray(pa.getCount()>65535?out:new Uint16Array(out));compactPrimitive(p);}};
  await doc.transform(dequantize(),dedup(),...pre,weld(),smartSimplify(),prune(),textureCompress({encoder:sharp,resize:[+(process.env.TEX||384),+(process.env.TEX||384)],quality:80}),meshopt({encoder:MeshoptEncoder,level:'medium'}));
  let t2=0;for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives()){const ix=p.getIndices();t2+=(ix?ix.getCount():p.getAttribute('POSITION').getCount())/3;}
  const bin=Buffer.from(await io.writeBinary(doc));const txt=zlib.gzipSync(bin,{level:9}).toString('base64');
  fs.writeFileSync(path.join(DST,k+'.part0.txt'),txt);a+=s.length;b+=txt.length;out[k]={n:1,mb:+(txt.length*.75/1048576).toFixed(1)};
  console.log(k,Math.round(tris),'->',Math.round(t2),(s.length/1048576).toFixed(2)+'MB ->',(txt.length/1048576).toFixed(2)+'MB');}
fs.writeFileSync(path.join(DST,'_index.json'),JSON.stringify(out));
console.log('TOTAL',(a/1048576).toFixed(1),'MB ->',(b/1048576).toFixed(1),'MB');
