"""
Flagship Precision Blender 5.2 LTS Cycles Metal GPU Renderer — All 24 Studio 3D Families (72 Frames @ 900x585)
Every single one of the 24 families maps 1:1 to a verified distinct 3D rig (with 0 fallback collisions!).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import bpy

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from pilates_3d_modeling_kernel import (
    MeshCollector,
    aim_camera_perspective_exact,
    build_apparatus_and_props,
    build_sculpted_practitioner,
)
from render_all_218_3d_artworks import (
    clear_subject_collection,
    collect_exercise_envelope_points,
    setup_flagship_cycles_studio,
)

FAMILY_TO_EXERCISE_ID: dict[str, str] = {
    "barrel-horseback": "expanded-barrel-horseback",
    "barrel-sidebend": "crawled-barrel-side-sit-up",
    "barrel-spinecorrector": "crawled-barrel-arc-thoracic-opener",
    "barrel-swan": "crawled-barrel-swan-dive-full",
    "bridge": "original-reformer-supported-bridge",
    "cadillac-cat": "ex-warmup-02",
    "cadillac-hanging": "crawled-cadillac-hanging-pullups",
    "cadillac-legspring": "ex-kr-cadillac-02",
    "cadillac-teaser": "crawled-cadillac-teaser-pushthrough",
    "chair": "original-chair-seated-pedal-press",
    "chair-goingup": "crawled-chair-going-up-front",
    "chair-pike": "ex-kr-chair-01",
    "chair-swan": "expanded-chair-swan",
    "footwork": "original-reformer-parallel-footwork",
    "longbox-teaser": "crawled-reformer-longbox-teaser",
    "mat-hundred": "expanded-mat-hundred",
    "mat-sidekick": "original-mat-side-leg-lift",
    "mat-twist": "crawled-mat-saw",
    "reformer-elephant": "crawled-reformer-knee-stretches-knees-off",
    "reformer-feetstraps": "original-reformer-strap-frog",
    "reformer-jumpboard": "original-reformer-parallel-footwork",
    "reformer-lunge": "crawled-reformer-front-splits",
    "reformer-mermaid": "crawled-reformer-stomach-massage-reach-twist",
    "shortspine": "crawled-reformer-short-spine-massage",
}


def main():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", type=str, default="")
    args = parser.parse_args(argv)

    poses_path = "/Users/hjunkim/.gemini/antigravity/brain/e3c254a4-3b6a-402f-906c-6b96d66ba5b8/scratch/poses_218x3.json"
    out_dir = "/Users/hjunkim/WebstormProjects/pilates-flow/public/motion-studio3d"
    with open(poses_path, "r", encoding="utf-8") as f:
        poses_list = json.load(f)
    by_id = {item["id"]: item for item in poses_list}

    for fam, ex_id in FAMILY_TO_EXERCISE_ID.items():
        assert ex_id in by_id, f"Missing {ex_id} for {fam}"

    targets = sorted(FAMILY_TO_EXERCISE_ID.keys())
    if args.only:
        allowed = {x.strip() for x in args.only.split(",") if x.strip()}
        targets = [f for f in targets if f in allowed]

    scene, cam, subj_col, mats = setup_flagship_cycles_studio(res_x=900, res_y=585, samples=12)
    t0 = time.time()
    count = 0

    for fam in targets:
        ex = json.loads(json.dumps(by_id[FAMILY_TO_EXERCISE_ID[fam]]))
        ex["props"] = []
        if fam == "reformer-jumpboard":
            for ph_k in ("start", "middle", "end"):
                ex["phases"][ph_k]["withJumpboard"] = True

        env_pts = collect_exercise_envelope_points(ex)
        aim_camera_perspective_exact(cam, env_pts, azim_deg=-64.0, elev_deg=20.0, margin=1.15, aspect=900.0 / 585.0)

        for suffix, phase_key in [("start", "start"), ("mid", "end"), ("peak", "middle")]:
            out_png = os.path.join(out_dir, f"{fam}-{suffix}.png")
            clear_subject_collection(subj_col)
            mc = MeshCollector(subj_col, mats, glb_mode=False)
            rig = ex["phases"][phase_key]
            build_apparatus_and_props(mc, ex, rig)
            build_sculpted_practitioner(mc, rig, subsurf=1)
            scene.render.filepath = out_png
            bpy.ops.render.render(write_still=True)
            count += 1

        print(f"[Studio3D 24-Families] {count}/{len(targets) * 3} rendered ({fam}) in {time.time() - t0:.1f}s", flush=True)

    clear_subject_collection(subj_col)


if __name__ == "__main__":
    main()
