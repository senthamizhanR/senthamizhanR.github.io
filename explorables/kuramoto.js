/* Frequency-weighted Kuramoto oscillators with biharmonic coupling (Senthamizhan, Gopal & Chandrasekar):
 *
 *   dtheta_i/dt = omega_i + |omega_i| [ K1 r1 sin(psi1 - theta_i) + K2 r2 sin(psi2 - 2 theta_i) ]
 *   r1 e^{i psi1} = <e^{i theta}>,  r2 e^{i psi2} = <e^{2 i theta}>   (Daido order parameters)
 *
 * omega_i: Lorentzian, zero mean, unit half-width, placed on a deterministic quantile grid.
 * The extreme 1% tails on each side are left out (|omega| <= tan(0.49 pi) ~ 31.8) so the
 * stiffest oscillators stay integrable at frame rate. Fixed-step RK4 with the step bounded
 * by the fastest rate in the system.
 */
(function (g) {
  "use strict";
  var TAIL = 0.01;

  function FWK(N, seed) {
    this.K1 = -5; this.K2 = 7;
    this.t = 0;
    this.alloc(N);
    this.reset(seed || 1);
  }

  FWK.prototype.alloc = function (N) {
    var F = Float64Array;
    this.N = N;
    this.w = new F(N); this.aw = new F(N); this.rank = new F(N);
    this.th = new F(N); this.tmp = new F(N); this.C = new F(N); this.S = new F(N);
    this.k = [new F(N), new F(N), new F(N), new F(N)];
    // quantile grid, shuffled-free and already sorted by omega
    var wmax = 0;
    for (var i = 0; i < N; i++) {
      var u = TAIL + (1 - 2 * TAIL) * (i + 0.5) / N;
      this.w[i] = Math.tan(Math.PI * (u - 0.5));
      this.aw[i] = Math.abs(this.w[i]);
      this.rank[i] = (i + 0.5) / N;
      if (this.aw[i] > wmax) wmax = this.aw[i];
    }
    this.wmax = wmax;
  };

  FWK.prototype.reset = function (seed) {
    var r = g.X.rng(seed);
    for (var i = 0; i < this.N; i++) this.th[i] = -Math.PI + 2 * Math.PI * r();
    this.t = 0;
  };

  FWK.prototype.resize = function (N, seed) { this.alloc(N); this.reset(seed); };

  FWK.prototype.mean = function (T) {
    var N = this.N, a = 0, b = 0, c2 = 0, s2 = 0;
    for (var i = 0; i < N; i++) {
      var c = Math.cos(T[i]), s = Math.sin(T[i]);
      a += c; b += s; c2 += c * c - s * s; s2 += 2 * s * c;
    }
    return [a / N, b / N, c2 / N, s2 / N];
  };

  FWK.prototype.deriv = function (T, D) {
    var N = this.N, K1 = this.K1, K2 = this.K2, w = this.w, aw = this.aw, C = this.C, S = this.S, i;
    var a = 0, b = 0, c2 = 0, s2 = 0;
    for (i = 0; i < N; i++) {
      var c = Math.cos(T[i]), s = Math.sin(T[i]);
      C[i] = c; S[i] = s;
      a += c; b += s; c2 += c * c - s * s; s2 += 2 * s * c;
    }
    var z1x = a / N, z1y = b / N, z2x = c2 / N, z2y = s2 / N;
    for (i = 0; i < N; i++) {
      var ci = C[i], si = S[i];
      // r1 sin(psi1 - th) = Im(Z1 e^{-i th});  r2 sin(psi2 - 2th) = Im(Z2 e^{-2i th})
      var f1 = z1y * ci - z1x * si;
      var f2 = z2y * (ci * ci - si * si) - z2x * (2 * si * ci);
      D[i] = w[i] + aw[i] * (K1 * f1 + K2 * f2);
    }
  };

  FWK.prototype.maxStep = function () {
    var rate = this.wmax * (1 + Math.abs(this.K1) + 2 * Math.abs(this.K2));
    return Math.min(0.02, 1.2 / rate);
  };

  /* advance by `span` time units; returns the number of RK4 steps taken */
  FWK.prototype.advance = function (span) {
    var hmax = this.maxStep(), n = Math.max(1, Math.ceil(span / hmax)), h = span / n;
    var N = this.N, th = this.th, tm = this.tmp, k = this.k, i, q;
    for (q = 0; q < n; q++) {
      this.deriv(th, k[0]);
      for (i = 0; i < N; i++) tm[i] = th[i] + .5 * h * k[0][i];
      this.deriv(tm, k[1]);
      for (i = 0; i < N; i++) tm[i] = th[i] + .5 * h * k[1][i];
      this.deriv(tm, k[2]);
      for (i = 0; i < N; i++) tm[i] = th[i] + h * k[2][i];
      this.deriv(tm, k[3]);
      for (i = 0; i < N; i++) {
        var v = th[i] + h / 6 * (k[0][i] + 2 * k[1][i] + 2 * k[2][i] + k[3][i]);
        if (v > Math.PI) v -= 2 * Math.PI * Math.ceil((v - Math.PI) / (2 * Math.PI));
        else if (v < -Math.PI) v += 2 * Math.PI * Math.ceil((-Math.PI - v) / (2 * Math.PI));
        th[i] = v;
      }
    }
    this.t += span;
    return n;
  };

  FWK.prototype.order = function () {
    var z = this.mean(this.th);
    return {
      r1: Math.hypot(z[0], z[1]), psi1: Math.atan2(z[1], z[0]),
      r2: Math.hypot(z[2], z[3]), psi2: Math.atan2(z[3], z[2])
    };
  };

  g.FWK = FWK;
})(window);
