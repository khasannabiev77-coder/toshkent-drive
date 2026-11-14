#!/usr/bin/env python3
"""Shrink a game car model: weld, simplify (QEM), re-encode textures, write gzip+base64 part files.
usage: slim.py in.glb out_prefix target_tris max_tex [--glb out.glb]"""
import sys, os, json, struct, io, gzip, base64, subprocess, tempfile
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def load_glb(path):
    b = open(path, 'rb').read()
    jl = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + jl])
    o = 20 + jl
    bl = struct.unpack('<I', b[o:o + 4])[0]
    return j, b[o + 8:o + 8 + bl]


def read_acc(j, binb, ai):
    a = j['accessors'][ai]
    assert 'sparse' not in a
    bv = j['bufferViews'][a['bufferView']]
    dt = np.dtype(CT[a['componentType']]); nc = NC[a['type']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = bv.get('byteStride', 0) or dt.itemsize * nc
    n = a['count']
    raw = np.frombuffer(binb, np.uint8, count=stride * (n - 1) + dt.itemsize * nc, offset=off) if n else np.zeros(0, np.uint8)
    if n == 0:
        return np.zeros((0, nc), dt), a
    if stride == dt.itemsize * nc:
        arr = raw.view(dt).reshape(n, nc)
    else:
        idx = (np.arange(n)[:, None] * stride + np.arange(dt.itemsize * nc)[None, :])
        arr = raw[idx].copy().view(dt).reshape(n, nc)
    return arr, a


def to_float(arr, a):
    f = arr.astype(np.float64)
    if a.get('normalized') and arr.dtype != np.float32:
        f = f / float(np.iinfo(arr.dtype).max)
        if arr.dtype.kind == 'i':
            f = np.maximum(f, -1.0)
    return f


def node_local(n):
    if 'matrix' in n:
        return np.array(n['matrix'], np.float64).reshape(4, 4).T
    M = np.eye(4)
    if 'scale' in n:
        M = np.diag(list(n['scale']) + [1.0])
    if 'rotation' in n:
        x, y, z, w = n['rotation']
        R = np.eye(4)
        R[:3, :3] = [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]]
        M = R @ M
    if 'translation' in n:
        T = np.eye(4); T[:3, 3] = n['translation']; M = T @ M
    return M


def world_mats(j):
    W = {}
    def rec(i, P):
        M = P @ node_local(j['nodes'][i]); W[i] = M
        for c in j['nodes'][i].get('children', []):
            rec(c, M)
    for s in j.get('scenes', []):
        for r in s.get('nodes', []):
            rec(r, np.eye(4))
    return W


def mat_has_tex(m):
    def rec(o):
        if isinstance(o, dict):
            if 'index' in o and isinstance(o['index'], int):
                return True
            return any(rec(v) for v in o.values())
        if isinstance(o, list):
            return any(rec(v) for v in o)
        return False
    return rec(m)


def shrink_image(data, max_tex, pal=False):
    try:
        im = Image.open(io.BytesIO(data)); im.load()
    except Exception:
        return data, None
    fmt = im.format
    w, h = im.size
    alpha = False
    if im.mode in ('RGBA', 'LA', 'PA') or 'transparency' in im.info:
        im = im.convert('RGBA')
        alpha = np.asarray(im)[..., 3].min() < 250
        if not alpha:
            im = im.convert('RGB')
    elif im.mode != 'RGB':
        im = im.convert('RGB')
    s = min(1.0, max_tex / max(w, h))
    if s < 1.0:
        im = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    out = io.BytesIO()
    if alpha:
        if pal:
            im = im.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG)
        im.save(out, 'PNG', optimize=True); mime = 'image/png'
    else:
        im.save(out, 'JPEG', quality=80, optimize=True, progressive=False); mime = 'image/jpeg'
    o = out.getvalue()
    if s == 1.0 and len(o) >= len(data) and fmt in ('JPEG', 'PNG'):
        return data, None
    return o, mime


def snap_pow2(x, extent, bits):
    if extent <= 0:
        return x
    step = 2.0 ** np.floor(np.log2(extent / (1 << bits)))
    return np.round(x / step) * step


def main():
    inp, outp, target, max_tex = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    glb_out = sys.argv[sys.argv.index('--glb') + 1] if '--glb' in sys.argv else None
    j, binb = load_glb(inp)
    W = world_mats(j)
    mesh_nodes = {}
    for i, n in enumerate(j['nodes']):
        if 'mesh' in n and i in W:
            mesh_nodes.setdefault(n['mesh'], []).append(i)
    mats = j.get('materials', [])
    # ---- gather primitives
    prims = []  # dict per primitive
    tris_in = 0; verts_in = 0
    for mi, m in enumerate(j['meshes']):
        for pi, p in enumerate(m['primitives']):
            at = p['attributes']
            ok = p.get('mode', 4) == 4 and 'POSITION' in at and 'targets' not in p and mi in mesh_nodes
            d = dict(mi=mi, pi=pi, p=p, ok=ok)
            if not ok:
                prims.append(d); continue
            pos, pa = read_acc(j, binb, at['POSITION']); posf = to_float(pos, pa)
            n = len(posf)
            if 'indices' in p:
                idx = read_acc(j, binb, p['indices'])[0].reshape(-1).astype(np.int64)
            else:
                idx = np.arange(n, dtype=np.int64)
            idx = idx[:len(idx) // 3 * 3].reshape(-1, 3)
            if 'NORMAL' in at:
                nr, na = read_acc(j, binb, at['NORMAL']); nrf = to_float(nr, na)
            else:
                nrf = None
            uvf = None
            if 'TEXCOORD_0' in at and 'material' in p and mat_has_tex(mats[p['material']]):
                uv, ua = read_acc(j, binb, at['TEXCOORD_0']); uvf = to_float(uv, ua)
            Mw = W[mesh_nodes[mi][0]]
            wp = posf @ Mw[:3, :3].T + Mw[:3, 3]
            d.update(pos=posf, idx=idx, nr=nrf, uv=uvf, Mw=Mw, wp=wp, grp=(mi if len(mesh_nodes[mi]) > 1 else -1))
            tris_in += len(idx); verts_in += n
            prims.append(d)
    good = [d for d in prims if d['ok'] and len(d['idx'])]
    if not good:
        raise SystemExit('no triangles')
    allw = np.concatenate([d['wp'] for d in good])
    lo = allw.min(0); diag = float(np.linalg.norm(allw.max(0) - lo)) or 1.0
    eps = diag * 2e-5
    # ---- position classes (welded in world space, multi-use meshes kept apart)
    keys = []
    for d in good:
        q = np.round((d['wp'] - lo) / eps).astype(np.int64)
        k = (q[:, 0] << 42) | (q[:, 1] << 21) | q[:, 2]
        keys.append(np.stack([np.full(len(k), d['grp'], np.int64), k], 1))
    allk = np.concatenate(keys)
    _, first, cls = np.unique(allk, axis=0, return_index=True, return_inverse=True)
    cls = cls.reshape(-1)
    cpos = (allw[first] - lo) / diag
    nC = len(first)
    # ---- attribute vertices (welded per primitive on class+normal+uv)
    off = 0; aoff = 0; triC = []; triA = []; triP = []
    for k, d in enumerate(good):
        n = len(d['pos']); c = cls[off:off + n]; off += n
        cols = [c[:, None]]
        if d['nr'] is not None:
            cols.append(np.round(d['nr'] * 127).astype(np.int64))
        if d['uv'] is not None:
            cols.append(np.round(d['uv'] * 4096).astype(np.int64))
        key = np.concatenate(cols, 1)
        _, afirst, ainv = np.unique(key, axis=0, return_index=True, return_inverse=True)
        ainv = ainv.reshape(-1)
        d['afirst'] = afirst; d['aoff'] = aoff; d['cls'] = c
        triC.append(c[d['idx']]); triA.append(ainv[d['idx']] + aoff); triP.append(np.full(len(d['idx']), k, np.int32))
        aoff += len(afirst)
    nA = aoff
    triC = np.concatenate(triC).astype(np.int32); triA = np.concatenate(triA).astype(np.int32); triP = np.concatenate(triP)
    nd = (triC[:, 0] != triC[:, 1]) & (triC[:, 1] != triC[:, 2]) & (triC[:, 0] != triC[:, 2])
    live0 = int(nd.sum())
    tgt = min(live0, max(target, min(int(live0 / 6.5), int(target * 2.15))))   # heavier originals keep more detail
    # keep the overall bounding box exact: the game scales every car by it
    locked = np.zeros(nC, np.uint8)
    tv = triC[nd]
    for ax in range(3):
        for ext in (cpos[:, ax].min(), cpos[:, ax].max()):
            hit = np.abs(cpos[tv][:, :, ax] - ext).min(1) < 1e-9
            if hit.any():
                locked[tv[np.argmax(hit)]] = 1
    with tempfile.TemporaryDirectory() as td:
        fi, fo = os.path.join(td, 'i'), os.path.join(td, 'o')
        with open(fi, 'wb') as f:
            f.write(struct.pack('<4i', nC, nA, len(triC), tgt)); f.write(cpos.astype('<f8').tobytes()); f.write(triC.tobytes()); f.write(triA.tobytes()); f.write(locked.tobytes())
        subprocess.run([os.path.join(HERE, 'qem'), fi, fo], check=True)
        r = open(fo, 'rb').read()
    simplified = tgt < live0
    nl = struct.unpack('<i', r[:4])[0]
    lt = np.frombuffer(r, '<i4', nl * 4, 4).reshape(nl, 4)
    aclass = np.frombuffer(r, '<i4', nA, 4 + nl * 16)
    # ---- rebuild binary
    out = bytearray(); views = []; accs = []
    def add_view(b, target=None, stride=None):
        while len(out) % 4:
            out.append(0)
        v = dict(buffer=0, byteOffset=len(out), byteLength=len(b))
        if target:
            v['target'] = target
        if stride:
            v['byteStride'] = stride
        out.extend(b); views.append(v); return len(views) - 1
    tris_out = 0; verts_out = 0
    ltP = triP[lt[:, 0]]
    order = np.argsort(ltP, kind='stable'); lt = lt[order]; ltP = ltP[order]
    bounds = np.searchsorted(ltP, np.arange(len(good) + 1))
    for k, d in enumerate(good):
        T = lt[bounds[k]:bounds[k + 1], 1:4]
        if len(T) == 0:
            d['drop'] = True; continue
        r = np.argmin(T, 1)                       # drop exact duplicate triangles (same winding)
        Tc = np.stack([T[np.arange(len(T)), (r + i) % 3] for i in range(3)], 1)
        T = T[np.sort(np.unique(Tc, axis=0, return_index=True)[1])]
        ua, inv = np.unique(T, return_inverse=True)
        inv = inv.reshape(-1, 3)
        loc = ua - d['aoff']
        src = d['afirst'][loc]              # original vertex carrying the attributes
        pos = d['pos'][src].copy()
        moved = aclass[ua] != d['cls'][src]
        if moved.any():
            wpos = cpos[aclass[ua[moved]]] * diag + lo
            Mi = np.linalg.inv(d['Mw'])
            pos[moved] = wpos @ Mi[:3, :3].T + Mi[:3, 3]
        ext = float((pos.max(0) - pos.min(0)).max())
        pos = snap_pow2(pos, max(ext, 1e-12), 13).astype('<f4')
        cl = aclass[ua]                         # position class of every vertex
        n8 = None; uv = None
        if d['uv'] is not None:
            uv = (np.round(d['uv'][src] * 4096) / 4096).astype('<f4')
        if d['nr'] is not None:
            nr = d['nr'][src]
            ln = np.linalg.norm(nr, axis=1, keepdims=True); nr = np.where(ln > 1e-9, nr / np.maximum(ln, 1e-9), [0.0, 1.0, 0.0])
            if simplified:
                # per-corner normals: keep the authored normal where it still fits the coarser face,
                # otherwise rebuild it from neighbouring faces within a crease angle
                A3 = d['Mw'][:3, :3]
                wpv = pos.astype(np.float64) @ A3.T
                fn = np.cross(wpv[inv[:, 1]] - wpv[inv[:, 0]], wpv[inv[:, 2]] - wpv[inv[:, 0]]) @ A3   # local normal space, length ~ area
                sg = np.sign(sum(np.einsum('ij,ij->i', fn, nr[inv[:, c]]) for c in range(3))); sg[sg == 0] = 1
                fn = fn * sg[:, None]
                fl = np.linalg.norm(fn, axis=1); fu = fn / np.maximum(fl, 1e-30)[:, None]
                nT_ = len(inv)
                cv = inv.reshape(-1)                         # corner -> vertex
                ct_ = np.repeat(np.arange(nT_), 3)           # corner -> tri
                cn = nr[cv].copy()
                bad = (np.einsum('ij,ij->i', cn, fu[ct_]) < 0.80) & (fl[ct_] > 0)
                if bad.any():
                    cc = cl[cv]
                    o = np.argsort(cc, kind='stable'); scc = cc[o]
                    st = np.searchsorted(scc, cc[bad], 'left'); en = np.searchsorted(scc, cc[bad], 'right')
                    cnt = en - st
                    rows = np.repeat(np.arange(len(cnt)), cnt)
                    cols = o[np.repeat(st, cnt) + (np.arange(cnt.sum()) - np.repeat(np.cumsum(cnt) - cnt, cnt))]
                    bt = ct_[bad][rows]; ot = ct_[cols]
                    keep = np.einsum('ij,ij->i', fu[bt], fu[ot]) > 0.72
                    accn = np.zeros((len(cnt), 3)); np.add.at(accn, rows[keep], fn[ot[keep]])
                    la = np.linalg.norm(accn, axis=1, keepdims=True)
                    cn[bad] = np.where(la > 0, accn / np.maximum(la, 1e-30), fu[ct_[bad]])
                c8 = np.round(cn * 127).astype(np.int8)
                # re-weld corners
                key = [cv[:, None].astype(np.int64), c8.astype(np.int64)]
                _, kfirst, kinv = np.unique(np.concatenate(key, 1), axis=0, return_index=True, return_inverse=True)
                vsel = cv[kfirst]
                pos = pos[vsel]; uv = uv[vsel] if uv is not None else None
                n8 = np.zeros((len(vsel), 4), np.int8); n8[:, :3] = c8[kfirst]
                inv = kinv.reshape(-1, 3)
            else:
                n8 = np.zeros((len(nr), 4), np.int8); n8[:, :3] = np.round(nr * 127)
        at = {}
        accs.append(dict(bufferView=add_view(pos.tobytes(), 34962), componentType=5126, count=len(pos), type='VEC3',
                         min=pos.min(0).astype(float).tolist(), max=pos.max(0).astype(float).tolist()))
        at['POSITION'] = len(accs) - 1
        if n8 is not None:
            accs.append(dict(bufferView=add_view(n8.tobytes(), 34962, 4), componentType=5120, normalized=True, count=len(n8), type='VEC3'))
            at['NORMAL'] = len(accs) - 1
        if uv is not None:
            accs.append(dict(bufferView=add_view(uv.tobytes(), 34962), componentType=5126, count=len(uv), type='VEC2'))
            at['TEXCOORD_0'] = len(accs) - 1
        if len(pos) <= 65535:
            ib = inv.astype('<u2').tobytes(); ct = 5123
        else:
            ib = inv.astype('<u4').tobytes(); ct = 5125
        accs.append(dict(bufferView=add_view(ib, 34963), componentType=ct, count=inv.size, type='SCALAR'))
        np_ = {kk: vv for kk, vv in d['p'].items() if kk not in ('attributes', 'indices', 'targets')}
        np_['attributes'] = at; np_['indices'] = len(accs) - 1
        d['new'] = np_
        tris_out += len(inv); verts_out += len(pos)
    def copy_acc(ai, target=34962):
        arr, a = read_acc(j, binb, ai)
        na = {kk: vv for kk, vv in a.items() if kk not in ('bufferView', 'byteOffset')}
        b = np.ascontiguousarray(arr).tobytes()
        isz = arr.dtype.itemsize * arr.shape[1]
        if target == 34962 and isz % 4:
            pad = np.zeros((len(arr), (4 - isz % 4)), np.uint8)
            b = np.concatenate([np.frombuffer(b, np.uint8).reshape(len(arr), isz), pad], 1).tobytes()
            na['bufferView'] = add_view(b, target, isz + pad.shape[1])
        else:
            na['bufferView'] = add_view(b, target)
        accs.append(na); return len(accs) - 1
    newmeshes = []; remap = {}
    for mi, m in enumerate(j['meshes']):
        ps = []
        for d in prims:
            if d['mi'] != mi:
                continue
            if 'new' in d:
                ps.append(d['new'])
            elif not d['ok'] and mi in mesh_nodes and not ('--nolines' in sys.argv and d['p'].get('mode', 4) in (0, 1, 2, 3)):
                p = d['p']; np_ = {kk: vv for kk, vv in p.items() if kk not in ('attributes', 'indices', 'targets')}
                np_['attributes'] = {kk: copy_acc(vv) for kk, vv in p['attributes'].items()}
                if 'indices' in p:
                    np_['indices'] = copy_acc(p['indices'], 34963)
                ps.append(np_)
        if ps:
            nm = {kk: vv for kk, vv in m.items() if kk != 'weights'}; nm['primitives'] = ps
            remap[mi] = len(newmeshes); newmeshes.append(nm)
    for n in j['nodes']:
        if 'mesh' in n:
            if n['mesh'] in remap:
                n['mesh'] = remap[n['mesh']]
            else:
                del n['mesh']
    j['meshes'] = newmeshes
    # ---- images
    img_in = img_out = 0
    cache = {}
    nrm_imgs = set()
    for m in mats:
        for kk in ('normalTexture',):
            if kk in m:
                nrm_imgs.add(j['textures'][m[kk]['index']].get('source'))
        cc = m.get('extensions', {}).get('KHR_materials_clearcoat', {}).get('clearcoatNormalTexture')
        if cc:
            nrm_imgs.add(j['textures'][cc['index']].get('source'))
    for ii, im in enumerate(j.get('images', [])):
        bv = j['bufferViews'][im['bufferView']]
        data = bytes(binb[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])
        img_in += len(data)
        if data not in cache:
            o, mime = shrink_image(data, max_tex, pal=ii not in nrm_imgs)
            cache[data] = (add_view(o), mime, len(o)); img_out += len(o)
        v, mime, _ = cache[data]
        im['bufferView'] = v
        if mime:
            im['mimeType'] = mime
    while len(out) % 4:
        out.append(0)
    j['bufferViews'] = views; j['accessors'] = accs; j['buffers'] = [dict(byteLength=len(out))]
    js = json.dumps(j, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    js += b' ' * ((4 - len(js) % 4) % 4)
    glb = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(out)) + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(out), b'BIN\0') + bytes(out)
    if glb_out:
        open(glb_out, 'wb').write(glb)
    gz = gzip.compress(glb, 9, mtime=0)
    b64 = base64.b64encode(gz)
    PART = 12000000
    parts = [b64[i:i + PART] for i in range(0, len(b64), PART)] or [b'']
    for f in __import__('glob').glob(outp + '.part*.txt'):
        os.remove(f)
    for i, p in enumerate(parts):
        open(f'{outp}.part{i}.txt', 'wb').write(p)
    print(json.dumps(dict(key=os.path.basename(outp), n=len(parts), mb=round(len(b64) / 1048576, 1), b64=len(b64), glb=len(glb),
                          tris_in=tris_in, tris_welded=live0, tris_out=tris_out, verts_in=verts_in, verts_out=verts_out,
                          img_in=img_in, img_out=img_out)))


if __name__ == '__main__':
    main()
