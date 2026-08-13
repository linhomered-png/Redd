#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Example 04 — the vertical-Shorts mechanical gate, with ZERO media and ZERO deps.

`longform_maker/shorts_gate.py` turns "the rules for cutting a Short" into asserts
that fire at build time, so nobody has to remember them. This demo runs the gate
three times:

    1) a BROKEN spec  → 3 blocking failures (duration dead zone / slow first cut /
                        missing opening ID)
    2) the FIXED spec → passes, and the gate hands back caption times it computed
                        from segment indexes (you never hand-type timecodes)
    3) ANOTHER PLATFORM → a 31s spec the default `yt_shorts` band rejects (it lands
                        in the 25-45s dead zone), accepted with no code changes at
                        all — just `spec["platform"] = "ig_reels"`: the dead zone is
                        a YouTube-Shorts calibration and blocking it everywhere would
                        be a FALSE block

Note the S-O line in the reports: it is a **warning, not a failure**. Warnings
tell you something and let the build through; only `[FAIL]` stops it.

Run:
    python examples/04_shorts_gate.py

Needs: Python 3.9+ only. **No ffmpeg, no Pillow, no numpy, no real footage** —
this file uses itself as the stand-in "clip" so the gate's file-exists check has
something real to look at. (The one-command driver `src/shorts_autopilot.py` does
need ffmpeg + Pillow + numpy; the gate itself never does.)

Threshold source of truth: the gate has no per-call `rules=` override — the
duration band is selected per platform via `spec["platform"]` against the
module-level `PLATFORM_RULES` table; first-cut / white-first thresholds
(`FIRST_CUT_MAX`, `NONWHITE_MAX_RATIO`) are fixed module constants. Recalibrating
means editing `src/longform_maker/shorts_gate.py` on your own 3-5 best Shorts,
not passing a dict at call time.
"""
import os
import sys

# Make `src/` (and the gate's own folder) importable when run straight from the repo.
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "src"))
sys.path.insert(0, os.path.join(HERE, "..", "src", "longform_maker"))

from shorts_gate import (  # noqa: E402
    DEFAULT_PLATFORM,
    FIRST_CUT_MAX,
    NONWHITE_MAX_RATIO,
    PLATFORM_RULES,
    gate_shorts,
)

# The gate checks that every segment file really exists. No footage needed for a
# demo — point every segment at this script itself.
CLIP = os.path.abspath(__file__)

# The gate reports in Chinese; the S-x code in front of each message is the
# language-neutral key. Glossed here so this demo reads in either language.
GLOSS = {
    "S-A": "opening ID: first segment needs place/topic + one line of what-is-this",
    "S-B": "duration outside the band (or inside the dead zone)",
    "S-C": "first cut too slow - something must change early",
    "S-D": "loop broken: last segment must land back on the first frame",
    "S-E": "standing info bar missing",
    "S-F": "caption bound to a segment that does not exist",
    "S-G": "caption sitting on the loop segment - keep the seam clean",
    "S-I": "white-first broken: too much colour / too many accent colours",
    "S-O": "caption rhythm: lines sit too long / too few lines per minute (ADVISORY)",
}


def show(title, spec):
    """Run the gate once and print a human-readable report."""
    ok, rep = gate_shorts(spec)
    print("\n" + "=" * 64)
    print("%s  ->  %s" % (title, "PASS" if ok else "FAIL"))
    print("=" * 64)
    print("  platform : %s" % rep.get("platform", "?"))
    print("  duration : %.1fs" % rep.get("dur", 0.0))
    if rep.get("cap_rate") is not None:
        print("  captions : %.1f lines/min, median dwell %.2fs"
              % (rep["cap_rate"], rep["cap_dwell"]))
    for level in ("fails", "warns"):
        for msg in rep[level]:
            code = msg.split()[0].split("/")[0]
            print("  [%s] %s" % ("FAIL" if level == "fails" else "WARN", msg))
            if code in GLOSS:
                print("         ^ %s: %s" % (code, GLOSS[code]))
    if ok:
        print("  captions the gate computed from segment indexes:")
        for st, en, blocks, kind in rep["caps"]:
            print("    %5.2f - %5.2fs  %-6s %s"
                  % (st, en, kind, "".join(t for t, _c in blocks)))
    return ok, rep


def broken():
    """Three rule breaks at once — each one alone is enough to block the build."""
    return dict(
        name="short_demo_broken",
        place="Riverside Market",
        what="a 40-year-old noodle stall",
        addr="Riverside Market | 12 Example Road",
        segs=[
            (CLIP, 4.0, 3.2),    # S-C: first cut 3.2s — way past the 2s rule
            (CLIP, 8.0, 9.0),
            (CLIP, 20.0, 9.0),
            (CLIP, 30.0, 9.0),
            (CLIP, 1.0, 3.0),    # loop segment: ends at 4.0s == first segment's in-point
        ],                       # S-B: 33.2s total lands in the dead zone
        caps_by_seg=[
            # S-A: only ONE caption on segment 0 — the "what is this" line is missing
            (0, [("Riverside Market", "gold")], "hook"),
            (1, [("hand-pulled every morning", "white")], "sub"),
            (2, [("the broth simmers 8 hours", "white")], "sub"),
            (3, [("USD 3 a bowl", "white")], "sub"),
        ],
        bgm_folder="<your-bgm-subfolder>",
    )


def fixed():
    """Same footage plan, all three breaks repaired.

    Note the shorter place/what text and one-caption-per-segment layout: S-C
    caps segment 0 at 2.0s, which only leaves ~1.7s of on-screen time for its
    caption — S-R (added 2026-08-06, "captions you can't finish reading") then
    caps that at 7 chars/sec. Two long English captions crammed onto one 2.0s
    segment (the kit's own ~3-4 chars/sec calibration is for burned-in Chinese
    subtitles) can't satisfy S-C and S-R at once, so "what" moves to segment
    1's own caption instead — the exact fallback S-A documents (seg0's 2nd
    caption OR seg1's 1st caption).
    """
    return dict(
        name="short_demo_fixed",
        place="River Mkt",
        what="40-Year Stall",
        addr="Riverside Market | 12 Example Road",
        segs=[
            (CLIP, 4.0, 2.0),    # first cut now 2.0s
            (CLIP, 8.0, 3.2),
            (CLIP, 12.0, 3.2),
            (CLIP, 16.0, 3.4),
            (CLIP, 2.4, 1.6),    # loop: 2.4 + 1.6 = 4.0 == first segment's in-point
        ],                       # 13.4s total — inside the band
        caps_by_seg=[
            (0, [("River Mkt", "gold")], "hook"),           # who/where (S-A: contains place)
            (1, [("40-Year Stall", "white")], "sub"),       # what is this (S-A: contains what)
            (2, [("Broth 8hr Simmer", "white")], "sub"),
            (3, [("USD 3 a bowl", "white")], "sub"),
        ],
        bgm_folder="<your-bgm-subfolder>",
    )


def long_format():
    """A 31s cut: legal on platforms with no dead zone, rejected on yt_shorts."""
    spec = fixed()
    spec["name"] = "short_demo_long"
    spec["segs"] = [
        (CLIP, 4.0, 2.0),
        (CLIP, 8.0, 9.0),
        (CLIP, 20.0, 9.0),
        (CLIP, 30.0, 9.6),
        (CLIP, 2.4, 1.6),
    ]
    return spec


def main():
    print(__doc__.strip().splitlines()[0])
    yt = PLATFORM_RULES[DEFAULT_PLATFORM]
    print("shipped example calibration (platform=%s): %.0f-%.0fs band, "
          "first cut <=%.1fs, non-white captions <=%.0f%%"
          % (DEFAULT_PLATFORM, yt["dur_min"], yt["dur_max"],
             FIRST_CUT_MAX, NONWHITE_MAX_RATIO * 100))

    ok_bad, rep_bad = show("1) BROKEN spec (default platform)", broken())
    ok_fix, _ = show("2) FIXED spec (default platform)", fixed())

    # Same 31s spec, twice: rejected by the default yt_shorts band (dead zone),
    # accepted on a platform with no dead zone — no code changes, just the field.
    show("3a) 31s spec (platform=%s)" % DEFAULT_PLATFORM, long_format())

    reels = long_format()
    reels["platform"] = "ig_reels"       # no override dict — just say where it ships
    ok_reels, _ = show("3b) same 31s spec, platform='ig_reels' (no overrides)", reels)

    print("\n" + "-" * 64)
    print("Recap")
    print("-" * 64)
    print("  broken spec blocked by %d rules: %s"
          % (len(rep_bad["fails"]),
             ", ".join(f.split()[0] for f in rep_bad["fails"])))
    print("  fixed spec passes and returns caption timings it derived itself")
    print("  ...and the SAME 31s cut passes once you name the platform:")
    print("  the 25-45s dead zone is a YouTube-Shorts number, not a law of nature")
    print("  S-O is a WARN, never a block - a rule that fires on every normal cut")
    print("  gets ignored, so caption rhythm reports itself instead of judging you")
    print()
    print("Make it yours: PLATFORM_RULES / FIRST_CUT_MAX / NONWHITE_MAX_RATIO in")
    print("src/longform_maker/shorts_gate.py came from one genre's measurements.")
    print("Re-calibrate on YOUR 3-5 best performing Shorts by editing those")
    print("constants directly, and confirm your 3 worst ones still get blocked.")

    # Exit non-zero if the demo itself stopped behaving as documented.
    return 0 if (not ok_bad and ok_fix and ok_reels) else 1


if __name__ == "__main__":
    raise SystemExit(main())
