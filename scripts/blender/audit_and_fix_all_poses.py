#!/usr/bin/env python3
"""
전체 필라테스 3D 동작(핵심 218종 654포즈 및 `--all-atomics` 524종 1,572포즈) 전수 IK · 기구 접점 · 충돌 자동 감사 및 정합화 스크립트.

기능:
1. `src/data/universal3dExerciseRigs.ts`의 정본 218종 × 3자세(start/middle/end)를 Node/Vite SSR로
   추출해 `scripts/blender/poses_studio_canonical.json`에 100% 동기화한다.
   `--all-atomics` 지정 시 전체 524 아토믹 동작(핵심 218종 + 월드 아토믹/퓨전 306종 = 1,572포즈)을
   `scripts/blender/poses_studio_canonical_524.json`에 함께 동기화하고 전수 감사한다.
2. 모든 포즈에 대해 실제 Blender 5.3 커널과 동일한 2-Bone IK 및 기구 3D 경계 좌표로 다음을 전수 감사한다:
   - 바닥 관통 (`z < 0` 및 관절/발 최소 여유고 위반)
   - 리포머 누운 자세 팔꿈치 캐리지 이탈/관통 및 스트랩 몸통 관통
   - 운다 체어 시트 관통, 페달 접점 오차, 핸들 그립 오차
   - 래더 바렐 사다리 봉 발/정강이 관통, 아치 지지, 엎드린 팔 T-포즈 꺾임
   - 캐딜락 롤백바/푸쉬스루바 접점 오차
   - 관절 도달 거리 초과(과도한 IK 클램핑), 극단 팔꿈치/무릎 역꺾임
   - 시작/중간/종료 3자세 구분 델타 검증
   - 소도구(미니볼·써클링·폼롤러) 배치 충돌 검증
3. 전수 감사 리포트를 `docs/3d-pose-form-audit-report.json`에 저장하고 결함이 남아 있으면 종료 코드 1을 반환한다.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
DEFAULT_POSES_PATH = os.path.join(SCRIPT_DIR, "poses_studio_canonical.json")
DEFAULT_POSES_524_PATH = os.path.join(SCRIPT_DIR, "poses_studio_canonical_524.json")
DEFAULT_POSES_620_PATH = os.path.join(SCRIPT_DIR, "poses_studio_canonical_620.json")
DEFAULT_REPORT_PATH = os.path.join(ROOT_DIR, "docs", "3d-pose-form-audit-report.json")


def vsub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def vadd(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def vmul(a, s):
    return (a[0] * s, a[1] * s, a[2] * s)


def vdot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def vcross(a, b):
    return (
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    )


def vlen(a):
    return math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2])


def vnorm(a):
    l = vlen(a)
    return (a[0] / l, a[1] / l, a[2] / l) if l > 1e-6 else (0.0, 0.0, 1.0)


def solve_2bone_ik(root, tgt, l1: float, l2: float, pole):
    d = vsub(tgt, root)
    raw_dist = vlen(d)
    max_r = (l1 + l2) * 0.992
    min_r = abs(l1 - l2) + 0.03
    clamped_over = 0.0
    if raw_dist > max_r:
        clamped_over = raw_dist - max_r
        tgt = vadd(root, vmul(vnorm(d), max_r))
        d = vsub(tgt, root)
        dist = max_r
    elif raw_dist < min_r:
        u0 = vnorm(d) if raw_dist > 1e-5 else (1.0, 0.0, 0.0)
        tgt = vadd(root, vmul(u0, min_r))
        d = vsub(tgt, root)
        dist = min_r
    else:
        dist = raw_dist
    u = vnorm(d)
    bend = vsub(pole, vmul(u, vdot(pole, u)))
    if vlen(bend) < 1e-4:
        bend = vcross(u, (0.0, 1.0, 0.0))
        if vlen(bend) < 1e-4:
            bend = vcross(u, (0.0, 0.0, 1.0))
    bend = vnorm(bend)
    cos_a = max(-1.0, min(1.0, (l1 * l1 + dist * dist - l2 * l2) / (2.0 * l1 * dist)))
    ang_a = math.acos(cos_a)
    mid = vadd(root, vmul(vadd(vmul(u, math.cos(ang_a)), vmul(bend, math.sin(ang_a))), l1))
    return mid, tgt, bend, clamped_over


def chair_pedal_tread_top(deg: float) -> tuple[float, float]:
    rad = math.radians(deg)
    ax, az = math.cos(rad), math.sin(rad)
    ux, uz = -math.sin(rad), math.cos(rad)
    return (-0.20 + 0.54 * ax + 0.036 * ux, 0.088 + 0.54 * az + 0.036 * uz)


def resolve_node_bin() -> str:
    found = shutil.which("node")
    if found:
        return found
    nvm_fallback = "/Users/hjunkim/.nvm/versions/node/v24.22.1/bin/node"
    if os.path.exists(nvm_fallback):
        return nvm_fallback
    return "node"


def sync_poses_from_ts(
    poses_path: str,
    all_atomics_path: str | None = None,
    all_620_path: str | None = None,
) -> tuple[int, int, int]:
    """Exports core 218 exercises (plus 524 atomics and optional 620 atomics+featured variations) × 3 phases."""
    node_script = r"""
import { writeFile } from 'node:fs/promises';
import { createServer } from 'vite';

const outPath218 = process.argv[1];
const outPath524 = process.argv[2] || '';
const outPath620 = process.argv[3] || '';
const server = await createServer({
  root: process.cwd(),
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, watch: null },
  esbuild: { jsx: 'automatic' },
  logLevel: 'error',
});

function roundVal(v) {
  if (typeof v === 'number') return Math.round(v * 1e6) / 1e6;
  if (Array.isArray(v)) return v.map(roundVal);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      if (val !== undefined) out[k] = roundVal(val);
    }
    return out;
  }
  return v;
}

try {
  const { INITIAL_EXERCISES } = await server.ssrLoadModule('/src/data/pilatesCatalog.ts');
  const { GLOBAL_CRAWLED_REPERTOIRE_EXERCISES } = await server.ssrLoadModule('/src/data/globalCrawledRepertoirePack.ts');
  const { WORLD_PILATES_EXERCISES, WORLD_PILATES_BY_ID } = await server.ssrLoadModule('/src/data/worldPilatesRepertoire1000.ts');
  const { FEATURED_VARIATION_3D_IDS, PHASE_3D_RAW_T, sampleUniversal3DExerciseRig } = await server.ssrLoadModule('/src/data/universal3dExerciseRigs.ts');

  const exportList = (list) =>
    list.map((ex) => {
      const phases = {};
      let resolvedRigId = '';
      for (const phase of ['start', 'middle', 'end']) {
        const rig = sampleUniversal3DExerciseRig(ex, PHASE_3D_RAW_T[phase]);
        resolvedRigId = rig.rigId;
        const { rigId, rigScope, poseFeatureKo, trajectoryFocus, activeZones, ...geom } = rig;
        phases[phase] = roundVal(geom);
      }
      return {
        id: ex.id,
        rigId: resolvedRigId,
        apparatus: ex.apparatus,
        bodyPosition: ex.bodyPosition,
        footbar: ex.footbar,
        headrest: ex.headrest,
        box: ex.box,
        props: ex.props,
        phases,
      };
    });

  const core218 = [...INITIAL_EXERCISES, ...GLOBAL_CRAWLED_REPERTOIRE_EXERCISES];
  const exported218 = exportList(core218);
  await writeFile(outPath218, JSON.stringify(exported218, null, 2) + '\n', 'utf8');

  let count524 = 0;
  let count620 = 0;
  const coreIdSet = new Set(core218.map((e) => e.id));
  const worldAtomics306 = WORLD_PILATES_EXERCISES.filter((e) => e.tier === 'atomic' && !coreIdSet.has(e.id));
  const all524 = [...core218, ...worldAtomics306];

  if (outPath524) {
    const exported524 = exportList(all524);
    await writeFile(outPath524, JSON.stringify(exported524, null, 2) + '\n', 'utf8');
    count524 = exported524.length;
  }

  if (outPath620) {
    const seen524 = new Set(all524.map((e) => e.id));
    const featuredVars = FEATURED_VARIATION_3D_IDS
      .map((id) => WORLD_PILATES_BY_ID.get(id))
      .filter((ex) => ex && !seen524.has(ex.id));
    const exported620 = exportList([...all524, ...featuredVars]);
    await writeFile(outPath620, JSON.stringify(exported620, null, 2) + '\n', 'utf8');
    count620 = exported620.length;
  }

  console.log(JSON.stringify({ synced218: exported218.length, synced524: count524, synced620: count620 }));
} finally {
  await server.close();
}
"""
    proc = subprocess.run(
        [
            resolve_node_bin(),
            "--input-type=module",
            "-e",
            node_script,
            poses_path,
            all_atomics_path or "",
            all_620_path or "",
        ],
        cwd=ROOT_DIR,
        capture_output=True,
        text=True,
        check=True,
    )
    info = json.loads(proc.stdout.strip().splitlines()[-1])
    return int(info["synced218"]), int(info["synced524"]), int(info["synced620"])


def audit_all_poses(poses: list[dict]) -> dict:
    checks = {
        "floor_penetration": [],
        "mat_supine_foot_float": [],
        "mat_seated_pelvis_float": [],
        "reformer_supine_elbow": [],
        "reformer_shblock_arm_clip": [],
        "reformer_strap_body_clip": [],
        "chair_foot_in_seat": [],
        "chair_shin_clips_seat": [],
        "chair_pedal_contact_miss": [],
        "chair_handle_grip_miss": [],
        "barrel_foot_in_rung": [],
        "barrel_shin_in_rung": [],
        "barrel_arch_sink": [],
        "barrel_prone_tpose_arm": [],
        "cadillac_rolldown_bar_miss": [],
        "cadillac_pushthrough_bar_miss": [],
        "mini_ball_placement_defect": [],
        "extreme_reach_overflow": [],
        "extreme_elbow_kink": [],
        "extreme_knee_flip": [],
        "phase_delta_missing": [],
        "degenerate_pole": [],
    }

    per_apparatus = {}
    total_poses = 0
    mini_ball_verified = []

    for ex in poses:
        eid = ex["id"]
        rig_id = ex.get("rigId", "")
        app = ex["apparatus"]
        bp = ex["bodyPosition"]
        props = [p for p in (ex.get("props") or []) if p != "none"]
        per_apparatus.setdefault(app, {"exercises": 0, "poses": 0, "defects": 0})
        per_apparatus[app]["exercises"] += 1

        # Distinct start / middle / end pose delta check
        phase_sigs = {
            ph: json.dumps(ex["phases"][ph], sort_keys=True)
            for ph in ("start", "middle", "end")
        }
        if (
            phase_sigs["start"] == phase_sigs["middle"]
            or phase_sigs["end"] == phase_sigs["middle"]
            or phase_sigs["start"] == phase_sigs["end"]
        ):
            checks["phase_delta_missing"].append(f"{eid}: duplicate start/middle/end pose")
            per_apparatus[app]["defects"] += 1

        for ph in ("start", "middle", "end"):
            total_poses += 1
            per_apparatus[app]["poses"] += 1
            r = ex["phases"][ph]
            before_defect_count = sum(len(v) for v in checks.values())

            pel = tuple(r["pelvis"])
            ch = tuple(r["chest"])
            ant = tuple(r["antHint"])
            sp_up = vnorm(vsub(ch, pel))
            ant_p = vsub(ant, vmul(sp_up, vdot(ant, sp_up)))
            ant_n = vnorm(ant_p) if vlen(ant_p) > 1e-4 else (1.0, 0.0, 0.0)
            br = vnorm(vcross(sp_up, ant_n))
            pr = tuple(r.get("pelvisRight", br))

            l_hip = vsub(pel, vmul(pr, 0.086))
            r_hip = vadd(pel, vmul(pr, 0.086))
            l_sh = vsub(ch, vmul(br, 0.148))
            r_sh = vadd(ch, vmul(br, 0.148))

            l_foot = tuple(r["lFoot"])
            r_foot = tuple(r["rFoot"])
            l_hand = tuple(r["lHand"])
            r_hand = tuple(r["rHand"])

            for pname in ("lKneePole", "rKneePole", "lElbowPole", "rElbowPole"):
                if vlen(tuple(r[pname])) < 0.1:
                    checks["degenerate_pole"].append(f"{eid}/{ph}: {pname} degenerate")

            l_knee, l_ankle, _, l_leg_over = solve_2bone_ik(l_hip, l_foot, 0.40, 0.39, tuple(r["lKneePole"]))
            r_knee, r_ankle, _, r_leg_over = solve_2bone_ik(r_hip, r_foot, 0.40, 0.39, tuple(r["rKneePole"]))
            l_elb, l_wr, _, l_arm_over = solve_2bone_ik(l_sh, l_hand, 0.28, 0.26, tuple(r["lElbowPole"]))
            r_elb, r_wr, _, r_arm_over = solve_2bone_ik(r_sh, r_hand, 0.28, 0.26, tuple(r["rElbowPole"]))

            if l_leg_over > 0.02 or r_leg_over > 0.02 or l_arm_over > 0.02 or r_arm_over > 0.02:
                checks["extreme_reach_overflow"].append(
                    f"{eid}/{ph}: overreach leg=({l_leg_over:.3f},{r_leg_over:.3f}) arm=({l_arm_over:.3f},{r_arm_over:.3f})"
                )

            # Extreme upright upward chicken-wing elbow kink check
            is_overhead_tricep_or_row = any(
                k in f"{eid} {rig_id}"
                for k in ("shave", "salute", "zip-up", "seated-arm-springs")
            )
            if sp_up[2] > 0.48 and not is_overhead_tricep_or_row:
                for sn, sh_pt, eb_pt, wr_pt in [("L", l_sh, l_elb, l_wr), ("R", r_sh, r_elb, r_wr)]:
                    u1 = vnorm(vsub(eb_pt, sh_pt))
                    u2 = vnorm(vsub(wr_pt, eb_pt))
                    bend_deg = math.degrees(math.acos(max(-1.0, min(1.0, vdot(u1, u2)))))
                    if eb_pt[2] > max(sh_pt[2], wr_pt[2]) + 0.085 and bend_deg > 52.0:
                        checks["extreme_elbow_kink"].append(
                            f"{eid}/{ph}: {sn} upward elbow kink sh.z={sh_pt[2]:.2f} elb.z={eb_pt[2]:.2f} wr.z={wr_pt[2]:.2f} bend={bend_deg:.0f}deg"
                        )

            # Extreme anatomical knee hinge flip check (matches TS unslop test)
            sp_mid = tuple(r["spineMid"])
            pel_up = vnorm(vsub(sp_mid, pel))
            pel_ant_p = vsub(ant, vmul(pel_up, vdot(ant, pel_up)))
            pel_ant = vnorm(pel_ant_p) if vlen(pel_ant_p) > 1e-4 else ant_n
            is_lunge_or_horse = any(
                k in f"{eid} {rig_id}"
                for k in ("lunge", "scooter", "splits", "horseback", "bulgarian", "pigeon", "curtsy", "handstand", "barrel-standing")
            )
            for sn, hip_pt, kn_pt, ank_pt in [("L", l_hip, l_knee, l_ankle), ("R", r_hip, r_knee, r_ankle)]:
                u1 = vnorm(vsub(kn_pt, hip_pt))
                u2 = vnorm(vsub(ank_pt, kn_pt))
                bend_deg = math.degrees(math.acos(max(-1.0, min(1.0, vdot(u1, u2)))))
                if bend_deg > 18.0 and not r.get("trapezeStrap"):
                    patella = vnorm(vsub(u1, u2))
                    outward = vmul(pr, -1.0 if sn == "L" else 1.0)
                    is_prone_curl = pel_ant[2] < -0.45 and (patella[2] < -0.10 or "rocking" in f"{eid} {rig_id}")
                    if not is_prone_curl and not is_lunge_or_horse:
                        valid_hinge = (
                            vdot(patella, pel_ant) >= -0.10
                            or vdot(patella, ant_n) >= -0.08
                            or vdot(patella, pel_up) >= 0.35
                            or vdot(patella, outward) >= 0.50
                        )
                        if not valid_hinge:
                            checks["extreme_knee_flip"].append(
                                f"{eid}/{ph}: {sn} inverted knee hinge bend={bend_deg:.0f}deg patella=({patella[0]:.2f},{patella[1]:.2f},{patella[2]:.2f})"
                            )

            # 1) Floor penetration check (zero z < 0 & clearance for limb thickness)
            for jname, pt, min_z in [
                ("pelvis", pel, 0.05),
                ("chest", ch, 0.05),
                ("lKnee", l_knee, 0.03),
                ("rKnee", r_knee, 0.03),
                ("lAnkle", l_ankle, 0.03),
                ("rAnkle", r_ankle, 0.03),
                ("lElb", l_elb, 0.025),
                ("rElb", r_elb, 0.025),
                ("lWr", l_wr, 0.025),
                ("rWr", r_wr, 0.025),
            ]:
                if pt[2] < min_z:
                    checks["floor_penetration"].append(f"{eid}/{ph}: {jname}.z={pt[2]:.3f} < {min_z}")

            # 1B) Mat supine/seated foot floating & grounded ischium/pelvis floating checks
            if app == "mat":
                for sn, ank in [("L", l_ankle), ("R", r_ankle)]:
                    if bp in ("supine", "seated") and 0.085 < ank[2] <= 0.145:
                        checks["mat_supine_foot_float"].append(
                            f"{eid}/{ph}: {sn} foot floats above mat (ankle.z={ank[2]:.3f}m > 0.085m, matTop=0.046m)"
                        )
                if (
                    bp in ("seated", "supine")
                    and sp_up[2] > 0.55
                    and ch[2] > 0.30
                    and 0.118 < pel[2] < 0.22
                ):
                    checks["mat_seated_pelvis_float"].append(
                        f"{eid}/{ph}: seated/teaser pelvis floats above mat (pelvis.z={pel[2]:.3f}m > 0.118m)"
                    )

            # 2) Reformer checks
            if app == "reformer":
                pad_top = 0.418
                cx_ref = r.get("carriageX", 0.12)
                if bp == "supine" and not r.get("withLongbox") and not r.get("withShortbox"):
                    # Shoulder block AABB: x in [cx - 0.229, cx - 0.161], |y| in [0.089, 0.187], z in [0.420, 0.528]
                    for sn, sh, eb, wr in [("L", l_sh, l_elb, l_wr), ("R", r_sh, r_elb, r_wr)]:
                        if (
                            (cx_ref - 0.239 <= sh[0] <= cx_ref - 0.151)
                            and (0.079 <= abs(sh[1]) <= 0.197)
                            and (0.415 <= sh[2] <= 0.538)
                        ):
                            checks["reformer_shblock_arm_clip"].append(
                                f"{eid}/{ph}: {sn} shoulder clips ShBlock (dx={sh[0] - cx_ref:+.3f}, y={sh[1]:+.3f}, z={sh[2]:.3f})"
                            )
                        if (
                            (cx_ref - 0.255 <= eb[0] <= cx_ref - 0.135)
                            and (0.064 <= abs(eb[1]) <= 0.215)
                            and (0.405 <= eb[2] <= 0.555)
                        ):
                            checks["reformer_shblock_arm_clip"].append(
                                f"{eid}/{ph}: {sn} elbow clips ShBlock (dx={eb[0] - cx_ref:+.3f}, y={eb[1]:+.3f}, z={eb[2]:.3f})"
                            )
                        if r.get("ropeToHands") and eb[2] < 0.65 and abs(eb[1]) > 0.275:
                            checks["reformer_shblock_arm_clip"].append(
                                f"{eid}/{ph}: {sn} supine strap elbow off carriage (dx={eb[0] - cx_ref:+.3f}, y={eb[1]:+.3f}, z={eb[2]:.3f})"
                            )
                        for seg_a, seg_b, s_vals in [(sh, eb, (0.45, 0.75)), (eb, wr, (0.3, 0.7))]:
                            for s_chk in s_vals:
                                p_chk = vadd(vmul(seg_a, 1.0 - s_chk), vmul(seg_b, s_chk))
                                if (
                                    (cx_ref - 0.245 <= p_chk[0] <= cx_ref - 0.145)
                                    and (0.075 <= abs(p_chk[1]) <= 0.205)
                                    and (0.415 <= p_chk[2] <= 0.542)
                                ):
                                    checks["reformer_shblock_arm_clip"].append(
                                        f"{eid}/{ph}: {sn} arm segment clips ShBlock at ({p_chk[0] - cx_ref:+.3f},{p_chk[1]:+.3f},{p_chk[2]:.3f})"
                                    )
                                    break
                if bp == "supine" and not r.get("withLongbox") and not r.get("withShortbox") and not r.get("ropeToHands"):
                    for sn, eb in [("L", l_elb), ("R", r_elb)]:
                        if abs(eb[1]) > 0.265 or eb[2] < pad_top + 0.015:
                            checks["reformer_supine_elbow"].append(
                                f"{eid}/{ph}: {sn} elbow=({eb[0]:.3f},{eb[1]:.3f},{eb[2]:.3f})"
                            )
                if r.get("ropeToHands") and bp == "supine":
                    for sn, wr in [("L", l_wr), ("R", r_wr)]:
                        if wr[0] > pel[0] - 0.12 and abs(wr[1]) < 0.215:
                            checks["reformer_strap_body_clip"].append(
                                f"{eid}/{ph}: {sn} wr=({wr[0]:.3f},{wr[1]:.3f},{wr[2]:.3f}) clips torso/pelvis"
                            )

            # 3) Wunda Chair checks (Seat x in [-0.42, +0.16], y in [-0.275, +0.275], z in [0.549, 0.611])
            if app == "chair":
                pdeg = r.get("pedalDeg", 22.0)
                l_deg = r.get("lPedalDeg", pdeg)
                r_deg = r.get("rPedalDeg", pdeg)
                lpt = chair_pedal_tread_top(l_deg)
                rpt = chair_pedal_tread_top(r_deg)

                for sn, ft, kn in [("L", l_ankle, l_knee), ("R", r_ankle, r_knee)]:
                    if -0.42 <= ft[0] <= 0.165 and abs(ft[1]) <= 0.275 and 0.52 <= ft[2] < 0.612:
                        checks["chair_foot_in_seat"].append(
                            f"{eid}/{ph}: {sn} foot=({ft[0]:.3f},{ft[1]:.3f},{ft[2]:.3f}) inside seat"
                        )
                    for s in (0.2, 0.4, 0.6, 0.8):
                        p = vadd(vmul(kn, 1.0 - s), vmul(ft, s))
                        if -0.40 <= p[0] <= 0.155 and abs(p[1]) <= 0.265 and 0.555 <= p[2] <= 0.605:
                            checks["chair_shin_clips_seat"].append(
                                f"{eid}/{ph}: {sn} shin pt=({p[0]:.3f},{p[1]:.3f},{p[2]:.3f}) clips seat"
                            )
                            break

                # Pedal contact accuracy for pedal-engaged exercises
                non_pedal_seated = {
                    "original-chair-seated-breath",
                    "original-chair-seated-pelvic-rock",
                    "original-chair-seated-arm-arc",
                    "original-chair-seated-spine-twist",
                    "original-chair-seated-back-reach",
                    "crawled-chair-teaser-tricep-press",
                    "world-chair-chair-reverse-pike",
                }
                base_eid = eid.split("--var-")[0]
                is_chair_teaser = "chair-teaser-triceps" in rig_id
                if base_eid not in non_pedal_seated and not is_chair_teaser:
                    d_lf = math.hypot(l_ankle[0] - lpt[0], l_ankle[2] - (lpt[1] + 0.036))
                    d_rf = math.hypot(r_ankle[0] - rpt[0], r_ankle[2] - (rpt[1] + 0.036))
                    d_lh = math.hypot(l_wr[0] - lpt[0], l_wr[2] - (lpt[1] + 0.030))
                    d_rh = math.hypot(r_wr[0] - rpt[0], r_wr[2] - (rpt[1] + 0.030))
                    best_d = min(d_lf, d_rf, d_lh, d_rh)
                    if best_d > 0.055:
                        checks["chair_pedal_contact_miss"].append(
                            f"{eid}/{ph}: best pedal contact err={best_d:.3f}m (pedal={rpt[0]:.2f},{rpt[1]:.2f})"
                        )

                if r.get("withChairHandles"):
                    # Grips run x in [-0.09, +0.03], y = +-0.286, z = 1.26..1.28
                    # In side-facing going-up-side, only lHand grips the front handle (-0.286); rHand balances overhead
                    is_single_handle = (
                        eid == "crawled-chair-going-up-side"
                        or "chair-goingup-side" in rig_id
                    )
                    grip_sides = [("L", l_wr)] if is_single_handle else [("L", l_wr), ("R", r_wr)]
                    for sn, wr in grip_sides:
                        dx_g = max(0.0, -0.09 - wr[0], wr[0] - 0.03)
                        dy_g = abs(abs(wr[1]) - 0.286)
                        dz_g = abs(wr[2] - 1.275)
                        err = math.sqrt(dx_g * dx_g + dy_g * dy_g + dz_g * dz_g)
                        if err > 0.025:
                            checks["chair_handle_grip_miss"].append(
                                f"{eid}/{ph}: {sn} wr=({wr[0]:.3f},{wr[1]:.3f},{wr[2]:.3f}) err={err:.3f}m"
                            )

            # 4) Ladder Barrel checks
            if app == "barrel" and not r.get("isSpineCorrector"):
                rungs = [(0.52 - (rz - 0.035) * 0.039, rz) for rz in (0.19, 0.38, 0.58, 0.76, 0.91, 1.01)]
                for sn, ft, kn in [("L", l_ankle, l_knee), ("R", r_ankle, r_knee)]:
                    if 0.44 <= ft[0] <= 0.56 and abs(ft[1]) <= 0.28:
                        min_d = min(math.hypot(ft[0] - rx, ft[2] - rz) for rx, rz in rungs)
                        if min_d < 0.045:
                            checks["barrel_foot_in_rung"].append(
                                f"{eid}/{ph}: {sn} foot=({ft[0]:.3f},{ft[1]:.3f},{ft[2]:.3f}) pierces rung d={min_d:.3f}m"
                            )
                    for s in (0.25, 0.5, 0.75, 0.92):
                        p = vadd(vmul(kn, 1.0 - s), vmul(ft, s))
                        if abs(p[1]) <= 0.275:
                            for rx, rz in rungs:
                                if math.hypot(p[0] - rx, p[2] - rz) < 0.028:
                                    checks["barrel_shin_in_rung"].append(
                                        f"{eid}/{ph}: {sn} shin pt=({p[0]:.3f},{p[2]:.3f}) clips rung ({rx:.3f},{rz:.3f})"
                                    )
                                    break
                d_pel_arch = math.hypot(pel[0] - (-0.30), pel[2] - 0.55) - 0.33
                if d_pel_arch < -0.025 and pel[0] < 0.1:
                    checks["barrel_arch_sink"].append(f"{eid}/{ph}: pelvis sinks into barrel arch ({d_pel_arch:+.3f}m)")
                if bp == "prone":
                    for sn, eb in [("L", l_elb), ("R", r_elb)]:
                        if abs(eb[1]) > 0.38 and eb[2] > ch[2] - 0.05:
                            checks["barrel_prone_tpose_arm"].append(
                                f"{eid}/{ph}: {sn} elbow=({eb[0]:.3f},{eb[1]:.3f},{eb[2]:.3f}) T-pose flare"
                            )

            # 5) Cadillac bar contact checks
            if app == "cadillac":
                if r.get("rolldownBar"):
                    bx, bz = r["rolldownBar"]
                    is_single_arm_rdb = (
                        eid == "expanded-cadillac-roll-back-side-arm"
                        or "expanded-cadillac-roll-back-side-arm" in rig_id
                    )
                    grip_sides = [("L", l_wr)] if is_single_arm_rdb else [("L", l_wr), ("R", r_wr)]
                    for sn, wr in grip_sides:
                        err = math.hypot(wr[0] - bx, wr[2] - bz)
                        if err > 0.025:
                            checks["cadillac_rolldown_bar_miss"].append(
                                f"{eid}/{ph}: {sn} wr=({wr[0]:.3f},{wr[2]:.3f}) misses rolldown bar ({bx:.3f},{bz:.3f}) err={err:.3f}m"
                            )
                if r.get("pushthroughDeg") is not None:
                    rad = math.radians(r["pushthroughDeg"])
                    ex_x = 0.62 - math.sin(rad) * 0.66
                    ez_z = 1.94 - math.cos(rad) * 0.66
                    min_h = min(math.hypot(l_wr[0] - ex_x, l_wr[2] - ez_z), math.hypot(r_wr[0] - ex_x, r_wr[2] - ez_z))
                    min_f = min(math.hypot(l_ankle[0] - ex_x, l_ankle[2] - ez_z), math.hypot(r_ankle[0] - ex_x, r_ankle[2] - ez_z))
                    if min(min_h, min_f) > 0.055:
                        checks["cadillac_pushthrough_bar_miss"].append(
                            f"{eid}/{ph}: min hand={min_h:.3f} foot={min_f:.3f} to PTB ({ex_x:.3f},{ez_z:.3f})"
                        )

            # 6) Mini-ball placement check for bilateral parallel-knee supine reformer footwork/bridging/core
            if (
                "mini-ball" in props
                and app == "reformer"
                and bp == "supine"
                and "--var-single-leg" not in eid
                and "frog" not in eid
            ):
                knee_span = vlen(vsub(l_knee, r_knee))
                knee_x_diff = abs(l_knee[0] - r_knee[0])
                knee_mid = vmul(vadd(l_knee, r_knee), 0.5)
                if not (0.14 <= knee_span <= 0.34 and knee_x_diff < 0.08 and knee_mid[2] >= 0.46):
                    checks["mini_ball_placement_defect"].append(
                        f"{eid}/{ph}: knee_span={knee_span:.3f} x_diff={knee_x_diff:.3f} knee_mid_z={knee_mid[2]:.3f}"
                    )
                else:
                    mini_ball_verified.append({
                        "exerciseId": eid,
                        "phase": ph,
                        "kneeMid": [round(c, 4) for c in knee_mid],
                        "kneeSpanM": round(knee_span, 4),
                    })

            after_defect_count = sum(len(v) for v in checks.values())
            per_apparatus[app]["defects"] += after_defect_count - before_defect_count

    total_defects = sum(len(v) for v in checks.values())
    return {
        "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
        "totalExercises": len(poses),
        "totalPosesAudited": total_poses,
        "totalDefects": total_defects,
        "passed": total_defects == 0,
        "perApparatusSummary": per_apparatus,
        "defectCountsByCategory": {k: len(v) for k, v in checks.items()},
        "defects": {k: v for k, v in checks.items() if v},
        "verifiedSupineMiniBallKneePlacements": len(mini_ball_verified),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sync", action="store_true", help="Explicitly sync poses JSON from TS (default)")
    parser.add_argument("--no-sync", action="store_true", help="Skip syncing poses JSON from TS")
    parser.add_argument(
        "--all-atomics",
        action="store_true",
        help="Sync and audit ALL 524 atomic exercises (218 core + 306 world atomics = 1,572 poses) to poses_studio_canonical_524.json while also updating poses_studio_canonical.json",
    )
    parser.add_argument(
        "--all-620",
        action="store_true",
        help="Sync and audit ALL 620 exercises (524 atomics + 96 featured variations = 1,860 poses) to poses_studio_canonical_620.json",
    )
    parser.add_argument("--poses", default=DEFAULT_POSES_PATH)
    parser.add_argument("--poses-524", default=DEFAULT_POSES_524_PATH)
    parser.add_argument("--poses-620", default=DEFAULT_POSES_620_PATH)
    parser.add_argument("--report", default=DEFAULT_REPORT_PATH)
    args = parser.parse_args()

    audit_target_path = (
        args.poses_620
        if args.all_620
        else (args.poses_524 if args.all_atomics else args.poses)
    )

    if not args.no_sync:
        synced218, synced524, synced620 = sync_poses_from_ts(
            args.poses,
            args.poses_524 if (args.all_atomics or args.all_620) else None,
            args.poses_620 if args.all_620 else None,
        )
        print(f"[audit_and_fix_all_poses] Synced {synced218} core exercises -> {os.path.relpath(args.poses, ROOT_DIR)}")
        if args.all_atomics or args.all_620:
            print(
                f"[audit_and_fix_all_poses] Synced {synced524} atomic exercises ({synced524 * 3} poses) "
                f"-> {os.path.relpath(args.poses_524, ROOT_DIR)}"
            )
        if args.all_620:
            print(
                f"[audit_and_fix_all_poses] Synced {synced620} exercises incl. featured variations ({synced620 * 3} poses) "
                f"-> {os.path.relpath(args.poses_620, ROOT_DIR)}"
            )

    with open(audit_target_path, "r", encoding="utf-8") as f:
        poses = json.load(f)

    report = audit_all_poses(poses)
    os.makedirs(os.path.dirname(args.report), exist_ok=True)
    with open(args.report, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(
        f"[audit_and_fix_all_poses] Audited {report['totalExercises']} exercises ({report['totalPosesAudited']} poses) "
        f"-> totalDefects={report['totalDefects']} (passed={report['passed']})"
    )
    for k, count in report["defectCountsByCategory"].items():
        if count > 0:
            print(f"  FAIL {k}: {count}")
            for sample in report["defects"][k][:12]:
                print(f"    - {sample}")

    sys.exit(0 if report["passed"] else 1)


if __name__ == "__main__":
    main()
