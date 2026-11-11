/* Shared helpers for the explorables: theme, colour tokens, HiDPI canvases, RNG, plots. */
(function (g) {
  "use strict";
  var root = document.documentElement;
  var X = {};

  /* ---------- theme (same storage key as the main page) ---------- */
  var listeners = [];
  X.onTheme = function (fn) { listeners.push(fn); };
  X.initTheme = function () {
    var btn = document.getElementById("themeBtn");
    if (!btn) return;
    function label() {
      btn.setAttribute("aria-label", root.dataset.theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
    }
    label();
    btn.addEventListener("click", function () {
      root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
      try { localStorage.setItem("cv-theme", root.dataset.theme); } catch (e) {}
      label();
      X.readTokens();
      listeners.forEach(function (f) { f(); });
    });
  };

  /* ---------- colour tokens, read from CSS so canvases follow the theme ---------- */
  X.tok = {};
  X.readTokens = function () {
    var cs = getComputedStyle(root);
    ["primary", "on-surface", "on-surface-variant", "outline", "outline-variant", "surface",
     "surface-container", "surface-container-high", "bg", "g-blue", "g-red", "g-yellow", "g-green"]
      .forEach(function (k) { X.tok[k] = cs.getPropertyValue("--" + k).trim(); });
    X.dark = root.dataset.theme === "dark";
  };
  X.readTokens();

  /* cyclic phase colour, tuned per theme */
  X.phaseColor = function (th) {
    var d = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    return "hsl(" + (d * 180 / Math.PI).toFixed(1) + (X.dark ? ",78%,64%)" : ",72%,48%)");
  };
  X.phaseLUT = function (n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(X.phaseColor(2 * Math.PI * i / n));
    return a;
  };

  /* ---------- HiDPI canvas ---------- */
  X.canvas = function (el) {
    var ctx = el.getContext("2d");
    var o = { el: el, ctx: ctx, w: 0, h: 0, dpr: 1 };
    function fit() {
      var r = el.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
      if (w !== o.w || h !== o.h || dpr !== o.dpr) {
        o.w = w; o.h = h; o.dpr = dpr;
        el.width = Math.round(w * dpr); el.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }
    o.fit = fit;
    fit();
    if ("ResizeObserver" in window) new ResizeObserver(fit).observe(el);
    else window.addEventListener("resize", fit);
    return o;
  };

  /* ---------- seeded RNG (mulberry32) ---------- */
  X.rng = function (seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* ---------- rolling time series ---------- */
  X.series = function (names, cap) {
    var s = { names: names, cap: cap, t: [], v: {} };
    names.forEach(function (n) { s.v[n] = []; });
    s.push = function (t, vals) {
      s.t.push(t);
      names.forEach(function (n) { s.v[n].push(vals[n]); });
      if (s.t.length > cap) { s.t.shift(); names.forEach(function (n) { s.v[n].shift(); }); }
    };
    s.clear = function () { s.t.length = 0; names.forEach(function (n) { s.v[n].length = 0; }); };
    s.mean = function (n, k) {
      var a = s.v[n], m = Math.min(k, a.length), acc = 0;
      for (var i = a.length - m; i < a.length; i++) acc += a[i];
      return m ? acc / m : 0;
    };
    return s;
  };

  /* draw a time-series plot of values in [0, 1] */
  X.plotSeries = function (c, s, colors, opts) {
    opts = opts || {};
    var ctx = c.ctx, w = c.w, h = c.h, T = X.tok;
    var padL = 40, padR = 14, padT = 14, padB = 30;
    var pw = w - padL - padR, ph = h - padT - padB;
    ctx.clearRect(0, 0, w, h);
    ctx.font = "12px 'Google Sans Code', ui-monospace, monospace";
    ctx.lineWidth = 1;
    for (var k = 0; k <= 4; k++) {
      var y = padT + ph * (1 - k / 4);
      ctx.strokeStyle = T["outline-variant"];
      ctx.globalAlpha = k === 0 ? 1 : 0.6;
      ctx.beginPath(); ctx.moveTo(padL, y + .5); ctx.lineTo(padL + pw, y + .5); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = T["on-surface-variant"];
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillText((k / 4).toFixed(k % 2 ? 2 : 1), padL - 8, y);
    }
    var n = s.t.length;
    if (n < 2) return;
    var t0 = s.t[0], t1 = s.t[n - 1], span = Math.max(t1 - t0, 1e-9);
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = T["on-surface-variant"];
    ctx.fillText("t = " + t0.toFixed(0), padL + 28, padT + ph + 9);
    ctx.fillText("t = " + t1.toFixed(0), padL + pw - 28, padT + ph + 9);
    s.names.forEach(function (name, idx) {
      var a = s.v[name];
      ctx.strokeStyle = colors[idx];
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (var i = 0; i < n; i++) {
        var x = padL + pw * (s.t[i] - t0) / span;
        var yv = padT + ph * (1 - Math.max(0, Math.min(1, a[i])));
        if (i) ctx.lineTo(x, yv); else ctx.moveTo(x, yv);
      }
      ctx.stroke();
    });
  };

  /* axes frame for scatter panels */
  X.frame = function (c, pad, xl, yl, xt, yt) {
    var ctx = c.ctx, T = X.tok;
    var x0 = pad.l, y0 = pad.t, pw = c.w - pad.l - pad.r, ph = c.h - pad.t - pad.b;
    ctx.strokeStyle = T["outline-variant"]; ctx.lineWidth = 1;
    ctx.strokeRect(x0 + .5, y0 + .5, pw, ph);
    ctx.fillStyle = T["on-surface-variant"];
    ctx.font = "12px 'Google Sans Code', ui-monospace, monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    xt.forEach(function (t) { ctx.fillText(t[1], x0 + pw * t[0], y0 + ph + 7); });
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    yt.forEach(function (t) { ctx.fillText(t[1], x0 - 7, y0 + ph * (1 - t[0])); });
    ctx.font = "13px 'Roboto Flex', system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(xl, x0 + pw / 2, c.h - 2);
    ctx.save(); ctx.translate(12, y0 + ph / 2); ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = "middle"; ctx.fillText(yl, 0, 0); ctx.restore();
    return { x0: x0, y0: y0, pw: pw, ph: ph };
  };

  /* run a callback each frame only while the element is on screen and the tab visible */
  X.loop = function (el, fn) {
    var on = true, raf = 0, last = 0;
    function tick(ts) {
      raf = 0;
      if (!on || document.hidden) return;
      var dt = last ? Math.min((ts - last) / 1000, 0.1) : 0.016;
      last = ts;
      fn(dt);
      raf = requestAnimationFrame(tick);
    }
    function kick() { if (!raf && on && !document.hidden) { last = 0; raf = requestAnimationFrame(tick); } }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { on = es[0].isIntersecting; kick(); }, { threshold: 0 }).observe(el);
    }
    document.addEventListener("visibilitychange", kick);
    kick();
    return { kick: kick };
  };

  X.reduced = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* KaTeX: render every [data-tex] element once the library is in */
  X.tex = function () {
    if (!g.katex) return;
    document.querySelectorAll("[data-tex]").forEach(function (el) {
      try {
        g.katex.render(el.getAttribute("data-tex"), el, { displayMode: el.hasAttribute("data-display"), throwOnError: false });
      } catch (e) {}
    });
  };

  g.X = X;
})(window);
