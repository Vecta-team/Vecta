/* Record mode: microphone + drawing, saved as a Vecta lesson (voice + timed instructions). */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const kb = b => (b / 1000).toFixed(1) + " KB";
  const board = new Vecta.Board($("board"));
  const MIMES = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4", "audio/aac"];
  const EXT = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/aac": "aac" };

  let tool = { kind: "pen", color: "ink" };
  let elements = [], recording = false, t0 = 0, recorder = null, chunks = [], stream = null, mime = "";
  let stroke = null, entry = null, take = null, previewUrl = null;

  const elapsed = () => recording ? (performance.now() - t0) / 1000 : 0;
  const r2 = v => Math.round(v * 100) / 100;

  function say(text, error) {
    const m = $("msg"); m.hidden = !text; m.className = "notice" + (error ? " error" : ""); m.textContent = text || "";
  }

  // ---------- tools
  document.querySelectorAll("[data-tool]").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll("[data-tool]").forEach(x => x.setAttribute("aria-pressed", "false"));
    b.setAttribute("aria-pressed", "true");
    tool = { kind: b.dataset.tool, color: b.dataset.color || "ink" };
    closeEntry();
  }));
  $("undo").addEventListener("click", () => { closeEntry(); elements.pop(); board.setElements(elements); });
  $("newPage").addEventListener("click", () => { closeEntry(); elements.push({ t: r2(elapsed()), type: "clear" }); board.setElements(elements); });

  // ---------- drawing
  const el = board.el;
  el.addEventListener("pointerdown", e => {
    if (e.target.closest(".entry")) return;
    if (!recording) { $("hint").textContent = "Press Record first. Everything you draw is saved in time with your voice."; return; }
    const [x, y] = board.toBoard(e.clientX, e.clientY);
    if (tool.kind === "pen") {
      el.setPointerCapture(e.pointerId);
      stroke = { t: r2(elapsed()), type: "stroke", color: tool.color, w: 0.6, pts: [[x, y, 0]] };
      elements.push(stroke);
      e.preventDefault();
    } else openEntry(tool.kind, x, y);
  });
  el.addEventListener("pointermove", e => {
    if (!stroke) return;
    const [x, y] = board.toBoard(e.clientX, e.clientY), last = stroke.pts[stroke.pts.length - 1];
    if (Math.hypot((x - last[0]) * 16 / 9, y - last[1]) < 0.35) return; // skip tiny moves: smaller files
    stroke.pts.push([x, y, Math.round((elapsed() - stroke.t) * 1000)]);
  });
  const endStroke = () => { if (stroke && stroke.pts.length === 1) stroke.pts.push([stroke.pts[0][0] + 0.05, stroke.pts[0][1], 10]); stroke = null; };
  el.addEventListener("pointerup", endStroke);
  el.addEventListener("pointercancel", endStroke);

  // ---------- text / equation entry
  function openEntry(kind, x, y) {
    closeEntry();
    entry = document.createElement("div");
    entry.className = "entry";
    entry.style.left = Math.min(Math.max(x, 22), 78) + "%";
    entry.style.top = Math.min(Math.max(y, 18), 82) + "%";
    const label = kind === "math" ? "Equation, e.g. A = \\pi r^2 or \\frac{1}{2}bh" : "Text";
    entry.innerHTML = '<input type="text" autocomplete="off" spellcheck="false"><div class="preview" aria-live="polite"></div><div class="row"><button class="btn" type="button" data-a="cancel">Cancel</button><button class="btn primary" type="button" data-a="add">Add</button></div>';
    const input = entry.querySelector("input"), preview = entry.querySelector(".preview");
    input.setAttribute("aria-label", label); input.placeholder = label;
    if (kind !== "math") preview.remove();
    input.addEventListener("input", () => {
      if (kind !== "math") return;
      try { katex.render(input.value || " ", preview, { throwOnError: true }); }
      catch (err) { preview.textContent = "Keep typing… (" + err.message.replace(/^KaTeX parse error: /, "").slice(0, 60) + ")"; }
    });
    const add = () => {
      const v = input.value.trim();
      if (v && recording) {
        elements.push({ t: r2(elapsed()), type: kind, value: v, x, y, size: kind === "math" ? 6 : 5, color: tool.color === "accent" ? "accent" : undefined });
        board.setElements(elements);
      }
      closeEntry();
    };
    input.addEventListener("keydown", ev => { if (ev.key === "Enter") { ev.preventDefault(); add(); } if (ev.key === "Escape") closeEntry(); });
    entry.querySelector('[data-a="add"]').addEventListener("click", add);
    entry.querySelector('[data-a="cancel"]').addEventListener("click", closeEntry);
    el.appendChild(entry);
    input.focus();
  }
  function closeEntry() { if (entry) { entry.remove(); entry = null; } }

  // ---------- recording
  function tick() {
    if (!recording) return;
    const t = elapsed();
    board.draw(t);
    $("clock").textContent = Vecta.fmtTime(t);
    requestAnimationFrame(tick);
  }

  let embedded = false;
  try { embedded = window.self !== window.top; } catch (e) { embedded = true; }

  async function start() {
    if (embedded) {
      say("Record mode can't use the microphone inside this preview. Open Vecta from its own link (your GitHub Pages address) to record.", true); return;
    }
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      say("Recording needs a secure https link and a recent browser. Open Vecta from its GitHub Pages address in Chrome or Safari.", true); return;
    }
    $("rec").disabled = true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
    } catch (err) {
      $("rec").disabled = false;
      say(err.name === "NotAllowedError" ? "Microphone access is blocked. Tap the icon next to the address bar, set Microphone to Allow, then reload the page and press Record again."
        : "No microphone was found. Plug one in or use a phone, then press Record again.", true);
      return;
    }
    mime = MIMES.find(m => MediaRecorder.isTypeSupported(m)) || "";
    try { recorder = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 24000 } : { audioBitsPerSecond: 24000 }); }
    catch (e) { recorder = new MediaRecorder(stream); }
    chunks = []; elements = []; board.setElements(elements);
    recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    recorder.onstart = () => {
      t0 = performance.now(); recording = true; say("");
      $("rec").disabled = false; $("rec").classList.add("on"); $("recLabel").textContent = "Stop";
      $("clock").classList.add("live"); $("undo").disabled = false; $("newPage").disabled = false;
      $("hint").textContent = "Recording. Talk and draw. Press Stop when you finish.";
      requestAnimationFrame(tick);
    };
    recorder.onstop = finish;
    recorder.start(1000);
  }

  function stop() {
    if (!recording) return;
    const duration = elapsed();
    recording = false; closeEntry(); endStroke();
    take = { duration: r2(duration) };
    recorder.stop();
    stream.getTracks().forEach(t => t.stop());
  }

  async function finish() {
    const type = (recorder.mimeType || mime || "audio/webm").split(";")[0];
    const fullType = recorder.mimeType || mime || type;
    const blob = new Blob(chunks, { type });
    const id = "rec-" + Date.now().toString(36);
    const name = "voice." + (EXT[type] || "webm");
    take.lesson = { format: "vecta/0.1", id, title: "", subject: "", language: "en", voice: "recorded",
      duration: take.duration, board: { aspect: "16:9" }, audio: [{ src: name, type: fullType }], captions: [],
      elements: elements.map(e => e.type === "stroke" ? Object.assign({}, e, { pts: e.pts.map(p => [p[0], p[1], p[2]]) }) : e) };
    take.audio = [{ name, type: fullType, blob }];
    $("rec").classList.remove("on"); $("recLabel").textContent = "Record"; $("clock").classList.remove("live");
    $("undo").disabled = true; $("newPage").disabled = true;
    showReview();
  }

  $("rec").addEventListener("click", () => recording ? stop() : start());
  window.addEventListener("beforeunload", e => { if (recording || (take && !take.saved)) { e.preventDefault(); e.returnValue = ""; } });

  // ---------- review
  const pBoard = new Vecta.Board($("previewBoard"));
  const pAudio = $("pAudio");
  let pEnd = 0;

  async function showReview() {
    $("studio").hidden = true; $("review").hidden = false;
    pBoard.setElements(take.lesson.elements); pBoard.resize();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(take.audio[0].blob); pAudio.src = previewUrl;
    pEnd = Vecta.lessonEnd(take.lesson);
    $("pScrub").max = pEnd; pRender(0);
    const s = await Vecta.recordBytes({ lesson: take.lesson, audio: take.audio });
    $("rTotal").textContent = kb(s.total); $("rVoice").textContent = kb(s.voice); $("rDraw").textContent = kb(s.draw);
    $("rHour").textContent = "≈ " + (s.total / Math.max(pEnd, 1) * 3600 / 1e6).toFixed(1) + " MB per hour";
    $("revMeta").textContent = Vecta.fmtTime(pEnd) + " · " + take.lesson.elements.filter(e => e.type !== "clear").length + " board items";
    $("title").focus();
  }
  function pRender(t) { pBoard.draw(t); $("pScrub").value = t; $("pTime").textContent = Vecta.fmtTime(t) + " / " + Vecta.fmtTime(pEnd); }
  function pLoop() { pRender(Math.min(pAudio.currentTime, pEnd)); if (!pAudio.paused) requestAnimationFrame(pLoop); }
  $("pPlay").addEventListener("click", () => {
    if (pAudio.paused) { if (pAudio.ended) pAudio.currentTime = 0; const p = pAudio.play(); if (p && p.catch) p.catch(() => {}); } else pAudio.pause();
  });
  $("pScrub").addEventListener("input", () => { pAudio.currentTime = +$("pScrub").value; pRender(+$("pScrub").value); });
  const pIcon = p => { $("pIcon").innerHTML = p ? '<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>' : '<path d="M8 5.5v13l11-6.5z"/>'; };
  pAudio.addEventListener("play", () => { pIcon(true); requestAnimationFrame(pLoop); });
  pAudio.addEventListener("pause", () => pIcon(false));
  pAudio.addEventListener("ended", () => { pIcon(false); pRender(pEnd); });

  function finalRecord() {
    take.lesson.title = $("title").value.trim() || "Untitled lesson";
    take.lesson.subject = $("subject").value.trim();
    return { id: "mine-" + take.lesson.id, lesson: take.lesson, audio: take.audio, saved: Date.now() };
  }
  $("save").addEventListener("click", async () => {
    try {
      const rec = finalRecord(); await Vecta.saveLesson(rec); take.saved = true;
      location.href = "./#mine/" + encodeURIComponent(rec.id);
    } catch (err) { say("Couldn't save on this phone: " + err.message + " Use “Save as .vecta file” instead.", true); }
  });
  $("download").addEventListener("click", async () => {
    const rec = finalRecord(), bytes = await Vecta.toVecta(rec);
    const name = rec.lesson.title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() + ".vecta";
    const file = new File([bytes], name, { type: "application/zip" });
    take.saved = true;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: rec.lesson.title }); return; } catch (e) { if (e.name === "AbortError") return; }
    }
    const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  });
  $("discard").addEventListener("click", () => {
    const c = $("discardConfirm");
    if (c.hidden) { c.hidden = false; return; }
    c.hidden = true; pAudio.pause(); take = null; elements = []; board.setElements(elements); board.draw(0);
    $("review").hidden = true; $("studio").hidden = false; $("clock").textContent = "0:00";
    $("hint").textContent = "Drawing starts when you press Record. Tap Text or Equation, then tap the board where it should go.";
  });
})();
