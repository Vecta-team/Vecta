/* Saved lessons (IndexedDB) and .vecta files.
 * A .vecta file is a plain zip holding lesson.json plus its audio file(s),
 * small enough to send over WhatsApp or Bluetooth.
 */
(function (global) {
  "use strict";
  const DB = "vecta", STORE = "lessons";

  function open() {
    return new Promise((res, rej) => {
      if (!global.indexedDB) return rej(new Error("This browser can't save lessons."));
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function tx(mode, fn) {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(STORE, mode), s = t.objectStore(STORE);
      const out = fn(s);
      t.oncomplete = () => res(out && "result" in out ? out.result : undefined);
      t.onerror = () => rej(t.error);
    });
  }
  // record = { id, lesson, audio: [{ name, type, blob }], saved }
  const saveLesson = rec => tx("readwrite", s => s.put(rec));
  const getLesson = id => tx("readonly", s => s.get(id));
  const listLessons = () => tx("readonly", s => s.getAll());
  const deleteLesson = id => tx("readwrite", s => s.delete(id));

  // ---- zip (store method, with deflate support when reading)
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

  function makeZip(files) { // files: [{ name, data: Uint8Array }]
    const enc = new TextEncoder(), parts = [], central = [];
    let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);
      h.setUint16(8, 0, true); h.setUint32(14, crc, true); h.setUint32(18, size, true); h.setUint32(22, size, true);
      h.setUint16(26, name.length, true);
      parts.push(new Uint8Array(h.buffer), name, f.data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint32(16, crc, true); c.setUint32(20, size, true); c.setUint32(24, size, true); c.setUint16(28, name.length, true);
      c.setUint32(42, offset, true);
      central.push(new Uint8Array(c.buffer), name);
      offset += 30 + name.length + size;
    }
    const cdSize = central.reduce((n, p) => n + p.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, cdSize, true); e.setUint32(16, offset, true);
    return concat(parts.concat(central, [new Uint8Array(e.buffer)]));
  }

  function concat(arrs) {
    const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0)); let o = 0;
    for (const a of arrs) { out.set(a, o); o += a.length; }
    return out;
  }

  async function readZip(buf) { // -> { name: Uint8Array }
    const u8 = new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), dec = new TextDecoder();
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error("This isn't a Vecta lesson file.");
    const count = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const out = {};
    for (let n = 0; n < count; n++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error("This lesson file is damaged.");
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
      const local = dv.getUint32(p + 42, true), name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
      const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
      const raw = u8.subarray(start, start + csize);
      if (method === 0) out[name] = raw.slice();
      else if (method === 8 && global.DecompressionStream) {
        const ds = new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        out[name] = new Uint8Array(await new Response(ds).arrayBuffer());
      } else throw new Error("This lesson file uses compression this browser can't open.");
      p += 46 + nlen + xlen + clen;
    }
    return out;
  }

  // Saved record -> .vecta bytes
  async function toVecta(rec) {
    const files = [{ name: "lesson.json", data: new TextEncoder().encode(JSON.stringify(rec.lesson)) }];
    for (const a of rec.audio) files.push({ name: a.name, data: new Uint8Array(await a.blob.arrayBuffer()) });
    return makeZip(files);
  }

  // .vecta bytes -> record ready to save
  async function fromVecta(buf) {
    const files = await readZip(buf);
    if (!files["lesson.json"]) throw new Error("This file has no lesson inside.");
    const lesson = JSON.parse(new TextDecoder().decode(files["lesson.json"]));
    if (!lesson.format || !String(lesson.format).startsWith("vecta/")) throw new Error("This isn't a Vecta lesson.");
    const audio = (lesson.audio || []).filter(a => files[a.src]).map(a => ({ name: a.src, type: a.type, blob: new Blob([files[a.src]], { type: a.type.split(";")[0] }) }));
    if (!audio.length) throw new Error("This lesson is missing its sound file.");
    lesson.id = lesson.id || "lesson-" + Date.now().toString(36);
    return { id: "mine-" + lesson.id, lesson, audio, saved: Date.now() };
  }

  // Download size: voice + drawing instructions (gzipped, as a web server sends them).
  async function recordBytes(rec) {
    const voice = rec.audio.length ? rec.audio[0].blob.size : 0;
    const json = new TextEncoder().encode(JSON.stringify(rec.lesson));
    let draw = json.length;
    if (global.CompressionStream) {
      try { draw = (await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer()).byteLength; }
      catch (e) { /* keep raw size */ }
    }
    return { voice, draw, total: voice + draw };
  }

  global.Vecta = Object.assign(global.Vecta || {}, {
    saveLesson, getLesson, listLessons, deleteLesson, makeZip, readZip, toVecta, fromVecta, crc32, recordBytes
  });
})(typeof window !== "undefined" ? window : globalThis);
