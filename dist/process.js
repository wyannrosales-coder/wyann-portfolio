// My process: a scroll-driven particle story that lives inside the TV screen, like Portfolio.
// The brain glides aside, turns into an icon for each step, then explodes into a closing message.
(() => {
  'use strict';
  const screen = document.querySelector('.screen');
  if (!screen) return;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Settings chosen in the prototype (style panel removed)
  const SETTINGS = { process:'full', shape:2, palette:'solar', mode:0, density:0.93, folds:0.88, radius:0.12 };

  /* ------------------------------------------------------------------
   *  Section markup (inserted under the glass so the CRT effect covers it)
   * ------------------------------------------------------------------ */
  const section = document.createElement('section');
  section.id = 'process';
  section.hidden = true;
  section.inert = true;
  section.setAttribute('aria-labelledby', 'process-heading');
  section.innerHTML = `
    <canvas class="process-canvas" aria-hidden="true"></canvas>
    <div class="process-scroller" tabindex="-1"><div class="process-track"></div></div>
    <div class="process-ui">
      <div class="process-hero">
        <p class="eyebrow">My process &middot; From curiosity to clarity</p>
        <h2 id="process-heading">Every product starts as a tangled idea.</h2>
        <p class="process-lead">Scroll to watch how I untangle it, one step at a time.</p>
        <button type="button" class="pill process-start">Follow the process &darr;</button>
      </div>
      <div class="process-hint" aria-hidden="true"><span></span>Scroll</div>
      <div class="process-steps"></div>
      <ol class="process-rail" aria-label="Process steps"></ol>
      <div class="process-mobile-nav" aria-label="Process step controls">
        <button type="button" class="process-prev" aria-label="Previous process step">&#8249;</button>
        <div class="process-dots" aria-label="Choose a process step"></div>
        <button type="button" class="process-next-mobile" aria-label="Next process step">&#8250;</button>
      </div>
      <div class="process-outro">
        <p class="eyebrow">What&rsquo;s next</p>
        <h2>Now, let&rsquo;s build yours.</h2>
        <p>If your product is tangled, stuck, or just not landing, I&rsquo;d love to help untangle it, from first conversation to launch day.</p>
        <div class="process-row"><button type="button" class="pill primary" data-panel="Get in touch">Get in touch</button><button type="button" class="pill process-to-work">View selected work</button></div>
      </div>
    </div>`;
  screen.insertBefore(section, screen.querySelector('.glass'));

  const $ = sel => section.querySelector(sel);
  const canvas = $('.process-canvas'), scroller = $('.process-scroller'), track = $('.process-track');
  const heroCopy = $('.process-hero'), hint = $('.process-hint'), stepsEl = $('.process-steps'), railEl = $('.process-rail'), outro = $('.process-outro');
  const mobilePrev = $('.process-prev'), mobileNext = $('.process-next-mobile'), mobileDots = $('.process-dots');
  const homeBack = document.querySelector('.home-back');
  const copy = screen.querySelector('.copy'), thoughts = screen.querySelector('.thoughts');

  // wheel over text or buttons still scrolls the story
  $('.process-ui').addEventListener('wheel', e => { scroller.scrollTop += e.deltaY; }, { passive:true });

  /* ==================================================================
   *  1. Brain surface as a signed distance field (SDF)
   *     x = left/right, y = up, z = front(-) to back(+)
   * ================================================================== */
  function hash3(i, j, k){
    let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1440662683);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function vnoise(x, y, z){
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    let xf = x - xi, yf = y - yi, zf = z - zi;
    xf = xf*xf*(3-2*xf); yf = yf*yf*(3-2*yf); zf = zf*zf*(3-2*zf);
    const a = hash3(xi,yi,zi),     b = hash3(xi+1,yi,zi),     c = hash3(xi,yi+1,zi),     d = hash3(xi+1,yi+1,zi);
    const e = hash3(xi,yi,zi+1),   f = hash3(xi+1,yi,zi+1),   g = hash3(xi,yi+1,zi+1),   h = hash3(xi+1,yi+1,zi+1);
    const l1 = a + (b-a)*xf, l2 = c + (d-c)*xf, l3 = e + (f-e)*xf, l4 = g + (h-g)*xf;
    const m1 = l1 + (l2-l1)*yf, m2 = l3 + (l4-l3)*yf;
    return m1 + (m2-m1)*zf;
  }
  const gauss = (v, w) => { const q = v/w; return Math.exp(-q*q); };
  const sat = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const sstep = (a, b, v) => { const t = sat((v-a)/(b-a)); return t*t*(3-2*t); };
  function sdEll(x, y, z, cx, cy, cz, rx, ry, rz){
    const X = x-cx, Y = y-cy, Z = z-cz;
    const a = X/rx, b = Y/ry, c = Z/rz;
    const k0 = Math.sqrt(a*a + b*b + c*c);
    const a2 = X/(rx*rx), b2 = Y/(ry*ry), c2 = Z/(rz*rz);
    const k1 = Math.sqrt(a2*a2 + b2*b2 + c2*c2);
    return k1 > 1e-9 ? k0*(k0-1)/k1 : -Math.min(rx, ry, rz);
  }
  function smin(a, b, k){ const h = Math.max(k - Math.abs(a-b), 0) / k; return Math.min(a, b) - h*h*k*0.25; }
  function sdCapsule(x, y, z, ax, ay, az, bx, by, bz, r){
    const px = x-ax, py = y-ay, pz = z-az, qx = bx-ax, qy = by-ay, qz = bz-az;
    const h = sat((px*qx + py*qy + pz*qz) / (qx*qx + qy*qy + qz*qz));
    const dx = px - qx*h, dy = py - qy*h, dz = pz - qz*h;
    return Math.sqrt(dx*dx + dy*dy + dz*dz) - r;
  }

  // Lobes of one hemisphere (mirrored with |x|), carved by the big sulci
  function cerebrum(x, y, z){
    const X = Math.abs(x);
    let d = sdEll(X,y,z, 0.50, 0.18, 0.00, 0.56, 0.86, 1.22);              // core
    d = smin(d, sdEll(X,y,z, 0.48, 0.02,-0.78, 0.50, 0.70, 0.58), 0.18);   // frontal
    d = smin(d, sdEll(X,y,z, 0.46, 0.46, 0.38, 0.50, 0.58, 0.68), 0.18);   // parietal
    d = smin(d, sdEll(X,y,z, 0.42, 0.02, 0.98, 0.44, 0.56, 0.44), 0.16);   // occipital
    // lateral (Sylvian) fissure rising toward the back
    const y0 = -0.06 + 0.20*z;
    const gS = gauss(y-y0, 0.06) * sstep(0.45, 0.8, X) * sstep(-0.75, -0.45, z) * (1 - sstep(0.55, 0.85, z));
    // central sulcus running diagonally over the top
    const z0 = 0.05 - 0.32*(y - 0.4);
    const gC = gauss(z-z0, 0.045) * sstep(0.0, 0.45, y);
    d += 0.08*gS + 0.055*gC;
    d = smin(d, sdEll(X,y,z, 0.62,-0.40, 0.02, 0.40, 0.34, 0.74), 0.05);   // temporal
    d += 0.09*gauss(X, 0.055) * sstep(-0.4, -0.1, y);              // longitudinal fissure
    return d;
  }
  // Gyri: winding grooves along noise iso-lines (0 in the groove, 1 on the crown)
  function gyri(x, y, z){
    const k = 1.6;
    const wx = vnoise(x*k+9.1, y*k, z*k) - 0.5, wy = vnoise(x*k, y*k+4.3, z*k) - 0.5, wz = vnoise(x*k, y*k, z*k+7.7) - 0.5;
    const qx = x + wx*0.8, qy = y + wy*0.8, qz = z + wz*0.8;
    const n1 = vnoise(qx*3.9, qy*3.9, qz*3.9);
    const n2 = vnoise(qx*7.8+3, qy*7.8, qz*7.8);
    return Math.min(Math.sqrt(Math.abs(n1*2-1)), 0.55 + 0.45*Math.sqrt(Math.abs(n2*2-1)));
  }
  function brainSDF(x, y, z, amp){
    let d = cerebrum(x, y, z);
    if (amp > 0 && d < 0.2 && d > -0.2) d -= amp*(gyri(x, y, z) - 0.62);
    const X = Math.abs(x);
    let dc = sdEll(X,y,z, 0.30,-0.62, 0.80, 0.44, 0.30, 0.40);              // cerebellum
    if (dc < 0.1) dc += 0.008*Math.sin(y*70 + z*10);                       // folia
    d = smin(d, dc, 0.05);
    d = smin(d, sdCapsule(x,y,z, 0,-0.40,0.30, 0,-1.30,0.48, 0.10), 0.08); // brain stem
    return d;
  }

  /* ==================================================================
   *  1b. Icons as real 3D objects (signed-distance parts), sampled with the
   *      same even spacing as the brain. Coordinates: X right, Y up, D toward you.
   * ================================================================== */
  const clampN = (v, a, b) => v < a ? a : v > b ? b : v;
  const sdSphere = (x, y, z, cx, cy, cz, r) => Math.hypot(x-cx, y-cy, z-cz) - r;
  const sdRBox = (x, y, z, cx, cy, cz, hx, hy, hz, r) => {
    const qx = Math.abs(x-cx) - hx + r, qy = Math.abs(y-cy) - hy + r, qz = Math.abs(z-cz) - hz + r;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
  };
  const sdCap = (x, y, z, ax, ay, az, bx, by, bz, r) => {
    const px = x-ax, py = y-ay, pz = z-az, qx = bx-ax, qy = by-ay, qz = bz-az;
    const h = clampN((px*qx + py*qy + pz*qz) / (qx*qx + qy*qy + qz*qz), 0, 1);
    return Math.hypot(px - qx*h, py - qy*h, pz - qz*h) - r;
  };
  const sdTorusZ = (x, y, z, cx, cy, cz, R, r) => Math.hypot(Math.hypot(x-cx, y-cy) - R, z-cz) - r;
  const sdTorusY = (x, y, z, cx, cy, cz, R, r) => Math.hypot(Math.hypot(x-cx, z-cz) - R, y-cy) - r;
  const sdCylZ = (x, y, z, cx, cy, cz, R, h, rr) => {
    const a = Math.hypot(x-cx, y-cy) - R + rr, b = Math.abs(z-cz) - h + rr;
    return Math.min(Math.max(a, b), 0) + Math.hypot(Math.max(a, 0), Math.max(b, 0)) - rr;
  };
  const sdCylY = (x, y, z, cx, cy, cz, R, h, rr) => {
    const a = Math.hypot(x-cx, z-cz) - R + rr, b = Math.abs(y-cy) - h + rr;
    return Math.min(Math.max(a, b), 0) + Math.hypot(Math.max(a, 0), Math.max(b, 0)) - rr;
  };
  const sdExt = (d2, z, h, rr) => {          // rounded extrusion of a 2D shape
    const a = d2 + rr, b = Math.abs(z) - h + rr;
    return Math.min(Math.max(a, b), 0) + Math.hypot(Math.max(a, 0), Math.max(b, 0)) - rr;
  };
  const sdHeart2 = (x, y) => {
    x = Math.abs(x);
    if (y + x > 1) return Math.hypot(x - 0.25, y - 0.75) - Math.SQRT2/4;
    const t = 0.5*Math.max(x + y, 0);
    return Math.min(Math.hypot(x, y - 1), Math.hypot(x - t, y - t)) * Math.sign(x - y);
  };
  const sdPoly2 = (x, y, v) => {
    let d = (x-v[0][0])**2 + (y-v[0][1])**2, sg = 1;
    for (let i = 0, j = v.length-1; i < v.length; j = i, i++){
      const ex = v[j][0]-v[i][0], ey = v[j][1]-v[i][1], wx = x-v[i][0], wy = y-v[i][1];
      const h = clampN((wx*ex + wy*ey) / (ex*ex + ey*ey), 0, 1), bx = wx - ex*h, by = wy - ey*h;
      d = Math.min(d, bx*bx + by*by);
      const c1 = y >= v[i][1], c2 = y < v[j][1], c3 = ex*wy > ey*wx;
      if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) sg = -sg;
    }
    return sg * Math.sqrt(d);
  };
  const rotXYZ = (x, y, z, rx, ry, rz) => {
    let c = Math.cos(rx), sn = Math.sin(rx); const y1 = y*c - z*sn, z1 = y*sn + z*c;
    c = Math.cos(ry); sn = Math.sin(ry);       const x2 = x*c + z1*sn, z2 = -x*sn + z1*c;
    c = Math.cos(rz); sn = Math.sin(rz);       return [x2*c - y1*sn, x2*sn + y1*c, z2];
  };
  const minOf = (...v) => Math.min(...v);
  const sminK = (a, b, k) => { const h = Math.max(k - Math.abs(a-b), 0)/k; return Math.min(a, b) - h*h*k*0.25; };
  function sdRoundCone(x, y, z, ax, ay, az, bx, by, bz, r1, r2){
    const bax = bx-ax, bay = by-ay, baz = bz-az, l2 = bax*bax + bay*bay + baz*baz, rr = r1 - r2, a2 = l2 - rr*rr, il2 = 1/l2;
    const pax = x-ax, pay = y-ay, paz = z-az, yy = pax*bax + pay*bay + paz*baz, zz = yy - l2;
    const xvx = pax*l2 - bax*yy, xvy = pay*l2 - bay*yy, xvz = paz*l2 - baz*yy, x2 = xvx*xvx + xvy*xvy + xvz*xvz;
    const y2 = yy*yy*l2, z2 = zz*zz*l2, k = Math.sign(rr)*rr*rr*x2;
    if (Math.sign(zz)*a2*z2 > k) return Math.sqrt(x2 + z2)*il2 - r2;
    if (Math.sign(yy)*a2*y2 < k) return Math.sqrt(x2 + y2)*il2 - r1;
    return (Math.sqrt(x2*a2*il2) + yy*rr)*il2 - r1;
  }
  // a finger as tapered bones joined with soft knuckles: pts = [[x,y,z,r], ...]
  const sdFinger = (x, y, z, pts) => {
    let d = 9;
    for (let i = 0; i < pts.length-1; i++){
      const a = pts[i], b = pts[i+1];
      d = sminK(d, sdRoundCone(x, y, z, a[0], a[1], a[2], b[0], b[1], b[2], a[3], b[3]), 0.04);
    }
    return d;
  };
  // realistic pointing hand (back of the hand toward you, index finger up), one smooth surface
  function sdPointingHand(x, y, z){
    // palm + back of hand: a soft, slightly flattened block
    let d = sdRBox(x, y, z, 0.02, -0.36, -0.03, 0.4, 0.4, 0.13, 0.13);
    d = sminK(d, sdSphere(x, y, z, -0.1, -0.2, 0.0, 0.3), 0.2);                                   // fleshy back of hand
    // wrist / forearm stub, widening slightly
    d = sminK(d, sdRoundCone(x, y, z, 0.02, -0.72, -0.04, 0.05, -1.25, -0.08, 0.27, 0.3), 0.14);
    // index finger, extended (three bones, tapering)
    d = sminK(d, sdFinger(x, y, z, [[-0.26, 0.0, 0.02, 0.112], [-0.28, 0.46, 0.04, 0.1], [-0.29, 0.8, 0.06, 0.088], [-0.29, 1.06, 0.07, 0.075]]), 0.07);
    // middle, ring and little finger curled into the palm (folding away from you)
    for (const [fx, fy, r, len] of [[-0.05, 0.03, 0.105, 1.0], [0.15, 0.0, 0.1, 0.95], [0.33, -0.06, 0.088, 0.82]]){
      d = sminK(d, sdFinger(x, y, z, [[fx, fy, 0.0, r], [fx + 0.01, fy + 0.13*len, -0.27*len, r*0.95], [fx + 0.02, fy - 0.1*len, -0.42*len, r*0.88], [fx + 0.02, fy - 0.29*len, -0.3*len, r*0.8]]), 0.06);
    }
    // thumb folded across the curled fingers on the palm side
    d = sminK(d, sdFinger(x, y, z, [[-0.34, -0.6, -0.06, 0.15], [-0.5, -0.3, -0.16, 0.12], [-0.42, -0.06, -0.3, 0.105], [-0.22, 0.0, -0.4, 0.092]]), 0.09);
    // tendons on the back of the hand
    for (const tx of [-0.24, -0.05, 0.15, 0.33]) d = sminK(d, sdCap(x, y, z, tx*0.55 + 0.01, -0.62, 0.1, tx, -0.02, 0.1, 0.028), 0.05);
    return d;
  }

  // each icon: scale, rotation (to show off the 3D form), offset, parts[{ f, box, overlay }]
  const ICON_DEFS = [
    { // 1 HEART, a plump pillow
      scale:1.2, rot:[0.0, 0.0, 0.0], off:[0, 0, 0],
      parts:[{ box:[-1.1,1.1,-1.15,1.1,-0.5,0.5],
        f:(x, y, z) => sdExt(sdHeart2(x/1.5, (y + 1.0)/1.5)*1.5, z, 0.36, 0.32) }] },
    { // 2 TARGET, raised rings with an arrow stuck in the bullseye
      scale:1.12, rot:[-0.2, 0.3, 0.0], off:[-0.05, -0.08, 0],
      parts:(() => {
        const out = [];
        for (const R of [1.0, 0.68, 0.36])
          out.push({ box:[-R-0.12,R+0.12,-R-0.12,R+0.12,-0.12,0.2], f:(x, y, z) => sdTorusZ(x, y, z, 0, 0, 0.05, R, 0.075) });
        out.push({ box:[-0.25,0.25,-0.25,0.25,-0.1,0.3], f:(x, y, z) => sdSphere(x, y, z, 0, 0, 0.08, 0.17) });
        const d = (() => { const v = [0.62, 0.6, 0.5], l = Math.hypot(...v); return v.map(a => a/l); })();
        const E = [0.95, 0.92, 1.2], T = [0.02, 0.02, 0.12];
        const nx = (() => { const c = [d[1], -d[0], 0]; const l = Math.hypot(...c); return c.map(a => a/l); })();
        out.push({ box:[0,1.15,0,1.1,0.0,1.4], f:(x, y, z) => sdCap(x, y, z, T[0], T[1], T[2], E[0], E[1], E[2], 0.055) });
        const fins = [];
        for (const k of [0, 0.17]){
          const P = [E[0]-d[0]*k, E[1]-d[1]*k, E[2]-d[2]*k];
          for (const sg of [-1, 1]) fins.push([P[0], P[1], P[2], P[0] - d[0]*0.24 + nx[0]*0.17*sg, P[1] - d[1]*0.24 + nx[1]*0.17*sg, P[2] - d[2]*0.24 + nx[2]*0.17*sg]);
        }
        out.push({ box:[0.5,1.35,0.4,1.3,0.7,1.5], f:(x, y, z) => minOf(...fins.map(q => sdCap(x, y, z, q[0], q[1], q[2], q[3], q[4], q[5], 0.032))) });
        return out;
      })() },
    { // 3 COMPASS, bezel rings, tick marks and a chunky needle
      scale:1.12, rot:[0.0, 0.0, 0.0], off:[0, 0, 0],
      parts:[
        { box:[-1.2,1.2,-1.2,1.2,-0.15,0.15], f:(x, y, z) => sdTorusZ(x, y, z, 0, 0, 0, 1.0, 0.1) },
        { box:[-1.0,1.0,-1.0,1.0,-0.1,0.1], f:(x, y, z) => sdTorusZ(x, y, z, 0, 0, 0, 0.84, 0.045) },
        { box:[-0.85,0.85,-0.85,0.85,-0.1,0.1], f:(x, y, z) => {
            const r = Math.hypot(x, y), sec = Math.PI*2/32, a = Math.atan2(y, x);
            const al = (((a % sec) + sec) % sec) - sec/2;
            const major = Math.abs(Math.round(a/sec)) % 4 === 0, len = major ? 0.13 : 0.07;
            const u = r - (0.76 - len/2 + 0.03), v = al*r;
            return Math.hypot(Math.max(Math.abs(u) - len/2, 0), Math.max(Math.abs(v) - 0.022, 0), Math.max(Math.abs(z) - 0.03, 0)) - 0.012;
          } },
        { box:[-0.6,0.6,-0.9,0.9,-0.2,0.3], f:(x, y, z) => {
            const dx = -Math.sin(0.7), dy = Math.cos(0.7);          // needle axis, pointing up-left
            const P = (t) => [dx*t, dy*t];
            const a1 = P(0.3), a2 = P(0.7), b1 = P(-0.3), b2 = P(-0.62);
            return minOf(sdCap(x, y, z, 0, 0, 0.1, a1[0], a1[1], 0.1, 0.17), sdCap(x, y, z, a1[0], a1[1], 0.1, a2[0], a2[1], 0.1, 0.085),
                         sdCap(x, y, z, 0, 0, 0.1, b1[0], b1[1], 0.1, 0.14), sdCap(x, y, z, b1[0], b1[1], 0.1, b2[0], b2[1], 0.1, 0.07),
                         sdSphere(x, y, z, 0, 0, 0.17, 0.18));
          } },
      ] },
    { // 4 LIGHT BULB, glass, filament, screw cap and rays
      scale:1.04, rot:[0.0, 0.3, 0.0], off:[0, 0.05, 0],
      parts:[
        { box:[-0.8,0.8,-0.65,1.0,-0.8,0.8], f:(x, y, z) => { const a = sdSphere(x, y, z, 0, 0.3, 0, 0.66), b = sdCylY(x, y, z, 0, -0.3, 0, 0.3, 0.25, 0.05); const k = 0.3, h = Math.max(k - Math.abs(a-b), 0)/k; return Math.min(a, b) - h*h*k*0.25; } },
        { box:[-0.4,0.4,-1.2,-0.5,-0.4,0.4], f:(x, y, z) => minOf(sdCylY(x, y, z, 0, -0.78, 0, 0.27, 0.22, 0.04), sdTorusY(x, y, z, 0, -0.68, 0, 0.27, 0.04), sdTorusY(x, y, z, 0, -0.80, 0, 0.27, 0.04), sdTorusY(x, y, z, 0, -0.92, 0, 0.27, 0.04), sdSphere(x, y, z, 0, -1.04, 0, 0.11)) },
        { box:[-0.25,0.25,-0.5,0.4,-0.06,0.06], overlay:true, f:(x, y, z) => {
            const q = [[-0.18,-0.45],[-0.18,0.1],[-0.09,0.32],[0,0.1],[0.09,0.32],[0.18,0.1],[0.18,-0.45]];
            let d = 9; for (let i = 0; i < q.length-1; i++) d = Math.min(d, sdCap(x, y, z, q[i][0], q[i][1], 0, q[i+1][0], q[i+1][1], 0, 0.022));
            return d;
          } },
        { box:[-1.3,1.3,-0.5,1.5,-0.08,0.08], f:(x, y, z) => {
            let d = 9; for (const deg of [-25, 15, 55, 90, 125, 165, 205]){ const an = deg*Math.PI/180, c = Math.cos(an), sn = Math.sin(an); d = Math.min(d, sdCap(x, y, z, 0.9*c, 0.3 + 0.9*sn, 0, 1.15*c, 0.3 + 1.15*sn, 0, 0.032)); }
            return d;
          } },
      ] },
    { // 5 HAND: index finger out, about to tap
      scale:1.2, rot:[0.24, 0.18, 0.12], off:[0.12, -0.04, 0],
      parts:[{ box:[-0.75,0.6,-1.3,1.2,-0.7,0.35], f:(x, y, z) => sdPointingHand(x, y, z) }] },
    { // 6 GIFT BOX with ribbon and bow
      scale:1.1, rot:[0.26, 0.32, 0.0], off:[0, 0.05, 0],
      parts:[
        { box:[-0.85,0.85,-1.12,-0.08,-0.85,0.85], f:(x, y, z) => sdRBox(x, y, z, 0, -0.58, 0, 0.7, 0.46, 0.7, 0.05) },
        { box:[-0.95,0.95,-0.1,0.3,-0.95,0.95], f:(x, y, z) => sdRBox(x, y, z, 0, 0.1, 0, 0.78, 0.17, 0.78, 0.05) },
        { box:[-0.85,0.85,-1.12,0.32,-0.9,0.9], f:(x, y, z) => minOf(
            sdRBox(x, y, z, 0, -0.58, 0, 0.13, 0.47, 0.72, 0.02), sdRBox(x, y, z, 0, -0.58, 0, 0.72, 0.47, 0.13, 0.02),
            sdRBox(x, y, z, 0, 0.1, 0, 0.14, 0.19, 0.8, 0.02), sdRBox(x, y, z, 0, 0.1, 0, 0.8, 0.19, 0.14, 0.02)) },
        { box:[-0.85,0.85,0.2,1.0,-0.25,0.25], f:(x, y, z) => {
            const loop = (cx, ang) => { const c = Math.cos(-ang), sn = Math.sin(-ang), u = (x-cx)*c - (y-0.58)*sn, v = (x-cx)*sn + (y-0.58)*c; return sdTorusZ(u*0.8, v, z, 0, 0, 0, 0.27, 0.06); };
            return minOf(loop(-0.3, 0.5), loop(0.3, -0.5), sdSphere(x, y, z, 0, 0.38, 0, 0.15),
              sdCap(x, y, z, 0, 0.38, 0.05, -0.38, 0.3, 0.12, 0.05), sdCap(x, y, z, 0, 0.38, 0.05, 0.38, 0.3, 0.12, 0.05));
          } },
      ] },
  ];

  // octahedral-pack a unit normal into one float (24-bit exact)
  function packNormal(nx, ny, nz){
    const l = Math.abs(nx) + Math.abs(ny) + Math.abs(nz) || 1;
    let ox = nx/l, oy = ny/l;
    if (nz < 0){ const ax = Math.abs(oy), ay = Math.abs(ox); ox = (1 - ax) * (ox >= 0 ? 1 : -1); oy = (1 - ay) * (oy >= 0 ? 1 : -1); }
    const qx = Math.round((ox*0.5 + 0.5)*4095), qy = Math.round((oy*0.5 + 0.5)*4095);
    return qx*4096 + qy;
  }

  // even-spaced surface points for one icon -> Float32Array(count*4): model xyz + packed normal
  function buildIcon3D(def, spacing){
    const t0 = performance.now();
    const sc = def.scale || 1, r = spacing, r2 = r*r, inv = 1/r, e = 0.003;
    const parts = def.parts.map(pt => ({ f:(x, y, z) => pt.f(x/sc, y/sc, z/sc)*sc, box:pt.box.map(v => v*sc), overlay:!!pt.overlay, ghost:!!pt.ghost, useGhost:!!pt.useGhost }));
    const grid = new Map(), key = (i, j, k) => ((i+512)*1024 + (j+512))*1024 + (k+512);
    const X = [], Y = [], Z = [], NX = [], NY = [], NZ = [];
    parts.forEach((part, pi) => {
      if (part.ghost) return;                          // ghosts only hide other parts, they have no particles
      const [a0, a1, b0, b1, c0, c1] = part.box, pad = 0.12;
      const x0 = a0-pad, x1 = a1+pad, y0 = b0-pad, y1 = b1+pad, z0 = c0-pad, z1 = c1+pad;
      let hit = 0; const S = 1500, th = 0.05;
      for (let i = 0; i < S; i++) if (Math.abs(part.f(x0 + Math.random()*(x1-x0), y0 + Math.random()*(y1-y0), z0 + Math.random()*(z1-z0))) < th) hit++;
      const A = Math.max((x1-x0)*(y1-y0)*(z1-z0)*hit/S/(2*th), 0.02);
      const cand = Math.min(80000, Math.ceil(10*A/r2));
      for (let c = 0; c < cand; c++){
        let x = x0 + Math.random()*(x1-x0), y = y0 + Math.random()*(y1-y0), z = z0 + Math.random()*(z1-z0);
        let d = part.f(x, y, z);
        if (Math.abs(d) > 0.25) continue;
        for (let it = 0; it < 4 && Math.abs(d) > 0.0015; it++){
          const gx = part.f(x+e, y, z) - part.f(x-e, y, z), gy = part.f(x, y+e, z) - part.f(x, y-e, z), gz = part.f(x, y, z+e) - part.f(x, y, z-e);
          const gl = Math.hypot(gx, gy, gz) || 1;
          x -= gx/gl*d; y -= gy/gl*d; z -= gz/gl*d; d = part.f(x, y, z);
        }
        if (Math.abs(d) > 0.004) continue;
        if (!part.overlay){
          let hidden = false;
          for (let j = 0; j < parts.length; j++) if (j !== pi && !parts[j].overlay && (!parts[j].ghost || part.useGhost) && parts[j].f(x, y, z) < -0.012){ hidden = true; break; }
          if (hidden) continue;
        }
        const ix = Math.floor(x*inv), iy = Math.floor(y*inv), iz = Math.floor(z*inv);
        let ok = true;
        for (let a = -1; a <= 1 && ok; a++) for (let b = -1; b <= 1 && ok; b++) for (let g = -1; g <= 1 && ok; g++){
          const cell = grid.get(key(ix+a, iy+b, iz+g));
          if (!cell) continue;
          for (let q = 0; q < cell.length; q++){
            const k = cell[q], dx = X[k]-x, dy = Y[k]-y, dz = Z[k]-z;
            if (dx*dx + dy*dy + dz*dz < r2){ ok = false; break; }
          }
        }
        if (!ok) continue;
        const gx = part.f(x+e, y, z) - part.f(x-e, y, z), gy = part.f(x, y+e, z) - part.f(x, y-e, z), gz = part.f(x, y, z+e) - part.f(x, y, z-e);
        const gl = Math.hypot(gx, gy, gz) || 1, k = X.length, kk = key(ix, iy, iz);
        (grid.get(kk) || grid.set(kk, []).get(kk)).push(k);
        X.push(x); Y.push(y); Z.push(z); NX.push(gx/gl); NY.push(gy/gl); NZ.push(gz/gl);
      }
    });
    const n = X.length, out = new Float32Array(n*4), [rx, ry, rz] = def.rot, off = def.off;
    for (let i = 0; i < n; i++){
      const [px, py, pz] = rotXYZ(X[i], Y[i], Z[i], rx, ry, rz), [qx, qy, qz] = rotXYZ(NX[i], NY[i], NZ[i], rx, ry, rz);
      const wx = px + off[0], wy = py + off[1], wz = pz + off[2];
      // to the brain's model space: screen x -> z, up -> y, toward viewer -> -x
      out[i*4] = -wz; out[i*4+1] = wy; out[i*4+2] = wx;
      out[i*4+3] = packNormal(-qz, qy, qx);
    }
    console.info(`[icon] ${n} particles in ${(performance.now()-t0).toFixed(0)} ms`);
    return out;
  }
  const ICON_CACHE = new Map();
  let iconToken = 0;
  function scheduleIcons(pts, spacing){
    const token = ++iconToken, attrs = pts.userData.iconAttrs, n = pts.geometry.attributes.position.count, key = spacing.toFixed(4);
    let list = ICON_CACHE.get(key); if (!list){ list = []; ICON_CACHE.set(key, list); }
    let k = 0;
    const step = () => {
      if (token !== iconToken || k >= ICON_DEFS.length) return;
      if (!list[k]) list[k] = buildIcon3D(ICON_DEFS[k], spacing);
      const data = list[k], cnt = Math.min(data.length/4, n);
      attrs[k].array.set(data.subarray(0, cnt*4), 0);
      attrs[k].needsUpdate = true;
      k++; setTimeout(step, 16);
    };
    setTimeout(step, 40);
  }

  /* ==================================================================
   *  2. Evenly spaced particles on the surface
   *     ray-march candidates onto the outer surface, then keep a
   *     Poisson-disk subset so every particle sits on its own (like the video)
   * ================================================================== */

  function buildBrain(spacing, amp){
    const t0 = performance.now();
    const C = Math.min(160000, Math.round(56000 * (0.046/spacing)**2));
    const inv = 1/spacing, r2 = spacing*spacing;
    const grid = new Map();
    const key = (i,j,k) => ((i+600)*1200 + (j+600))*1200 + (k+600);
    const P = [], N = [], Pa = [], F = [];
    const e = 0.004;
    for (let c = 0; c < C; c++){
      const tx = (Math.random()*2-1)*0.5, ty = -1.25 + Math.random()*2.0, tz = (Math.random()*2-1)*1.0;
      const u = Math.random()*2-1, th = Math.random()*Math.PI*2, s = Math.sqrt(1-u*u);
      const dx = s*Math.cos(th), dy = u, dz = s*Math.sin(th);
      const ox = tx + dx*4, oy = ty + dy*4, oz = tz + dz*4;
      let t = 0, px = 0, py = 0, pz = 0, hit = false;
      for (let k = 0; k < 90; k++){
        px = ox - dx*t; py = oy - dy*t; pz = oz - dz*t;
        const d = brainSDF(px, py, pz, amp);
        if (k === 0 && d < 0) break;
        if (d < 0.0015){ hit = true; break; }
        t += Math.max(d*0.7, 0.002);
        if (t > 8) break;
      }
      if (!hit) continue;
      // Poisson-disk rejection
      const ix = Math.floor(px*inv), iy = Math.floor(py*inv), iz = Math.floor(pz*inv);
      let ok = true;
      for (let a = -1; a <= 1 && ok; a++) for (let b = -1; b <= 1 && ok; b++) for (let g = -1; g <= 1 && ok; g++){
        const cell = grid.get(key(ix+a, iy+b, iz+g));
        if (!cell) continue;
        for (let q = 0; q < cell.length; q++){
          const j = cell[q]*3, ex = P[j]-px, ey = P[j+1]-py, ez = P[j+2]-pz;
          if (ex*ex + ey*ey + ez*ez < r2){ ok = false; break; }
        }
      }
      if (!ok) continue;
      const idx = P.length/3, kk = key(ix, iy, iz);
      (grid.get(kk) || grid.set(kk, []).get(kk)).push(idx);
      P.push(px, py, pz);
      // surface normal from the SDF gradient
      let nx = brainSDF(px+e,py,pz,amp) - brainSDF(px-e,py,pz,amp);
      let ny = brainSDF(px,py+e,pz,amp) - brainSDF(px,py-e,pz,amp);
      let nz = brainSDF(px,py,pz+e,amp) - brainSDF(px,py,pz-e,amp);
      const nl = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
      N.push(nx/nl, ny/nl, nz/nl);
      Pa.push(vnoise(px*1.5+20, py*1.5, pz*1.5));   // soft colour patches
      F.push(amp > 0 && cerebrum(px, py, pz) < 0.08 ? gyri(px, py, pz) : 1);   // 0 = deep in a crevice
    }
    const n = P.length/3;
    const rnd = new Float32Array(n*4), sca = new Float32Array(n*3);
    for (let i = 0; i < n; i++){
      rnd[i*4] = Math.random(); rnd[i*4+1] = Math.random(); rnd[i*4+2] = 0.85 + Math.random()*0.3; rnd[i*4+3] = 0;
      sca[i*3] = (Math.random()*2-1)*3.4; sca[i*3+1] = (Math.random()*2-1)*1.9; sca[i*3+2] = (Math.random()*2-1)*1.8;
    }
    console.info(`[brain] ${n} particles from ${C} candidates in ${(performance.now()-t0).toFixed(0)} ms`);
    return { pos:new Float32Array(P), nor:new Float32Array(N), patch:new Float32Array(Pa), fold:new Float32Array(F), rnd, sca, count:n };
  }

  function buildAmbient(n){
    const pos = new Float32Array(n*3), nor = new Float32Array(n*3), rnd = new Float32Array(n*4);
    for (let i = 0; i < n; i++){
      pos.set([(Math.random()*2-1)*6.5, (Math.random()*2-1)*3.6, -2.5 + Math.random()*4], i*3);
      nor.set([0, 0, 1], i*3);
      rnd[i*4] = Math.random(); rnd[i*4+1] = Math.random();
      rnd[i*4+2] = Math.random() < 0.15 ? 4 + Math.random()*3.5 : 1 + Math.random()*1.4;
      rnd[i*4+3] = 1;
    }
    return { pos, nor, rnd, sca:pos.slice(), patch:new Float32Array(n).fill(0.5), fold:new Float32Array(n).fill(1), count:n };
  }

  // icon ids: 1 heart, 2 target, 3 compass, 4 light bulb, 5 hand + phone, 6 gift box
  const FORM_NOTE = {
    1:'Particles form a heart &mdash; empathy comes first',
    2:'Particles lock onto a target &mdash; one clear problem',
    3:'Particles settle into a compass &mdash; finding direction',
    4:'Particles light a bulb &mdash; ideas sparking',
    5:'Particles form a hand about to tap &mdash; making it real',
    6:'Particles wrap into a gift &mdash; delivered',
  };
  const PROCESSES = {
    ess: { forms:[1,4,6], steps:[
      { name:'Empathize', tag:'Listen before designing', time:'Weeks 1–2',
        desc:'I start with people, not pixels. Interviews, observation and data show me what users truly need, and what the business is trying to achieve.',
        points:['User & stakeholder interviews','Research synthesis & journey maps','A sharp problem statement'],
        out:'Insights · Problem statement' },
      { name:'Ideate', tag:'From spark to something real', time:'Weeks 3–6',
        desc:'Workshops, sketches and quick prototypes explore many directions. Real users test the strongest ones, and the design gets better with every round.',
        points:['Sketching & co-creation workshops','Interactive prototypes','Usability testing & iteration'],
        out:'Validated prototype' },
      { name:'Ship', tag:'Deliver it well, then measure', time:'Weeks 7–9',
        desc:'Polished UI, a scalable design system and close pairing with engineers get it live. After launch I track the numbers that show what to improve next.',
        points:['UI design & design system','Dev handoff & design QA','Post-launch measurement'],
        out:'Launch kit · Impact report' },
    ]},
    lean: { forms:[1,2,5,6], steps:[
      { name:'Empathize', tag:'Understand the people', time:'Weeks 1–2',
        desc:'Interviews, observation and data show me who I am designing for and what gets in their way, before anyone proposes a solution.',
        points:['User & stakeholder interviews','Field research & analytics review','Journey maps & key insights'],
        out:'Research synthesis · Insights' },
      { name:'Define', tag:'Aim at the right problem', time:'Week 3',
        desc:'Insights become one clear problem statement. We agree on goals, scope and the metrics that will tell us we hit the target.',
        points:['Personas & jobs-to-be-done','“How might we” framing','Success metrics & scope'],
        out:'Problem statement · Design principles' },
      { name:'Design', tag:'Ideate, prototype, test', time:'Weeks 4–7',
        desc:'Sketches become flows and interactive prototypes in short loops. Real people try them, and each round sharpens the design until it feels effortless.',
        points:['Ideation workshops & sketching','Wireframes & Figma prototypes','Usability testing & iteration'],
        out:'Tested prototype · UI kit' },
      { name:'Ship', tag:'Deliver, then keep learning', time:'Weeks 8–10',
        desc:'High-fidelity UI on a scalable design system, handed off with specs and pairing sessions, then measured after launch to see what really moved.',
        points:['UI design & design system','Dev handoff & design QA','Post-launch metrics review'],
        out:'Hi-fi UI kit · Launch report' },
    ]},
    full: { forms:[1,2,3,4,5,6], steps:[
      { name:'Empathize', tag:'Walk in their shoes', time:'Weeks 1–2',
        desc:'I talk to the people who will use the product, watch how they work today, and collect the stories hiding behind the numbers.',
        points:['User interviews & diary studies','Shadowing & contextual inquiry','Support tickets & analytics mining'],
        out:'Empathy maps · Raw insights' },
      { name:'Define', tag:'Frame the problem clearly', time:'Week 3',
        desc:'Patterns across the research become a single, testable problem statement and a short list of opportunities worth pursuing.',
        points:['Affinity mapping & themes','Personas & jobs-to-be-done','Problem statement & KPIs'],
        out:'Problem brief · Priorities' },
      { name:'Explore', tag:'Find the best direction', time:'Week 4',
        desc:'Before committing, I map the territory: competitors, patterns, technical limits and different ways the product could work.',
        points:['Competitive & pattern research','Concept sketches & moodboards','Feasibility chats with engineering'],
        out:'Concept directions' },
      { name:'Ideate', tag:'Generate, then choose', time:'Week 5',
        desc:'Workshops with the team produce dozens of ideas. Then we converge, scoring by impact, effort and risk, to pick what to prototype.',
        points:['Crazy-8s & design studios','Impact / effort prioritisation','Concept storyboards'],
        out:'Concept shortlist · User flows' },
      { name:'Prototype', tag:'Make it tangible, then test it', time:'Weeks 6–8',
        desc:'Wireframes grow into interactive prototypes, just real enough to learn from. Usability sessions show what works and what confuses.',
        points:['Wireframes & Figma prototypes','Moderated usability sessions','Iteration & UI kit'],
        out:'Tested prototype · UI kit' },
      { name:'Ship', tag:'Land it, then measure', time:'Weeks 9–10',
        desc:'Polished specs, motion notes and pairing with engineers get it live. A post-launch review shows what to improve next.',
        points:['Dev handoff & design QA','Motion & interaction specs','Post-launch measurement'],
        out:'Launch kit · Impact report' },
    ]},
  };


  /* ------------------------------------------------------------------
   *  Steps
   * ------------------------------------------------------------------ */
  const proc = PROCESSES[SETTINGS.process], N = proc.steps.length;
  let stepNodes = [], railBtns = [];
  const goTo = q => scroller.scrollTo({ top:(0.9 + q) * scroller.clientHeight, behavior:reduced() ? 'auto' : 'smooth' });
  track.style.height = ((N + 3.1) * 100) + '%';
  stepsEl.innerHTML = proc.steps.map((st, i) => `
    <article class="process-step">
      <p class="process-kicker"><span>${String(i+1).padStart(2,'0')} / ${String(N).padStart(2,'0')}</span><span class="process-time">${st.time}</span></p>
      <h3>${st.name}</h3>
      <p class="process-tag">${st.tag}</p>
      <p class="process-desc">${st.desc}</p>
      <ul>${st.points.map(x => `<li>${x}</li>`).join('')}</ul>
      <p class="process-out"><b>Outputs</b>${st.out}</p>
      <p class="process-note"><i></i><span>${FORM_NOTE[proc.forms[i]]}</span></p>
    </article>`).join('');
  stepNodes = [...stepsEl.children];
  railEl.innerHTML = proc.steps.map(st => `<li><button type="button" aria-label="${st.name}" title="${st.name}"></button></li>`).join('');
  railBtns = [...railEl.querySelectorAll('button')];
  railBtns.forEach((b, i) => b.addEventListener('click', () => goTo(i + 0.5)));
  mobileDots.innerHTML = proc.steps.map((st,i) => `<button type="button" aria-label="Go to ${st.name}" data-step="${i}"></button>`).join('');
  const dotBtns = [...mobileDots.querySelectorAll('button')];
  dotBtns.forEach((b,i) => b.addEventListener('click', () => goTo(i + 0.5)));
  $('.process-start').addEventListener('click', () => goTo(0.5));
  let activeStep = -1;
  function mobileStep(delta){
    const next = Math.max(-1, Math.min(N, activeStep + delta));
    if(next < 0) scroller.scrollTo({top:0,behavior:reduced()?'auto':'smooth'});
    else if(next >= N) goTo(N + 0.65);
    else goTo(next + 0.5);
  }
  mobilePrev.addEventListener('click', () => mobileStep(-1));
  mobileNext.addEventListener('click', () => mobileStep(1));
  let swipeStart = null;
  section.addEventListener('pointerdown', e => { if(e.pointerType === 'touch' && !e.target.closest('button,a')) swipeStart={x:e.clientX,y:e.clientY}; }, {passive:true});
  section.addEventListener('pointerup', e => {
    if(!swipeStart || e.pointerType !== 'touch') return;
    const dx=e.clientX-swipeStart.x,dy=e.clientY-swipeStart.y;swipeStart=null;
    if(Math.abs(dx)>48 && Math.abs(dx)>Math.abs(dy)*1.25) mobileStep(dx<0?1:-1);
  }, {passive:true});

  // formation pair + blend for a given position q along the steps
  function formAt(q){
    const S = [0, ...proc.forms];
    if (q <= 0) return [0, S[1], 0];
    if (q < 0.35) return [0, S[1], q / 0.35];
    const r = q - 0.35, i = Math.floor(r), f = r - i;
    return [S[Math.min(1 + i, N)], S[Math.min(2 + i, N)], 1 + i >= N ? 0 : sstep(0.65, 1, f)];
  }

  // text, rail and outro follow the (smoothed) scroll position
  function updateUI(Ts){
    const q = Ts - 0.9;
    const heroO = 1 - sstep(0.05, 0.55, Ts);
    heroCopy.style.opacity = heroO.toFixed(3);
    heroCopy.classList.toggle('live', heroO > 0.5);
    heroCopy.style.translate = `0 ${(-sstep(0.05, 0.55, Ts) * 30).toFixed(1)}px`;
    hint.style.opacity = (1 - sstep(0, 0.2, Ts)).toFixed(3);
    let active = -1;
    stepNodes.forEach((el, i) => {
      const inn = sat((q - i) / 0.22), out = sat((i + 1 - q) / 0.22), o = Math.min(inn, out);
      el.style.opacity = o.toFixed(3);
      el.style.setProperty('--y', (q < i + 0.5 ? (1 - inn) * 30 : -(1 - out) * 30).toFixed(1) + 'px');
      el.classList.toggle('live', o > 0.6);
      if (o > 0.5) active = i;
    });
    railEl.style.opacity = (sat((q + 0.2) / 0.3) * sat((N - 0.1 - q) / 0.3)).toFixed(3);
    railBtns.forEach((b, i) => { b.classList.toggle('on', i === active); b.setAttribute('aria-current', i === active ? 'step' : 'false'); });
    activeStep = active >= 0 ? active : (q > N ? N : -1);
    dotBtns.forEach((b,i)=>b.classList.toggle('on',i===active));
    mobilePrev.disabled = active < 0;
    mobileNext.disabled = q > N + 0.3;
    const outroO = sstep(N + 0.25, N + 0.75, q);
    outro.style.opacity = outroO.toFixed(3);
    outro.classList.toggle('live', outroO > 0.6);
    return q;
  }

  /* ------------------------------------------------------------------
   *  Three.js engine (loaded the first time My process opens)
   * ------------------------------------------------------------------ */
  let THREE = null, engine = null;
  function loadThree(){
    if (window.THREE) return Promise.resolve(window.THREE);
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      s.onload = () => resolve(window.THREE); s.onerror = reject;
      document.head.append(s);
    });
  }

  function createEngine(){
    const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true, powerPreference:'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.z = 7;

    // [rim / main, accent patch A, accent patch B, lit face]
    const PALETTES = {
      solar:  ['#ffb915', '#8f5bff', '#2ec4c9', '#e6e6f0'],
      aurora: ['#3df5d0', '#ff4fd8', '#5a7bff', '#e4fbff'],
      ember:  ['#ff6a2b', '#ffcf5a', '#ff3d6e', '#fff0e2'],
      mono:   ['#ffffff', '#9aa0b5', '#6b7088', '#d8d8e0'],
    };
    const TRAIL = 10;
    const trail = Array.from({ length:TRAIL }, () => new THREE.Vector3(9, 9, 0));
    const uniforms = {
      uTime:{value:0}, uViewH:{value:1}, uWorldSize:{value:0.04}, uAmbSize:{value:0.04},
      uScatter:{value:0}, uAspect:{value:1}, uTrail:{value:trail},
      uFormA:{value:0}, uFormB:{value:0}, uMix:{value:0}, uBurst:{value:0},
      uRadius:{value:0.24}, uMode:{value:0}, uStrength:{value:0.55}, uShape:{value:0}, uSizeMul:{value:1},
      uC1:{value:new THREE.Color()}, uC2:{value:new THREE.Color()}, uC3:{value:new THREE.Color()}, uCore:{value:new THREE.Color()},
    };
    function setPalette(name){
      const [a, b, c, d] = PALETTES[name];
      uniforms.uC1.value.set(a); uniforms.uC2.value.set(b); uniforms.uC3.value.set(c); uniforms.uCore.value.set(d);
    }
    setPalette('solar');

    const vert = `
      #define TRAIL ${TRAIL}
      attribute vec4 aRand;      // seed, angle, size, ambient flag
      attribute vec3 aScatter;
      attribute float aPatch;
      attribute float aFold;
      attribute vec4 aF1, aF2, aF3, aF4, aF5, aF6;   // icon surface point (xyz) + packed normal (w, -1 = unused)
      uniform float uTime, uViewH, uWorldSize, uAmbSize, uScatter, uAspect, uRadius, uMode, uStrength, uSizeMul;
      uniform float uFormA, uFormB, uMix, uBurst;
      uniform vec3 uTrail[TRAIL];
      uniform vec3 uC1, uC2, uC3, uCore;
      varying vec3 vCol;
      varying float vAlpha, vAngle, vSize, vBlur;

      float hh(float x){ return fract(sin(x*91.3458 + 17.13) * 43758.5453); }
      // the screen plane is the model's (z, y) plane because the brain is turned side-on
      vec3 scr(vec2 xy, float depth){ return vec3(depth, xy.y, xy.x); }

      vec4 pickF(float id){
        if (id < 1.5) return aF1;
        if (id < 2.5) return aF2;
        if (id < 3.5) return aF3;
        if (id < 4.5) return aF4;
        if (id < 5.5) return aF5;
        return aF6;
      }
      // position, normal and visibility of this particle in formation id (0 = the brain itself)
      void formData(float id, vec3 bp, vec3 bn, float seed, float t, out vec3 pos, out vec3 nrm, out float vis){
        if (id < 0.5){ pos = bp; nrm = bn; vis = 1.0; return; }
        vec4 f = pickF(id);
        pos = f.xyz;
        if (id < 1.5){                                   // the heart beats
          float beat = 1.0 + 0.05*pow(max(sin(t*3.2), 0.0), 3.0);
          pos.yz *= beat;
        }
        pos += 0.006*vec3(sin(t*1.3 + seed*40.0), sin(t*1.1 + seed*33.0), cos(t*1.2 + seed*27.0));
        if (f.w < 0.0){ vis = 0.0; nrm = bn; return; }   // spare particle: not part of this icon
        vis = 1.0;
        float qx = floor(f.w/4096.0 + 0.001), qy = f.w - qx*4096.0;
        vec2 o = vec2(qx, qy)/4095.0*2.0 - 1.0;
        float z = 1.0 - abs(o.x) - abs(o.y);
        if (z < 0.0) o = (1.0 - abs(o.yx)) * vec2(o.x >= 0.0 ? 1.0 : -1.0, o.y >= 0.0 ? 1.0 : -1.0);
        nrm = normalize(vec3(o, z));
      }

      void main(){
        float seed = aRand.x;
        float amb  = step(0.5, aRand.w);
        float t = uTime;
        float s = smoothstep(0.0, 1.0, uScatter);
        // morph between two formations (brain = 0), with a little flying-around in the middle
        float m = smoothstep(0.0, 1.0, uMix);
        vec3 posA, nrmA, posB, nrmB; float visA, visB;
        formData(uFormA, position, normal, seed, t, posA, nrmA, visA);
        formData(uFormB, position, normal, seed, t, posB, nrmB, visB);
        vec3 fp = mix(posA, posB, m);
        vec3 fn = normalize(mix(nrmA, nrmB, m) + vec3(1e-4));
        fp += (vec3(hh(seed*21.0), hh(seed*23.0), hh(seed*29.0)) - 0.5) * 1.4 * sin(3.14159*m);
        float formAmt = mix(step(0.5, uFormA), step(0.5, uFormB), m);
        float loose = max(s, amb);
        float fvis = max(mix(mix(visA, visB, m), 1.0, s), amb);   // spare particles reappear for the explosion

        vec3 p = fp + fn * sin(t*1.1 + seed*40.0) * 0.005 * (1.0 - amb) * (1.0 - formAmt);
        vec3 drift = vec3(sin(t*0.30+seed*20.0), cos(t*0.25+seed*30.0), sin(t*0.20+seed*10.0));
        // the explosion throws every particle outward from where it was
        vec3 sp = mix(aScatter*1.25 + fp*0.6, aScatter, amb) + drift*(0.25 + amb*0.35);
        p = mix(p, sp, max(s, amb));

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vec3 nv = normalize(normalMatrix * fn);
        float sc = length(modelViewMatrix[0].xyz);

        // only the side of the brain facing the camera is shown
        float front = smoothstep(mix(-0.05, -0.42, formAmt), mix(0.25, 0.12, formAmt), nv.z);
        // depth relative to the brain's centre: the far half (other hemisphere,
        // back of the head) fades right down so the near surface reads cleanly
        vec4 cv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float depthRel = (mv.z - cv.z) / sc;            // > 0 = nearer the camera
        float near = mix(smoothstep(-0.25, 0.35, depthRel), smoothstep(-0.2, 0.25, depthRel), formAmt);
        float visible = front * mix(0.06, 1.0, near);
        visible = mix(visible, 1.0, loose);

        // cursor + its fading trail (screen space)
        vec4 c0 = projectionMatrix * mv;
        vec2 ndc = c0.xy / c0.w;
        float inf = 0.0; vec2 dir = vec2(0.0);
        for (int k = 0; k < TRAIL; k++){
          vec3 tr = uTrail[k];
          vec2 d = (ndc - tr.xy) * vec2(uAspect, 1.0);
          float dist = length(d);
          float w = (1.0 - smoothstep(0.0, uRadius, dist)) * tr.z;
          if (w > inf){ inf = w; dir = d / (dist + 1e-4); }
        }
        inf *= visible * fvis;
        vec2 push = uMode < 0.5 ? dir*0.1 : (uMode < 1.5 ? dir : (uMode < 2.5 ? -dir : vec2(-dir.y, dir.x)));
        float j = 0.6 + 0.4*fract(seed*13.7);
        mv.xy += push * inf * uStrength * j;
        mv.z  += inf * uStrength * (uMode < 0.5 ? 1.8 : 0.6) * j;
        gl_Position = projectionMatrix * mv;

        // colour: lit face -> tinted patches -> gold rim (fresnel)
        float rim = 1.0 - clamp(nv.z, 0.0, 1.0) + (seed - 0.5)*0.14;
        vec3 band = aPatch > 0.66 ? uC2 : (aPatch < 0.27 ? uC3 : uC1);
        float patchMix = smoothstep(0.08, 0.2, abs(aPatch - 0.5)) * 0.55;
        vec3 face = mix(uCore*0.78, band, patchMix);
        vec3 col = mix(face, band, smoothstep(mix(0.40, 0.22, formAmt), mix(0.66, 0.6, formAmt), rim));
        col = mix(col, uC1, smoothstep(0.62, 0.92, rim) * 0.8);
        vec3 confetti = seed < 0.5 ? uC1 : (seed < 0.72 ? uC2 : (seed < 0.9 ? uC3 : uCore));
        col = mix(col, confetti, loose);
        // icons get a soft key light from the upper left so their curves read as solid objects
        float lit = 0.62 + 0.55 * clamp(dot(nv, normalize(vec3(-0.45, 0.6, 0.65))), -0.4, 1.0);
        col *= mix(1.0, lit, formAmt * (1.0 - loose));
        float cav = mix(1.0, smoothstep(0.18, 0.62, aFold), (1.0 - loose) * (1.0 - formAmt));
        col *= mix(0.35, 1.08, cav);
        col = mix(col, vec3(1.0), inf * 0.85);
        vCol = col;

        vAlpha = visible * mix(0.8, 1.0, smoothstep(0.4, 0.7, rim));
        vAlpha = mix(vAlpha, amb > 0.5 ? 0.55 : mix(0.82, 0.42, s), loose);
        vAlpha *= mix(0.07, 1.0, cav);
        vAlpha = clamp(vAlpha + inf*0.3 + uBurst*0.15, 0.0, 1.0) * fvis;

        float ws = amb > 0.5 ? uAmbSize : uWorldSize;
        float size = ws * sc * aRand.z * uSizeMul * projectionMatrix[1][1] * uViewH * 0.5 / -mv.z;
        size *= mix(0.7, 1.0, cav) * mix(mix(0.7, 1.0, near), 1.0, loose);
        size *= (1.0 + inf * 1.3) * (1.0 + uBurst * 0.9) * fvis;
        gl_PointSize = clamp(size, 1.5, 90.0);
        vSize = gl_PointSize;
        vAngle = 3.14159 + (aRand.y - 0.5)*0.45 + sin(t*0.6 + seed*30.0)*0.12 + loose*t*(0.2 + seed*0.6) + inf*(seed-0.5)*1.4;
        vBlur = amb * smoothstep(3.5, 6.0, aRand.z);
      }
    `;

    const frag = `
      precision highp float;
      uniform float uShape;
      varying vec3 vCol;
      varying float vAlpha, vAngle, vSize, vBlur;

      float sdTri(vec2 p){
        const float k = 1.7320508;
        p.x = abs(p.x) - 1.0;
        p.y = p.y + 1.0 / k;
        if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) * 0.5;
        p.x -= clamp(p.x, -2.0, 0.0);
        return -length(p) * sign(p.y);
      }
      float sdSeg(vec2 p, vec2 b){ return length(p - b * clamp(dot(p, b) / dot(b, b), 0.0, 1.0)); }

      void main(){
        vec2 c = gl_PointCoord;
        vec2 p = (vec2(c.x, 1.0 - c.y) * 2.0 - 1.0) * 1.3;
        float ca = cos(vAngle), sa = sin(vAngle);
        p = mat2(ca, -sa, sa, ca) * p;

        float px   = 2.6 / max(vSize, 2.0);
        float w    = max(0.08, 0.7 * px);
        float soft = 0.75 * px + vBlur;
        float a;
        if (uShape < 0.5){
          // faceted pyramid: outline + edges to the apex
          float d = abs(sdTri(p) + w);
          float y = min(sdSeg(p, vec2(-1.0, -0.57735)), min(sdSeg(p, vec2(1.0, -0.57735)), sdSeg(p, vec2(0.0, 1.1547))));
          a = max(1.0 - smoothstep(w, w + soft, d), 0.55 * (1.0 - smoothstep(w*0.8, w*0.8 + soft, y)));
        } else if (uShape < 1.5){
          a = 1.0 - smoothstep(w, w + soft, abs(sdTri(p) + w));
        } else if (uShape < 2.5){
          a = 1.0 - smoothstep(-soft, soft, length(p) - 0.7);
        } else {
          float d = (abs(p.x) + abs(p.y)) * 0.7071 - 0.85;
          a = 1.0 - smoothstep(w, w + soft, abs(d + w));
        }
        a *= vAlpha * (1.0 - vBlur * 1.5);
        if (a < 0.01) discard;
        gl_FragColor = vec4(vCol, a);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms, vertexShader:vert, fragmentShader:frag,
      transparent:true, depthWrite:false, depthTest:false, blending:THREE.NormalBlending,
    });
    function makePoints(data){
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(data.pos, 3));
      g.setAttribute('normal',   new THREE.BufferAttribute(data.nor, 3));
      g.setAttribute('aRand',    new THREE.BufferAttribute(data.rnd, 4));
      g.setAttribute('aScatter', new THREE.BufferAttribute(data.sca, 3));
      g.setAttribute('aPatch',   new THREE.BufferAttribute(data.patch, 1));
      g.setAttribute('aFold',    new THREE.BufferAttribute(data.fold, 1));
      const nP = data.pos.length/3, iconAttrs = [];
      for (let k = 0; k < ICON_DEFS.length; k++){
        const arr = new Float32Array(nP*4);
        for (let i = 0; i < nP; i++) arr[i*4+3] = -1;               // hidden until the icon has been built
        const at = new THREE.BufferAttribute(arr, 4);
        g.setAttribute('aF' + (k+1), at); iconAttrs.push(at);
      }
      const pts = new THREE.Points(g, material);
      pts.userData.iconAttrs = iconAttrs;
      pts.frustumCulled = false;
      return pts;
    }

    const group = new THREE.Group();
    scene.add(group);
    const spacing = 0.068 - SETTINGS.density*0.032;
    const brain = makePoints(buildBrain(spacing, SETTINGS.folds * 0.15));
    group.add(brain);
    uniforms.uWorldSize.value = spacing * 0.9;
    uniforms.uShape.value = SETTINGS.shape;
    uniforms.uMode.value = SETTINGS.mode;
    uniforms.uRadius.value = SETTINGS.radius;
    setPalette(SETTINGS.palette);
    scheduleIcons(brain, spacing);
    scene.add(makePoints(buildAmbient(36)));

    // layout: brain on the right for the intro, on the left during the steps
    const L = { x0:0, y0:0, s0:1, x1:0, y1:0, s1:1 };
    let W = 1, H = 1;
    function resize(){
      W = canvas.clientWidth || 1; H = canvas.clientHeight || 1;
      renderer.setSize(W, H, false);
      camera.aspect = W / H; camera.updateProjectionMatrix();
      uniforms.uAspect.value = W / H;
      uniforms.uViewH.value = H * renderer.getPixelRatio();
      const visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), visW = visH * camera.aspect;
      if (camera.aspect > 1.15){
        const s = Math.min(visW * 0.44 / 2.8, visH * 0.68 / 2.0);
        L.s0 = s;        L.x0 =  visW * 0.2;  L.y0 = -0.08 * s;
        L.s1 = s * 0.92; L.x1 = -visW * 0.2;  L.y1 = -0.04 * s;
      } else {
        const s = Math.min(visW * 1.18 / 2.8, visH * 0.55 / 2.0);
        L.s0 = s;        L.x0 = 0; L.y0 = visH * 0.18;
        L.s1 = s * 0.9;  L.x1 = 0; L.y1 = visH * 0.18;
      }
    }

    // pointer, measured against the canvas inside the curved screen
    const mouse = { x:0, y:0, sx:0, sy:0, on:0 };
    section.addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      mouse.on = 1;
    }, { passive:true });
    section.addEventListener('pointerleave', () => { mouse.on = 0; });
    document.addEventListener('wyann:gyro', e => {
      if(innerWidth > 760) return;
      mouse.x = e.detail.x; mouse.y = -e.detail.y; mouse.on = 1;
    });

    const clock = new THREE.Clock();
    let raf = 0, running = false, mouseOn = 0, lastTrail = 0, Ts = 0;
    function frame(now){
      if (!running) return;
      const dtReal = Math.min(clock.getDelta(), 0.6), dt = Math.min(dtReal, 0.05);
      uniforms.uTime.value += dt * (reduced() ? 0.15 : 1);
      const t = uniforms.uTime.value;
      mouse.sx += (mouse.x - mouse.sx) * Math.min(1, dt * 12);
      mouse.sy += (mouse.y - mouse.sy) * Math.min(1, dt * 12);
      mouseOn += (mouse.on - mouseOn) * Math.min(1, dt * 6);
      if (now - lastTrail > 45){ for (let k = TRAIL - 1; k > 0; k--) trail[k].copy(trail[k-1]); lastTrail = now; }
      trail[0].set(mouse.sx, mouse.sy, mouseOn);
      for (let k = 1; k < TRAIL; k++) trail[k].z *= Math.exp(-dt * 3.2);

      const Traw = scroller.scrollTop / (scroller.clientHeight || 1);
      Ts += (Traw - Ts) * Math.min(1, dtReal * (reduced() ? 40 : 7));
      const q = updateUI(Ts);

      const [fa, fb, fm] = formAt(q);
      uniforms.uFormA.value = fa; uniforms.uFormB.value = fb; uniforms.uMix.value = fm;
      const s = sstep(N, N + 0.75, q);
      uniforms.uScatter.value = s;
      uniforms.uBurst.value = Math.sin(Math.PI * s);
      const formAmt = (1 - fm) * (fa > 0 ? 1 : 0) + fm * (fb > 0 ? 1 : 0);

      const mv = sstep(0.05, 0.95, Ts), lerp = (a, b, k) => a + (b - a) * k;
      const sway = reduced() ? 0 : Math.sin(t * 0.3) * 0.16 * (1 - 0.6 * formAmt);
      group.rotation.y = Math.PI / 2 + sway + mouse.sx * 0.15 * (1 - s) + s * 0.5 * Math.sin(t * 0.1);
      group.rotation.x = -mouse.sy * 0.08 * (1 - s);
      group.scale.setScalar(lerp(L.s0, L.s1, mv) * (1 + s * 0.35));
      group.position.set(lerp(lerp(L.x0, L.x1, mv), 0, s), lerp(lerp(L.y0, L.y1, mv), 0, s), 0);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }
    new ResizeObserver(() => { resize(); }).observe(canvas);
    resize();
    return {
      resize,
      reset(){ Ts = 0; },
      start(){ if (running) return; running = true; clock.getDelta(); raf = requestAnimationFrame(frame); },
      stop(){ running = false; cancelAnimationFrame(raf); },
    };
  }

  /* ------------------------------------------------------------------
   *  Open / close, mirroring Portfolio's transition toward the upper right
   * ------------------------------------------------------------------ */
  const rest = 'perspective(1200px) translate3d(0,0,0) rotateX(0) rotateZ(0) scale(1)';
  const belowLeft = 'perspective(1200px) translate3d(-12%,108%,-200px) rotateX(-42deg) rotateZ(-9deg) scale(.8)';
  const departure = [
    { transform:rest },
    { transform:'perspective(1200px) translate3d(8%,-48%,-160px) rotateX(38deg) rotateZ(7deg) scale(.83)', offset:.55 },
    { transform:'perspective(1200px) translate3d(15%,-125%,-250px) rotateX(60deg) rotateZ(10deg) scale(.7)' },
  ];
  const arrival = [{ transform:belowLeft }, { transform:rest }];
  const timing = { duration:1500, easing:'cubic-bezier(.55,.05,.2,1)', fill:'both' };
  let isOpen = false, busy = false, opener = null;

  function homeSheet(){
    const bounds = screen.getBoundingClientRect();
    const viewport = document.createElement('div');
    viewport.className = 'transition-viewport';
    viewport.style.cssText = `left:${bounds.left}px;top:${bounds.top}px;width:${bounds.width}px;height:${bounds.height}px`;
    const sheet = screen.cloneNode(true);
    sheet.classList.remove('in-portfolio', 'in-about', 'in-process', 'posing');
    sheet.classList.add('home-sheet');
    sheet.inert = true; sheet.setAttribute('aria-hidden', 'true');
    sheet.querySelectorAll('#about,#portfolio,#process,header,.home-back,.section-switch,.tracking-ripple').forEach(n => n.remove());
    sheet.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    viewport.append(sheet); document.body.append(viewport);
    return { viewport, sheet };
  }

  window.openProcess = async () => {
    if (isOpen || busy || screen.classList.contains('in-portfolio')) return;
    busy = true; opener = document.activeElement;
    try { THREE = await loadThree(); if (!engine) engine = createEngine(); } catch (err) { console.warn('My process: 3D scene unavailable', err); }
    const anim = !reduced() ? homeSheet() : null;
    section.hidden = false; section.inert = false;
    screen.classList.add('in-process');
    copy && (copy.inert = true); thoughts && (thoughts.inert = true);
    homeBack.hidden = false;
    scroller.scrollTop = 0;
    if (engine){ engine.reset(); engine.resize(); engine.start(); }
    if (anim){
      const leave = anim.sheet.animate(departure, timing), arrive = section.animate(arrival, timing);
      await Promise.all([leave.finished.catch(() => {}), arrive.finished.catch(() => {})]);
      anim.viewport.remove(); arrive.cancel();
    }
    isOpen = true; busy = false;
    scroller.focus({ preventScroll:true });
  };

  async function closeProcess(){
    if (!isOpen || busy) return;
    busy = true;
    const anim = !reduced() ? homeSheet() : null;
    if (anim){
      const back = departure.map(k => ({ ...k, offset:k.offset === undefined ? undefined : 1 - k.offset })).reverse();
      const home = anim.sheet.animate(back, timing), leave = section.animate([...arrival].reverse(), timing);
      await Promise.all([home.finished.catch(() => {}), leave.finished.catch(() => {})]);
      leave.cancel();
    }
    screen.classList.remove('in-process');
    section.hidden = true; section.inert = true;
    copy && (copy.inert = false); thoughts && (thoughts.inert = false);
    homeBack.hidden = true;
    engine && engine.stop();
    anim && anim.viewport.remove();
    isOpen = false; busy = false;
    (opener && opener.focus ? opener : document.querySelector('[data-panel="My process"]'))?.focus({ preventScroll:true });
  }

  homeBack.addEventListener('click', closeProcess);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen && !document.querySelector('dialog[open]')) closeProcess(); });
  document.addEventListener('visibilitychange', () => { if (!engine || !isOpen) return; document.hidden ? engine.stop() : engine.start(); });
  $('.process-to-work').addEventListener('click', async () => {
    await closeProcess();
    window.openPortfolio && window.openPortfolio();
  });
  // warm up the 3D scene after the homepage settles, so opening My process starts instantly
  const warmUp = () => loadThree().then(T => { THREE = T; if (!engine) engine = createEngine(); }).catch(() => {});
  // links like index.html#process open straight into the story
  if (location.hash === '#process') addEventListener('load', () => window.openProcess(), { once:true });
  else addEventListener('load', () => (window.requestIdleCallback || setTimeout)(warmUp, { timeout:2500 }), { once:true });
})();
