import type { ApparatusType, BodyPosition, PilatesExercise, PropType } from '../types/pilates';

/** Title/structured-metadata compatibility is discovery evidence, never playback review. */
export interface VideoSemanticCandidate {
  readonly title: string;
  readonly apparatus: readonly ApparatusType[];
  readonly bodyPositions?: readonly BodyPosition[];
  readonly props?: readonly PropType[];
}

export type VideoSemanticExercise = Pick<
  PilatesExercise,
  'id' | 'nameKo' | 'nameEn' | 'apparatus'
> &
  Partial<Pick<PilatesExercise, 'bodyPosition' | 'props' | 'requiredEquipment'>>;

export function videoReferenceSubject(exercise: VideoSemanticExercise, videoId: string): string {
  return JSON.stringify([
    videoId,
    exercise.id,
    exercise.nameEn,
    exercise.apparatus,
    exercise.bodyPosition,
    [...(exercise.props ?? [])].sort(),
    [...(exercise.requiredEquipment ?? [])].sort(),
  ]);
}

export function normalizeVideoSearchText(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function movementSlug(id: string): string {
  return id.replace(/^(?:original|expanded|crawled)-(?:mat|reformer|cadillac|chair|barrel)-/, '');
}

const COMPOSITE_TITLE_REQUIREMENTS: Readonly<Record<string, RegExp>> = {
  // These catalog entries explicitly combine several named movements. A video
  // naming one component is a related reference, not coverage of the whole flow.
  'ex-core-02': /short[\s-]*box|숏\s*박스/i,
  'ex-lower-03':
    /going[\s-]*up[\s-]*front|mountain[\s-]*climb|climb(?:ing)?\s+(?:up\s+)?the\s+mountain|step[\s-]*up/i,
  'ex-plank-01':
    /long[\s-]*stretch|elephant|knee[\s-]*stretch|롱\s*스트레치|엘리펀트|니\s*스트레치/i,
  'ex-plank-02': /pull[\s-]*up|\bpike\b|scapular[\s-]*plank|풀\s*업|파이크/i,
  'ex-extension-02': /\bswan\b|back[\s-]*extension|스완/i,
  'ex-straps-01':
    /\bfrogs?\b|leg[\s-]*circles?|peter[\s-]*pan|short[\s-]*spine|프로그|레그\s*서클|피터\s*팬|숏\s*스파인/i,
};

export type VideoReferenceScope = 'named-component' | 'movement-reference';

export function getVideoReferenceScope(
  exercise: Pick<VideoSemanticExercise, 'id'>,
): VideoReferenceScope {
  return Object.hasOwn(COMPOSITE_TITLE_REQUIREMENTS, exercise.id)
    ? 'named-component'
    : 'movement-reference';
}

export function getVideoMatchReasonKo(exercise: Pick<VideoSemanticExercise, 'id'>): string {
  return getVideoReferenceScope(exercise) === 'named-component'
    ? '복합 흐름의 구성 동작을 위한 부분 참고 · 제목·기구 대조 · 전체 흐름·실제 재생·구간 미검수'
    : '동작 제목·기구 대조 · 자세·도구의 명백한 불일치 제외 · 동일 시범·실제 재생·구간 미검수';
}

// Audited aliases describe a movement family. Preparation, support, resistance,
// and range still need review; tags must never override these title requirements.
const TITLE_REQUIREMENTS: Readonly<Record<string, RegExp>> = {
  ...COMPOSITE_TITLE_REQUIREMENTS,
  'incline-support': /fixed[\s-]*(?:seat|support)|incline[\s-]*support|고정\s*(?:좌면|지지)/i,
  'seated-back-reach': /seated.*(?:chest|back).*reach|(?:앉|시티드).*(?:가슴|체스트).*리치/i,
  'rib-breath': /흉곽\s*호흡.*골반\s*중립/i,
  'heel-slide': /heel[\s-]*slides?|힐\s*슬라이드/i,
  'chest-lift': /chest[\s-]*lift|체스트\s*리프트|상체\s*컬업/i,
  'band-row': /(?:band|밴드).*(?:row|로잉)|(?:row|로잉).*(?:band|밴드)/i,
  'side-leg-lift': /side.*(?:leg[\s-]*(?:lift|raise)|straight[\s-]*leg)|사이드.*레그.*리프트/i,
  'single-leg-stretch': /single[\s-]*leg[\s-]*stretch|싱글\s*레그\s*스트레치/i,
  'seated-spine-twist': /(?:seated.*)?spine[\s-]*twist|스파인\s*트위스트/i,
  'parallel-footwork': /footwork|풋워크/i,
  'supported-bridge': /bridge|bridging|브릿지|브리지/i,
  'seated-pedal-press': /footwork|풋워크|seated.*pedal|시티드.*페달/i,
  'alternating-pedal':
    /(?:alternat|single[\s-]*leg).*footwork|footwork.*(?:alternat|single[\s-]*leg)|교차.*풋워크/i,
  'strap-frog': /frogs?|프로그/i,
  'supported-swan': /swan|스완/i,
  'supported-side-bend': /side[\s-]*(?:sit[\s-]*ups?|bend)|사이드.*(?:싯업|벤드)/i,
  'quadruped-reach':
    /bird[\s-]*dog|opposite.*(?:leg.*arm|arm.*leg).*reach|quadruped.*reach|버드\s*독/i,
  'forearm-plank':
    /(?:kneeling|knee.*support).*forearm.*plank|forearm.*plank.*(?:kneeling|knee.*support)|무릎.*전완.*플랭크/i,
  'knee-fold': /knee[\s-]*fold|니\s*폴드/i,
  clam: /clam(?:shell)?|클램/i,
  'open-book': /open[\s-]*book|오픈\s*북/i,
  'going-up-side': /going[\s-]*up[\s-]*side|고잉\s*업\s*사이드/i,
  'single-leg-kick': /single[\s-]*leg[\s-]*kick|싱글\s*레그\s*킥/i,
};

const POSITION_WORDS: readonly [BodyPosition, RegExp][] = [
  ['supine', /\bsupine\b|바로\s*누운|앙와위/i],
  ['prone', /\bprone\b|엎드린|복와위/i],
  ['side-lying', /side[\s-]*lying|사이드\s*라잉|옆으로\s*누운/i],
  ['seated', /\bseated\b|\bsitting\b|시티드|앉아서|앉은/i],
  ['kneeling', /\bkneeling\b|닐링|무릎\s*서기/i],
  ['standing', /\bstanding\b|스탠딩|서서/i],
  ['quadruped', /\bquadruped\b|bird[\s-]*dog|네발\s*기기|버드\s*독/i],
];

const PROP_WORDS: readonly [readonly PropType[], RegExp][] = [
  [
    ['theraband', 'long-band', 'loop-band', 'tube-band'],
    /\b(?:resistance\s+)?bands?\b|thera[\s-]*band|밴드/i,
  ],
  [['magic-circle'], /magic[\s-]*circle|\bring\b|써클링|서클링|매직\s*써클/i],
  [['foam-roller'], /foam[\s-]*roller|폼\s*롤러/i],
  [
    ['mini-ball', 'toning-ball', 'fitness-ball'],
    /(?:mini|small|fitness|stability|toning|purple)[\s-]*ball|미니볼|짐볼|토닝볼/i,
  ],
  [['dumbbell'], /dumbbell|hand[\s-]*weights?|덤벨/i],
  [['bosu'], /bosu|보수/i],
  [['sliders'], /sliders?|슬라이더/i],
  [['yoga-block'], /yoga[\s-]*blocks?|요가\s*블록/i],
];

const SPECIFIC_PROP_WORDS: readonly [readonly PropType[], RegExp][] = [
  [['loop-band'], /loop[\s-]*band|mini[\s-]*band|booty[\s-]*band|루프\s*밴드/i],
  [['tube-band'], /tube[\s-]*band|튜빙\s*밴드|튜브\s*밴드/i],
  [['theraband', 'long-band'], /long[\s-]*band|thera[\s-]*band|세라\s*밴드|긴\s*밴드/i],
  [['mini-ball'], /(?:mini|small|purple)[\s-]*(?:stability[\s-]*)?ball|미니\s*볼/i],
  [['toning-ball'], /toning[\s-]*ball|토닝\s*볼/i],
  [['fitness-ball'], /fitness[\s-]*ball|swiss[\s-]*ball|짐\s*볼/i],
];

const GENERIC_WORDS = new Set([
  'a',
  'an',
  'and',
  'at',
  'for',
  'in',
  'of',
  'on',
  'the',
  'to',
  'with',
  'without',
  'pilates',
  'mat',
  'reformer',
  'cadillac',
  'chair',
  'wunda',
  'stability',
  'barrel',
  'ladder',
  'tower',
  'seated',
  'sitting',
  'standing',
  'supine',
  'prone',
  'kneeling',
  'lying',
  'quadruped',
  'preparation',
  'prep',
  'supported',
  'support',
  'basic',
  'classical',
  'classic',
  'table',
  'exercise',
  'exercises',
  'movement',
  'movements',
  'flow',
  'series',
  'sequence',
  'workout',
  'beginner',
  'intermediate',
  'advanced',
  'level',
  'full',
  'body',
  'minute',
  'minutes',
]);

function meaningfulWords(text: string): string[] {
  return [
    ...new Set(
      normalizeVideoSearchText(text)
        .split(' ')
        .filter((word) => word.length > 1 && !GENERIC_WORDS.has(word) && !/^\d+$/.test(word)),
    ),
  ];
}

export function withoutAttachmentNames(text: string): string {
  // “Bicep Curls with Roll Back Bar” names a bar, not the Roll Back movement.
  return text.replace(/roll[\s-]*(?:back|down)[\s-]*bar|push[\s-]*through[\s-]*bar/gi, ' ');
}

export function hasAuditedVideoTitleMismatch(
  exercise: VideoSemanticExercise,
  candidate: VideoSemanticCandidate,
): boolean {
  const requirement = TITLE_REQUIREMENTS[movementSlug(exercise.id)];
  return Boolean(requirement && !requirement.test(candidate.title));
}

/** Explicit contradictions are blocked even for a stored direct reference. */
export function hasVideoSetupConflict(
  exercise: VideoSemanticExercise,
  candidate: VideoSemanticCandidate,
): boolean {
  if (!candidate.apparatus.includes(exercise.apparatus)) return true;
  const setup = [exercise.nameEn, exercise.nameKo, ...(exercise.requiredEquipment ?? [])].join(' ');
  const ladder = /ladder[\s-]*barrel|래더\s*바렐/i;
  const arc = /spine[\s-]*corrector|arc[\s-]*barrel|스파인\s*코렉터|아크\s*바렐/i;
  if (
    (ladder.test(setup) && arc.test(candidate.title)) ||
    (arc.test(setup) && !ladder.test(setup) && ladder.test(candidate.title))
  )
    return true;
  if (/jump[\s-]*board|점프\s*보드/i.test(setup) && !/jump|점프/i.test(candidate.title))
    return true;
  if (/side[\s-]*footwork|사이드\s*풋워크/i.test(candidate.title) && !/side|사이드/i.test(setup))
    return true;
  if (
    exercise.bodyPosition === 'supine' &&
    /front[\s-]*rowing|프론트\s*로잉/i.test(candidate.title)
  )
    return true;
  if (
    /frog.*facing (?:back|out)/i.test(setup) &&
    /frog.*facing (?:in|front)/i.test(candidate.title)
  )
    return true;
  if (
    /frog.*facing (?:in|front)/i.test(setup) &&
    /frog.*facing (?:back|out)/i.test(candidate.title)
  )
    return true;
  if (exercise.bodyPosition) {
    if (candidate.bodyPositions?.length && !candidate.bodyPositions.includes(exercise.bodyPosition))
      return true;
    const namedPositions = POSITION_WORDS.filter(([, pattern]) =>
      pattern.test(candidate.title),
    ).map(([position]) => position);
    if (namedPositions.length && !namedPositions.includes(exercise.bodyPosition)) return true;
  }
  const requestedProps = (exercise.props ?? []).filter((prop) => prop !== 'none');
  for (const [props, pattern] of [...PROP_WORDS, ...SPECIFIC_PROP_WORDS]) {
    if (pattern.test(candidate.title) && !requestedProps.some((prop) => props.includes(prop)))
      return true;
  }
  if (candidate.props?.some((prop) => prop !== 'none' && !requestedProps.includes(prop)))
    return true;
  const name = `${exercise.nameEn} ${exercise.nameKo}`;
  if (
    /\bprep(?:aration)?\b|프렙/i.test(name) &&
    /\badvanced\b|\bhigh[\s-]*frogs?\b|swan[\s-]*dive|grasshopper/i.test(candidate.title)
  )
    return true;
  const requestsDoubleLeg = /double[\s-]*leg|양발|양\s*다리/i.test(name);
  const requestsSingleLeg = /single[\s-]*leg|한\s*다리/i.test(name);
  if (
    requestsDoubleLeg &&
    !requestsSingleLeg &&
    /single[\s-]*leg|one[\s-]*leg|한\s*다리/i.test(candidate.title)
  )
    return true;
  if (
    requestsSingleLeg &&
    !requestsDoubleLeg &&
    /double[\s-]*leg|양발|양\s*다리/i.test(candidate.title)
  )
    return true;
  // Apparatus add-ons and opposite variants cannot be silently substituted.
  for (const pattern of [
    /jump[\s-]*board|점프\s*보드/i,
    /long[\s-]*box|롱\s*박스/i,
    /short[\s-]*box|숏\s*박스/i,
  ]) {
    if (pattern.test(candidate.title) && !pattern.test(name)) return true;
  }
  if (
    /side[\s-]*lying.*leg[\s-]*lift|side[\s-]*leg[\s-]*lift/i.test(name) &&
    /clam/i.test(candidate.title)
  )
    return true;
  if (/\bclam\b/i.test(name) && /(?:with|and)\s+(?:a\s+)?lift/i.test(candidate.title)) return true;
  return false;
}

const candidateTitleWords = new WeakMap<
  VideoSemanticCandidate,
  { title: string; words: Set<string> }
>();

function titleWords(candidate: VideoSemanticCandidate): Set<string> {
  const previous = candidateTitleWords.get(candidate);
  if (previous?.title === candidate.title) return previous.words;
  const words = new Set(
    normalizeVideoSearchText(withoutAttachmentNames(candidate.title)).split(' '),
  );
  candidateTitleWords.set(candidate, { title: candidate.title, words });
  return words;
}

function namesMovementWord(title: Set<string>, word: string) {
  if (title.has(word)) return true;
  if (word.length < 4) return false;
  return (
    title.has(word + 's') ||
    (/s$/.test(word) && !/ss$/.test(word) && title.has(word.slice(0, -1))) ||
    (/(?:ch|sh|x|z|ss)$/.test(word) && title.has(word + 'es')) ||
    title.has(word + 'ing') ||
    title.has((word + 'ing').replace(/eing$/, 'ing'))
  );
}

/**
 * Both discovery pools use this gate. A category, posture, muscle, channel, or
 * manually assigned keyword is insufficient: the public title must name the task.
 * The integer only orders references; 100 is not an accuracy percentage or a
 * claim that a video demonstrates every component of a catalog flow.
 */
export function scoreVideoSemanticMatch(
  exercise: VideoSemanticExercise,
  candidate: VideoSemanticCandidate,
): number {
  const guard = TITLE_REQUIREMENTS[movementSlug(exercise.id)];
  let score = 100;
  if (guard) {
    if (!guard.test(candidate.title)) return 0;
  } else {
    const words = meaningfulWords(withoutAttachmentNames(exercise.nameEn));
    if (
      !words.length ||
      (words.length === 1 &&
        /^(?:arm|leg|core|back|reach|press|breath|rotation|stretch|twist|side|up|down)$/.test(
          words[0],
        ))
    )
      return 0;
    const title = titleWords(candidate);
    if (!words.every((word) => namesMovementWord(title, word))) return 0;
    score = 60 + Math.min(30, words.length * 5);
  }
  if (hasVideoSetupConflict(exercise, candidate)) return 0;
  const requestedProps = (exercise.props ?? []).filter((prop) => prop !== 'none');
  for (const prop of requestedProps) {
    const group = PROP_WORDS.find(([props]) => props.includes(prop));
    if (!candidate.props?.includes(prop) && (!group || !group[1].test(candidate.title))) return 0;
  }
  return score;
}

export function safeVideoDiscoveryLimit(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(6, Math.floor(value))) : 0;
}
