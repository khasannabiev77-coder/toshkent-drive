// Quadric-error edge-collapse simplifier (subset placement, wedge-aware).
// Input : int32 nC,nA,nT,target ; double pos[nC*3] ; int32 triC[nT*3] ; int32 triA[nT*3] ; uint8 locked[nC]
// Output: int32 nLive ; nLive * {int32 origTri,a0,a1,a2} ; int32 aclass[nA] ; double maxcost
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <stdint.h>

typedef struct { double m[10]; } Q;
typedef struct { double c; int u, v, vu, vv; } HE;

static int nC, nA, nT, target;
static double *P; static int *TC, *TA; static char *dead; static int *head, *nxt, *ver; static char *gone;
static Q *Qs; static int *aclass; static unsigned char *locked;
static HE *heap; static long hn = 0, hcap = 0;

static void qadd_plane(Q *q, double a, double b, double c, double d, double w) {
  q->m[0] += w*a*a; q->m[1] += w*a*b; q->m[2] += w*a*c; q->m[3] += w*a*d;
  q->m[4] += w*b*b; q->m[5] += w*b*c; q->m[6] += w*b*d;
  q->m[7] += w*c*c; q->m[8] += w*c*d; q->m[9] += w*d*d;
}
static double qeval(const Q *q, const double *p) {
  double x = p[0], y = p[1], z = p[2];
  return q->m[0]*x*x + 2*q->m[1]*x*y + 2*q->m[2]*x*z + 2*q->m[3]*x + q->m[4]*y*y + 2*q->m[5]*y*z + 2*q->m[6]*y + q->m[7]*z*z + 2*q->m[8]*z + q->m[9];
}
static void hpush(double c, int u, int v) {
  if (hn == hcap) { hcap = hcap ? hcap*2 : 1<<20; heap = realloc(heap, hcap*sizeof(HE)); }
  long i = hn++; HE e = {c, u, v, ver[u], ver[v]};
  while (i > 0) { long p = (i-1)/2; if (heap[p].c <= e.c) break; heap[i] = heap[p]; i = p; }
  heap[i] = e;
}
static HE hpop(void) {
  HE top = heap[0], e = heap[--hn]; long i = 0;
  for (;;) { long l = 2*i+1; if (l >= hn) break; if (l+1 < hn && heap[l+1].c < heap[l].c) l++; if (e.c <= heap[l].c) break; heap[i] = heap[l]; i = l; }
  heap[i] = e; return top;
}
static void cross(const double *a, const double *b, const double *c, double *n) {
  double e1[3] = {b[0]-a[0], b[1]-a[1], b[2]-a[2]}, e2[3] = {c[0]-a[0], c[1]-a[1], c[2]-a[2]};
  n[0] = e1[1]*e2[2]-e1[2]*e2[1]; n[1] = e1[2]*e2[0]-e1[0]*e2[2]; n[2] = e1[0]*e2[1]-e1[1]*e2[0];
}
static double ecost(int u, int v) { // remove u, keep v
  Q q; for (int i = 0; i < 10; i++) q.m[i] = Qs[u].m[i] + Qs[v].m[i];
  double c = qeval(&q, P+3*v); return c < 0 ? 0 : c;
}
static int cmp64(const void *a, const void *b) { uint64_t x = *(const uint64_t*)a, y = *(const uint64_t*)b; return x < y ? -1 : x > y; }

int main(int argc, char **argv) {
  FILE *f = fopen(argv[1], "rb"); int hdr[4]; if (fread(hdr, 4, 4, f) != 4) return 1;
  nC = hdr[0]; nA = hdr[1]; nT = hdr[2]; target = hdr[3];
  P = malloc(sizeof(double)*3*nC); TC = malloc(4*3*(size_t)nT); TA = malloc(4*3*(size_t)nT);
  if (fread(P, 8, 3*(size_t)nC, f) != 3*(size_t)nC) return 1;
  if (fread(TC, 4, 3*(size_t)nT, f) != 3*(size_t)nT) return 1;
  if (fread(TA, 4, 3*(size_t)nT, f) != 3*(size_t)nT) return 1;
  locked = calloc(nC, 1); if (fread(locked, 1, nC, f) != (size_t)nC) return 1;
  fclose(f);
  dead = calloc(nT, 1); head = malloc(4*(size_t)nC); nxt = malloc(4*3*(size_t)nT); ver = calloc(nC, 4); gone = calloc(nC, 1);
  Qs = calloc(nC, sizeof(Q)); aclass = malloc(4*(size_t)nA);
  for (int i = 0; i < nC; i++) head[i] = -1;
  for (int i = 0; i < nA; i++) aclass[i] = -1;
  long live = 0; double *asum = calloc(nC, 8);
  uint64_t *ed = malloc(8*3*(size_t)nT); long ne = 0;
  for (int t = 0; t < nT; t++) {
    int *c = TC+3*t;
    if (c[0] == c[1] || c[1] == c[2] || c[0] == c[2]) { dead[t] = 1; continue; }
    live++;
    for (int k = 0; k < 3; k++) { nxt[3*t+k] = head[c[k]]; head[c[k]] = 3*t+k; aclass[TA[3*t+k]] = c[k]; }
    double n[3]; cross(P+3*c[0], P+3*c[1], P+3*c[2], n); double l = sqrt(n[0]*n[0]+n[1]*n[1]+n[2]*n[2]);
    if (l > 1e-300) { n[0] /= l; n[1] /= l; n[2] /= l; double d = -(n[0]*P[3*c[0]]+n[1]*P[3*c[0]+1]+n[2]*P[3*c[0]+2]);
      for (int k = 0; k < 3; k++) { qadd_plane(&Qs[c[k]], n[0], n[1], n[2], d, l*0.5); asum[c[k]] += l*0.5; } }
    for (int k = 0; k < 3; k++) { uint32_t a = c[k], b = c[(k+1)%3]; if (a > b) { uint32_t s = a; a = b; b = s; } ed[ne++] = ((uint64_t)a<<32)|b; }
  }
  // boundary constraints
  uint64_t *es = malloc(8*(size_t)ne); memcpy(es, ed, 8*(size_t)ne); qsort(es, ne, 8, cmp64);
  for (int t = 0; t < nT; t++) { if (dead[t]) continue; int *c = TC+3*t;
    for (int k = 0; k < 3; k++) { uint32_t a = c[k], b = c[(k+1)%3]; uint32_t lo = a < b ? a : b, hi = a < b ? b : a; uint64_t key = ((uint64_t)lo<<32)|hi;
      uint64_t *p = bsearch(&key, es, ne, 8, cmp64); long i = p-es; int cnt = 1; long j = i; while (j > 0 && es[j-1] == key) { j--; cnt++; } j = i; while (j+1 < ne && es[j+1] == key) { j++; cnt++; }
      if (cnt == 1) { double n[3], e[3] = {P[3*b]-P[3*a], P[3*b+1]-P[3*a+1], P[3*b+2]-P[3*a+2]}, bn[3];
        cross(P+3*c[0], P+3*c[1], P+3*c[2], n);
        bn[0] = e[1]*n[2]-e[2]*n[1]; bn[1] = e[2]*n[0]-e[0]*n[2]; bn[2] = e[0]*n[1]-e[1]*n[0];
        double l = sqrt(bn[0]*bn[0]+bn[1]*bn[1]+bn[2]*bn[2]); if (l < 1e-300) continue; bn[0] /= l; bn[1] /= l; bn[2] /= l;
        double d = -(bn[0]*P[3*a]+bn[1]*P[3*a+1]+bn[2]*P[3*a+2]); double w = 10.0*(e[0]*e[0]+e[1]*e[1]+e[2]*e[2]);
        qadd_plane(&Qs[a], bn[0], bn[1], bn[2], d, w); qadd_plane(&Qs[b], bn[0], bn[1], bn[2], d, w); } } }
  // regulariser: stay near original position
  for (int v = 0; v < nC; v++) { double w = 1e-3*asum[v], *p = P+3*v; Q *q = &Qs[v];
    q->m[0] += w; q->m[4] += w; q->m[7] += w; q->m[3] -= w*p[0]; q->m[6] -= w*p[1]; q->m[8] -= w*p[2]; q->m[9] += w*(p[0]*p[0]+p[1]*p[1]+p[2]*p[2]); }
  free(asum);
  uint64_t prev = ~0ull;
  for (long i = 0; i < ne; i++) { if (es[i] == prev) continue; prev = es[i]; int a = (int)(es[i]>>32), b = (int)(es[i]&0xffffffffu); hpush(ecost(a, b), a, b); hpush(ecost(b, a), b, a); }
  free(es); free(ed);
  int *mark = calloc(nC, 4); int stamp = 0; double maxcost = 0; int pa[64][2];
  while (live > target && hn > 0) {
    HE e = hpop(); int u = e.u, v = e.v;
    if (locked[u] || gone[u] || gone[v] || ver[u] != e.vu || ver[v] != e.vv) continue;
    // flip check + compact u's list
    int ok = 1, np = 0; int *pp = &head[u];
    while (*pp >= 0) { int cid = *pp, t = cid/3; if (dead[t]) { *pp = nxt[cid]; continue; } pp = &nxt[cid]; }
    for (int cid = head[u]; cid >= 0 && ok; cid = nxt[cid]) { int t = cid/3, *c = TC+3*t;
      if (c[0] == v || c[1] == v || c[2] == v) continue;
      double n0[3], n1[3]; const double *q[3];
      cross(P+3*c[0], P+3*c[1], P+3*c[2], n0);
      for (int k = 0; k < 3; k++) q[k] = P+3*(c[k] == u ? v : c[k]);
      cross(q[0], q[1], q[2], n1);
      double d = n0[0]*n1[0]+n0[1]*n1[1]+n0[2]*n1[2], l0 = n0[0]*n0[0]+n0[1]*n0[1]+n0[2]*n0[2], l1 = n1[0]*n1[0]+n1[1]*n1[1]+n1[2]*n1[2];
      if (l0 > 1e-30 && d < 0.25*sqrt(l0*l1)) ok = 0; }
    if (!ok) continue;
    if (e.c > maxcost) maxcost = e.c;
    // wedge pairs from triangles that contain the collapsing edge
    for (int cid = head[u]; cid >= 0; cid = nxt[cid]) { int t = cid/3, *c = TC+3*t, kv = -1;
      for (int k = 0; k < 3; k++) if (c[k] == v) kv = k;
      if (kv < 0) continue;
      if (np < 64) { pa[np][0] = TA[cid]; pa[np][1] = TA[3*t+kv]; np++; }
      dead[t] = 1; live--; }
    int last = -1;
    for (int cid = head[u]; cid >= 0; cid = nxt[cid]) { int t = cid/3; last = cid; if (dead[t]) continue;
      TC[cid] = v; int a = TA[cid], na = a;
      for (int i = 0; i < np; i++) if (pa[i][0] == a) { na = pa[i][1]; break; }
      if (na != a) TA[cid] = na; else aclass[a] = v; }
    if (last >= 0) { nxt[last] = head[v]; head[v] = head[u]; }
    head[u] = -1; gone[u] = 1;
    for (int i = 0; i < 10; i++) Qs[v].m[i] += Qs[u].m[i];
    ver[v]++; stamp++;
    pp = &head[v];
    while (*pp >= 0) { int cid = *pp, t = cid/3; if (dead[t]) { *pp = nxt[cid]; continue; } pp = &nxt[cid];
      int *c = TC+3*t; for (int k = 0; k < 3; k++) { int w = c[k]; if (w != v && mark[w] != stamp) { mark[w] = stamp; hpush(ecost(v, w), v, w); hpush(ecost(w, v), w, v); } } }
  }
  f = fopen(argv[2], "wb"); int nl = (int)live; fwrite(&nl, 4, 1, f);
  for (int t = 0; t < nT; t++) if (!dead[t]) { int r[4] = {t, TA[3*t], TA[3*t+1], TA[3*t+2]}; fwrite(r, 4, 4, f); }
  fwrite(aclass, 4, nA, f); fwrite(&maxcost, 8, 1, f); fclose(f);
  return 0;
}
