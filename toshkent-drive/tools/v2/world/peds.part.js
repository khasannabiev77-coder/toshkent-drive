
/* ---------------- pedestrians: crossing roads at the lights (pedCorner/pedCross in world.js); cars give way ---------------- */
rep("    if(p.walk){const pv=p.down>0?0:p.panic>0?p.v*3.4:V2.pedV(p,dt);p.s+=pv*p.dir*dt;p.ph+=pv*dt*5.4;[x,z,h]=perim(p);}",
  "    if(p.walk&&p.cross&&!(p.down>0)&&!(p.panic>0)){[x,z,h]=pedCross(p,dt);}\n    else if(p.walk){if(p.cross){XW.delete(p);p.cross=null;}const pv=p.down>0?0:p.panic>0?p.v*3.4:V2.pedV(p,dt);p.s+=pv*p.dir*dt;p.ph+=pv*dt*5.4;[x,z,h]=perim(p);pedCorner(p,x,z);}");
rep("    if(mode==='foot')chk(HERO.x,HERO.z,12);", "    if(mode==='foot')chk(HERO.x,HERO.z,12);\n    for(const q of XW)chk(q.cx,q.cz,14);");
