"""
Flagship Precision Blender 5.x Cycles Metal GPU Renderer:
1. All 24 Studio 3D Movement Families (`72` frames @ `900x585` in `public/motion-studio3d/` + lossless VP8L `.webp` & `motionFrameManifest.json`)
2. All 4 Atelier v2 Apparatus Still-Lifes (`reformer`, `cadillac`, `chair`, `barrel` @ `1280x720` in `public/images/atelier-v2/`)
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
import bpy
from mathutils import Vector

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
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


def render_atelier_v2_hero_stills(out_dir: str | None = None):
    out_dir = out_dir or os.path.join(ROOT_DIR, "public", "images", "atelier-v2")
    os.makedirs(out_dir, exist_ok=True)
    scene, cam, subj_col, mats = setup_flagship_cycles_studio(res_x=1280, res_y=720, samples=26)

    app_specs = [
        ("reformer-studio-3d.png", "reformer", "high", "up", {"carriageX": 0.16, "lFoot": [0, 0, 0], "rFoot": [0, 0, 0], "lHand": [0, 0, 0], "rHand": [0, 0, 0]}, (-1.22, -0.38, 0.0), (1.22, 0.38, 0.72), -56.0, 22.0),
        ("cadillac-studio-3d.png", "cadillac", "none", "flat", {"rolldownBar": [0.78, 1.38], "lFoot": [0, 0, 0], "rFoot": [0, 0, 0], "lHand": [0, 0, 0], "rHand": [0, 0, 0]}, (-1.12, -0.38, 0.0), (1.12, 0.38, 1.98), -58.0, 19.0),
        ("chair-studio-3d.png", "chair", "none", "flat", {"pedalDeg": 24.0, "withChairHandles": True, "lFoot": [0, 0, 0], "rFoot": [0, 0, 0], "lHand": [0, 0, 0], "rHand": [0, 0, 0]}, (-0.46, -0.34, 0.0), (0.44, 0.34, 1.30), -54.0, 21.0),
        ("barrel-studio-3d.png", "barrel", "none", "flat", {"lFoot": [0, 0, 0], "rFoot": [0, 0, 0], "lHand": [0, 0, 0], "rHand": [0, 0, 0]}, (-0.68, -0.34, 0.0), (0.60, 0.34, 1.08), -56.0, 21.0),
    ]

    for fname, app, fb, hr, rig, b0, b1, az, el in app_specs:
        clear_subject_collection(subj_col)
        mc = MeshCollector(subj_col, mats, glb_mode=False)
        ex = {"id": f"hero-{app}", "apparatus": app, "footbar": fb, "headrest": hr, "box": "none", "props": []}
        build_apparatus_and_props(mc, ex, rig)
        pts = [
            Vector((x, y, z))
            for x in (b0[0], (b0[0] + b1[0]) * 0.5, b1[0])
            for y in (b0[1], (b0[1] + b1[1]) * 0.5, b1[1])
            for z in (b0[2], (b0[2] + b1[2]) * 0.5, b1[2])
        ]
        aim_camera_perspective_exact(cam, pts, azim_deg=az, elev_deg=el, margin=1.18, aspect=1280.0 / 720.0)
        scene.render.filepath = os.path.join(out_dir, fname)
        bpy.ops.render.render(write_still=True)
    clear_subject_collection(subj_col)


def render_family_batch(families: list[str], poses_path: str | None = None, out_dir: str | None = None, samples: int = 12):
    poses_path = poses_path or os.path.join(SCRIPT_DIR, "poses_studio_canonical.json")
    out_dir = out_dir or os.path.join(ROOT_DIR, "public", "motion-studio3d")
    os.makedirs(out_dir, exist_ok=True)

    with open(poses_path, "r", encoding="utf-8") as f:
        poses_list = json.load(f)
    by_id = {item["id"]: item for item in poses_list}

    scene, cam, subj_col, mats = setup_flagship_cycles_studio(res_x=900, res_y=585, samples=samples)
    count = 0
    for fam in families:
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
            build_sculpted_practitioner(mc, rig, subsurf=2)
            scene.render.filepath = out_png
            bpy.ops.render.render(write_still=True)
            count += 1
    clear_subject_collection(subj_col)
    return count


def encode_lossless_webp_and_manifest(out_dir: str | None = None, manifest_path: str | None = None) -> int:
    """
    Encodes every `*-{start,mid,peak}.png` in `out_dir` into a lossless VP8L `.webp` using `bpy.context.scene`
    (without creating/deleting Blender scenes) and verifies bit-exact 8-bit top-to-bottom RGBA pixel identity!
    """
    out_dir = out_dir or os.path.join(ROOT_DIR, "public", "motion-studio3d")
    manifest_path = manifest_path or os.path.join(ROOT_DIR, "src", "data", "motionFrameManifest.json")
    png_files = sorted(
        f for f in os.listdir(out_dir)
        if f.endswith(".png") and any(f.endswith(f"-{s}.png") for s in ("start", "mid", "peak"))
    )

    scene = bpy.context.scene
    old_vt = scene.view_settings.view_transform
    old_look = scene.view_settings.look
    old_exp = scene.view_settings.exposure
    old_gam = scene.view_settings.gamma
    old_fmt = scene.render.image_settings.file_format
    old_cm = scene.render.image_settings.color_mode
    old_q = scene.render.image_settings.quality

    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.0
    scene.view_settings.gamma = 1.0
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.quality = 100

    import numpy as np

    def _extract_topdown_rgba_bytes(img_obj) -> bytes:
        w, h = img_obj.size[0], img_obj.size[1]
        arr = np.empty(w * h * 4, dtype=np.float32)
        img_obj.pixels.foreach_get(arr)
        arr = arr.reshape((h, w, 4))[::-1, :, :]
        u8 = np.clip(arr * 255.0 + 0.5, 0.0, 255.0).astype(np.uint8)
        return u8.tobytes()

    entries = []
    try:
        for fname in png_files:
            png_path = os.path.join(out_dir, fname)
            webp_path = os.path.join(out_dir, fname[:-4] + ".webp")

            img_png = bpy.data.images.load(png_path, check_existing=False)
            img_png.colorspace_settings.name = "Non-Color"
            w, h = img_png.size[0], img_png.size[1]
            rgba_png = _extract_topdown_rgba_bytes(img_png)

            img_png.colorspace_settings.name = "sRGB"
            img_png.save_render(filepath=webp_path, scene=scene)
            bpy.data.images.remove(img_png)

            with open(png_path, "rb") as fp:
                png_bytes = fp.read()
            with open(webp_path, "rb") as fw:
                raw_webp = fw.read()

            assert raw_webp[:4] == b"RIFF" and raw_webp[8:12] == b"WEBP", f"Invalid WebP header: {fname}"
            # Extract pure lossless VP8L chunk (stripping any VP8X/ICCP wrapper added by Blender 5.x)
            vp8l_chunk = None
            off = 12
            while off + 8 <= len(raw_webp):
                tag = raw_webp[off : off + 4]
                clen = int.from_bytes(raw_webp[off + 4 : off + 8], "little")
                assert tag != b"VP8 ", f"Lossy VP8 chunk not permitted: {fname}"
                padded = clen + (clen % 2)
                if tag == b"VP8L":
                    vp8l_chunk = raw_webp[off : off + 8 + padded]
                    break
                off += 8 + padded
            assert vp8l_chunk is not None, f"Expected lossless VP8L chunk: {fname}"
            riff_size = 4 + len(vp8l_chunk)
            webp_bytes = b"RIFF" + riff_size.to_bytes(4, "little") + b"WEBP" + vp8l_chunk
            with open(webp_path, "wb") as fw:
                fw.write(webp_bytes)

            assert len(webp_bytes) < len(png_bytes), f"WebP not smaller than PNG: {fname}"

            img_webp = bpy.data.images.load(webp_path, check_existing=False)
            img_webp.colorspace_settings.name = "Non-Color"
            rgba_webp = _extract_topdown_rgba_bytes(img_webp)
            bpy.data.images.remove(img_webp)

            rgba_sha = hashlib.sha256(rgba_png).hexdigest()
            assert rgba_sha == hashlib.sha256(rgba_webp).hexdigest(), f"Pixel mismatch on {fname}!"

            entries.append({
                "source": f"/motion-studio3d/{fname}",
                "optimized": f"/motion-studio3d/{fname[:-4]}.webp",
                "width": w,
                "height": h,
                "sourceBytes": len(png_bytes),
                "optimizedBytes": len(webp_bytes),
                "sourceSha256": hashlib.sha256(png_bytes).hexdigest(),
                "optimizedSha256": hashlib.sha256(webp_bytes).hexdigest(),
                "rgbaSha256": rgba_sha,
                "identicalPixels": True,
            })
    finally:
        scene.view_settings.view_transform = old_vt
        scene.view_settings.look = old_look
        scene.view_settings.exposure = old_exp
        scene.view_settings.gamma = old_gam
        scene.render.image_settings.file_format = old_fmt
        scene.render.image_settings.color_mode = old_cm
        scene.render.image_settings.quality = old_q

    with open(manifest_path, "w", encoding="utf-8") as mf:
        mf.write(json.dumps({"version": 1, "method": "lossless-webp", "frames": entries}, indent=2) + "\n")
    return len(entries)


def main():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", type=str, default="")
    parser.add_argument("--poses", type=str, default=os.path.join(SCRIPT_DIR, "poses_studio_canonical.json"))
    parser.add_argument("--with-stills", action="store_true")
    args = parser.parse_args(argv)

    targets = sorted(FAMILY_TO_EXERCISE_ID.keys())
    if args.only:
        allowed = {x.strip() for x in args.only.split(",") if x.strip()}
        targets = [f for f in targets if f in allowed]

    if args.with_stills:
        render_atelier_v2_hero_stills()

    t0 = time.time()
    count = render_family_batch(targets, poses_path=args.poses, samples=16)
    print(f"[Studio3D 24-Families] {count} frames rendered in {time.time() - t0:.1f}s", flush=True)

    if not args.only:
        n_enc = encode_lossless_webp_and_manifest()
        print(f"[Studio3D WebP] Encoded & verified {n_enc} lossless VP8L frames.", flush=True)


if __name__ == "__main__":
    main()
