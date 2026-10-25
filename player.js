/* Library + player page. Routes: #lesson/<id> (built-in) and #mine/<id> (saved on this phone). */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const audio = $("audio"), scrub = $("scrub"), timeEl = $("time"), capEl = $("caption");
  const kb = b => (b / 1000).toFixed(1) + " KB";
  const board = new Vecta.Board($("board"));
  // Where lesson files live. (The no-folders build changes only these two lines.)
  const LESSON_INDEX = "lessons.json";
  const lbase = id => id + "-";
  let lesson = null, current = null, builtinId = null, end = 0, ccOn = true, objectUrls = [], index = { lessons: [] };

  // ---------- offline status
  let swReady = false;
  function setStatus(ok, text) { const s = $("status"); s.textContent = text; s.classList.toggle("ok", ok); }
  let embedded = false;
  try { embedded = window.self !== window.top; } catch (e) { embedded = true; }
  if ("serviceWorker" in navigator && !embedded) {
    navigator.serviceWorker.register("sw.js").then(() => navigator.serviceWorker.ready)
      .then(() => { swReady = true; setStatus(true, "App works offline"); refreshDownloads(); })
      .catch(() => { setStatus(false, "Online only"); refreshDownloads(); });
  } else setStatus(false, "Online only");

  // ---------- library
  function card(href, kicker, title, facts, pills) {
    const a = document.createElement("a");
    a.className = "card"; a.href = href;
    a.innerHTML = '<span class="kicker"></span><span class="title"></span><span class="facts"></span><span class="pills"></span>';
    a.querySelector(".kicker").textContent = kicker;
    a.querySelector(".title").textContent = title;
    const f = a.querySelector(".facts");
    facts.forEach(t => { const s = document.createElement("span"); s.textContent = t; f.appendChild(s); });
    (pills || []).forEach(p => addPill(a, p));
    return a;
  }
  function addPill(cardEl, p) {
    const s = document.createElement("span"); s.className = "pill" + (p.cls ? " " + p.cls : ""); s.textContent = p.text;
    if (p.key) s.dataset.key = p.key;
    cardEl.querySelector(".pills").appendChild(s);
  }

  async function renderLibrary() {
    const b = $("builtin"); b.textContent = "";
    try {
      index = await (await fetch(LESSON_INDEX)).json();
      index.lessons.forEach(l => {
        const c = card("#lesson/" + l.id, l.subject + " · " + l.level, l.title, [Vecta.fmtTime(l.duration), kb(l.bytes)],
          l.voice === "placeholder" ? [{ text: "placeholder voice", cls: "warn" }] : []);
        c.dataset.id = l.id; b.appendChild(c);
      });
      refreshDownloads();
    } catch (e) {
      b.innerHTML = '<div class="empty">Lessons could not load. Connect to the internet once, then they stay available offline.</div>';
    }
    const m = $("mine"); m.textContent = "";
    let mine = [];
    try { mine = await Vecta.listLessons(); } catch (e) { /* storage unavailable */ }
    mine.sort((x, y) => (y.saved || 0) - (x.saved || 0));
    if (!mine.length) {
      m.innerHTML = '<div class="empty">No lessons yet. Record one, or open a .vecta file someone sent you.</div>';
      return;
    }
    for (const r of mine) {
      const s = await Vecta.recordBytes(r);
      m.appendChild(card("#mine/" + encodeURIComponent(r.id), "Saved on this phone", r.lesson.title || "Untitled lesson",
        [Vecta.fmtTime(r.lesson.duration), kb(s.total)]));
    }
  }

  // ---------- download lessons for offline
  // The offline worker (sw.js) saves any lesson file the page fetches; this just fetches them all.
  function audioFor(l) { // the audio file this browser will actually play
    const list = l.audio || [];
    return (list.find(a => audio.canPlayType(a.type)) || list[list.length - 1] || {}).src;
  }
  function sizeFor(l) { // index entry -> bytes this browser downloads
    const m4a = !audio.canPlayType("audio/ogg; codecs=opus") && audio.canPlayType("audio/mp4");
    return l.sizes.instructions_gz + (m4a ? l.sizes.voice_m4a : l.sizes.voice_opus);
  }
  async function isSaved(l) {
    if (!window.caches) return false;
    try {
      const j = await caches.match(new URL(lbase(l.id) + "lesson.json", location.href).href);
      if (!j) return false;
      const src = audioFor(await j.clone().json());
      return !!(src && await caches.match(new URL(lbase(l.id) + src, location.href).href));
    } catch (e) { return false; }
  }
  let downloading = false;
  async function refreshDownloads() {
    if (!index.lessons.length || downloading) return;
    const total = index.lessons.reduce((n, l) => n + sizeFor(l), 0);
    let saved = 0;
    for (const l of index.lessons) {
      const ok = await isSaved(l);
      if (ok) saved++;
      const c = document.querySelector('#builtin .card[data-id="' + l.id + '"]');
      if (c) {
        const old = c.querySelector('[data-key="saved"]'); if (old) old.remove();
        if (ok) addPill(c, { text: "✓ Saved offline", cls: "ok", key: "saved" });
      }
    }
    const n = index.lessons.length, btn = $("dlBtn"), dl = $("dl");
    if (!swReady) {
      btn.disabled = true; dl.classList.remove("done");
      $("dlInfo").textContent = embedded ? "Downloading works on Vecta's own link (GitHub Pages), not in this preview."
        : "Open Vecta from its https link to download lessons for offline use.";
      return;
    }
    const done = saved === n;
    dl.classList.toggle("done", done);
    btn.disabled = done;
    $("dlLabel").textContent = done ? "Downloaded" : saved ? "Download the rest" : "Download all";
    $("dlTitle").textContent = done ? "All lessons are on this phone" : "Download lessons for offline";
    $("dlInfo").textContent = done ? n + " lessons · " + kb(total) + " · they play with no signal"
      : n + " lessons · " + kb(total) + " in total" + (saved ? " · " + saved + " already saved" : "");
  }
  $("dlBtn").addEventListener("click", async () => {
    if (downloading) return;
    downloading = true;
    const btn = $("dlBtn"), bar = $("dlBar"), fill = $("dlFill");
    btn.disabled = true; bar.hidden = false; fill.style.width = "0%";
    const total = index.lessons.reduce((n, l) => n + sizeFor(l), 0);
    let got = 0, failed = 0;
    for (const l of index.lessons) {
      $("dlLabel").textContent = "Downloading…";
      $("dlInfo").textContent = "Saving “" + l.title + "”… " + kb(got) + " of " + kb(total);
      try {
        if (!(await isSaved(l))) {
          const base = lbase(l.id);
          const j = await fetch(base + "lesson.json", { cache: "reload" });
          if (!j.ok) throw new Error();
          const src = audioFor(await j.json());
          const a = await fetch(base + src, { cache: "reload" });
          if (!a.ok) throw new Error();
          await a.arrayBuffer();
        }
      } catch (e) { failed++; }
      got += sizeFor(l);
      fill.style.width = Math.round(100 * got / total) + "%";
    }
    downloading = false;
    setTimeout(() => { bar.hidden = true; }, 600);
    await refreshDownloads();
    if (failed) { $("dlInfo").textContent = failed + " lesson(s) didn't download. Check your connection and tap the button again."; btn.disabled = false; }
  });

  $("importFile").addEventListener("change", async e => {
    const file = e.target.files[0]; e.target.value = "";
    const msg = $("importMsg"); msg.hidden = false; msg.className = "notice"; msg.textContent = "Opening " + file.name + "…";
    try {
      const rec = await Vecta.fromVecta(await file.arrayBuffer());
      await Vecta.saveLesson(rec);
      msg.textContent = "Added “" + (rec.lesson.title || "lesson") + "” to My lessons.";
      renderLibrary();
    } catch (err) { msg.className = "notice error"; msg.textContent = err.message + " Ask the sender to share the .vecta file again."; }
  });

  // ---------- player
  function cleanup() {
    audio.pause(); audio.removeAttribute("src"); audio.textContent = ""; audio.load();
    objectUrls.forEach(u => URL.revokeObjectURL(u)); objectUrls = [];
  }

  function pickAudio(list, urlFor) {
    for (const a of list) if (audio.canPlayType(a.type)) return urlFor(a);
    return list.length ? urlFor(list[list.length - 1]) : "";
  }

  async function openLesson(kind, id) {
    cleanup();
    $("library").hidden = true; $("playerView").hidden = false;
    const msg = $("loadMsg"); msg.hidden = true;
    $("deleteBtn").hidden = kind !== "mine"; $("deleteConfirm").hidden = true; $("shareMsg").hidden = true;
    builtinId = kind === "lesson" ? id : null; current = null;
    let sizes;
    try {
      if (kind === "lesson") {
        const base = lbase(id);
        lesson = await (await fetch(base + "lesson.json")).json();
        audio.src = pickAudio(lesson.audio, a => base + a.src);
        if (!index.lessons.length) { try { index = await (await fetch(LESSON_INDEX)).json(); } catch (e) { /* sizes stay blank */ } }
        const meta = index.lessons.find(l => l.id === id);
        if (meta) sizes = { voice: sizeFor(meta) - meta.sizes.instructions_gz, draw: meta.sizes.instructions_gz };
      } else {
        current = await Vecta.getLesson(decodeURIComponent(id));
        if (!current) throw new Error("This lesson is no longer on this phone.");
        lesson = current.lesson;
        audio.src = pickAudio(current.audio.map(a => ({ type: a.type, blob: a.blob })), a => { const u = URL.createObjectURL(a.blob); objectUrls.push(u); return u; });
        sizes = await Vecta.recordBytes(current);
      }
    } catch (err) {
      msg.hidden = false; msg.className = "notice error";
      msg.textContent = (err.message || "This lesson could not load.") + " Go back and pick another lesson.";
      return;
    }
    end = Vecta.lessonEnd(lesson);
    $("pTitle").textContent = lesson.title || "Untitled lesson";
    $("pMeta").textContent = Vecta.fmtTime(end) + (lesson.subject ? " · " + lesson.subject : "") + (lesson.voice === "placeholder" ? " · placeholder voice" : "");
    scrub.max = end; scrub.value = 0;
    $("cc").hidden = !(lesson.captions && lesson.captions.length);
    capEl.textContent = lesson.captions && lesson.captions.length ? "Press play. The board draws itself in time with the voice." : "";
    if (sizes) {
      const total = sizes.voice + sizes.draw;
      $("totalKB").textContent = kb(total); $("voiceKB").textContent = kb(sizes.voice); $("drawKB").textContent = kb(sizes.draw);
      $("barVoice").style.width = (100 * sizes.voice / total) + "%"; $("barDraw").style.width = (100 * sizes.draw / total) + "%";
      $("perHour").textContent = "≈ " + (total / Math.max(end, 1) * 3600 / 1e6).toFixed(1) + " MB per hour";
    }
    board.setElements(lesson.elements || []);
    board.resize();
    render(0);
  }

  function now() { return Math.min(audio.currentTime || 0, end); }
  function render(t) {
    board.draw(t);
    if (lesson && lesson.captions && lesson.captions.length && (t > 0 || !audio.paused)) {
      let c = null; for (const k of lesson.captions) if (k.t <= t) c = k;
      capEl.textContent = ccOn ? (c ? c.text : "") : "";
    }
    scrub.value = t;
    timeEl.textContent = Vecta.fmtTime(t) + " / " + Vecta.fmtTime(end);
  }
  function setIcon(p) {
    $("playIcon").innerHTML = p ? '<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>' : '<path d="M8 5.5v13l11-6.5z"/>';
    $("play").setAttribute("aria-label", p ? "Pause" : "Play");
  }
  function loop() { render(now()); if (!audio.paused) requestAnimationFrame(loop); }

  $("play").addEventListener("click", () => {
    if (audio.paused) { if (audio.ended || now() >= end - 0.05) audio.currentTime = 0; const p = audio.play(); if (p && p.catch) p.catch(() => {}); }
    else audio.pause();
  });
  $("back10").addEventListener("click", () => { audio.currentTime = Math.max(0, now() - 10); render(now()); });
  $("cc").addEventListener("click", () => { ccOn = !ccOn; $("cc").setAttribute("aria-pressed", String(ccOn)); render(now()); });
  scrub.addEventListener("input", () => { audio.currentTime = +scrub.value; render(+scrub.value); });
  audio.addEventListener("play", () => { setIcon(true); requestAnimationFrame(loop); });
  audio.addEventListener("pause", () => { setIcon(false); render(now()); });
  audio.addEventListener("ended", () => { setIcon(false); render(end); });
  audio.addEventListener("error", () => { const m = $("loadMsg"); m.hidden = false; m.className = "notice error"; m.textContent = "This phone couldn't play the lesson's sound file. Try another browser, such as Chrome."; });

  // A built-in lesson as a shareable record: its instructions plus both audio files,
  // so the person receiving it can play it on Android or iPhone.
  async function builtinRecord(id) {
    const base = lbase(id);
    const l = await (await fetch(base + "lesson.json")).json();
    const files = [];
    for (const a of l.audio) {
      const r = await fetch(base + a.src);
      if (r.ok) files.push({ name: a.src, type: a.type, blob: await r.blob() });
    }
    if (!files.length) throw new Error("The sound file isn't on this phone yet.");
    l.audio = l.audio.filter(a => files.some(f => f.name === a.src));
    return { id: "mine-" + l.id, lesson: l, audio: files, saved: Date.now() };
  }

  $("shareBtn").addEventListener("click", async () => {
    const m = $("shareMsg");
    let rec = current;
    if (!rec && builtinId) {
      try { rec = await builtinRecord(builtinId); }
      catch (e) { m.hidden = false; m.textContent = "Couldn't prepare the file: " + e.message + " Connect to the internet and try again."; return; }
    }
    if (!rec) return;
    const bytes = await Vecta.toVecta(rec);
    const name = (lesson.title || "lesson").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() + ".vecta";
    const file = new File([bytes], name, { type: "application/zip" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: lesson.title }); return; } catch (e) { if (e.name === "AbortError") return; }
    }
    const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  });
  $("deleteBtn").addEventListener("click", async () => {
    const c = $("deleteConfirm");
    if (c.hidden) { c.hidden = false; return; }
    await Vecta.deleteLesson(current.id); location.hash = "";
  });

  // ---------- routing
  function route() {
    const m = location.hash.match(/^#(lesson|mine)\/(.+)$/);
    if (m) openLesson(m[1], m[2]);
    else { cleanup(); lesson = null; current = null; builtinId = null; $("playerView").hidden = true; $("library").hidden = false; renderLibrary(); }
  }
  $("backToList").addEventListener("click", e => { e.preventDefault(); location.hash = ""; });
  window.addEventListener("hashchange", route);
  route();
})();
