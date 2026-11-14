/* Landing page: plays one real lesson with the same renderer the app uses (board.js).
 * Nothing here downloads the voice file until someone presses play. */
(function () {
  "use strict";

  // Old links like .../Vecta/#lesson/pythagoras pointed at the app when it was the front page.
  if (/^#(lesson|mine)\//.test(location.hash)) { location.replace("app.html" + location.hash); return; }

  const $ = id => document.getElementById(id);
  const kb = b => (b / 1000).toFixed(1) + " KB";
  const calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const LESSON = "area-of-a-circle";
  const POSTER = 20.5; // before play, show the board as it looks 20.5 s in (circle + formula)
  const audio = $("audio"), scrub = $("scrub"), capEl = $("caption"), timeEl = $("time");
  const board = new Vecta.Board($("board"));
  let lesson = null, end = 0, started = false, ccOn = true;

  // ---------- load the lesson (about 3 KB of instructions)
  fetch(LESSON + "-lesson.json").then(r => r.json()).then(l => {
    lesson = l; end = Vecta.lessonEnd(l);
    const a = l.audio.find(x => audio.canPlayType(x.type)) || l.audio[l.audio.length - 1];
    audio.src = LESSON + "-" + a.src; // preload="none": not fetched until play
    scrub.max = end;
    board.setElements(l.elements || []);
    board.resize();
    $("play").disabled = false;
    render(0);
    xrayBuild(l);
  }).catch(() => { capEl.textContent = "The demo lesson could not load. Check your connection and reload the page."; });

  // ---------- sizes shown under the player come from lessons.json (real file sizes)
  fetch("lessons.json").then(r => r.json()).then(index => {
    const m = index.lessons.find(x => x.id === LESSON); if (!m) return;
    const m4a = !audio.canPlayType("audio/ogg; codecs=opus") && audio.canPlayType("audio/mp4");
    const voice = m4a ? m.sizes.voice_m4a : m.sizes.voice_opus, draw = m.sizes.instructions_gz, total = voice + draw;
    $("totalKB").textContent = kb(total); $("voiceKB").textContent = kb(voice); $("drawKB").textContent = kb(draw);
    $("barVoice").style.width = (100 * voice / total) + "%"; $("barDraw").style.width = (100 * draw / total) + "%";
  }).catch(() => {});

  // ---------- playback: the audio is the clock, the board is drawn for that moment
  function now() { return Math.min(audio.currentTime || 0, end); }
  function render(t) {
    board.draw(started ? t : POSTER);
    if (started && lesson && lesson.captions) {
      let c = null; for (const k of lesson.captions) if (k.t <= t) c = k;
      capEl.textContent = ccOn && c ? c.text : "";
    }
    scrub.value = t;
    timeEl.textContent = Vecta.fmtTime(t) + " / " + Vecta.fmtTime(end);
  }
  function loop() { render(now()); xraySet(now()); if (!audio.paused) requestAnimationFrame(loop); }
  function begin() { started = true; $("bigPlay").hidden = true; }
  function toggle() {
    if (!lesson) return;
    if (audio.paused) {
      begin();
      if (audio.ended || now() >= end - 0.05) audio.currentTime = 0;
      const p = audio.play(); if (p && p.catch) p.catch(() => {});
    } else audio.pause();
  }
  function setIcon(playing) {
    $("playIcon").innerHTML = playing ? '<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>' : '<path d="M8 5.5v13l11-6.5z"/>';
    $("play").setAttribute("aria-label", playing ? "Pause" : "Play");
  }

  $("play").addEventListener("click", toggle);
  $("bigPlay").addEventListener("click", toggle);
  $("board").addEventListener("click", toggle);
  $("heroPlay").addEventListener("click", () => {
    $("demo").scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "center" });
    if (audio.paused) toggle();
  });
  $("cc").addEventListener("click", () => { ccOn = !ccOn; $("cc").setAttribute("aria-pressed", String(ccOn)); render(now()); });
  scrub.addEventListener("input", () => { if (!lesson) return; begin(); audio.currentTime = +scrub.value; render(+scrub.value); });
  audio.addEventListener("play", () => { setIcon(true); requestAnimationFrame(loop); });
  audio.addEventListener("pause", () => { setIcon(false); render(now()); });
  audio.addEventListener("ended", () => { setIcon(false); render(end); });
  audio.addEventListener("error", () => { capEl.textContent = "This device couldn't play the lesson's sound file. Try another browser, such as Chrome."; });

  // ---------- "How it works" x-ray: the lesson's real instructions beside a second board.
  // Move the slider (or play the lesson above) and the instruction being drawn lights up.
  const xboard = new Vecta.Board($("xboard")), xscrub = $("xscrub"), feed = $("feed");
  let xLines = [], xTimes = [], xIdx = -2, xT = +xscrub.value, xTouched = false, xSeen = false, xPrev = 0;
  function xrayBuild(l) {
    const els = l.elements || [];
    feed.textContent = "";
    xLines = els.map(e => {
      const li = document.createElement("li"), code = document.createElement("code");
      code.textContent = JSON.stringify(e); li.appendChild(code); feed.appendChild(li); return li;
    });
    xTimes = els.map(e => e.t);
    xscrub.max = end;
    xboard.setElements(els); xboard.resize();
    xraySet(xT);
  }
  function xraySet(t) {
    if (!xLines.length) return;
    xT = t; xboard.draw(t); xscrub.value = t;
    $("xtime").textContent = t.toFixed(2);
    let i = -1; while (i + 1 < xTimes.length && xTimes[i + 1] <= t) i++;
    if (i === xIdx) return;
    xIdx = i;
    xLines.forEach((li, k) => { li.className = k === i ? "now" : k < i ? "done" : ""; });
    const cur = xLines[Math.max(i, 0)]; // keep the current line in the middle of the list
    feed.scrollTop = cur.offsetTop - feed.clientHeight / 2 + cur.offsetHeight / 2;
  }
  xscrub.addEventListener("input", () => { xTouched = true; xraySet(+xscrub.value); });
  // Until someone drags the slider, the x-ray runs by itself (silently) while it is on screen.
  function xrayRun(ts) {
    if (!xSeen || xTouched) return;
    if (audio.paused && xLines.length) { const dt = Math.min(0.1, (ts - xPrev) / 1000 || 0); xraySet((xT + dt) % end); }
    xPrev = ts; requestAnimationFrame(xrayRun);
  }
  if (!calm && "IntersectionObserver" in window) {
    new IntersectionObserver(es => {
      const was = xSeen; xSeen = es[0].isIntersecting;
      if (xSeen && !was && !xTouched) { xPrev = performance.now(); requestAnimationFrame(xrayRun); }
    }, { threshold: 0.3 }).observe($("xray"));
  }

  // ---------- results chart drawn to scale: one small square per kilobyte
  document.querySelectorAll(".units").forEach(box => {
    const frag = document.createDocumentFragment();
    JSON.parse(box.dataset.parts).forEach(([cls, n]) => {
      for (let k = 0; k < n; k++) { const s = document.createElement("i"); s.className = "sq " + cls; frag.appendChild(s); }
    });
    box.insertBefore(frag, box.firstChild);
  });

  // ---------- drag to compare Vecta with 144p video
  $("cmpRange").addEventListener("input", e => { $("cmp").style.setProperty("--pos", e.target.value + "%"); });

  // ---------- marker notes draw themselves in when they scroll into view
  if (!calm && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.remove("pre"); e.target.classList.add("in"); io.unobserve(e.target); }
      else e.target.classList.add("pre");
    }), { threshold: 0.6 });
    document.querySelectorAll("[data-draw]").forEach(n => io.observe(n));
  }
})();
