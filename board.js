/* Vecta board renderer (format vecta/0.1).
 * Draws a lesson at any time t. Shapes and handwriting go on a canvas; text and
 * equations are real text (KaTeX), so they stay sharp at any screen size.
 * Coordinates: x, y = % of board width / height. Sizes, radii, pen width = % of height.
 */
(function (global) {
  "use strict";

  function unicodeMath(tex) {
    return tex.replace(/\\(?:d?frac)\{([^}]*)\}\{([^}]*)\}/g, "$1/$2").replace(/\\text\{([^}]*)\}/g, "$1")
      .replace(/\\sqrt\{([^}]*)\}/g, "√$1").replace(/\\pi/g, "π").replace(/\\times/g, "×")
      .replace(/\\approx/g, "≈").replace(/\\ /g, " ").replace(/\^2/g, "²").replace(/\\/g, "");
  }

  function fmtTime(s) {
    s = Math.max(0, Math.floor(s || 0));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  function Board(container) {
    this.el = container;
    this.el.classList.add("vboard");
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("aria-hidden", "true");
    this.layer = document.createElement("div");
    this.layer.className = "vlayer";
    this.el.append(this.canvas, this.layer);
    this.ctx = this.canvas.getContext("2d");
    this.elements = [];
    this.items = new Map(); // element -> DOM node for text / math
    this.t = 0;
    this.reduce = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const self = this;
    if (global.ResizeObserver) new ResizeObserver(() => self.resize()).observe(this.el);
    if (global.matchMedia) global.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => self.draw(self.t));
    this.resize();
  }

  Board.prototype.setElements = function (elements) {
    this.elements = elements;
    this.sync();
    this.draw(this.t);
  };

  // Create DOM nodes for any new text / math elements, remove stale ones.
  Board.prototype.sync = function () {
    const keep = new Set();
    for (const e of this.elements) {
      if (e.type !== "text" && e.type !== "math") continue;
      keep.add(e);
      if (this.items.has(e)) continue;
      const d = document.createElement("div");
      d.className = "vitem" + (e.color ? " c-" + e.color : "") + (e.weight >= 700 ? " bold" : "") +
        (e.italic ? " italic" : "") + (e.box ? " box" : "");
      d.style.left = e.x + "%";
      d.style.top = e.y + "%";
      d.style.fontSize = "calc(var(--bh) * " + (e.size || 5) / 100 + ")";
      if (e.type === "math" && global.katex) {
        try { global.katex.render(e.value, d, { throwOnError: false, displayMode: false }); }
        catch (err) { d.textContent = unicodeMath(e.value); }
      } else {
        d.textContent = e.type === "math" ? unicodeMath(e.value) : e.value;
      }
      this.layer.appendChild(d);
      this.items.set(e, d);
    }
    for (const [e, d] of this.items) if (!keep.has(e)) { d.remove(); this.items.delete(e); }
  };

  Board.prototype.resize = function () {
    const r = this.el.getBoundingClientRect();
    this.w = r.width; this.h = r.height;
    this.dpr = Math.min(global.devicePixelRatio || 1, 3);
    this.canvas.width = Math.max(1, Math.round(this.w * this.dpr));
    this.canvas.height = Math.max(1, Math.round(this.h * this.dpr));
    this.el.style.setProperty("--bh", this.h + "px");
    this.draw(this.t);
  };

  // Point from a pointer event, in board %.
  Board.prototype.toBoard = function (clientX, clientY) {
    const r = this.el.getBoundingClientRect();
    return [Math.round((clientX - r.left) / r.width * 10000) / 100, Math.round((clientY - r.top) / r.height * 10000) / 100];
  };

  Board.prototype.draw = function (now) {
    this.t = now;
    const ctx = this.ctx, W = this.w, H = this.h;
    if (!W || !H) return;
    const cs = getComputedStyle(this.el);
    const col = { ink: cs.getPropertyValue("--ink").trim(), accent: cs.getPropertyValue("--accent").trim(),
      muted: cs.getPropertyValue("--muted").trim(), grid: cs.getPropertyValue("--grid").trim() };
    const C = c => col[c] || col.ink;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // squared paper
    ctx.strokeStyle = col.grid; ctx.lineWidth = 1; ctx.beginPath();
    const step = H / 20;
    for (let x = step; x < W; x += step) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, H); }
    for (let y = step; y < H; y += step) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(W, Math.round(y) + 0.5); }
    ctx.stroke();

    let scene = -Infinity;
    for (const e of this.elements) if (e.type === "clear" && e.t <= now && e.t > scene) scene = e.t;
    const X = v => v / 100 * W, Y = v => v / 100 * H, R = v => v / 100 * H;
    const reduce = this.reduce;
    const prog = e => reduce ? 1 : Math.min(1, Math.max(0, (now - e.t) / (e.dur || 0.4)));
    const lw = Math.max(2, H * 0.0055);
    ctx.lineCap = "round"; ctx.lineJoin = "round";

    for (const e of this.elements) {
      if (e.t > now || e.t < scene || e.type === "clear") continue;
      const p = prog(e);
      switch (e.type) {
        case "circle":
          ctx.strokeStyle = C(e.color); ctx.lineWidth = lw; ctx.beginPath();
          if (p >= 1) ctx.arc(X(e.x), Y(e.y), R(e.r), 0, 2 * Math.PI); // finished: plain full circle
          else ctx.arc(X(e.x), Y(e.y), R(e.r), -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * p); // drawing in from the top
          ctx.stroke(); break;
        case "line": case "arrow": {
          const x1 = X(e.x1), y1 = Y(e.y1), x2 = x1 + (X(e.x2) - x1) * p, y2 = y1 + (Y(e.y2) - y1) * p;
          ctx.strokeStyle = C(e.color); ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          if (e.type === "arrow" && p > 0.05) {
            const a = Math.atan2(y2 - y1, x2 - x1), s = H * 0.03;
            ctx.beginPath(); ctx.moveTo(x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45));
            ctx.lineTo(x2, y2); ctx.lineTo(x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45)); ctx.stroke();
          }
          break;
        }
        case "dot":
          ctx.globalAlpha = p; ctx.fillStyle = C(e.color); ctx.beginPath();
          ctx.arc(X(e.x), Y(e.y), Math.max(3, H * 0.0085), 0, 2 * Math.PI); ctx.fill(); ctx.globalAlpha = 1; break;
        case "fill":
          ctx.globalAlpha = 0.15 * p; ctx.fillStyle = C(e.color || "accent"); ctx.beginPath();
          ctx.arc(X(e.x), Y(e.y), Math.max(0, R(e.r) - lw / 2), 0, 2 * Math.PI); ctx.fill(); ctx.globalAlpha = 1; break;
        case "highlight": {
          const w = X(e.w), h = Y(e.h), x = X(e.x) - w / 2, y = Y(e.y) - h / 2, r = H * 0.02;
          ctx.globalAlpha = 0.14 * p; ctx.fillStyle = col.accent;
          ctx.beginPath(); roundRect(ctx, x, y, w, h, r); ctx.fill(); ctx.globalAlpha = 1; break;
        }
        case "stroke": {
          const pts = e.pts || []; if (!pts.length) break;
          const ms = reduce ? Infinity : (now - e.t) * 1000;
          ctx.strokeStyle = C(e.color); ctx.lineWidth = Math.max(1.5, R(e.w || 0.6)); ctx.beginPath();
          ctx.moveTo(X(pts[0][0]), Y(pts[0][1]));
          if (pts.length === 1) ctx.lineTo(X(pts[0][0]) + 0.01, Y(pts[0][1]));
          for (let i = 1; i < pts.length && pts[i][2] <= ms; i++) ctx.lineTo(X(pts[i][0]), Y(pts[i][1]));
          ctx.stroke(); break;
        }
      }
    }
    for (const [e, d] of this.items) {
      const on = e.t <= now && e.t >= scene;
      d.style.opacity = on ? (reduce ? 1 : Math.min(1, (now - e.t) / 0.35)) : 0;
    }
  };

  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // Lesson duration helper: longest of audio length and last element end.
  function lessonEnd(lesson) {
    let end = lesson.duration || 0;
    for (const e of lesson.elements || []) {
      let d = e.dur || 0.4;
      if (e.type === "stroke" && e.pts && e.pts.length) d = e.pts[e.pts.length - 1][2] / 1000;
      end = Math.max(end, e.t + d);
    }
    return end;
  }

  global.Vecta = Object.assign(global.Vecta || {}, { Board, fmtTime, unicodeMath, lessonEnd });
})(window);
