/**
 * Sensitive Health & Personal Information (PHI / PII) detection patterns.
 * Free external AI providers (Google Gemini Free Tier & OpenRouter Free Models) may log or train on inputs;
 * sensitive health or personal information must NEVER be sent to external free AI.
 */
const SENSITIVE_HEALTH_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  {
    label: '척추·관절 질환/진단명',
    regex:
      /디스크|추간판\s*탈출|척추관\s*협착|협착증|전방\s*전위증|척추\s*분리증|골절|파열|오십견|회전근개\s*파열|관절염|류마티스|골다공증|측만증|herniated\s*disc|spinal\s*stenosis|fracture|scoliosis|osteoarthritis|osteoporosis/i,
  },
  {
    label: '수술·시술·치료 이력',
    regex:
      /수술|시술|인공\s*관절|입원|퇴원|주사\s*치료|스테로이드|신경\s*차단술|물리\s*치료\s*처방|병원\s*진단|의사\s*소견|처방전|재활\s*환자|환자|surgery|post-op|operation|hospital|diagnosis|prescription|patient/i,
  },
  {
    label: '임신·산전·산후 건강상태',
    regex:
      /임신\s*\d*주|임산부|산모|출산\s*(?:직후|\d+\s*(?:주|개월))|산후\s*\d+\s*(?:주|개월)|제왕절개|유산|복직근\s*이개|pregnant|pregnancy|trimester|postpartum\s*patient|c-section/i,
  },
  {
    label: '급성 통증·신경학적 증상',
    regex:
      /통증|충돌\s*증후군|방사통|신경통|저림\s*증상|마비|감각\s*저하|배뇨\s*장애|배변\s*장애|어지럼증|실신|급성\s*통증|심한\s*통증|통증\s*호소|sciatica|numbness|paralysis|acute\s*pain|chronic\s*pain/i,
  },
  {
    label: '내과·만성 질환 및 복약 정보',
    regex:
      /고혈압|저혈압|당뇨|심장병|협심증|뇌졸중|암\s*투병|항암|갑상선\s*질환|우울증|공황장애|복용\s*약|약물|hypertension|diabetes|cancer|stroke|medication/i,
  },
  {
    label: '개인 식별 정보(연락처·이메일·주민번호)',
    regex:
      /(?:\b01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}\b)|(?:\b\d{6}[-.\s]?[1-4]\d{6}\b)|(?:\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b)|(?:회원\s*실명|환자\s*이름|차트\s*번호|병록\s*번호)/i,
  },
  {
    label: '개인 식별 정보(회원명)',
    // Context and common family names avoid treating every Korean class title as a name.
    regex:
      /(?:^|[^가-힣])(?!(?:선생|강사|원장|회원|고객|사용자)님)[김이박최정강조윤장임한오서신권황안송전홍유고문양손배백허남심노하곽성차주우구민진지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용][가-힣]{1,3}\s*(?:회원|님)|회원\s*[:：]?\s*[김이박최정강조윤장임한오서신권황안송전홍유고문양손배백허남심노하곽성차주우구민진지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용][가-힣]{1,3}(?=$|[^가-힣])/i,
  },
];

export interface SensitiveHealthInspection {
  hasSensitiveData: boolean;
  matchedCategories: string[];
  sanitizedText: string;
  warningMessageKo: string | null;
}

export function inspectSensitiveHealthText(rawText: string): SensitiveHealthInspection {
  const matchedCategories: string[] = [];
  let sanitizedText = rawText;

  for (const { label, regex } of SENSITIVE_HEALTH_PATTERNS) {
    if (regex.test(rawText)) {
      if (!matchedCategories.includes(label)) {
        matchedCategories.push(label);
      }
      const globalRegex = new RegExp(regex.source, 'gi');
      sanitizedText = sanitizedText.replace(globalRegex, '[민감정보 제외]');
    }
  }

  return {
    hasSensitiveData: matchedCategories.length > 0,
    matchedCategories,
    sanitizedText: sanitizedText.trim(),
    warningMessageKo:
      matchedCategories.length > 0
        ? `민감 건강·개인정보(${matchedCategories.join(', ')})는 무료 외부 AI로 전송할 수 없습니다. 질환·통증·실명 대신 일반적인 수업 주제나 운동 부위(예: 코어 조절, 둔근 강화, 흉추 가동성)로 입력해 주세요.`
        : null,
  };
}
