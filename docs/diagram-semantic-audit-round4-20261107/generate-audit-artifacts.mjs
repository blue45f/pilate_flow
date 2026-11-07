import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  REPO_ROOT,
  AUDIT_DIR,
  runSemanticAuditAnalysis,
} from './shared/semantic-audit-analyzer.mjs';

function fmtPt(pt) {
  if (!pt) return '-';
  return `(${pt.x},${pt.y})`;
}

import { buildPatchContent } from "./shared/patch-proposal-builder.mjs";

function buildMarkdownReport(analysis) {
  const {
    summary,
    alreadyResolvedExclusions,
    residualSemanticMismatchCatalog,
    singletonResidualNote,
    coordinateGroups,
    inventory,
  } = analysis;

  const lines = [];
  lines.push('# 98개 필라테스 도해 동일 Rig/위상 의미론적 불일치 정밀 감사 보고서 (Round 4)');
  lines.push('');
  lines.push('> **진실성·한계 고지 (Truthfulness & Boundary Notice)**');
  lines.push('> - 본 문서는 현재 `main` (`ca38174`)의 98개 필라테스 2D 도해(`src/data/movementVisualRigCatalog.ts` 및 `src/components/MovementPhaseDiagramSvg.tsx`)에서 **서로 다른 동작이 동일한 아키타입(`archetypeId`)과 시작/중간/끝(`start`/`middle`/`end`) 관절 좌표를 공유하여 명칭·기구·척추 면(spinalPlane)·움직임 목적과 시각적으로 불일치하는 잔여 사례**를 전수 조사한 엔지니어링 감사 자료입니다.');
  lines.push('> - **의학적·해부학적·임상적·외부 전문가 검증 완료를 절대 주장하지 않습니다** (`anatomicalAccuracyAssumed: false`, `anatomicalVerificationCompleted: false`, `expertVerificationCompleted: false`, `professionalReviewCount: 0`).');
  lines.push('> - 공개 출처 근거는 저장소 원장(`VERIFIED_REFERENCES`, `PUBLIC_REFERENCES`, `COURSE_REFERENCES`, `motionEvidenceReview`)에서 확인 가능한 공개 URL만 기록하며(`blocked-by-sandbox-proxy-unverified` 제외), 외부 이미지·영상을 임의 복제하지 않습니다.');
  lines.push('> - 다른 활성 작업과의 충돌을 방지하기 위해 원본 렌더러·카탈로그·페이지(`src/**`)는 **읽기 전용(READ ONLY)** 으로 유지하고 `docs/diagram-semantic-audit-round4-20261107/**` 내부에만 산출물을 기록했습니다.');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 1. 감사 요약 (Executive Summary)');
  lines.push('');
  lines.push('| 지표 | 값 | 비고 |');
  lines.push('| :--- | :--- | :--- |');
  lines.push(`| 감사 기준 커밋 | \`${summary.baselineCommit}\` | 이전 6접점 패치(\`55ce22d\` / \`b2d6022\`) 반영 완료 상태 |`);
  lines.push(`| 전체 감사 대상 동작 수 | **${summary.totalExercisesAudited}개** | \`INITIAL_EXERCISES\` 98개 전수 |`);
  lines.push(`| 고유 좌표·궤적 그룹 수 (\`archetypeId\` + \`start/middle/end\`) | **${summary.totalCoordinateGroups}개 그룹** (\`G-01\`..\`G-28\`) | 다중 공유 그룹 **${summary.sharedCoordinateGroupsCount}개**(91동작) + 단독(Singleton) 그룹 **${summary.singletonCoordinateGroupsCount}개**(7동작) |`);
  lines.push(`| 의도적·구조적 호환 재사용 그룹 | **${summary.intentionalCompatibleGroupsCount}개 공유 그룹 + 6개 분리 완료 단독 그룹** | 총 **${summary.intentionalOrCompatibleExercisesCount}개 동작** (동일 운동학 패턴의 정당한 공유 또는 기분리 완료) |`);
  lines.push(`| **잔여 의미론적 불일치 상위 그룹 (\`SM-01\`..\`SM-08\`)** | **${summary.residualMismatchGroupsCount}개 핵심 불일치 범주** (9개 공유 그룹에 걸쳐 발생) | 총 **${summary.residualMismatchedExercisesCount}개 잔여 불일치 동작** + 단독 이월 노트 **${summary.singletonFollowUpNoteCount}개**(\`original-mat-forearm-plank\`) |`);
  lines.push(`| 이전 라운드 해결 완료 제외 항목 | **${summary.priorResolvedExclusionsCount}개 패치 범주 (\`R-01\`, \`D-01\`..\`D-05\`)** | 중복 결함 보고 제외 완료 |`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 2. 이전 라운드 기해결 항목 제외 명세 (`R-01`, `D-01`..`D-05`)');
  lines.push('');
  lines.push('| 해결 ID | 반영 커밋 | 대상 동작 ID | 해결 내용 및 이번 감사 제외 사유 |');
  lines.push('| :--- | :--- | :--- | :--- |');
  for (const ex of alreadyResolvedExclusions) {
    lines.push(
      `| \`${ex.fixId}\` | \`${ex.commitSha}\` | ${ex.exerciseIds.map((id) => `\`${id}\``).join(', ')} | ${ex.summaryKo} |`,
    );
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 3. 28개 고유 좌표·궤적 그룹 전체 분류표 (의도적 재사용 vs 잔여 의미론적 불일치)');
  lines.push('');
  lines.push('| 그룹 ID | Rig (`archetypeId`) | 동작 수 | 분류 판정 | 최대 변위 관절 (`start→middle→end`) | 호환/의도적 재사용 동작 ID | 잔여 의미론적 불일치 동작 ID (불일치 코드) |');
  lines.push('| :--- | :--- | :---: | :--- | :--- | :--- | :--- |');
  for (const g of coordinateGroups) {
    const topJ = g.topMovingJoints[0];
    const topStr = topJ
      ? `\`${topJ.joint}\` Δ${topJ.maxPhaseDist}px ${topJ.trajectory}`
      : '정지';
    const compatStr =
      g.compatibleMemberIds.length > 0
        ? g.compatibleMemberIds.map((id) => `\`${id}\``).join(', ')
        : '-';
    const mismatchStr =
      g.mismatchedMemberIds.length > 0
        ? g.mismatchedMemberIds
            .map((id) => {
              const m = g.members.find((x) => x.exerciseId === id);
              return `\`${id}\` (**${m?.mismatchId}**)`;
            })
            .join(', ')
        : g.groupDisposition === 'singleton-with-follow-up-note'
          ? `\`${g.members[0].exerciseId}\` (**SM-09-singleton-note**)`
          : '없음 (정상 호환)';
    lines.push(
      `| \`${g.groupId}\` | \`${g.archetypeId}\` | ${g.memberCount} | \`${g.groupDisposition}\` | ${topStr} | ${compatStr} | ${mismatchStr} |`,
    );
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 4. 상위 잔여 의미론적 불일치 사례 정밀 분석 (`SM-01` .. `SM-08` 및 `SM-09`)');
  lines.push('');

  const invById = new Map(inventory.map((i) => [i.exerciseId, i]));

  for (const sm of residualSemanticMismatchCatalog) {
    lines.push(`### ${sm.mismatchId}: ${sm.archetypeTitleKo} (\`${sm.archetypeId}\`, 심각도: \`${sm.severity}\`)`);
    lines.push('');
    lines.push(`- **공유 그룹 크기**: ${sm.groupSize}개 동작 (의도적 재사용 ${sm.intentionalMemberIds.length}개 vs **의미론적 불일치 ${sm.mismatchedMemberIds.length}개**)`);
    lines.push(`- **의도적 재사용(정상) 동작**: ${sm.intentionalMemberIds.map((id) => `\`${id}\` (${invById.get(id)?.nameKo ?? ''})`).join(', ')}`);
    lines.push(`- **잔여 불일치(차별화 필요) 동작**: ${sm.mismatchedMemberIds.map((id) => `\`${id}\` (${invById.get(id)?.nameKo ?? ''})`).join(', ')}`);
    lines.push('- **현재 공유 중인 지배적 관절 궤적**:');
    for (const [k, v] of Object.entries(sm.dominantSharedTrajectory)) {
      lines.push(`  - \`${k}\`: ${v}`);
    }
    lines.push(`- **핵심 오해 원인**: ${sm.mismatchReasonKo}`);
    lines.push('');
    lines.push('| 동작 ID | 동작명 (기구 / 자세 / 면) | 카탈로그 큐·목적 원문 근거 | 현재 렌더링 좌표·관절 Delta 불일치 실측 | 최소 후속 차별화 제안 | 확인 가능한 공개 출처 URL |');
    lines.push('| :--- | :--- | :--- | :--- | :--- | :--- |');
    for (const item of sm.perExerciseFindings) {
      const inv = invById.get(item.exerciseId);
      const urls = (inv?.verifiablePublicSources ?? [])
        .slice(0, 3)
        .map((u) => `[${u.sourceId}](${u.url})`)
        .join('<br/>');
      lines.push(
        `| \`${item.exerciseId}\` | **${item.nameKo}**<br/>(\`${item.apparatus}\` / \`${item.bodyPosition}\` / \`${item.spinalPlanes.join(',')}\`) | ${item.catalogCueQuoteKo} | ${item.observedJointAnomalyKo} | ${item.proposedMinimalFixKo} | ${urls} |`,
      );
    }
    lines.push('');
  }

  lines.push(`### ${singletonResidualNote.mismatchId}: 단독 그룹 아키타입 잔여 불일치 참고 (\`${singletonResidualNote.exerciseId}\`)`);
  lines.push('');
  lines.push(`- **대상 동작**: \`${singletonResidualNote.exerciseId}\` (${singletonResidualNote.nameKo}, \`${singletonResidualNote.archetypeId}\`)`);
  lines.push(`- **상세 분석**: ${singletonResidualNote.noteKo}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 5. 98개 전체 동작 ID → Rig → 시작/중간/끝 좌표 → 관절별 Delta 전수 인벤토리');
  lines.push('');
  lines.push('| # | 동작 ID (`exerciseId`) | 동작명 | 기구 / 자세 / 면 | Rig (`archetypeId`) | 핵심 관절 `start → middle → end` 좌표 | 상위 가동 관절 Delta (`maxPhaseDist`) | 판정 (`mismatchId`) | 확인 가능한 공개 출처 URL |');
  lines.push('| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |');

  inventory.forEach((item, index) => {
    const jd = item.jointDeltas;
    const coordSummary = [
      `head:${fmtPt(jd.head.start)}→${fmtPt(jd.head.middle)}→${fmtPt(jd.head.end)}`,
      `hand:${fmtPt(jd.hand.start)}→${fmtPt(jd.hand.middle)}→${fmtPt(jd.hand.end)}`,
      `pelvis:${fmtPt(jd.pelvis.start)}→${fmtPt(jd.pelvis.middle)}→${fmtPt(jd.pelvis.end)}`,
      `knee:${fmtPt(jd.knee.start)}→${fmtPt(jd.knee.middle)}→${fmtPt(jd.knee.end)}`,
      `ankle:${fmtPt(jd.ankle.start)}→${fmtPt(jd.ankle.middle)}→${fmtPt(jd.ankle.end)}`,
    ].join('<br/>');

    const deltaSummary = item.topMovingJoints
      .slice(0, 3)
      .map((j) => `\`${j.joint}\`: ${j.maxPhaseDist}px`)
      .join(', ');

    const badge =
      item.semanticClassification === 'residual-semantic-mismatch'
        ? `**불일치 (${item.mismatchId})**`
        : item.semanticClassification === 'singleton-archetype-Carryover-note'
          ? `**단독노트 (${item.mismatchId})**`
          : item.priorResolvedFixes.length > 0
            ? `정상 (기해결: ${item.priorResolvedFixes.join(',')})`
            : '의도적 재사용';

    const urls = item.verifiablePublicSources
      .slice(0, 2)
      .map((u) => `[${u.sourceId}](${u.url})`)
      .join('<br/>');

    lines.push(
      `| ${index + 1} | \`${item.exerciseId}\` | ${item.nameKo} | \`${item.apparatus}\` / \`${item.bodyPosition}\` / \`${item.spinalPlanes.join(',')}\` | \`${item.archetypeId}\` | ${coordSummary} | ${deltaSummary} | ${badge} | ${urls} |`,
    );
  });

  lines.push('');
  return lines.join('\n');
}

async function main() {
  const analysis = await runSemanticAuditAnalysis();

  const jsonPath = path.join(AUDIT_DIR, 'evidence/full-98-inventory-and-groups.json');
  fs.writeFileSync(jsonPath, JSON.stringify(analysis, null, 2) + '\n', 'utf8');

  const mdPath = path.join(AUDIT_DIR, 'GROUP_INVENTORY_AND_MISMATCH_TABLE.md');
  fs.writeFileSync(mdPath, buildMarkdownReport(analysis), 'utf8');

  const patchPath = path.join(
    AUDIT_DIR,
    'patches/minimal-semantic-differentiation-proposal.patch',
  );
  fs.writeFileSync(patchPath, buildPatchContent(), 'utf8');

  // Verify the candidate patch applies cleanly against current read-only src/data/movementVisualRigCatalog.ts
  execFileSync('git', ['apply', '--check', patchPath], { cwd: REPO_ROOT });

  console.log('Generated artifacts successfully:');
  console.log(' -', path.relative(REPO_ROOT, jsonPath));
  console.log(' -', path.relative(REPO_ROOT, mdPath));
  console.log(' -', path.relative(REPO_ROOT, patchPath), '(git apply --check PASSED)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
