/* 2D swarmalators with an h-th harmonic phase coupling (thesis ch. 5, PRE 109, 064303):
 *
 *   dx_i/dt     = 1/N sum_{j!=i} [ (x_j-x_i)/|x_j-x_i| (1 + J cos(th_j-th_i)) - (x_j-x_i)/|x_j-x_i|^2 ]
 *   dtheta_i/dt = K/N sum_{j!=i} sin(h (th_j-th_i)) / |x_j-x_i|
 *
 * with v_i = omega_i = 0 (identical agents), A = B = 1, h = 2 by default.
 * Pairwise forces are antisymmetric, so each pair is visited once. RK4 time stepping.
 */
(function (g) {
  "use strict";

  function Swarm(N, seed) {
    this.J = 0.1; this.K = 1; this.h = 2;
    this.t = 0;
    this.alloc(N);
    this.reset(seed || 1);
  }

  Swarm.prototype.alloc = function (N) {
    this.N = N;
    var F = Float64Array;
    this.x = new F(N); this.y = new F(N); this.th = new F(N);
    this.c = new F(N); this.s = new F(N);
    this.k = [];
    for (var q = 0; q < 4; q++) this.k.push([new F(N), new F(N), new F(N)]);
    this.tx = new F(N); this.ty = new F(N); this.tt = new F(N);
    this.speed = 0;
  };

  /* positions uniform in (-2,2)^2, phases uniform in [-pi,pi) */
  Swarm.prototype.reset = function (seed) {
    var r = g.X.rng(seed), N = this.N;
    for (var i = 0; i < N; i++) {
      this.x[i] = -2 + 4 * r();
      this.y[i] = -2 + 4 * r();
      this.th[i] = -Math.PI + 2 * Math.PI * r();
    }
    this.t = 0;
  };

  Swarm.prototype.resize = function (N, seed) { this.alloc(N); this.reset(seed); };

  Swarm.prototype.deriv = function (X, Y, T, dX, dY, dT) {
    var N = this.N, J = this.J, K = this.K, h2 = this.h === 2, c = this.c, s = this.s, i, j;
    for (i = 0; i < N; i++) { c[i] = Math.cos(T[i]); s[i] = Math.sin(T[i]); dX[i] = 0; dY[i] = 0; dT[i] = 0; }
    for (i = 0; i < N - 1; i++) {
      var xi = X[i], yi = Y[i], ci = c[i], si = s[i];
      var ax = 0, ay = 0, at = 0;
      for (j = i + 1; j < N; j++) {
        var dx = X[j] - xi, dy = Y[j] - yi;
        var r2 = dx * dx + dy * dy;
        if (r2 < 1e-10) r2 = 1e-10;
        var ir = 1 / Math.sqrt(r2);
        var cd = c[j] * ci + s[j] * si;          // cos(th_j - th_i)
        var sd = s[j] * ci - c[j] * si;          // sin(th_j - th_i)
        var a = ir * (1 + J * cd) - ir * ir;
        var fx = dx * a, fy = dy * a;
        ax += fx; ay += fy; dX[j] -= fx; dY[j] -= fy;
        var p = K * (h2 ? 2 * sd * cd : sd) * ir;
        at += p; dT[j] -= p;
      }
      dX[i] += ax; dY[i] += ay; dT[i] += at;
    }
    var inv = 1 / N;
    for (i = 0; i < N; i++) { dX[i] *= inv; dY[i] *= inv; dT[i] *= inv; }
  };

  Swarm.prototype.step = function (dt) {
    var N = this.N, k = this.k, x = this.x, y = this.y, th = this.th, tx = this.tx, ty = this.ty, tt = this.tt, i;
    this.deriv(x, y, th, k[0][0], k[0][1], k[0][2]);
    for (i = 0; i < N; i++) { tx[i] = x[i] + .5 * dt * k[0][0][i]; ty[i] = y[i] + .5 * dt * k[0][1][i]; tt[i] = th[i] + .5 * dt * k[0][2][i]; }
    this.deriv(tx, ty, tt, k[1][0], k[1][1], k[1][2]);
    for (i = 0; i < N; i++) { tx[i] = x[i] + .5 * dt * k[1][0][i]; ty[i] = y[i] + .5 * dt * k[1][1][i]; tt[i] = th[i] + .5 * dt * k[1][2][i]; }
    this.deriv(tx, ty, tt, k[2][0], k[2][1], k[2][2]);
    for (i = 0; i < N; i++) { tx[i] = x[i] + dt * k[2][0][i]; ty[i] = y[i] + dt * k[2][1][i]; tt[i] = th[i] + dt * k[2][2][i]; }
    this.deriv(tx, ty, tt, k[3][0], k[3][1], k[3][2]);
    var sp = 0, d6 = dt / 6;
    for (i = 0; i < N; i++) {
      var vx = k[0][0][i] + 2 * k[1][0][i] + 2 * k[2][0][i] + k[3][0][i];
      var vy = k[0][1][i] + 2 * k[1][1][i] + 2 * k[2][1][i] + k[3][1][i];
      x[i] += d6 * vx; y[i] += d6 * vy;
      th[i] += d6 * (k[0][2][i] + 2 * k[1][2][i] + 2 * k[2][2][i] + k[3][2][i]);
      if (th[i] > Math.PI) th[i] -= 2 * Math.PI; else if (th[i] < -Math.PI) th[i] += 2 * Math.PI;
      sp += Math.sqrt(vx * vx + vy * vy) / 6;
    }
    this.speed = sp / N;
    this.t += dt;
  };

  /* s_{m,+-} = |1/N sum exp(i(phi_j +- m theta_j))|, phi measured about the centroid */
  Swarm.prototype.order = function () {
    var N = this.N, x = this.x, y = this.y, th = this.th, cx = 0, cy = 0, i;
    for (i = 0; i < N; i++) { cx += x[i]; cy += y[i]; }
    cx /= N; cy /= N;
    var a = [0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < N; i++) {
      var ph = Math.atan2(y[i] - cy, x[i] - cx), t = th[i];
      a[0] += Math.cos(ph + t); a[1] += Math.sin(ph + t);
      a[2] += Math.cos(ph - t); a[3] += Math.sin(ph - t);
      a[4] += Math.cos(ph + 2 * t); a[5] += Math.sin(ph + 2 * t);
      a[6] += Math.cos(ph - 2 * t); a[7] += Math.sin(ph - 2 * t);
    }
    function m(p, q) { return Math.sqrt(p * p + q * q) / N; }
    return { s1p: m(a[0], a[1]), s1m: m(a[2], a[3]), s2p: m(a[4], a[5]), s2m: m(a[6], a[7]), cx: cx, cy: cy };
  };

  g.Swarm = Swarm;
})(window);
