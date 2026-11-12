"""Build every lesson in lessons_src/ into site/lessons/<id>/.

For each lesson: speaks the script (placeholder voice), times the drawings to
the speech, writes lesson.json, voice.opus (16 kbps) and voice.m4a (iPhone
fallback), and finally site/lessons/index.json with real file sizes.

To use a real recording instead of the robot voice, put it at
recordings/<lesson-id>.m4a (or .wav/.mp3): one take, every sentence in order,
with about 2 seconds of silence between sentences. The build splits it at the
pauses and uses those timings instead.
"""
import importlib.util, json, os, subprocess, sys, wave, glob, re, gzip

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "lessons_src")
OUT = os.path.join(HERE, "..", "site", "lessons")
REC = os.path.join(HERE, "recordings")
RATE = 24000

def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def read_pcm(path):
    with wave.open(path) as w:
        return w.readframes(w.getnframes())

def to_pcm_wav(src, dst, clean=False):
    # clean: for human recordings, cut rumble below 80 Hz and even out the volume
    af = ["-af", "highpass=f=80,loudnorm=I=-18:TP=-2:LRA=11"] if clean else []
    run(["ffmpeg", "-y", "-i", src, *af, "-ac", "1", "-ar", str(RATE), "-sample_fmt", "s16", dst])

def robot_segments(segments, tmp):
    """Speak each sentence with espeak-ng; return (pcm_bytes, durations)."""
    parts, durs = [], []
    for i, seg in enumerate(segments):
        raw = os.path.join(tmp, f"s{i}.wav")
        run(["espeak-ng", "-v", "en-gb", "-s", "150", "-w", raw, seg["say"]])
        to_pcm_wav(raw, raw + ".pcm.wav")
        pcm = read_pcm(raw + ".pcm.wav")
        parts.append(pcm); durs.append(len(pcm) / 2 / RATE)
    return parts, durs

def aligned_segments(src_py, path, tmp):
    """Split a human recording by lining the script up with the speech (PocketSphinx).
    Returns (parts, part_durations, leads, speech_durations); lead = silence before the words in each part."""
    sys.path.insert(0, HERE)
    import align_recording
    spans, _ = align_recording.main(src_py, path)
    wav = os.path.join(tmp, "rec.wav")
    to_pcm_wav(path, wav, clean=True)
    pcm = read_pcm(wav); total = len(pcm) / 2 / RATE
    cuts = [max(0, spans[0][0] - 0.25)]
    for (s0, e0), (s1, e1) in zip(spans, spans[1:]):
        cuts.append(min((e0 + s1) / 2, s1 - 0.05))
    cuts.append(min(total, spans[-1][1] + 0.5))
    parts, durs, leads, speech = [], [], [], []
    for i, (s, e) in enumerate(spans):
        a, b = cuts[i], cuts[i + 1]
        chunk = pcm[int(a * RATE) * 2: int(b * RATE) * 2]
        parts.append(chunk); durs.append(len(chunk) / 2 / RATE); leads.append(s - a); speech.append(e - s)
    return parts, durs, leads, speech

def recorded_segments(path, n, tmp):
    """Fallback: split one human recording into n sentences at its n-1 longest pauses."""
    wav = os.path.join(tmp, "rec.wav")
    to_pcm_wav(path, wav, clean=True)
    out = subprocess.run(["ffmpeg", "-i", wav, "-af", "silencedetect=noise=-35dB:d=0.6", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]
    pcm = read_pcm(wav)
    total = len(pcm) / 2 / RATE
    gaps = [(e - s, s, e) for s, e in zip(starts, ends) if s > 0.05 and e < total - 0.05]
    if len(gaps) < n - 1:
        sys.exit(f"{os.path.basename(path)}: found {len(gaps) + 1} sentences, script has {n}. "
                 "Leave about 2 seconds of silence between sentences and record again.")
    cuts = sorted(sorted(gaps, reverse=True)[: n - 1], key=lambda g: g[1])
    # skip silence before the first word
    bounds, prev = [], (max(0, ends[0] - 0.15) if starts and starts[0] < 0.05 else 0)
    for _, s, e in cuts:
        bounds.append((prev, s + 0.15)); prev = e - 0.15
    bounds.append((prev, total))
    parts, durs = [], []
    for a, b in bounds:
        a, b = max(0, a), min(total, b)
        chunk = pcm[int(a * RATE) * 2: int(b * RATE) * 2]
        parts.append(chunk); durs.append(len(chunk) / 2 / RATE)
    return parts, durs

def build(path):
    spec = importlib.util.spec_from_file_location("lesson", path)
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    meta, segs, gap = mod.META, mod.SEGMENTS, getattr(mod, "GAP", 0.6)
    out = os.path.join(OUT, meta["id"]); os.makedirs(out, exist_ok=True)
    tmp = os.path.join(out, "_tmp"); os.makedirs(tmp, exist_ok=True)
    recs = [p for p in glob.glob(os.path.join(REC, meta["id"] + ".*"))]
    robot_parts, robot_durs = robot_segments(segs, tmp)
    n = len(segs)
    if recs:
        voice = "recorded"; gap = 0.0  # keep the speaker's own pauses
        try:
            parts, durs, leads, speech = aligned_segments(path, recs[0], tmp)
            print(f"  {meta['id']}: lined up script with {os.path.basename(recs[0])}")
        except Exception as err:
            print(f"  {meta['id']}: script alignment failed ({err}); splitting at pauses instead")
            parts, durs = recorded_segments(recs[0], n, tmp); leads, speech = [0] * n, durs; gap = 0.35
    else:
        parts, durs = robot_parts, robot_durs; leads, speech = [0] * n, robot_durs; voice = "placeholder"
    t, els, caps, pcm = 0.0, [], [], []
    for seg, part, dur, lead, sp, rdur in zip(segs, parts, durs, leads, speech, robot_durs):
        start = t + lead  # when the words begin
        caps.append({"t": round(start, 2), "text": seg["say"]})
        stretch = sp / rdur if rdur else 1  # drawing offsets were tuned to the robot's speed
        for item in seg["show"]:
            els.append({"t": round(start + item["at"] * stretch, 2), **{k: v for k, v in item.items() if k != "at"}})
        pcm.append(part + b"\x00\x00" * int(gap * RATE)); t += dur + gap
    full = os.path.join(tmp, "voice.wav")
    with wave.open(full, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE); w.writeframes(b"".join(pcm))
    run(["ffmpeg", "-y", "-i", full, "-ac", "1", "-c:a", "libopus", "-b:a", "16k", "-application", "voip",
         os.path.join(out, "voice.opus")])
    run(["ffmpeg", "-y", "-i", full, "-ac", "1", "-c:a", "aac", "-b:a", "24k", os.path.join(out, "voice.m4a")])
    lesson = {"format": "vecta/0.1", "id": meta["id"], "title": meta["title"], "subject": meta["subject"],
              "level": meta.get("level", ""), "language": "en", "voice": voice, "duration": round(t, 2),
              "board": {"aspect": "16:9"},
              "audio": [{"src": "voice.opus", "type": "audio/ogg; codecs=opus"},
                        {"src": "voice.m4a", "type": "audio/mp4"}],
              "captions": caps, "elements": els}
    js = json.dumps(lesson, ensure_ascii=False, separators=(",", ":"))
    open(os.path.join(out, "lesson.json"), "w").write(js)
    for f in glob.glob(os.path.join(tmp, "*")): os.remove(f)
    os.rmdir(tmp)
    sizes = {"instructions_gz": len(gzip.compress(js.encode(), 9)),
             "voice_opus": os.path.getsize(os.path.join(out, "voice.opus")),
             "voice_m4a": os.path.getsize(os.path.join(out, "voice.m4a"))}
    return {"id": meta["id"], "title": meta["title"], "subject": meta["subject"], "level": meta.get("level", ""),
            "duration": round(t, 2), "voice": voice, "order": meta.get("order", 99),
            "bytes": sizes["instructions_gz"] + sizes["voice_opus"], "sizes": sizes}

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    entries = [build(p) for p in sorted(glob.glob(os.path.join(SRC, "*.py")))]
    entries.sort(key=lambda e: e["order"])
    json.dump({"lessons": entries}, open(os.path.join(OUT, "index.json"), "w"), indent=1)
    for e in entries:
        print(f"{e['id']:<22} {e['duration']:>5.1f}s  {e['bytes']/1000:6.1f} KB  "
              f"({e['bytes']/e['duration']*3600/1e6:.1f} MB/h)  voice: {e['voice']}")
