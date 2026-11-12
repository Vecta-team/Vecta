"""Find where each script sentence starts in a human recording (forced alignment).

Usage: python3 align_recording.py <lesson_src.py> <recording> -> prints JSON list of [start, end] per sentence.
Uses PocketSphinx (built-in English model) to line up the known script with the audio.
"""
import sys, re, json, subprocess, importlib.util, os
from pocketsphinx import Decoder

WORDS = {"r": "are", "let's": "lets", "we're": "we are", "centimetres": "centimeters", "pythagoras'": "pythagoras",
         "x": "ex", "c": "see", "b": "be", "a": "a"}

def norm(sentence):
    s = sentence.lower().replace("-", " ")
    out = []
    for w in re.findall(r"[a-z']+", s):
        out.extend(WORDS.get(w, w).split())
    return out

def main(src, rec):
    spec = importlib.util.spec_from_file_location("l", src); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    sents = [norm(s["say"]) for s in m.SEGMENTS]
    raw = subprocess.run(["ffmpeg", "-i", rec, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True).stdout
    d = Decoder(samprate=16000, bestpath=False)
    d.set_align_text(" ".join(w for s in sents for w in s))
    d.start_utt(); d.process_raw(raw, full_utt=True); d.end_utt()
    d.set_alignment(); d.start_utt(); d.process_raw(raw, full_utt=True); d.end_utt()
    words = [(w.name, w.start / 100, (w.start + w.duration) / 100) for w in d.get_alignment()]
    words = [w for w in words if w[0] not in ("<s>", "</s>", "<sil>") and not w[0].startswith("[")]
    total = sum(len(s) for s in sents)
    if len(words) != total:
        sys.exit(f"alignment found {len(words)} words, script has {total}")
    spans, i = [], 0
    for s in sents:
        chunk = words[i:i + len(s)]; i += len(s)
        spans.append([round(chunk[0][1], 2), round(chunk[-1][2], 2)])
    return spans, words

if __name__ == "__main__":
    spans, words = main(sys.argv[1], sys.argv[2])
    print(json.dumps(spans))
