import { BATCH_PHASES } from '../models/motionAuthoringBatch';
import type { BatchVariantId } from '../models/motionAuthoringBatch';

/** Source text facts checked 2026-11-05; no source video was watched or traced. */
export const BATCH_SOURCE_FACTS = [
  {
    id:'uhsussex-chair-arm-lift-text-2026-11-05',
    publisher:'University Hospitals Sussex NHS Foundation Trust',
    title:'Chair exercises (with seated arm exercises) · Lift your arms above your head',
    url:'https://www.uhsussex.nhs.uk/resources/chair-exercises-with-seated-arm-exercises/',
    locator:'Heading 5; page last reviewed 28 September 2026',
    checkedAt:'2026-11-05',verification:'public-text-checked',videoWatched:false,expertChecked:false,
    facts:['Seated exercise guidance describes raising one hand overhead and lowering it before changing arms.'],
    context:'Worthing ward physiotherapy patient guidance for symptoms and deconditioning; this does not establish general adult class suitability.',
    mediaLicense:null,mediaReused:false,
  },
  {
    id:'leicspart-chair-trunk-stretch-text-2026-11-05',
    publisher:'Leicestershire Partnership NHS Trust · Community Falls Service',
    title:'Seated stretching and strengthening exercises for the whole body · Trunk stretch',
    url:'https://www.leicspart.nhs.uk/wp-content/uploads/2022/07/134-Falls-service-stretching-and-strengthening-exercises-edition-5.pdf',
    locator:'Printed page 4 (PDF page index 3), Trunk stretch; stable chair guidance on printed page 2',
    checkedAt:'2026-11-05',verification:'public-text-checked',videoWatched:false,expertChecked:false,
    facts:['A chair-seated trunk stretch bends sideways while the opposite arm reaches overhead, then returns upright.','The leaflet requires a sturdy, stable chair; it also describes an arms-down alternative.'],
    context:'Community Falls Service patient exercise programme; not proof of suitability for a Pilates class or a floor-seated mermaid.',
    mediaLicense:null,mediaReused:false,
  },
  {
    id:'rnoh-prone-hip-extension-text-2026-11-05',
    publisher:'Royal National Orthopaedic Hospital NHS Trust',
    title:'Functional Fitness Exercise Pack · Posterior Chain · Prone hip extension',
    url:'https://www.rnoh.nhs.uk/patients-and-visitors/patient-information-guides/functional-fitness-exercise-pack',
    locator:'Posterior Chain, Prone hip extension; page last updated 16 July 2025',
    checkedAt:'2026-11-05',verification:'public-text-checked',videoWatched:false,expertChecked:false,
    facts:['The text describes lying on the stomach, lifting a straight leg, lowering it, and repeating with the other leg.'],
    context:'Hospital functional fitness exercise guidance with therapist-directed activities; not an exact Pilates Swimming demonstration.',
    mediaLicense:null,mediaReused:false,
  },
  {
    id:'ocats-prone-forearm-extension-text-2026-11-05',
    publisher:'North Cheshire and Mersey NHS · Musculoskeletal Physiotherapy OCATS',
    title:'Low Back Mobility Exercises · Level 1 Prone Lumbar Extension on Forearms',
    url:'https://northcheshireandmersey.nhs.uk/media/4lnldy0f/lower-back-range-of-motion-exercises-patient-advice-sheet.pdf',
    locator:'PDF page index 6 (Level 1); rehabilitation context on PDF page index 1',
    checkedAt:'2026-11-05',verification:'public-text-checked',videoWatched:false,expertChecked:false,
    facts:['A face-down forearm-supported extension raises the shoulders while keeping the forearms on the floor and the pelvis and abdomen directed into the floor.'],
    context:'Lower-back-pain rehabilitation guidance following physiotherapist instruction; not general adult suitability or an exact Pilates Swan source.',
    mediaLicense:null,mediaReused:false,
  },
] as const;

const source = (sourceId:string) => {
  const entry=BATCH_SOURCE_FACTS.find(item=>item.id===sourceId);
  if(!entry) throw new Error(`Missing factual source ${sourceId}`);
  return [{sourceId:entry.id,label:`${entry.publisher} · ${entry.title}`,url:entry.url,context:entry.context}];
};
const status = {
  status:'variant-proposal',assetStatus:'authored-unreviewed-draft',professionalReviewStatus:'unreviewed',
  professionalReviewCount:0,exactAssetReady:false,exactSourceVariantMatched:false,
  sourceVariantReconciliationRequired:true,autoRecommendationEligible:false,
  safetyStatus:'not_assessed',sourceFactsCheckedAt:'2026-11-05',
  license:'0BSD',sourceMediaReused:false,sourceMediaTraced:false,motionCaptureUsed:false,
  secondsArePrescription:false,repCount:null,breathingCue:null,
} as const;

export const BATCH_VARIANTS = [
  {
    ...status,id:'chair-seated-bilateral-arm-raise-v1',intendedExerciseId:'original-mat-seated-arm-reach',
    title:'일반 의자 · 양팔 앞·위 리치',variant:'고정 일반 의자에 앉아 양팔을 앞에서 위로 올리는 저작 변형',
    sideMode:'bilateral',sideControlLabel:'양팔이 함께 움직입니다',phases:BATCH_PHASES['chair-seated-bilateral-arm-raise-v1'],
    rig:'ordinary-chair',equipment:['ordinary-stable-chair'],
    matched:['앉은 자세에서 팔이 올라갔다가 돌아오는 패턴을 참조했습니다.'],
    unknown:['양팔 동시 움직임·정확한 팔 경로·크기·관절각과 머리·몸통 고정은 저작 선택입니다.','견갑골 움직임·근육 부하·개인별 범위와 수업 적합성은 검토하지 않았습니다.'],
    mismatched:['원문은 한 팔씩 번갈아 듭니다. 이 양팔 동시 변형은 원문과 정확히 일치하지 않습니다.','기존 매트 암 리치의 앞쪽 팔 경로와 달리 위쪽까지 이동하며, 일반 의자가 필요합니다.'],
    supportSummary:'좌석의 양쪽 앉은 접촉과 양발의 바닥 접촉을 고정합니다. 손은 지지점이 아닙니다.',
    supportNote:'좌석·발 접촉은 저작 도해의 위치 제약입니다. 의자 안정성이나 실제 압력을 입증하지 않습니다.',
    sources:source('uhsussex-chair-arm-lift-text-2026-11-05'),
  },
  {
    ...status,id:'chair-seated-overhead-sidebend-v1',intendedExerciseId:'original-mat-mermaid',
    title:'일반 의자 · 한 팔 위 옆굽힘',variant:'양발·좌석 지지를 둔 일반 의자 옆굽힘 · 바닥 머메이드와 별도',
    sideMode:'unilateral',sideControlLabel:'몸통이 기울어지는 해부학적 방향',phases:BATCH_PHASES['chair-seated-overhead-sidebend-v1'],
    rig:'ordinary-chair',equipment:['ordinary-stable-chair'],
    matched:['의자에 앉아 반대 팔을 위로 뻗으며 몸통을 옆으로 기울였다 돌아오는 패턴입니다.'],
    unknown:['6개 몸통 링크·위팔 배치·앉은 접촉의 고정은 저작 선택이며 척추나 견갑골 역학이 아닙니다.','아래 손은 자유롭게 움직이며 의자에 닿는 지지로 표시하지 않습니다. 개인별 적합성은 미검토입니다.'],
    mismatched:['일반 의자에서 하는 옆굽힘이며 바닥에 앉는 머메이드의 정확한 자산이 아닙니다.','팔을 이미 올린 시작 배치와 움직임 수치는 저작 선택입니다.'],
    supportSummary:'양쪽 좌석 접촉과 양발을 고정하고, 몸통 링크와 반대쪽 팔을 함께 기울입니다.',
    supportNote:'그림의 6개 링크는 몸통의 분산된 굽힘을 나타냅니다. 개별 척추 분절이나 안전성을 검증하지 않습니다.',
    sources:source('leicspart-chair-trunk-stretch-text-2026-11-05'),
  },
  {
    ...status,id:'prone-single-straight-leg-extension-v1',intendedExerciseId:'original-mat-swimming-prep',
    title:'엎드림 · 한쪽 편 다리 들기',variant:'손·이마와 몸통을 둔 한쪽 다리 들기 · 교차 스위밍 아님',
    sideMode:'unilateral',sideControlLabel:'들어 올리는 해부학적 다리',phases:BATCH_PHASES['prone-single-straight-leg-extension-v1'],
    rig:'mat',equipment:['mat'],
    matched:['엎드린 자세에서 편 다리 하나를 들어 올렸다가 내리는 패턴입니다.'],
    unknown:['이마·손의 배치와 접촉·골반 고정·발 모양·들리는 각도는 저작 선택입니다.','고관절과 허리의 실제 분리 움직임·압력·부하·성인 수업 적합성은 검토하지 않았습니다.'],
    mismatched:['원문은 팔·머리 지지의 자세를 명시하지 않습니다.','팔과 반대 다리를 동시에 드는 스위밍 변형이나 연속 교대 동작을 뜻하지 않습니다.'],
    supportSummary:'선택한 다리의 앞발 접촉만 해제됩니다. 반대 다리·골반·윗몸통·손·이마 접촉은 고정합니다.',
    supportNote:'두 다리의 각 뼈 길이는 유지하며 편 다리 전체를 고관절 기준으로 회전합니다. 실제 관절 범위나 지지 압력은 미검토입니다.',
    sources:source('rnoh-prone-hip-extension-text-2026-11-05'),
  },
  {
    ...status,id:'prone-forearm-chest-extension-v1',intendedExerciseId:'original-mat-swan-prep',
    title:'엎드림 · 팔뚝 지지 가슴 들기',variant:'고정된 양 팔뚝을 둔 분절 몸통 확장 도해 · 손 프레스 스완과 별도',
    sideMode:'bilateral',sideControlLabel:'양팔 지지를 함께 유지합니다',phases:BATCH_PHASES['prone-forearm-chest-extension-v1'],
    rig:'mat',equipment:['mat'],
    matched:['엎드린 양 팔뚝 지지에서 어깨·가슴이 올라가는 패턴을 참조했습니다.'],
    unknown:['두 그룹으로 연결한 6개 몸통 링크와 어깨 호는 저작 역기구학입니다. 실제 척추 움직임을 재현하지 않습니다.','복부의 면 접촉·흉곽·견갑골·허리 부하·개인별 적합성과 안전성은 검토하지 않았습니다.'],
    mismatched:['허리 통증 재활 자료이며 정확한 필라테스 스완 시범으로 확인하지 않았습니다.','기존 매트 스완 계획에서 팔뚝 지지와 정확한 몸통·팔 배치를 정하지 않았습니다.'],
    supportSummary:'골반·양발·양 팔꿈치·팔뚝·손의 접촉을 고정합니다. 상체와 머리는 들린 배치를 유지합니다.',
    supportNote:'양쪽 위팔과 몸통 링크 길이를 유지하는 저작 모델입니다. 복부 접촉 압력은 계산하지 않으며 도형 내부 일관성은 운동 안전성의 증거가 아닙니다.',
    sources:source('ocats-prone-forearm-extension-text-2026-11-05'),
  },
] as const;

export function getBatchVariant(id:BatchVariantId) { return BATCH_VARIANTS.find(item=>item.id===id)!; }

/** Usable discovery links; never a canonical exact-asset mapping or review grant. */
export const BATCH_PATTERN_REFERENCES = BATCH_VARIANTS.map(variant=>({
  variantId:variant.id,intendedExerciseIds:[variant.intendedExerciseId],relation:'pattern-reference' as const,
  exactCanonicalMatch:false as const,professionalReviewStatus:'unreviewed' as const,
  assetStatus:'authored-unreviewed-draft' as const,autoRecommendationEligible:false as const,
}));
export function getBatchPatternReferences(exerciseId:string) {
  return BATCH_PATTERN_REFERENCES.filter(reference=>reference.intendedExerciseIds.some(id=>id===exerciseId));
}
