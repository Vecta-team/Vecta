/* Test results page: reads data/benchmark.json and draws the tables and chart. */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const kb = b => (b / 1000).toFixed(1) + " KB";
  const SVGNS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs, text) => { const n = document.createElementNS(SVGNS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text != null) n.textContent = text; return n; };

  fetch("benchmark.json").then(r => r.json()).then(render).catch(() => {
    $("runInfo").textContent = "The results file could not load. Connect to the internet once, then it stays available offline.";
  });

  function render(B) {
    const V = B.vecta, v240 = B.video.find(v => v.height === 240), TS = B.textsize;
    const i3 = TS.sizes_pct.indexOf(3);
    $("runInfo").textContent = "Lesson: " + B.lesson + ". Measured " + new Date(B.run_date + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) + ".";

    // headline facts
    const facts = [
      [TS.vecta[i3] + "% vs " + TS.video["144"][i3] + "%", "small text (3% of screen) read correctly: Vecta vs 144p video"],
      [Math.round(v240.video_track_bytes / V.instructions_gz_bytes) + "× less", "board data than 240p video (" + kb(V.instructions_gz_bytes) + " vs " + kb(v240.video_track_bytes) + ")"],
      [V.mb_per_hour.toFixed(1) + " MB", "per hour of lesson, voice included (240p video: " + v240.mb_per_hour.toFixed(1) + " MB)"],
    ];
    facts.forEach(([n, t]) => { const d = document.createElement("div"); d.className = "fact"; d.innerHTML = "<b></b><span></span>"; d.querySelector("b").textContent = n; d.querySelector("span").textContent = t; $("facts").appendChild(d); });

    // size table
    const tb = $("sizeTable").querySelector("tbody");
    const row = (cells, cls) => { const tr = document.createElement("tr"); if (cls) tr.className = cls; cells.forEach((c, i) => { const td = document.createElement("td"); td.textContent = c; if (i) td.className = "num"; tr.appendChild(td); }); tb.appendChild(tr); };
    row(["Vecta", kb(V.total_bytes), V.mb_per_hour.toFixed(1) + " MB", kb(V.instructions_gz_bytes), "1×"], "us");
    B.video.forEach(v => row([v.height + "p video", kb(v.total_bytes), v.mb_per_hour.toFixed(1) + " MB", kb(v.video_track_bytes), v.times_bigger_than_vecta + "×"]));

    // readability table
    const rb = $("readTable").querySelector("tbody");
    TS.sizes_pct.forEach((s, i) => {
      const tr = document.createElement("tr");
      const first = document.createElement("td"); first.textContent = s + "%"; tr.appendChild(first);
      [TS.vecta[i]].concat(["144", "240", "360", "480", "720"].map(h => TS.video[h][i])).forEach(v => {
        const td = document.createElement("td"); td.className = "cell"; td.textContent = v + "%";
        const good = v >= 90; td.style.setProperty("--c", good ? "var(--good)" : "var(--bad)");
        td.style.setProperty("--v", good ? 14 : Math.round(10 + (90 - v) / 4)); tr.appendChild(td);
      });
      rb.appendChild(tr);
    });

    drawSizeChart(B);
  }

  // Horizontal stacked bars: MB per hour, split into voice and board data.
  function drawSizeChart(B) {
    const svg = $("sizeChart"), dur = B.duration_s, perHour = b => b / dur * 3600 / 1e6;
    const voice = B.vecta.voice_16k_bytes;
    const rows = [{ name: "Vecta", voice, board: B.vecta.instructions_gz_bytes, us: true }]
      .concat(B.video.map(v => ({ name: v.height + "p video", voice, board: v.video_track_bytes })));
    const W = 680, left = 104, right = 76, rowH = 34, top = 30, H = top + rows.length * rowH + 26;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    const max = Math.max(...rows.map(r => perHour(r.voice + r.board)));
    const step = max > 20 ? 5 : 2, niceMax = Math.ceil(max / step) * step;
    const X = mb => left + (W - left - right) * mb / niceMax;
    const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const ink = css("--ink"), muted = css("--muted"), grid = css("--grid"), accent = css("--accent");

    // legend
    svg.appendChild(el("rect", { x: left, y: 6, width: 12, height: 12, rx: 3, fill: accent, "fill-opacity": 0.35 }));
    svg.appendChild(el("text", { x: left + 18, y: 16, "font-size": 12, fill: muted }, "Voice (same in both)"));
    svg.appendChild(el("rect", { x: left + 170, y: 6, width: 12, height: 12, rx: 3, fill: accent }));
    svg.appendChild(el("text", { x: left + 188, y: 16, "font-size": 12, fill: muted }, "Board: drawings or video pixels"));

    // grid + ticks
    for (let t = 0; t <= niceMax; t += step) {
      svg.appendChild(el("line", { x1: X(t), x2: X(t), y1: top - 4, y2: top + rows.length * rowH, stroke: grid }));
      svg.appendChild(el("text", { x: X(t), y: H - 6, "font-size": 11, fill: muted, "text-anchor": "middle" }, t + (t === niceMax ? " MB/h" : "")));
    }
    rows.forEach((r, i) => {
      const y = top + i * rowH + 7, h = rowH - 14;
      const vEnd = X(perHour(r.voice)), bEnd = X(perHour(r.voice + r.board));
      svg.appendChild(el("text", { x: left - 10, y: y + h / 2 + 4, "font-size": 13, "font-weight": r.us ? 700 : 400, fill: r.us ? accent : ink, "text-anchor": "end" }, r.name));
      svg.appendChild(el("rect", { x: left, y, width: vEnd - left, height: h, fill: accent, "fill-opacity": 0.35 }));
      svg.appendChild(el("rect", { x: vEnd, y, width: Math.max(2, bEnd - vEnd), height: h, fill: accent }));
      svg.appendChild(el("text", { x: bEnd + 8, y: y + h / 2 + 4, "font-size": 12, "font-family": css("--mono"), "font-weight": r.us ? 700 : 400, fill: r.us ? accent : ink }, perHour(r.voice + r.board).toFixed(1)));
    });
  }
})();
