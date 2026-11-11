using System;
using System.IO;
using System.IO.Compression;
using System.Collections;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Web.Script.Serialization;
using System.Text;

public class GltfSlim {
  Dictionary<string,object> g; List<byte[]> buffers=new List<byte[]>(); IList bvs, accs; string baseDir;
  MemoryStream outBin=new MemoryStream(); ArrayList newViews=new ArrayList(), newAccs=new ArrayList();
  public StringBuilder log=new StringBuilder();

  static JavaScriptSerializer JS(){var j=new JavaScriptSerializer();j.MaxJsonLength=int.MaxValue;j.RecursionLimit=10000;return j;}
  static int I(object o){return Convert.ToInt32(o);}
  static Dictionary<string,object> M(object o){return (Dictionary<string,object>)o;}
  static IList L(object o){return (IList)o;}
  static int NC(string t){switch(t){case "SCALAR":return 1;case "VEC2":return 2;case "VEC3":return 3;case "VEC4":return 4;case "MAT2":return 4;case "MAT3":return 9;case "MAT4":return 16;}return 1;}
  static int CS(int ct){switch(ct){case 5120:case 5121:return 1;case 5122:case 5123:return 2;default:return 4;}}

  public static string Run(string inPath,string outPrefix,int maxTex){var s=new GltfSlim();return s.Go(inPath,outPrefix,maxTex);}

  string Go(string inPath,string outPrefix,int maxTex){
    baseDir=Path.GetDirectoryName(inPath);
    byte[] all=File.ReadAllBytes(inPath); byte[] bin=null;
    if(BitConverter.ToUInt32(all,0)==0x46546C67){int jl=BitConverter.ToInt32(all,12);g=M(JS().DeserializeObject(Encoding.UTF8.GetString(all,20,jl)));int bo=20+jl;if(bo+8<=all.Length){int bl=BitConverter.ToInt32(all,bo);bin=new byte[bl];Buffer.BlockCopy(all,bo+8,bin,0,bl);}}
    else g=M(JS().DeserializeObject(Encoding.UTF8.GetString(all)));
    all=null;
    foreach(var b in L(g["buffers"])){var bd=M(b);if(bd.ContainsKey("uri")){string u=(string)bd["uri"];if(u.StartsWith("data:"))buffers.Add(Convert.FromBase64String(u.Substring(u.IndexOf(',')+1)));else buffers.Add(File.ReadAllBytes(Path.Combine(baseDir,Uri.UnescapeDataString(u))));}else buffers.Add(bin);}
    bvs=L(g["bufferViews"]);accs=L(g["accessors"]);
    var posMap=new Dictionary<int,int>();var nrmMap=new Dictionary<int,int>();var uvMap=new Dictionary<int,int>();var idxMap=new Dictionary<int,int>();
    long tris=0,verts=0;
    foreach(var mo in L(g["meshes"])){var mesh=M(mo);mesh.Remove("weights");
      foreach(var po in L(mesh["primitives"])){var prim=M(po);prim.Remove("targets");prim.Remove("extensions");var at=M(prim["attributes"]);var na=new Dictionary<string,object>();
        if(at.ContainsKey("POSITION")){int a=I(at["POSITION"]);int n;if(!posMap.TryGetValue(a,out n)){n=WritePos(a);posMap[a]=n;}na["POSITION"]=n;verts+=I(M(accs[a])["count"]);}
        if(at.ContainsKey("NORMAL")){int a=I(at["NORMAL"]);int n;if(!nrmMap.TryGetValue(a,out n)){n=WriteNrm(a);nrmMap[a]=n;}na["NORMAL"]=n;}
        if(at.ContainsKey("TEXCOORD_0")){int a=I(at["TEXCOORD_0"]);int n;if(!uvMap.TryGetValue(a,out n)){n=WriteUV(a);uvMap[a]=n;}na["TEXCOORD_0"]=n;}
        prim["attributes"]=na;
        if(prim.ContainsKey("indices")){int a=I(prim["indices"]);int n;if(!idxMap.TryGetValue(a,out n)){n=WriteIdx(a);idxMap[a]=n;}prim["indices"]=n;tris+=I(M(accs[a])["count"])/3;}
      }}
    // images
    int imgIn=0,imgOut=0;
    if(g.ContainsKey("images")){foreach(var io in L(g["images"])){var im=M(io);byte[] data=null;
      try{if(im.ContainsKey("bufferView"))data=ViewBytes(I(im["bufferView"]));else if(im.ContainsKey("uri")){string u=(string)im["uri"];data=u.StartsWith("data:")?Convert.FromBase64String(u.Substring(u.IndexOf(',')+1)):File.ReadAllBytes(Path.Combine(baseDir,Uri.UnescapeDataString(u)));}}catch(Exception e){log.AppendLine("img read fail "+e.Message);}
      string mime;byte[] o2=Shrink(data,maxTex,out mime);imgIn+=data==null?0:data.Length;imgOut+=o2.Length;
      im.Remove("uri");im["bufferView"]=AddView(o2,0,0);im["mimeType"]=mime;}}
    if(g.ContainsKey("textures")){foreach(var to in L(g["textures"])){var t=M(to);if(t.ContainsKey("extensions")){var ex=M(t["extensions"]);foreach(var k in new List<string>(ex.Keys)){var e=M(ex[k]);if(!t.ContainsKey("source")&&e.ContainsKey("source"))t["source"]=e["source"];}t.Remove("extensions");}}}
    g.Remove("animations");g.Remove("skins");
    foreach(var no in L(g["nodes"])){var nd=M(no);nd.Remove("skin");nd.Remove("weights");}
    var used=new ArrayList();if(g.ContainsKey("extensionsUsed"))foreach(var e in L(g["extensionsUsed"])){string s=(string)e;if(s!="KHR_texture_basisu"&&s!="EXT_texture_webp"&&s!="KHR_draco_mesh_compression"&&s!="EXT_meshopt_compression")used.Add(s);}
    used.Add("KHR_mesh_quantization");g["extensionsUsed"]=used;g["extensionsRequired"]=new ArrayList{"KHR_mesh_quantization"};
    while(outBin.Length%4!=0)outBin.WriteByte(0);
    g["buffers"]=new ArrayList{new Dictionary<string,object>{{"byteLength",(int)outBin.Length}}};
    g["bufferViews"]=newViews;g["accessors"]=newAccs;
    // GLB
    byte[] js=Encoding.UTF8.GetBytes(JS().Serialize(g));int jp=(4-js.Length%4)%4;byte[] binb=outBin.ToArray();
    var glb=new MemoryStream();var w=new BinaryWriter(glb);
    w.Write(0x46546C67u);w.Write(2u);w.Write((uint)(12+8+js.Length+jp+8+binb.Length));
    w.Write((uint)(js.Length+jp));w.Write(0x4E4F534Au);w.Write(js);for(int i=0;i<jp;i++)w.Write((byte)0x20);
    w.Write((uint)binb.Length);w.Write(0x004E4942u);w.Write(binb);w.Flush();
    byte[] glbBytes=glb.ToArray();
    var gz=new MemoryStream();using(var z=new GZipStream(gz,CompressionLevel.Optimal,true)){z.Write(glbBytes,0,glbBytes.Length);}
    string b64=Convert.ToBase64String(gz.ToArray());
    int chunk=12000000,parts=0;
    for(int p=0;p<b64.Length;p+=chunk){File.WriteAllText(outPrefix+".part"+parts+".txt",b64.Substring(p,Math.Min(chunk,b64.Length-p)));parts++;}
    return string.Format("tris {0:N0} verts {1:N0} | glb {2:N1}MB gz {3:N1}MB b64 {4:N1}MB parts {5} | img {6:N1}->{7:N1}MB | {8}",tris,verts,glbBytes.Length/1048576.0,gz.Length/1048576.0,b64.Length/1048576.0,parts,imgIn/1048576.0,imgOut/1048576.0,log.ToString().Trim());
  }

  byte[] ViewBytes(int vi){var v=M(bvs[vi]);var buf=buffers[I(v["buffer"])];int off=v.ContainsKey("byteOffset")?I(v["byteOffset"]):0;int len=I(v["byteLength"]);var r=new byte[len];Buffer.BlockCopy(buf,off,r,0,len);return r;}
  int AddView(byte[] data,int stride,int target){while(outBin.Length%4!=0)outBin.WriteByte(0);var v=new Dictionary<string,object>{{"buffer",0},{"byteOffset",(int)outBin.Length},{"byteLength",data.Length}};if(stride>0)v["byteStride"]=stride;if(target>0)v["target"]=target;outBin.Write(data,0,data.Length);newViews.Add(v);return newViews.Count-1;}
  float[] ReadF(int ai,out int cnt,out int nc){var a=M(accs[ai]);cnt=I(a["count"]);nc=NC((string)a["type"]);int ct=I(a["componentType"]);bool norm=a.ContainsKey("normalized")&&(bool)a["normalized"];var res=new float[cnt*nc];if(!a.ContainsKey("bufferView"))return res;
    var v=M(bvs[I(a["bufferView"])]);var buf=buffers[I(v["buffer"])];int off=(v.ContainsKey("byteOffset")?I(v["byteOffset"]):0)+(a.ContainsKey("byteOffset")?I(a["byteOffset"]):0);int cs=CS(ct);int stride=v.ContainsKey("byteStride")?I(v["byteStride"]):cs*nc;
    for(int i=0;i<cnt;i++)for(int c=0;c<nc;c++){int p=off+i*stride+c*cs;float x;switch(ct){case 5126:x=BitConverter.ToSingle(buf,p);break;case 5125:x=BitConverter.ToUInt32(buf,p);break;case 5123:x=BitConverter.ToUInt16(buf,p);if(norm)x/=65535f;break;case 5122:x=BitConverter.ToInt16(buf,p);if(norm)x=Math.Max(x/32767f,-1f);break;case 5121:x=buf[p];if(norm)x/=255f;break;default:x=(sbyte)buf[p];if(norm)x=Math.Max(x/127f,-1f);break;}res[i*nc+c]=x;}
    return res;}
  int WritePos(int ai){int cnt,nc;var f=ReadF(ai,out cnt,out nc);var b=new byte[cnt*12];double[] mn={1e30,1e30,1e30},mx={-1e30,-1e30,-1e30};
    for(int i=0;i<cnt;i++)for(int c=0;c<3;c++){float x=c<nc?f[i*nc+c]:0;Buffer.BlockCopy(BitConverter.GetBytes(x),0,b,(i*3+c)*4,4);if(x<mn[c])mn[c]=x;if(x>mx[c])mx[c]=x;}
    if(cnt==0){mn=new double[]{0,0,0};mx=new double[]{0,0,0};}
    newAccs.Add(new Dictionary<string,object>{{"bufferView",AddView(b,0,34962)},{"componentType",5126},{"count",cnt},{"type","VEC3"},{"min",mn},{"max",mx}});return newAccs.Count-1;}
  int WriteNrm(int ai){int cnt,nc;var f=ReadF(ai,out cnt,out nc);var b=new byte[cnt*4];
    for(int i=0;i<cnt;i++){double x=f[i*nc],y=f[i*nc+1],z=f[i*nc+2],l=Math.Sqrt(x*x+y*y+z*z);if(l<1e-8){x=0;y=1;z=0;l=1;}b[i*4]=(byte)(sbyte)Math.Round(x/l*127);b[i*4+1]=(byte)(sbyte)Math.Round(y/l*127);b[i*4+2]=(byte)(sbyte)Math.Round(z/l*127);}
    newAccs.Add(new Dictionary<string,object>{{"bufferView",AddView(b,4,34962)},{"componentType",5120},{"normalized",true},{"count",cnt},{"type","VEC3"}});return newAccs.Count-1;}
  int WriteUV(int ai){int cnt,nc;var f=ReadF(ai,out cnt,out nc);var b=new byte[cnt*8];for(int i=0;i<cnt;i++){Buffer.BlockCopy(BitConverter.GetBytes(f[i*nc]),0,b,i*8,4);Buffer.BlockCopy(BitConverter.GetBytes(f[i*nc+1]),0,b,i*8+4,4);}
    newAccs.Add(new Dictionary<string,object>{{"bufferView",AddView(b,0,34962)},{"componentType",5126},{"count",cnt},{"type","VEC2"}});return newAccs.Count-1;}
  int WriteIdx(int ai){int cnt,nc;var f=ReadF(ai,out cnt,out nc);uint mx=0;foreach(var x in f)if(x>mx)mx=(uint)x;byte[] b;int ct;
    if(mx<65535){b=new byte[cnt*2];for(int i=0;i<cnt;i++){ushort u=(ushort)f[i];b[i*2]=(byte)(u&255);b[i*2+1]=(byte)(u>>8);}ct=5123;}
    else{b=new byte[cnt*4];for(int i=0;i<cnt;i++)Buffer.BlockCopy(BitConverter.GetBytes((uint)f[i]),0,b,i*4,4);ct=5125;}
    newAccs.Add(new Dictionary<string,object>{{"bufferView",AddView(b,0,34963)},{"componentType",ct},{"count",cnt},{"type","SCALAR"}});return newAccs.Count-1;}
  byte[] Shrink(byte[] data,int maxTex,out string mime){
    try{using(var ms=new MemoryStream(data))using(var src=new Bitmap(ms)){
      bool alpha=false;if(Image.IsAlphaPixelFormat(src.PixelFormat)){using(var t=new Bitmap(src.Width,src.Height,PixelFormat.Format32bppArgb)){using(var gr=Graphics.FromImage(t))gr.DrawImage(src,0,0,src.Width,src.Height);var bd=t.LockBits(new Rectangle(0,0,t.Width,t.Height),ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);var px=new byte[bd.Stride*t.Height];System.Runtime.InteropServices.Marshal.Copy(bd.Scan0,px,0,px.Length);t.UnlockBits(bd);for(int i=3;i<px.Length;i+=4)if(px[i]<250){alpha=true;break;}}}
      double s=Math.Min(1.0,(double)maxTex/Math.Max(src.Width,src.Height));int w=Math.Max(1,(int)Math.Round(src.Width*s)),h=Math.Max(1,(int)Math.Round(src.Height*s));
      using(var dst=new Bitmap(w,h,alpha?PixelFormat.Format32bppArgb:PixelFormat.Format24bppRgb)){using(var gr=Graphics.FromImage(dst)){gr.InterpolationMode=InterpolationMode.HighQualityBicubic;gr.PixelOffsetMode=PixelOffsetMode.HighQuality;gr.CompositingMode=CompositingMode.SourceCopy;using(var wa=new ImageAttributes()){wa.SetWrapMode(WrapMode.TileFlipXY);gr.DrawImage(src,new Rectangle(0,0,w,h),0,0,src.Width,src.Height,GraphicsUnit.Pixel,wa);}}
        var o=new MemoryStream();
        if(alpha){dst.Save(o,ImageFormat.Png);mime="image/png";}
        else{ImageCodecInfo jc=null;foreach(var c in ImageCodecInfo.GetImageEncoders())if(c.MimeType=="image/jpeg")jc=c;var ep=new EncoderParameters(1);ep.Param[0]=new EncoderParameter(System.Drawing.Imaging.Encoder.Quality,84L);dst.Save(o,jc,ep);mime="image/jpeg";}
        return o.ToArray();}}}
    catch(Exception e){log.AppendLine("img fail "+e.Message);using(var b=new Bitmap(2,2)){using(var gr=Graphics.FromImage(b))gr.Clear(Color.Gray);var o=new MemoryStream();b.Save(o,ImageFormat.Png);mime="image/png";return o.ToArray();}}
  }
}
