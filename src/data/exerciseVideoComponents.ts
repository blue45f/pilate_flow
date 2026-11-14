/** Named parts of catalog flows; a component reference never confirms an entire flow. */
export const EXERCISE_VIDEO_COMPONENTS: Readonly<
  Record<string, readonly { nameEn: string; labelKo: string }[]>
> = {
  'ex-footwork-01': [
    { nameEn: 'Footwork', labelKo: '풋워크' },
    { nameEn: 'Running', labelKo: '러닝' },
  ],
  'ex-footwork-03': [
    { nameEn: 'Footwork', labelKo: '체어 풋워크' },
    { nameEn: 'Single Leg Pump', labelKo: '한 다리 펌프' },
  ],
  'ex-bridging-01': [
    { nameEn: 'Pelvic Lift', labelKo: '골반 들기' },
    { nameEn: 'Hamstring Curl', labelKo: '햄스트링 컬' },
  ],
  'ex-bridging-02': [
    { nameEn: 'Shoulder Bridge', labelKo: '숄더 브리지' },
    { nameEn: 'Parakeet', labelKo: '파라키트' },
  ],
  'ex-core-01': [
    { nameEn: 'Supine Arms', labelKo: '누운 자세 팔 동작' },
    { nameEn: 'Coordination', labelKo: '코디네이션' },
    { nameEn: 'Hundred', labelKo: '헌드레드' },
  ],
  'ex-core-03': [
    { nameEn: 'Single Leg Stretch', labelKo: '싱글 레그 스트레치' },
    { nameEn: 'Double Leg Stretch', labelKo: '더블 레그 스트레치' },
    { nameEn: 'Scissors', labelKo: '시저스' },
    { nameEn: 'Criss Cross', labelKo: '크리스 크로스' },
  ],
  'ex-upper-01': [
    { nameEn: 'Chest Expansion', labelKo: '체스트 익스팬션' },
    { nameEn: 'Hug a Tree', labelKo: '허그 어 트리' },
    { nameEn: 'Seated Rotation', labelKo: '앉은 자세 회전' },
  ],
  'ex-upper-02': [
    { nameEn: 'Rowing', labelKo: '로잉' },
    { nameEn: 'Serve a Tray', labelKo: '서브 어 트레이' },
    { nameEn: 'Shave', labelKo: '셰이브' },
  ],
  'ex-upper-03': [
    { nameEn: 'Boxing', labelKo: '복싱' },
    { nameEn: 'Salute', labelKo: '살루트' },
    { nameEn: 'Chest Expansion', labelKo: '체스트 익스팬션' },
  ],
  'ex-lower-01': [
    { nameEn: 'Scooter', labelKo: '스쿠터' },
    { nameEn: 'Eve Lunge', labelKo: '이브 런지' },
  ],
  'ex-lower-02': [
    { nameEn: 'Side Splits', labelKo: '사이드 스플릿' },
    { nameEn: 'Skater', labelKo: '스케이터' },
  ],
  'ex-extension-01': [
    { nameEn: 'Pulling Straps', labelKo: '풀링 스트랩' },
    { nameEn: 'T Straps', labelKo: 'T 스트랩' },
    { nameEn: 'Plow', labelKo: '플로' },
  ],
  'ex-straps-02': [
    { nameEn: 'Frog', labelKo: '프로그' },
    { nameEn: 'Leg Circles', labelKo: '레그 서클' },
    { nameEn: 'Leg Springs Walking', labelKo: '레그 스프링 워킹' },
  ],
  'ex-cooldown-01': [
    { nameEn: 'Mermaid', labelKo: '머메이드' },
    { nameEn: 'Saw', labelKo: '소우 회전' },
  ],
};

/** Creator titles/descriptions identify these as variants or multi-movement videos. */
export const VIDEO_REFERENCE_SCOPE: Readonly<Record<string, 'related-variant' | 'flow-component'>> =
  {
    QFv_Fex3Mko: 'related-variant',
    '4mbKSdGz3us': 'flow-component',
    XnFBJBQpYEY: 'flow-component',
    V3_HSYh2Rvo: 'flow-component',
    QJjB2QPG9qQ: 'flow-component',
    zbrQhWe3hG4: 'flow-component',
  };
