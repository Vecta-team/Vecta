/* Landing page: plays one real lesson with the same renderer the app uses (board.js).
 * Nothing here downloads the voice file until someone presses play. */
(function () {
  "use strict";

  // Old links like .../Vecta/#lesson/pythagoras pointed at the app when it was the front page.
  if (/^#(lesson|mine)\//.test(location.hash)) { location.replace("app.html" + location.hash); return; }

  const $ = id => document.getElementById(id);
  const kb = b => (b / 1000).toFixed(1) + " KB";
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
  function loop() { render(now()); if (!audio.paused) requestAnimationFrame(loop); }
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
    const calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    $("demo").scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "center" });
    if (audio.paused) toggle();
  });
  $("cc").addEventListener("click", () => { ccOn = !ccOn; $("cc").setAttribute("aria-pressed", String(ccOn)); render(now()); });
  scrub.addEventListener("input", () => { if (!lesson) return; begin(); audio.currentTime = +scrub.value; render(+scrub.value); });
  audio.addEventListener("play", () => { setIcon(true); requestAnimationFrame(loop); });
  audio.addEventListener("pause", () => { setIcon(false); render(now()); });
  audio.addEventListener("ended", () => { setIcon(false); render(end); });
  audio.addEventListener("error", () => { capEl.textContent = "This device couldn't play the lesson's sound file. Try another browser, such as Chrome."; });

  // ---------- "How it works": draw the example formula with the same maths engine as the board
  if (window.katex) { try { katex.render("A = \\pi r^2", $("formulaOut"), { throwOnError: false }); } catch (e) { /* plain text stays */ } }

  // ---------- footer: how much data this page really used, as reported by the browser
  window.addEventListener("load", () => setTimeout(() => {
    try {
      const entries = performance.getEntriesByType("navigation").concat(performance.getEntriesByType("resource"));
      const bytes = entries.reduce((n, e) => n + (e.transferSize || 0), 0);
      if (bytes > 0) { $("pageKB").textContent = "Loading this page just now used " + Math.round(bytes / 1000) + " KB of data, as measured by your browser."; $("pageKB").hidden = false; }
    } catch (e) { /* older browser: leave the line hidden */ }
  }, 400));
})();
