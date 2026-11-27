/** 기구가 달라도 실제 움직임과 지지가 같은 경우에만 안내를 공유한다. */
export interface PracticeNote {
  readonly benefit: string;
  readonly setup: string;
  readonly movement: string;
  readonly check: string;
}

const noteGroups: readonly { ids: readonly string[]; note: PracticeNote }[] = [
  {
    ids: ['original-reformer-supine-breath'],
    note: {
      benefit: '팔을 움직일 때도 숨이 이어지는지 느껴 보는 동작이에요.',
      setup: '움직이는 판을 강사와 안정시킨 뒤 등을 대고 누워요. 팔은 몸 옆에 편하게 둬요.',
      movement:
        '편하게 숨을 몇 번 쉰 뒤 빈손으로 작은 반원을 그려요. 팔을 내리고 갈비뼈가 가라앉는 느낌을 살펴봐요.',
      check: '팔을 올릴 때 어깨가 귀에 가까워지거나 갈비뼈가 들뜨면 팔이 그리는 원을 줄여요.',
    },
  },
  {
    ids: ['original-mat-rib-breath', 'original-cadillac-table-breath'],
    note: {
      benefit: '숨을 들이쉴 때 갈비뼈가 양옆으로 벌어지고, 내쉴 때 모이는 느낌을 익혀요.',
      setup: '등을 대고 누워 무릎을 편하게 세워요. 손을 양옆 갈비뼈에 가볍게 얹어 보세요.',
      movement:
        '코로 숨을 들이며 손 사이가 넓어지는지 느껴요. 천천히 내쉬면서 갈비뼈가 돌아오는 걸 기다려요.',
      check: '어깨를 편하게 두세요. 숨을 크게 쉬려고 애쓰지 않아도 돼요.',
    },
  },
  {
    ids: ['original-chair-seated-breath'],
    note: {
      benefit: '숨을 들이쉴 때 갈비뼈가 양옆으로 벌어지고, 내쉴 때 모이는 느낌을 익혀요.',
      setup: '체어에 걸터앉아 발을 바닥에 편하게 두고 어깨를 내려요.',
      movement:
        '옆구리에 손을 얹고 편하게 숨을 쉬어 보세요. 숨이 들어올 때 손 사이가 조금 넓어지는지 느껴 보세요.',
      check: '어깨를 편하게 두세요. 숨을 크게 쉬려고 애쓰지 않아도 돼요.',
    },
  },
  {
    ids: ['original-barrel-standing-breath'],
    note: {
      benefit: '숨을 들이쉴 때 갈비뼈가 양옆으로 벌어지고, 내쉴 때 모이는 느낌을 익혀요.',
      setup: '바렐 옆 바닥에 서서 고정된 곳에 손을 가볍게 얹어요.',
      movement:
        '양발에 무게를 고르게 두고 편하게 숨을 쉬어요. 숨을 내쉴 때 목과 어깨의 힘을 조금 내려놔요.',
      check: '어깨를 편하게 두세요. 숨을 크게 쉬려고 애쓰지 않아도 돼요.',
    },
  },
  {
    ids: ['original-reformer-parallel-footwork'],
    note: {
      benefit: '발로 바를 밀면서 엉덩이와 허벅지에 힘을 싣는 연습이에요.',
      setup: '리포머에 누워 해당 동작에 맞는 위치에 발을 대요. 바와 스프링은 강사와 맞춰요.',
      movement: '발로 바를 밀어 움직이는 판을 보내고, 무릎을 굽히면서 천천히 돌아와요.',
      check: '무릎과 발끝이 같은 쪽을 보게 둬요. 돌아올 때 발 한쪽에만 힘이 몰리는지 느껴 보세요.',
    },
  },
  {
    ids: ['original-mat-pelvic-clock'],
    note: {
      benefit:
        '골반을 여러 방향으로 조금씩 기울이면서 허리가 바닥에 닿는 느낌이 어떻게 바뀌는지 살펴봐요.',
      setup:
        '매트에 누워 무릎을 세워요. 양손을 골반 양옆에 올려 두면 어느 쪽이 움직이는지 느끼기 쉬워요.',
      movement:
        '골반을 배꼽 쪽과 발 쪽으로 조금씩 굴렸다가 이번엔 왼쪽과 오른쪽으로 기울여요. 네 방향을 작은 원으로 이어 보고 반대로도 돌아봐요.',
      check: '원이 작아도 괜찮아요. 어깨나 무릎까지 같이 흔들리면 조금 작게 굴려 보세요.',
    },
  },
  {
    ids: ['original-cadillac-pelvic-rock'],
    note: {
      benefit: '골반을 앞뒤로 살짝 굴려 보면서 허리가 편안한 가운데 자리를 찾아요.',
      setup: '캐딜락에 등을 대고 누워 무릎을 굽히고 발바닥을 테이블에 둬요.',
      movement:
        '골반을 배꼽 쪽으로 살짝 굴렸다가 반대쪽으로 보내요. 양쪽 엉덩이가 편안한 자리에 돌아와요.',
      check: '어깨는 그 자리에 두고 골반만 작게 움직였다가 가운데에서 쉬어요.',
    },
  },
  {
    ids: ['original-chair-seated-pelvic-rock'],
    note: {
      benefit: '골반을 앞뒤로 살짝 굴려 보면서 허리가 편안한 가운데 자리를 찾아요.',
      setup: '체어에 편하게 앉아 두 발을 바닥에 두고 어깨에 힘을 빼요.',
      movement:
        '골반을 앞뒤로 살짝 굴려 봐요. 엉덩이 아래 딱딱한 뼈 두 곳에 몸무게가 고르게 실리는 데서 멈춰요.',
      check: '어깨는 그 자리에 두고 골반만 작게 움직였다가 가운데에서 쉬어요.',
    },
  },
  {
    ids: [
      'original-barrel-supported-ankle',
      'original-mat-ankle-reach',
      'original-chair-supported-calf-raise',
      'world-mat-standing-pilates-v-calf-raise',
      'world-reformer-fusion-barre-footbar-releve',
    ],
    note: {
      benefit: '뒤꿈치를 들었다 내리며 종아리 힘과 발끝으로 균형 잡는 감각을 길러요.',
      setup: '바닥에 서서 발을 나란히 놓고, 필요하면 고정된 곳을 가볍게 짚어요.',
      movement: '뒤꿈치를 들었다가 발바닥이 닿을 때까지 조용히 내려와요.',
      check:
        '발목이 바깥으로 꺾이지 않는 높이까지만 올라가고, 뒤꿈치가 바닥에 닿을 때까지 천천히 내려와요.',
    },
  },
  {
    ids: ['original-reformer-supported-bridge'],
    note: {
      benefit: '발로 밀어 엉덩이를 들면서 허벅지 뒤와 엉덩이가 몸을 받치는 느낌을 익혀요.',
      setup: '리포머에 누워 머리 받침을 평평하게 내리고 발을 바에 대요.',
      movement: '발로 바를 눌러 골반을 조금 들어요. 움직이는 판을 조절하며 등부터 천천히 내려와요.',
      check:
        '양 무릎이 정면을 보게 두세요. 내려올 때까지 고개를 돌리지 않고 발에 고르게 힘을 실어요.',
    },
  },
  {
    ids: ['original-cadillac-table-ankle'],
    note: {
      benefit: '발끝을 몸 쪽으로 당겼다 멀리 보내면서 발목이 편하게 움직이는 범위를 찾아요.',
      setup: '캐딜락에 등을 대고 누워 다리를 편하게 받쳐요.',
      movement: '발등을 몸 쪽으로 당겼다가 천천히 멀리 뻗어요. 힘을 풀고 가운데로 돌아와요.',
      check: '무릎은 편하게 두고 발가락에 힘을 풀어요. 발목에서만 움직여 보세요.',
    },
  },
  {
    ids: [
      'original-chair-seated-pedal-press',
      'ex-footwork-03',
      'world-chair-chair-footwork-toes',
      'world-chair-chair-footwork-heels',
      'world-chair-chair-footwork-pilates-v',
    ],
    note: {
      benefit: '발로 페달을 누르고 돌아오는 힘까지 조절하면서 허벅지와 발을 함께 써요.',
      setup: '체어에 앉아 강사가 맞춰 준 위치에 발을 놓고 몸통을 곧게 세워요.',
      movement: '발로 페달을 누르고 무릎을 천천히 굽혀요. 올라오는 페달을 발로 따라가요.',
      check: '페달이 발을 밀어 올릴 때 발이 떨어지지 않게 끝까지 따라와요.',
    },
  },
  {
    ids: ['original-barrel-seated-spine-reach'],
    note: {
      benefit: '바렐에 앉아 몸을 살짝 기울이면서 배로 상체 무게를 받치는 느낌을 익혀요.',
      setup: '발과 엉덩이를 안정되게 받치고 앉아요. 발이 뜨지 않는지 확인해요.',
      movement: '상체를 뒤로 조금 기울여요. 배에 힘이 느껴지는 곳에서 잠시 멈췄다가 다시 앉아요.',
      check:
        '발이 사다리에 편안히 고정되었는지 먼저 확인해요. 스스로 돌아올 수 있는 거리만큼만 기울여요.',
    },
  },
  {
    ids: ['original-reformer-supine-arm-press'],
    note: {
      benefit: '팔을 몸 옆으로 당기면서 팔 뒤쪽과 겨드랑이 아래의 힘을 느껴요.',
      setup: '리포머에 등을 대고 누워 발을 받친 뒤 양손으로 손잡이를 잡아요.',
      movement: '팔을 몸 옆으로 내려 줄을 당겼다가, 줄에 팔이 딸려가지 않게 천천히 되돌려요.',
      check: '손을 멀리 보내려다 어깨가 들뜨면 손이 오가는 거리를 조금 줄여요.',
    },
  },
  {
    ids: [
      'original-mat-bridge',
      'original-cadillac-table-bridge',
      'world-mat-shoulder-bridge-classic',
      'world-mat-miniball-inner-thigh-bridge',
      'world-mat-loopband-glute-bridge-abduction',
      'world-chair-chair-supine-bridge-pedal',
      'world-barrel-spine-corrector-shoulder-bridge',
    ],
    note: {
      benefit: '발로 밀어 엉덩이를 들면서 허벅지 뒤와 엉덩이가 몸을 받치는 느낌을 익혀요.',
      setup: '등을 대고 누워 무릎을 세우고 발밑이 미끄럽지 않은지 확인해요.',
      movement: '발을 눌러 엉덩이를 들어요. 머리는 정면에 두고 등과 골반을 천천히 내려놓아요.',
      check:
        '양 무릎이 정면을 보게 두세요. 내려올 때까지 고개를 돌리지 않고 발에 고르게 힘을 실어요.',
    },
  },
  {
    ids: [
      'original-chair-alternating-pedal',
      'crawled-chair-standing-leg-pump',
      'world-chair-chair-standing-pump-side',
      'world-chair-chair-standing-pump-back',
    ],
    note: {
      benefit: '한 발로 페달을 누르는 동안 골반을 한쪽으로 기울이지 않는 연습이에요.',
      setup:
        '체어 옆이나 앞에 서서 발을 페달에 올려요. 교대로 밟는 체어는 강사와 좌우 페달을 확인해요.',
      movement: '지지하는 쪽에 중심을 잡고 발로 페달을 조금 눌러요. 원래 높이까지 천천히 따라와요.',
      check:
        '페달을 놓치지 않고 원래 높이까지 따라와요. 양쪽이 얼마나 다르게 느껴지는지도 살펴보세요.',
    },
  },
  {
    ids: [
      'original-barrel-supported-arm-reach',
      'original-chair-seated-arm-arc',
      'original-mat-seated-arm-reach',
    ],
    note: {
      benefit: '팔을 뻗을 때 어깨와 날개뼈가 함께 움직이는 느낌을 익혀요.',
      setup: '앉거나 고정된 곳을 짚어 몸통을 편하게 세워요.',
      movement: '팔을 앞으로 천천히 뻗어 보고 어깨에 힘이 몰리기 전에 원래 자리로 내려요.',
      check: '팔을 높일수록 어깨가 귀에 가까워지거나 허리가 뜨면 바로 전 높이까지만 움직여요.',
    },
  },
  {
    ids: [
      'original-reformer-seated-row',
      'original-mat-band-row',
      'world-reformer-seated-midback-row',
      'world-cadillac-armsprings-kneeling-rowing',
    ],
    note: {
      benefit: '팔꿈치를 뒤로 보내며 날개뼈 사이와 등으로 당기는 힘을 길러요.',
      setup: '몸통을 곧게 세우고 줄이나 밴드를 잡아요. 시작할 때부터 살짝 당겨지는지 확인해요.',
      movement:
        '팔꿈치를 뒤로 보내 손을 몸 가까이 당겨요. 몸은 그대로 두고 팔을 천천히 펴서 돌아와요.',
      check: '손목을 접지 않고 팔꿈치를 이끌어 보세요. 돌아올 때도 팔을 천천히 펴요.',
    },
  },
  {
    ids: ['original-mat-heel-slide'],
    note: {
      benefit: '뒤꿈치를 밀어 다리를 펼 때 배와 골반이 가만히 있는지 느껴 봐요.',
      setup: '등을 대고 누워 무릎을 세우고 한쪽 뒤꿈치를 바닥에 가볍게 둬요.',
      movement: '뒤꿈치를 멀리 밀어 무릎을 편 뒤, 같은 길을 따라 발을 끌어와요. 반대쪽도 해 봐요.',
      check: '뒤꿈치가 바닥을 스치게 밀어요. 허리가 들리기 전까지만 갔다가 같은 길로 돌아와요.',
    },
  },
  {
    ids: [
      'original-cadillac-table-knee-fold',
      'original-mat-knee-fold',
      'world-mat-toe-taps',
      'world-mat-roller-marching',
    ],
    note: {
      benefit: '한 발씩 움직일 때 몸통의 무게가 한쪽으로 쏠리지 않게 잡는 연습이에요.',
      setup: '등을 대고 누워 무릎을 굽혀요. 양쪽 골반의 높이를 먼저 느껴 봐요.',
      movement: '골반을 두고 한 발씩 들어 올리거나 내려요. 한쪽을 마친 뒤 다른 쪽으로 바꿔요.',
      check: '발이 떨어지기 직전에 잠깐 멈춰 보세요. 골반이 기울면 발을 조금만 들어도 좋아요.',
    },
  },
  {
    ids: ['original-chair-seated-knee-lift'],
    note: {
      benefit: '한 발씩 움직일 때 몸통의 무게가 한쪽으로 쏠리지 않게 잡는 연습이에요.',
      setup: '체어에 허리를 편하게 세워 앉고 양발을 바닥에 두세요.',
      movement: '한쪽 무릎을 살짝 들어 발을 떼었다가 천천히 내려요. 반대쪽도 해 봐요.',
      check: '발이 떨어지기 직전에 잠깐 멈춰 보세요. 골반이 기울면 발을 조금만 들어도 좋아요.',
    },
  },
  {
    ids: [
      'original-barrel-standing-rotation',
      'original-chair-seated-spine-twist',
      'original-cadillac-seated-rotation',
      'world-mat-spine-twist-classic',
      'world-reformer-reformer-kneeling-spine-twist',
      'world-mat-yogablock-seated-posture-twist',
    ],
    note: {
      benefit: '골반을 두고 가슴을 돌리면서 옆구리와 등 윗부분이 함께 움직이게 해요.',
      setup: '발과 골반이 움직이지 않게 받치고 척추를 길게 세워요.',
      movement: '가슴을 한쪽으로 조금 돌린 뒤 정면으로 돌아와요. 반대 방향도 같은 크기로 해 봐요.',
      check: '고개만 먼저 돌리지 않고 가슴이 향하는 쪽으로 시선을 따라 보내요.',
    },
  },
  {
    ids: ['original-reformer-side-lying-press'],
    note: {
      benefit: '옆으로 누워 발로 밀면서 허벅지와 엉덩이로 힘을 내는 연습이에요.',
      setup: '리포머에 옆으로 누워 머리를 받치고 양쪽 골반을 포개요. 발을 바에 안정되게 대요.',
      movement: '발로 바를 밀어 판을 조금 보낸 뒤 무릎을 굽혀 천천히 끌어와요.',
      check: '위쪽 골반이 뒤로 넘어가지 않게 포개 두고, 무릎을 천천히 굽혀 돌아와요.',
    },
  },
  {
    ids: [
      'original-cadillac-seated-roll-back',
      'expanded-mat-half-roll-back',
      'crawled-barrel-shortbox-roundback',
      'world-mat-miniball-seated-c-curve',
    ],
    note: {
      benefit:
        '골반부터 뒤로 말며 배에 힘이 들어오는 지점을 찾아요. 앉은 자세로 돌아올 때도 그 힘을 써요.',
      setup: '발과 엉덩이를 안정되게 받치고 앉아요. 발이 뜨지 않는지 확인해요.',
      movement: '상체를 뒤로 조금 기울여요. 배에 힘이 느껴지는 곳에서 잠시 멈췄다가 다시 앉아요.',
      check: '어깨를 으쓱하지 않고, 발이 들뜨기 직전에 멈춰서 천천히 돌아와요.',
    },
  },
  {
    ids: ['original-barrel-standing-hip-extension'],
    note: {
      benefit: '다리를 뒤로 보낼 때 엉덩이 뒤쪽에 힘을 쓰고 허리를 길게 유지하는 연습이에요.',
      setup: '바렐 옆 바닥에 서서 고정된 곳을 짚고 한 발에 체중을 실어요.',
      movement:
        '반대 발끝을 바닥 위로 쓸듯이 뒤로 보냈다가 천천히 가져와요. 골반은 앞을 향해 둬요.',
      check:
        '허리가 꺾이기 시작하면 다리를 조금 낮춰요. 발끝보다 허벅지가 뒤로 간다고 생각해 보세요.',
    },
  },
  {
    ids: ['original-reformer-box-swan-prep', 'world-reformer-shortbox-swan'],
    note: {
      benefit: '가슴을 앞쪽으로 길게 뻗으며 등 윗부분을 펴는 힘을 길러요.',
      setup: '리포머 박스에 엎드려 골반과 몸통을 받치고 강사와 발이 놓일 자리를 맞춰요.',
      movement: '정수리를 앞으로 길게 보내며 가슴을 조금 들어요. 박스에 가슴을 조용히 내려놔요.',
      check:
        '턱을 들어 올리기보다 정수리를 멀리 보내요. 허리 한곳이 접히는 느낌이 들면 높이를 낮춰요.',
    },
  },
  {
    ids: [
      'original-mat-chest-lift',
      'world-mat-miniball-thoracic-curl',
      'world-mat-bosu-supine-crunch',
      'world-barrel-spine-corrector-chest-lift',
    ],
    note: {
      benefit: '배 앞쪽에 힘을 주면서 머리와 가슴을 함께 드는 동작이에요.',
      setup: '등을 대고 누워 시작해요. 손으로 머리를 편하게 받칠 수 있어요.',
      movement:
        '턱을 조금 당기고 갈비뼈를 골반 쪽으로 모으며 머리와 가슴을 함께 들어요. 등을 천천히 내려놔요.',
      check: '턱 밑에 작은 공간을 두고, 손으로 머리를 끌어당기지 않는 높이까지만 올라와요.',
    },
  },
  {
    ids: ['original-cadillac-arm-spring-press', 'world-cadillac-rollback-supine-lat-press'],
    note: {
      benefit: '팔을 몸 옆으로 당기면서 팔 뒤쪽과 겨드랑이 아래의 힘을 느껴요.',
      setup: '기구 위에 등을 대고 누워 바나 손잡이를 잡아요. 강사와 시작 위치를 맞춰요.',
      movement: '팔을 허벅지 쪽으로 길게 보내며 눌렀다가 스프링에 끌려가지 않게 천천히 돌아와요.',
      check: '손을 멀리 보내려다 어깨가 들뜨면 손이 오가는 거리를 조금 줄여요.',
    },
  },
  {
    ids: ['original-barrel-standing-side-reach'],
    note: {
      benefit: '다리를 옆으로 움직일 때 엉덩이 옆쪽이 다리 무게를 받치는 느낌을 익혀요.',
      setup: '바렐 옆에서 고정된 곳을 잡고 양발을 나란히 놓아요.',
      movement: '한 발을 옆으로 길게 뻗었다가 같은 길로 모아요. 발이 닿으면 반대쪽도 해 보세요.',
      check: '다리를 더 멀리 보내려다 몸통까지 기울지 않도록 움직임을 작게 시작해요.',
    },
  },
  {
    ids: ['original-reformer-strap-frog', 'world-cadillac-legsprings-frog'],
    note: {
      benefit: '두 다리를 개구리처럼 접었다 펴면서 허벅지 안쪽과 뒤쪽을 함께 써요.',
      setup: '누워 두 발을 줄에 걸고 강사와 고정을 확인해요. 무릎을 굽히고 뒤꿈치를 가까이 둬요.',
      movement: '발로 줄을 밀어 다리를 길게 펴요. 무릎을 다시 천천히 접어 시작 자리로 돌아와요.',
      check: '발에 닿는 줄의 당김이 양쪽에서 비슷한지 느끼면서 무릎을 천천히 접어요.',
    },
  },
  {
    ids: [
      'original-mat-single-leg-stretch',
      'world-mat-single-straight-leg-stretch',
      'world-mat-double-straight-leg-stretch',
      'world-mat-miniball-sacrum-scissors',
      'world-reformer-reformer-straps-leg-lowers',
      'world-reformer-reformer-straps-scissors-beats',
      'world-cadillac-legsprings-walking',
      'world-cadillac-legsprings-scissors',
      'world-barrel-spine-corrector-scissors',
    ],
    note: {
      benefit: '누워서 다리를 뻗을 때 배가 다리 무게를 받치고 허리가 편안하게 남는 범위를 익혀요.',
      setup:
        '등을 대고 누워 골반이 편한 곳에 놓이게 하고 다리를 들어요. 발에 줄을 쓰는 경우 고정을 확인해요.',
      movement:
        '배로 몸통을 받치며 다리를 뻗었다가 천천히 되돌려요. 번갈아 움직이는 동작에서는 양쪽의 속도를 맞춰요.',
      check: '다리를 낮췄을 때 허리가 갑자기 뜨면 다리를 조금 높여 보세요.',
    },
  },
  {
    ids: [
      'original-chair-sit-to-stand',
      'world-mat-standing-pilates-squat',
      'world-mat-bosu-balance-squat',
      'world-cadillac-pushthrough-standing-squat',
      'world-chair-chair-single-leg-squat',
      'world-reformer-fusion-barre-footbar-plie-pulse',
      'world-cadillac-fusion-barre-cadillac-plie-releve',
      'world-chair-fusion-barre-chair-plie-heel-lift',
      'world-mat-fusion-barre-mat-wide-plie-arms',
    ],
    note: {
      benefit: '무릎과 엉덩이를 함께 접었다 펴며 앉고 일어설 때 필요한 다리 힘을 길러요.',
      setup:
        '발밑과 필요한 지지대를 먼저 확인해요. 서거나 앉은 시작 자세에서 발끝과 무릎 방향을 맞춰요.',
      movement: '엉덩이와 무릎을 접어 몸을 낮춘 뒤 발로 지지면을 눌러 일어나요.',
      check: '무릎을 발끝과 같은 쪽으로 보내고, 다시 설 때 발바닥으로 지지하는 곳을 눌러요.',
    },
  },
  {
    ids: ['original-barrel-supported-swan', 'world-barrel-barrel-prone-swan-prep'],
    note: {
      benefit: '가슴을 앞쪽으로 길게 뻗으며 등 윗부분을 펴는 힘을 길러요.',
      setup: '발을 사다리에 안정되게 받치고 바렐 곡면에 아랫배와 골반을 기대 엎드려요.',
      movement:
        '가슴을 앞으로 뻗으며 조금 들어 올려요. 윗등에 힘이 들어오는 걸 느끼며 천천히 내려와요.',
      check:
        '턱을 들어 올리기보다 정수리를 멀리 보내요. 허리 한곳이 접히는 느낌이 들면 높이를 낮춰요.',
    },
  },
  {
    ids: [
      'original-cadillac-side-leg-reach',
      'original-mat-side-leg-lift',
      'expanded-cadillac-side-leg-springs-up-down',
      'world-barrel-barrel-side-leg-lift',
      'world-barrel-spine-corrector-side-leg-lift',
    ],
    note: {
      benefit: '다리를 옆으로 움직일 때 엉덩이 옆쪽이 다리 무게를 받치는 느낌을 익혀요.',
      setup: '옆으로 누워 머리를 받치고 양쪽 골반을 포개요.',
      movement: '위쪽 다리를 몸과 나란히 길게 뻗었다가 천천히 내려요. 골반을 뒤로 넘기지 않아요.',
      check: '다리를 더 멀리 보내려다 몸통까지 기울지 않도록 움직임을 작게 시작해요.',
    },
  },
  {
    ids: [
      'original-barrel-supported-side-bend',
      'original-barrel-standing-side-stretch',
      'original-cadillac-seated-side-reach',
      'original-chair-seated-mermaid',
      'original-mat-mermaid',
      'ex-cooldown-01',
      'expanded-cadillac-kneeling-side-bend',
      'expanded-chair-mermaid-kneeling',
      'crawled-barrel-side-over-opc',
      'world-reformer-reformer-kneeling-mermaid',
      'world-cadillac-pushthrough-mermaid',
      'world-chair-chair-standing-mermaid',
      'world-barrel-spine-corrector-mermaid',
    ],
    note: {
      benefit: '몸통을 옆으로 기울여 평소 잘 펴지 않는 옆구리와 갈비뼈 사이를 늘여요.',
      setup: '바닥이나 기구에 닿는 곳을 안정시키고 어깨를 편하게 둬요.',
      movement:
        '한 팔을 머리 너머로 길게 보내면서 몸통을 옆으로 기울여요. 옆구리를 길게 편 채 천천히 돌아와요.',
      check:
        '위쪽 어깨가 귀를 덮지 않게 팔을 멀리 보내요. 옆구리가 편안히 늘어나는 곳에서 숨을 쉬어요.',
    },
  },
  {
    ids: ['original-cadillac-quadruped-slide', 'original-mat-quadruped-reach'],
    note: {
      benefit: '팔다리를 길게 뻗으면서 배와 등으로 몸통이 흔들리지 않게 받치는 연습이에요.',
      setup: '손과 무릎을 짚고 네발기기 자세에서 등을 편하게 둬요.',
      movement:
        '한 손이나 발을 지지면을 따라 멀리 밀었다가 원래 자리에 가져와요. 양쪽을 번갈아 봐요.',
      check: '멀리 뻗는 쪽으로 몸까지 쏠리면 팔이나 다리가 오가는 거리를 줄여요.',
    },
  },
  {
    ids: ['original-chair-incline-support'],
    note: {
      benefit: '팔로 몸을 받치면서 배와 엉덩이가 몸통을 곧게 유지하도록 연습해요.',
      setup: '강사가 확인한 움직이지 않는 체어 좌면에 손을 두고 발을 조금 뒤로 보내요.',
      movement:
        '팔로 좌면을 밀어 몸통을 비스듬히 받쳐요. 숨을 편하게 몇 번 쉰 뒤 한 발씩 다가와 일어서요.',
      check: '받치는 팔로 바닥이나 기구를 살짝 밀어요. 몸통이 처지기 전에 짧게 쉬었다가 다시 해요.',
    },
  },
  {
    ids: ['original-cadillac-prone-back-reach'],
    note: {
      benefit: '가슴을 앞쪽으로 길게 뻗으며 등 윗부분을 펴는 힘을 길러요.',
      setup: '캐딜락 테이블에 엎드려 팔을 편하게 두고 다리를 길게 뻗어요.',
      movement:
        '가슴을 앞쪽으로 길게 보내며 조금만 들어요. 턱을 치켜들지 말고 가슴을 다시 테이블에 내려놔요.',
      check:
        '턱을 들어 올리기보다 정수리를 멀리 보내요. 허리 한곳이 접히는 느낌이 들면 높이를 낮춰요.',
    },
  },
  {
    ids: [
      'original-chair-seated-back-reach',
      'crawled-barrel-arc-thoracic-opener',
      'world-chair-chair-reverse-swan',
      'world-barrel-barrel-layback-stretch',
      'world-barrel-arc-barrel-thoracic-extension',
      'world-barrel-barrel-chest-opener-kneeling',
    ],
    note: {
      benefit: '가슴 앞을 펴면서 등이 뒤로 기울어지는 범위를 천천히 찾아요.',
      setup: '등이나 골반을 받치거나 바를 잡아 출발 자세에서 중심을 잡아요.',
      movement: '가슴 앞을 위로 길게 열었다가 갈비뼈와 골반을 다시 편한 자리에 놓아요.',
      check:
        '턱부터 젖히지 않고 가슴 앞면을 먼저 길게 펴요. 목을 편안하게 둘 수 있는 곳에서 멈춰요.',
    },
  },
  {
    ids: [
      'original-mat-clam',
      'world-reformer-reformer-side-lying-clam',
      'world-cadillac-legsprings-side-clam',
      'world-mat-fusion-athletic-loopband-clamshell',
    ],
    note: {
      benefit: '발을 모은 채 위쪽 무릎을 열어 엉덩이 옆쪽에 힘을 주는 연습이에요.',
      setup: '옆으로 누워 무릎을 굽히고 두 발을 가볍게 맞대요.',
      movement: '위쪽 무릎만 열었다가 천천히 닫아요. 골반이 뒤로 넘어가기 전에 멈춰요.',
      check: '양쪽 골반을 포개 두세요. 골반이 뒤로 넘어가기 직전까지만 무릎을 열어요.',
    },
  },
  {
    ids: ['original-mat-forearm-plank'],
    note: {
      benefit: '팔로 몸을 받치면서 배와 엉덩이가 몸통을 곧게 유지하도록 연습해요.',
      setup: '매트에 팔꿈치와 무릎을 대고 팔꿈치를 어깨 아래에 둬요.',
      movement:
        '팔뚝과 무릎으로 매트를 눌러 몸통을 길게 들어요. 잠깐 숨을 쉰 다음 골반을 내려 쉬어요.',
      check: '받치는 팔로 바닥이나 기구를 살짝 밀어요. 몸통이 처지기 전에 짧게 쉬었다가 다시 해요.',
    },
  },
  {
    ids: ['original-mat-swan-prep'],
    note: {
      benefit: '가슴을 앞쪽으로 길게 뻗으며 등 윗부분을 펴는 힘을 길러요.',
      setup: '매트에 엎드려 팔을 편하게 두고 정수리를 앞쪽으로 길게 뻗어요.',
      movement:
        '가슴을 앞으로 밀어내듯 상체를 조금 들어요. 목 뒤를 길게 둔 채 가슴부터 천천히 내려와요.',
      check:
        '턱을 들어 올리기보다 정수리를 멀리 보내요. 허리 한곳이 접히는 느낌이 들면 높이를 낮춰요.',
    },
  },
  {
    ids: [
      'original-mat-swimming-prep',
      'expanded-mat-swimming',
      'expanded-barrel-swimming',
      'world-reformer-longbox-swimming',
      'world-barrel-spine-corrector-swimming',
    ],
    note: {
      benefit: '팔다리를 길게 뻗으면서 배와 등으로 몸통이 흔들리지 않게 받치는 연습이에요.',
      setup: '엎드려 배와 골반을 편하게 받치고 팔과 다리를 길게 뻗어요.',
      movement:
        '팔이나 다리를 멀리 보냈다가 낮춰요. 교대로 움직일 때 몸통이 들썩이지 않게 작게 시작해요.',
      check: '멀리 뻗는 쪽으로 몸까지 쏠리면 팔이나 다리가 오가는 거리를 줄여요.',
    },
  },
  {
    ids: ['original-mat-open-book'],
    note: {
      benefit: '가슴과 등 윗부분을 돌려 양쪽의 움직임이 어떻게 다른지 느껴 봐요.',
      setup: '옆으로 누워 무릎을 포개고 두 팔을 가슴 앞에 모아요.',
      movement: '책장을 열듯 위쪽 팔과 가슴을 뒤로 천천히 열었다가 두 손을 다시 포개요.',
      check:
        '팔을 더 멀리 보내려다 골반이 들리면 조금 돌아와요. 눈은 가슴이 돌아가는 쪽을 따라가요.',
    },
  },
  {
    ids: ['ex-warmup-01'],
    note: {
      benefit:
        '골반을 여러 방향으로 조금씩 기울이면서 허리가 바닥에 닿는 느낌이 어떻게 바뀌는지 살펴봐요.',
      setup: '등을 대고 누워 무릎을 세워요. 두 발바닥을 편하게 붙여요.',
      movement:
        '골반을 배꼽 쪽으로 작게 굴렸다 발 쪽으로 되돌려요. 골반 시계에서는 좌우도 움직여 본 뒤 작은 원으로 이어가요.',
      check:
        '골반 위에 시계가 있다고 생각해 보세요. 머리 쪽이 열두 시, 발 쪽이 여섯 시예요. 먼저 그 두 방향만 작게 오가요.',
    },
  },
  {
    ids: [
      'ex-warmup-02',
      'world-cadillac-pushthrough-cat-stretch',
      'world-chair-chair-kneeling-cat',
    ],
    note: {
      benefit: '등을 둥글게 말았다 펴며 척추가 차례로 움직이는 감각을 익혀요.',
      setup: '손, 발이나 무릎이 몸을 받치는 자리를 확인해요. 바를 쓰면 안전장치를 먼저 확인해요.',
      movement: '골반에서 시작해 등을 둥글게 말아요. 천천히 등을 다시 길게 펴면서 가슴을 열어요.',
      check: '고개만 움직이지 않게 골반과 등 가운데의 움직임에도 주의를 기울여 보세요.',
    },
  },
  {
    ids: ['ex-warmup-03'],
    note: {
      benefit: '폼롤러에 등을 기대고 팔을 움직이면서 가슴 앞과 등 윗부분을 편안하게 펴요.',
      setup: '폼롤러를 척추와 나란히 두고 뒤통수와 골반이 편하게 받쳐지도록 누워요.',
      movement:
        '두 팔을 천장으로 뻗고 편안한 크기의 원을 그려요. 갈비뼈가 들뜨기 전에 팔을 되돌려요.',
      check: '갈비뼈가 크게 들릴 만큼 팔을 넘기지 않아도 돼요. 숨이 편하게 이어지는 곳까지 뻗어요.',
    },
  },
  {
    ids: ['ex-footwork-01'],
    note: {
      benefit: '발로 바를 밀고 뒤꿈치를 움직이면서 허벅지와 종아리에 차례로 힘을 실어요.',
      setup: '리포머에 누워 해당 동작에 맞는 위치에 발을 대요. 바와 스프링은 강사와 맞춰요.',
      movement: '발로 바를 밀어 움직이는 판을 보내고, 무릎을 굽히면서 천천히 돌아와요.',
      check: '바를 밀 때는 무릎 방향을, 뒤꿈치를 내릴 때는 발목이 기울지 않는지 살펴보세요.',
    },
  },
  {
    ids: ['ex-footwork-02'],
    note: {
      benefit: '다리를 넓게 두고 링을 이용해 무릎이 어느 쪽으로 움직이는지 느끼며 발로 밀어요.',
      setup: '리포머에 누워 해당 동작에 맞는 위치에 발을 대요. 바와 스프링은 강사와 맞춰요.',
      movement: '발로 바를 밀어 움직이는 판을 보내고, 무릎을 굽히면서 천천히 돌아와요.',
      check: '링을 세게 누르려고 무릎을 비틀지 말고 발끝과 무릎의 방향을 맞춰요.',
    },
  },
  {
    ids: ['ex-bridging-01'],
    note: {
      benefit: '골반을 들어 둔 채 무릎을 움직여 엉덩이와 허벅지 뒤가 몸을 받쳐 주도록 연습해요.',
      setup: '리포머에 누워 머리 받침을 평평하게 내리고 발을 바에 대요.',
      movement: '발로 바를 눌러 골반을 조금 들어요. 움직이는 판을 조절하며 등부터 천천히 내려와요.',
      check: '다리가 움직일 때 골반이 먼저 떨어지면 이동 거리를 짧게 해요.',
    },
  },
  {
    ids: [
      'ex-bridging-02',
      'crawled-cadillac-tower-prep',
      'crawled-cadillac-rolling-stomach-massage',
      'world-cadillac-pushthrough-single-leg-tower',
      'world-cadillac-pushthrough-parakeet',
    ],
    note: {
      benefit:
        '기구에 발을 대고 골반을 들어 올리며 다리로 미는 힘과 등을 차례로 내리는 움직임을 연결해요.',
      setup: '캐딜락에 누워 강사의 보조를 받아 발을 바에 대요. 바와 안전 스트랩의 고정을 확인해요.',
      movement:
        '발로 바를 받치면서 골반을 조금 들어요. 바가 튀지 않게 끝까지 따라가며 등을 차례로 내려요.',
      check: '시작 전에 강사와 바와 스프링을 확인해요. 움직이는 동안 머리는 정면에 두세요.',
    },
  },
  {
    ids: [
      'ex-core-01',
      'expanded-mat-hundred',
      'world-mat-circle-supine-hundred',
      'world-reformer-reformer-hundred-classic',
      'world-barrel-arc-barrel-hundred',
    ],
    note: {
      benefit: '팔을 작게 위아래로 움직이면서도 배에 힘을 유지하고 일정하게 숨 쉬는 연습이에요.',
      setup: '등을 받치고 누워 다리를 편안한 높이에 둬요. 양팔을 몸 옆으로 뻗어요.',
      movement:
        '손바닥으로 공기를 가볍게 누르듯 팔을 작게 위아래로 움직여요. 팔을 멈춘 뒤 머리와 다리를 내려요.',
      check: '팔은 몸 가까이에서 가볍게 흔들어요. 목에 힘이 몰리면 머리를 받치거나 내려놓아요.',
    },
  },
  {
    ids: ['ex-core-02'],
    note: {
      benefit: '앉은 자리에서 몸을 기울일 때 배와 옆구리가 상체의 무게를 받치는 느낌을 익혀요.',
      setup: '리포머의 짧은 박스 위에 앉아 양발을 줄에 걸고 중심을 잡아요.',
      movement:
        '먼저 등을 둥글게 말아 뒤로 기울었다 일어나요. 익숙해지면 등을 편 채 기울기, 가슴 돌리기를 따로 연습해요.',
      check: '발이 고정되는지 먼저 확인해요. 몸을 다시 세울 힘이 남아 있는 곳까지만 기울여요.',
    },
  },
  {
    ids: [
      'ex-core-03',
      'crawled-reformer-backstroke-longbox',
      'crawled-reformer-arms-in-straps-coordination',
      'world-mat-dead-bug-core',
      'world-mat-roller-dead-bug',
    ],
    note: {
      benefit: '누워서 팔과 다리를 움직이는 동안 배에 힘을 주고 골반을 안정시키는 연습이에요.',
      setup: '등을 받치고 누워 팔과 무릎을 몸 가까이 가져와요.',
      movement:
        '골반을 가만히 두고 팔과 다리를 뻗었다가 천천히 접어 돌아와요. 허리가 편안한 거리를 골라요.',
      check: '팔다리를 멀리 뻗기 전에 숨이 이어지는지 확인해요. 허리가 뜨면 덜 뻗어요.',
    },
  },
  {
    ids: [
      'ex-upper-01',
      'ex-upper-02',
      'ex-kr-reformer-03',
      'expanded-reformer-rowing-sternum',
      'expanded-reformer-rowing-90',
      'expanded-reformer-rowing-from-chest',
      'expanded-reformer-rowing-from-hips',
      'world-reformer-seated-offering',
    ],
    note: {
      benefit: '줄을 잡고 팔을 움직일 때 몸이 같이 끌려가지 않도록 등과 배로 중심을 잡아요.',
      setup: '몸통을 세워 앉거나 무릎으로 서서 손잡이를 잡아요. 움직이는 판부터 안정시켜요.',
      movement:
        '줄이 팽팽해지는 방향으로 팔을 움직이고, 팔꿈치를 천천히 굽혀 시작 위치로 돌아와요.',
      check: '손이 먼저 멀리 가기보다 가슴을 편안히 세워 두고 팔이 돌아오는 길까지 따라와요.',
    },
  },
  {
    ids: [
      'ex-upper-03',
      'world-reformer-seated-draw-a-sword',
      'world-cadillac-armsprings-boxing',
      'world-cadillac-armsprings-draw-a-sword',
    ],
    note: {
      benefit: '한 팔을 앞으로 또는 비스듬히 뻗으며 몸통의 중심을 잡고 어깨로 힘을 전달해요.',
      setup: '손잡이를 잡고 몸통을 세운 뒤 발이나 무릎으로 중심을 잡아요.',
      movement:
        '동작에 맞춰 한 팔을 앞으로 또는 비스듬히 뻗어요. 줄의 당김을 따라 천천히 되돌려요.',
      check: '손목을 팔과 나란히 두고, 발바닥이 들릴 만큼 멀리 뻗지 않아요.',
    },
  },
  {
    ids: ['ex-lower-01'],
    note: {
      benefit: '앞뒤로 발을 나누고 한쪽 다리에 체중을 실어 엉덩이와 허벅지 힘을 길러요.',
      setup:
        '리포머 옆 바닥에 한 발을 딛고 다른 발을 움직이는 판에 놓아요. 바를 짚고 중심부터 잡아요.',
      movement: '바닥 쪽 무릎은 살짝 굽혀 두고 반대 발로 판을 뒤로 밀었다가 천천히 끌어와요.',
      check: '앞 무릎이 발 안쪽으로 무너지지 않는 거리를 찾아요. 돌아올 때도 앞발을 고르게 눌러요.',
    },
  },
  {
    ids: [
      'ex-lower-02',
      'world-reformer-reformer-skating',
      'world-reformer-reformer-side-splits-heavy',
      'world-reformer-reformer-side-splits-light',
    ],
    note: {
      benefit: '다리를 옆으로 벌렸다 모을 때 엉덩이 옆쪽과 허벅지 안쪽을 고르게 쓰는 연습이에요.',
      setup: '움직이는 판과 고정된 곳을 구별하고 강사와 발 또는 무릎이 놓일 자리를 확인해요.',
      movement:
        '한쪽에 무게를 싣고 판을 조금 보낸 뒤 천천히 끌어와요. 양쪽을 바꾸기 전에는 판부터 멈춰요.',
      check:
        '다시 모을 수 있는 거리까지만 벌려요. 움직이는 판이 제자리로 돌아올 때까지 천천히 속도를 줄여요.',
    },
  },
  {
    ids: [
      'ex-lower-03',
      'crawled-chair-going-up-front',
      'crawled-chair-going-up-side',
      'world-chair-chair-backward-step-down',
      'world-chair-chair-crossover-step-up',
    ],
    note: {
      benefit: '한 발로 몸을 밀어 계단을 오르내릴 때처럼 허벅지와 엉덩이로 체중을 받쳐요.',
      setup: '강사의 보조를 받아 발판에 한 발을 두고 페달에 다른 발을 대요.',
      movement: '지지하는 쪽 발로 몸을 천천히 밀어 올렸다가 무릎을 굽혀 같은 길로 내려와요.',
      check:
        '발판과 페달을 강사와 먼저 확인해요. 내려올 때 몸이 툭 떨어지지 않게 지지하는 발을 끝까지 눌러요.',
    },
  },
  {
    ids: [
      'ex-plank-01',
      'expanded-reformer-elephant',
      'expanded-reformer-up-stretch',
      'expanded-reformer-single-leg-elephant',
      'crawled-reformer-knee-stretches-round',
      'crawled-reformer-knee-stretches-knees-off',
      'world-reformer-reformer-knee-stretch-flat',
      'world-reformer-reformer-reverse-elephant',
    ],
    note: {
      benefit: '손을 짚고 다리로 움직이는 판을 밀고 당기며 어깨와 배로 몸통을 받쳐요.',
      setup: '강사와 손과 발 또는 무릎이 놓일 자리를 확인하고, 팔로 상체를 받쳐요.',
      movement:
        '몸통을 받친 상태에서 다리로 판을 조금 밀었다가 다시 가까이 가져와요. 판이 멎은 뒤 내려와요.',
      check: '판을 멀리 보내기보다 돌아오는 마지막까지 같은 속도로 움직여 보세요.',
    },
  },
  {
    ids: [
      'ex-plank-02',
      'ex-kr-chair-01',
      'expanded-chair-side-pull-up',
      'crawled-reformer-tendon-stretch',
      'crawled-chair-pull-up-hamstring3',
      'world-chair-chair-tendon-stretch',
      'world-chair-chair-side-pullup-twist',
    ],
    note: {
      benefit: '손과 발로 기구를 밀면서 아랫배의 힘으로 골반을 들어 올리는 동작이에요.',
      setup: '강사가 보조하는 상태에서 손과 발로 기구를 받쳐요. 미리 내려올 방법을 확인해요.',
      movement:
        '팔로 받친 채 골반을 들어 몸을 접어요. 배에 힘을 유지하면서 천천히 출발 높이로 내려와요.',
      check:
        '짚고 있는 손으로 지지면을 눌러 어깨 사이가 푹 꺼지지 않게 해요. 기구가 급하게 돌아오지 않게 천천히 내려와요.',
    },
  },
  {
    ids: [
      'ex-extension-01',
      'world-reformer-longbox-pulling-straps-plow',
      'world-reformer-longbox-pulling-straps-t',
    ],
    note: {
      benefit: '엎드려 줄을 당기며 등과 팔 뒤쪽으로 가슴을 길게 펴는 힘을 길러요.',
      setup: '긴 박스 위에 엎드려 몸통을 받치고 손으로 줄을 잡아요.',
      movement:
        '팔을 몸 옆이나 옆으로 길게 보내며 가슴을 조금 들어요. 팔과 가슴을 천천히 되돌려요.',
      check: '손을 엉덩이 쪽으로 보내도 목이 짧아지지 않는지 살펴봐요.',
    },
  },
  {
    ids: [
      'ex-extension-02',
      'crawled-barrel-swan-dive-full',
      'world-mat-swan-dive',
      'world-reformer-longbox-swan-dive',
    ],
    note: {
      benefit: '몸 앞면으로 지지하면서 가슴과 다리를 길게 뻗어 몸 뒤쪽으로 중심을 잡는 동작이에요.',
      setup: '엎드려 몸 앞면을 받치고 발끝과 정수리를 서로 멀리 보내요.',
      movement:
        '가슴과 허벅지를 길게 뻗어 몸 앞면으로 균형을 잡아요. 크게 흔들지 않고 천천히 지지면으로 돌아와요.',
      check: '가슴을 들 때 목을 꺾지 않고 앞쪽으로 길게 뻗어요. 반동을 작게 시작하세요.',
    },
  },
  {
    ids: [
      'ex-straps-01',
      'ex-straps-02',
      'world-cadillac-legsprings-circles',
      'world-barrel-spine-corrector-leg-circles',
    ],
    note: {
      benefit: '두 다리가 그리는 길을 조절하면서 골반이 함께 흔들리지 않는 범위를 익혀요.',
      setup: '등을 받치고 누워 발에 거는 줄이나 손으로 잡을 곳을 강사와 확인해요.',
      movement:
        '두 다리를 들어 편한 크기의 원을 그리거나 접었다 펴요. 다리를 모아 멈춘 다음 천천히 내려요.',
      check: '다리가 아래로 내려갈 때 허리가 뜨지 않는 크기부터 시작해요.',
    },
  },
  {
    ids: [
      'ex-cooldown-02',
      'crawled-mat-spine-stretch-forward',
      'crawled-chair-spine-stretch-forward',
      'world-mat-theraband-assisted-rolldown',
      'world-cadillac-pushthrough-seated-forward',
      'world-cadillac-cadillac-standing-rolldown',
      'world-barrel-barrel-standing-rolldown',
    ],
    note: {
      benefit: '등을 천천히 둥글게 말았다가 다시 세우며 등이 어느 부분부터 움직이는지 느껴 봐요.',
      setup: '발이나 엉덩이를 편안하게 받치고 팔과 목의 힘을 풀어요.',
      movement:
        '고개를 살짝 숙여 등 위쪽부터 천천히 말아요. 몸이 편하게 내려가는 곳에서 멈췄다가 다시 세워요.',
      check:
        '팔과 목의 힘을 덜고 편하게 닿는 곳까지만 내려가요. 돌아올 때도 급하게 고개부터 들지 않아요.',
    },
  },
  {
    ids: [
      'ex-core-04',
      'world-mat-inverted-v-pike',
      'world-mat-roller-kneeling-rollout',
      'world-mat-sliders-core-pike',
    ],
    note: {
      benefit: '팔로 몸을 받치고 배에 힘을 주어 다리와 몸통 사이를 가까이 가져오는 연습이에요.',
      setup: '손이나 팔꿈치로 몸을 받치고 다리나 무릎이 움직일 자리를 확인해요.',
      movement: '배에 힘을 주어 다리와 몸통을 가까이 가져온 뒤 천천히 처음 거리로 돌아가요.',
      check: '다리가 가까워질 때 어깨가 귀 쪽으로 올라오지 않게 지지하는 곳을 가볍게 밀어요.',
    },
  },
  {
    ids: [
      'ex-lower-04',
      'expanded-mat-single-leg-circle',
      'expanded-mat-hip-circles',
      'world-mat-side-kick-ronde-de-jambe',
      'world-mat-theraband-leg-circles',
      'world-reformer-reformer-side-lying-circles',
      'world-cadillac-legsprings-side-circles',
      'world-barrel-barrel-side-leg-circles',
    ],
    note: {
      benefit:
        '다리로 원을 그리며 골반을 흔들지 않고 허벅지를 여러 방향으로 움직이는 감각을 익혀요.',
      setup: '몸통과 골반이 흔들리지 않게 받치고 움직일 다리를 길게 뻗어요.',
      movement: '발끝으로 작은 원을 그려요. 원이 닫히는 자리에서 잠시 멈추고 방향을 바꿔 보세요.',
      check: '원이 커질수록 몸통이 따라간다면 크기를 줄여요. 돌아오는 반원도 같은 속도로 그려요.',
    },
  },
  {
    ids: ['ex-kr-reformer-01'],
    note: {
      benefit: '발로 바를 밀고 이어서 엉덩이를 들며 다리 앞과 뒤를 번갈아 쓰는 흐름이에요.',
      setup: '리포머에 누워 두 발을 바에 대요. 다리를 펴 판을 밀었다가 무릎을 굽혀 돌아와요.',
      movement:
        '판을 멈추고 머리 받침을 평평하게 내린 다음, 발로 바를 눌러 골반을 들어요. 등부터 천천히 내려요.',
      check: '발로 미는 동작을 마치고 판이 멎은 다음, 다음 자세에 맞춰 발과 머리 받침을 확인해요.',
    },
  },
  {
    ids: [
      'ex-kr-cadillac-01',
      'crawled-cadillac-teaser-pushthrough',
      'world-cadillac-cadillac-teaser-top-rollup',
    ],
    note: {
      benefit: '바의 도움을 받아 등을 말아 상체를 일으키고 배의 힘으로 균형을 잡는 흐름이에요.',
      setup: '캐딜락에 누워 강사의 보조를 받아 바를 잡고 어깨를 편하게 둬요.',
      movement:
        '바를 따라 등을 차례로 말아 상체를 일으켜요. 균형을 확인한 뒤 등부터 천천히 내려와요.',
      check:
        '바를 놓지 않고 끝까지 함께 돌아와요. 처음에는 강사가 바를 보조하는 상태에서 연습해요.',
    },
  },
  {
    ids: ['ex-kr-reformer-02', 'world-reformer-reformer-curtsy-lunge'],
    note: {
      benefit: '앞뒤로 발을 나누고 한쪽 다리에 체중을 실어 엉덩이와 허벅지 힘을 길러요.',
      setup: '움직이는 판과 고정된 곳을 구별하고 강사와 발 또는 무릎이 놓일 자리를 확인해요.',
      movement:
        '한쪽에 무게를 싣고 판을 조금 보낸 뒤 천천히 끌어와요. 양쪽을 바꾸기 전에는 판부터 멈춰요.',
      check: '앞 무릎이 발 안쪽으로 무너지지 않는 거리를 찾아요. 돌아올 때도 앞발을 고르게 눌러요.',
    },
  },
  {
    ids: ['ex-kr-barrel-01'],
    note: {
      benefit:
        '바렐 곡면에 몸을 기대어 옆구리를 늘이고 가슴을 펴면서 몸통을 여러 방향으로 움직여요.',
      setup: '강사와 발 지지를 확인하고 바렐 옆면에 몸을 기대어 작은 공을 손에 들어요.',
      movement: '바렐을 따라 옆구리를 길게 늘인 뒤 가슴을 정면에 둔 채 다시 몸을 세워요.',
      check: '옆으로 기울이거나 가슴을 펼 때 발이 사다리에서 흔들리지 않는지 먼저 확인해요.',
    },
  },
  {
    ids: ['ex-kr-reformer-04'],
    note: {
      benefit: '여러 동작을 이어가며 팔이나 다리를 움직일 때마다 몸의 중심을 다시 잡는 연습이에요.',
      setup: '등을 대고 누워 손잡이를 잡고 골반이 편한 자리를 찾아요.',
      movement:
        '한쪽 팔과 반대쪽 다리를 멀리 보내며 배로 몸통을 받쳐요. 천천히 시작 자세로 돌아와요.',
      check: '다음 자세로 넘어가기 전에 기구가 멎었는지 확인하고 손발이 닿는 곳을 다시 잡아요.',
    },
  },
  {
    ids: ['ex-kr-cadillac-02'],
    note: {
      benefit: '두 다리가 그리는 길을 조절하면서 골반이 함께 흔들리지 않는 범위를 익혀요.',
      setup: '캐딜락에 등을 대고 누워 양발의 줄을 강사와 확인하고 무릎을 굽혀요.',
      movement:
        '뒤꿈치를 모아 앞으로 밀었다가 무릎을 접어요. 이어서 다리를 하나씩 가위처럼 바꿔요.',
      check: '다리가 아래로 내려갈 때 허리가 뜨지 않는 크기부터 시작해요.',
    },
  },
  {
    ids: ['ex-global-reformer-01'],
    note: {
      benefit: '여러 동작을 이어가며 팔이나 다리를 움직일 때마다 몸의 중심을 다시 잡는 연습이에요.',
      setup:
        '리포머에 등을 대고 누워 머리 받침을 평평하게 하고 발을 바에 놓아요. 허벅지 사이에 링을 두어요.',
      movement:
        '링을 가볍게 안고 골반을 들어요. 판을 조금 밀었다가 끌어온 뒤 등을 천천히 내려놓아요.',
      check: '다음 자세로 넘어가기 전에 기구가 멎었는지 확인하고 손발이 닿는 곳을 다시 잡아요.',
    },
  },
  {
    ids: ['ex-global-reformer-02'],
    note: {
      benefit: '등을 차례로 말았다 펴는 동안 배로 몸통의 무게를 받치는 연습이에요.',
      setup: '등을 편하게 받친 뒤 가슴과 골반이 놓인 곳을 느껴 보세요.',
      movement:
        '숨을 내쉬면서 배에 가볍게 힘을 주고 등을 차례로 말아요. 처음 자세로 천천히 돌아와요.',
      check: '등을 한꺼번에 떨어뜨리지 않도록 천천히 내려오세요.',
    },
  },
  {
    ids: ['ex-global-reformer-03'],
    note: {
      benefit: '여러 동작을 이어가며 팔이나 다리를 움직일 때마다 몸의 중심을 다시 잡는 연습이에요.',
      setup: '발과 무릎을 강사가 안내한 위치에 놓고 바를 잡아요.',
      movement:
        '판을 천천히 보내 뒤쪽 다리 앞면을 늘여요. 앞으로 무게를 옮기기 전에 움직임을 멈추고 앞다리 뒤쪽도 편하게 늘여요.',
      check: '다음 자세로 넘어가기 전에 기구가 멎었는지 확인하고 손발이 닿는 곳을 다시 잡아요.',
    },
  },
  {
    ids: ['expanded-mat-roll-up', 'crawled-mat-neck-pull', 'world-mat-circle-roll-up'],
    note: {
      benefit: '누웠다가 등을 차례로 말아 앉으며 배로 상체를 들어 올리는 힘을 길러요.',
      setup: '등을 대고 누워 다리를 길게 두고 팔을 준비해요.',
      movement:
        '머리와 가슴을 들어 등을 차례로 말아 앉아요. 골반부터 뒤로 굴려 등을 천천히 내려요.',
      check:
        '목부터 당기지 않고 갈비뼈와 골반이 가까워지는 느낌으로 올라와요. 돌아올 때도 천천히 등을 내려놓아요.',
    },
  },
  {
    ids: [
      'expanded-mat-double-leg-kick',
      'crawled-mat-single-leg-kick',
      'world-mat-prone-heel-beats',
      'world-reformer-longbox-double-leg-kick',
      'world-barrel-barrel-prone-leg-beats',
    ],
    note: {
      benefit: '엎드린 채 다리를 움직여 허벅지 뒤와 엉덩이를 쓰고 골반은 안정되게 받쳐요.',
      setup: '엎드려 골반을 받치고 무릎을 굽힐 공간을 확인해요.',
      movement:
        '뒤꿈치를 엉덩이 쪽으로 보내거나 모은 뒤 다리를 다시 길게 뻗어요. 골반은 닿은 자리에 남겨요.',
      check: '뒤꿈치를 움직일 때 골반 앞쪽이 지지면에서 번갈아 들리지 않는지 느껴 봐요.',
    },
  },
  {
    ids: [
      'expanded-mat-kneeling-side-kicks',
      'expanded-mat-side-kicks',
      'expanded-cadillac-side-leg-springs-front-back',
      'world-mat-side-kick-bicycle',
    ],
    note: {
      benefit: '옆으로 몸을 받치고 다리를 앞뒤로 움직이며 골반이 따라 흔들리지 않게 연습해요.',
      setup: '손과 무릎을 옆으로 짚거나 옆으로 누워 몸통을 받치고 다리를 길게 뻗어요.',
      movement: '뻗은 다리를 앞뒤로 오가며 천천히 움직여요. 다리를 몸과 나란히 놓아 마쳐요.',
      check: '뒤로 보내는 다리를 더 높이 들려고 허리를 꺾지 않아요. 몸통을 두고 허벅지만 움직여요.',
    },
  },
  {
    ids: ['expanded-mat-leg-pull-front'],
    note: {
      benefit: '팔로 몸을 받치면서 배와 엉덩이가 몸통을 곧게 유지하도록 연습해요.',
      setup: '매트에 손과 발을 대고 엎드려 몸통을 곧게 받쳐요.',
      movement: '한 다리를 뒤로 길게 들어요. 골반을 나란히 두고 발을 조용히 내린 뒤 반대쪽도 해요.',
      check: '받치는 팔로 바닥이나 기구를 살짝 밀어요. 몸통이 처지기 전에 짧게 쉬었다가 다시 해요.',
    },
  },
  {
    ids: ['expanded-mat-leg-pull-back'],
    note: {
      benefit: '팔로 몸을 받치면서 배와 엉덩이가 몸통을 곧게 유지하도록 연습해요.',
      setup: '다리를 뻗고 앉아 손을 몸 뒤에 짚고 뒤꿈치를 매트에 대요.',
      movement:
        '엉덩이를 들어 몸을 길게 받친 뒤 한 다리를 조금 들어요. 발을 다시 짚고 엉덩이를 천천히 내려요.',
      check: '받치는 팔로 바닥이나 기구를 살짝 밀어요. 몸통이 처지기 전에 짧게 쉬었다가 다시 해요.',
    },
  },
  {
    ids: [
      'expanded-mat-side-bend',
      'crawled-barrel-side-sit-up',
      'world-mat-star-side-plank',
      'world-mat-bosu-side-plank',
      'world-reformer-shortbox-side-situp',
      'world-reformer-reformer-star',
      'world-chair-chair-side-plank-pedal',
      'world-barrel-spine-corrector-side-situp',
      'world-reformer-reformer-side-plank-press',
      'world-chair-chair-star',
    ],
    note: {
      benefit: '옆구리와 어깨로 몸을 옆에서 지탱하는 힘을 길러요.',
      setup: '몸을 옆으로 돌려 아래쪽 팔이나 기구의 곡면에 안정되게 기대요.',
      movement:
        '아래쪽 옆구리로 몸을 밀어 올렸다가 천천히 내려와요. 어깨와 골반이 앞뒤로 비틀리지 않게 해요.',
      check:
        '아래쪽 어깨에 푹 기대지 않도록 지지면을 눌러요. 위쪽 어깨가 앞으로 말리면 범위를 줄여요.',
    },
  },
  {
    ids: ['expanded-mat-thigh-stretch'],
    note: {
      benefit: '무릎으로 선 채 몸을 뒤로 조금 기울여 허벅지 앞이 몸의 무게를 받치는 느낌을 익혀요.',
      setup: '매트에 두 무릎을 대고 일어서 허벅지와 몸통을 한 줄로 세워요.',
      movement:
        '무릎을 중심으로 허벅지와 몸통을 함께 뒤로 조금 기울여요. 허벅지 앞에 힘을 느끼며 다시 세워요.',
      check: '엉덩이부터 주저앉지 않고 무릎 위의 몸통과 허벅지가 함께 기울게 해요.',
    },
  },
  {
    ids: ['expanded-mat-rocking', 'world-reformer-longbox-rocking'],
    note: {
      benefit: '몸 앞면으로 지지하면서 가슴과 다리를 길게 뻗어 몸 뒤쪽으로 중심을 잡는 동작이에요.',
      setup: '엎드려 무릎을 접고 손으로 발목을 잡을 수 있는지 확인해요.',
      movement:
        '발목을 손 쪽으로 밀며 가슴과 허벅지를 길게 뻗어요. 작게 흔들었다가 멈춘 뒤 몸을 내려놔요.',
      check: '가슴을 들 때 목을 꺾지 않고 앞쪽으로 길게 뻗어요. 반동을 작게 시작하세요.',
    },
  },
  {
    ids: ['expanded-mat-footwork'],
    note: {
      benefit: '배로 상체를 받치면서 두 다리를 함께 굽혔다 펴는 힘을 길러요.',
      setup: '매트에 누워 무릎을 굽혀 들고 가슴과 머리를 편안한 높이로 받아요.',
      movement: '두 다리를 나란히 뻗었다가 천천히 접어요. 등과 골반은 처음 닿은 자리에 남겨요.',
      check: '다리가 펴질 때 무릎 뒤를 세게 밀지 말고 접는 길까지 부드럽게 이어가요.',
    },
  },
  {
    ids: ['expanded-reformer-long-stretch'],
    note: {
      benefit: '팔로 몸을 받치면서 배와 엉덩이가 몸통을 곧게 유지하도록 연습해요.',
      setup: '양손으로 리포머 바를 짚고 움직이는 판 쪽에 발을 두어 몸을 곧게 받쳐요.',
      movement: '몸통 길이를 유지하면서 판을 조금 보냈다가 천천히 끌어와요.',
      check: '받치는 팔로 바닥이나 기구를 살짝 밀어요. 몸통이 처지기 전에 짧게 쉬었다가 다시 해요.',
    },
  },
  {
    ids: [
      'expanded-reformer-long-back-stretch',
      'expanded-chair-long-back-arm',
      'world-chair-chair-tricep-sit',
      'world-reformer-reformer-long-back-stretch-advanced',
    ],
    note: {
      benefit: '몸 뒤에 손을 짚고 팔로 밀면서 팔 뒤쪽과 어깨가 몸을 받치는 힘을 길러요.',
      setup: '몸 뒤에 손을 짚어 손목과 어깨가 편한 자리를 찾고 발을 안정되게 받쳐요.',
      movement:
        '팔꿈치를 조금 굽혔다가 천천히 밀어 펴요. 시작 위치로 돌아올 때도 어깨가 귀 쪽으로 들리지 않게 해요.',
      check: '어깨 앞쪽이 불편하지 않은 만큼만 팔꿈치를 굽혔다 펴요.',
    },
  },
  {
    ids: [
      'expanded-reformer-arm-circles',
      'expanded-barrel-arm-circles',
      'expanded-barrel-arm-up-down',
      'world-mat-roller-angel-arms',
      'world-mat-toningball-standing-arm-circles',
      'world-reformer-supine-arm-circles',
      'world-cadillac-armsprings-supine-circles',
    ],
    note: {
      benefit: '팔을 뻗을 때 어깨와 날개뼈가 함께 움직이는 느낌을 익혀요.',
      setup: '몸통을 편하게 받치고 팔꿈치를 가볍게 펴요. 줄이나 공을 쓰면 손목을 편하게 둬요.',
      movement:
        '팔로 작은 원이나 반원을 그린 뒤 몸 옆으로 돌아와요. 허리가 뜨기 전까지만 팔을 보내요.',
      check: '팔을 높일수록 어깨가 귀에 가까워지거나 허리가 뜨면 바로 전 높이까지만 움직여요.',
    },
  },
  {
    ids: [
      'expanded-reformer-rowing-shave',
      'expanded-cadillac-roll-back-shave',
      'world-reformer-supine-triceps-press',
      'world-reformer-seated-salute',
      'world-cadillac-armsprings-triceps-press',
      'world-reformer-reformer-kneeling-salute',
      'world-cadillac-cadillac-armsprings-salute',
    ],
    note: {
      benefit: '팔꿈치를 펴는 동안 팔 뒤쪽에 힘을 싣고 몸통은 곧게 유지하는 연습이에요.',
      setup: '손잡이나 바를 잡고 팔꿈치를 굽힌 자세에서 손목을 팔뚝과 나란히 둬요.',
      movement: '팔꿈치를 펴서 손을 멀리 보냈다가 처음 각도까지 천천히 굽혀요.',
      check: '손목을 꺾지 않고 팔꿈치가 지나치게 벌어지지 않는 거리에서 팔을 펴요.',
    },
  },
  {
    ids: [
      'expanded-reformer-rowing-hug',
      'expanded-barrel-arm-hug',
      'world-reformer-seated-hug-a-tree',
      'world-cadillac-armsprings-hug-a-tree',
      'world-reformer-reformer-kneeling-hug-a-tree',
    ],
    note: {
      benefit: '큰 나무를 안듯 팔을 모으며 가슴과 팔 앞쪽에 힘을 주는 연습이에요.',
      setup: '몸통을 받친 채 팔꿈치를 가볍게 굽혀 가슴을 편안하게 열어요.',
      movement:
        '큰 공을 안듯 팔을 가슴 앞으로 모아요. 어깨가 앞으로 밀리지 않게 천천히 다시 열어요.',
      check: '손을 모으려고 어깨까지 앞으로 내밀지 않아요. 팔꿈치를 살짝 굽힌 모양을 유지해요.',
    },
  },
  {
    ids: [
      'expanded-reformer-hamstring-curl',
      'world-cadillac-legsprings-prone-hamstring-curl',
      'world-chair-chair-prone-hamstring-curl',
      'world-mat-fusion-athletic-sliders-hamstring-curl',
    ],
    note: {
      benefit: '무릎을 굽혀 뒤꿈치를 당길 때 허벅지 뒤쪽에 힘을 주고 천천히 풀어주는 연습이에요.',
      setup: '발에 거는 줄이나 발을 댈 곳을 먼저 맞추고, 골반과 배를 안정되게 받쳐요.',
      movement: '무릎을 굽혀 뒤꿈치를 몸 쪽으로 당겼다가 천천히 다리를 펴요.',
      check: '발목에 힘을 몰아주지 말고, 돌아갈 때도 무릎이 펴지는 속도를 조절해요.',
    },
  },
  {
    ids: ['expanded-reformer-thigh-stretch', 'expanded-cadillac-roll-back-thigh-stretch'],
    note: {
      benefit: '무릎으로 선 채 몸을 뒤로 조금 기울여 허벅지 앞이 몸의 무게를 받치는 느낌을 익혀요.',
      setup:
        '무릎으로 선 자세에서 허벅지와 몸통을 한 줄로 세워요. 줄이나 바를 쓰면 강사와 먼저 맞춰요.',
      movement:
        '무릎을 중심으로 허벅지와 몸통을 함께 뒤로 기울여요. 허벅지 앞에 힘을 느끼며 다시 세워요.',
      check: '엉덩이부터 주저앉지 않고 무릎 위의 몸통과 허벅지가 함께 기울게 해요.',
    },
  },
  {
    ids: [
      'expanded-reformer-stomach-massage-hands-back',
      'crawled-reformer-stomach-massage-round',
      'crawled-reformer-stomach-massage-reach-twist',
      'world-reformer-reformer-stomach-massage-flat',
    ],
    note: {
      benefit: '배로 상체를 받치면서 두 다리를 함께 굽혔다 펴는 힘을 길러요.',
      setup:
        '몸통을 받친 채 무릎을 접고 발의 위치를 정해요. 바를 쓰면 발이 미끄러지지 않는지 확인해요.',
      movement:
        '무릎을 펴 다리를 길게 보냈다가 천천히 굽혀요. 발목을 움직이는 구간에서도 몸통 높이를 유지해요.',
      check: '다리가 펴질 때 무릎 뒤를 세게 밀지 말고 접는 길까지 부드럽게 이어가요.',
    },
  },
  {
    ids: ['expanded-cadillac-standing-butterfly'],
    note: {
      benefit: '몸통을 옆으로 기울여 평소 잘 펴지 않는 옆구리와 갈비뼈 사이를 늘여요.',
      setup: '캐딜락에 서서 양손으로 각 손잡이를 잡고 스프링이 당겨지는 방향을 봐요.',
      movement:
        '한 손을 뒤쪽 아래로 보내고 반대 손은 머리 위로 뻗으며 몸을 옆으로 기울여요. 두 손을 되돌려 몸을 세워요.',
      check:
        '위쪽 어깨가 귀를 덮지 않게 팔을 멀리 보내요. 옆구리가 편안히 늘어나는 곳에서 숨을 쉬어요.',
    },
  },
  {
    ids: ['expanded-cadillac-standing-fencing'],
    note: {
      benefit: '한 팔을 앞으로 또는 비스듬히 뻗으며 몸통의 중심을 잡고 어깨로 힘을 전달해요.',
      setup: '캐딜락에 옆으로 서서 양손에 줄을 잡고 발끝 방향을 맞춰요.',
      movement:
        '바깥 발 쪽으로 체중을 옮겨 무릎을 굽히면서 팔을 뻗어요. 발로 바닥을 밀며 몸과 팔을 처음 위치로 가져와요.',
      check: '손목을 팔과 나란히 두고, 발바닥이 들릴 만큼 멀리 뻗지 않아요.',
    },
  },
  {
    ids: ['expanded-cadillac-roll-back-biceps', 'world-reformer-seated-biceps-curl-tower'],
    note: {
      benefit: '팔꿈치를 굽히고 펴면서 팔 앞쪽으로 당기는 힘을 길러요.',
      setup: '손바닥을 위로 향하게 해 바나 손잡이를 잡고 팔꿈치를 편하게 둬요.',
      movement: '팔꿈치를 굽혀 손을 몸 쪽으로 당기고 다시 천천히 펴요.',
      check: '손을 가까이 가져오려고 손목을 접지 말고 손등과 팔뚝을 한 줄에 둬요.',
    },
  },
  {
    ids: ['expanded-cadillac-roll-back-zip-up'],
    note: {
      benefit: '한쪽 또는 양쪽 팔을 움직이면서 어깨가 편한 길을 찾고 몸통을 안정되게 유지해요.',
      setup: '바를 몸 앞 낮은 위치에서 잡고 발을 편하게 벌려 서요.',
      movement: '지퍼를 올리듯 팔꿈치를 옆으로 보내 바를 당겼다가 같은 길로 내려요.',
      check: '팔을 멀리 보내도 어깨가 귀에 닿지 않도록, 편하게 돌아올 수 있는 높이에서 멈춰요.',
    },
  },
  {
    ids: ['expanded-cadillac-roll-back-side-arm'],
    note: {
      benefit: '한쪽 또는 양쪽 팔을 움직이면서 어깨가 편한 길을 찾고 몸통을 안정되게 유지해요.',
      setup: '기구에 옆으로 서서 가까운 손으로 바 가운데를 잡고 두 발을 안정시켜요.',
      movement:
        '바를 골반 쪽으로 당겼다가 위와 바깥으로 보내고, 처음 위치까지 사각형을 그리듯 돌아와요.',
      check: '팔을 멀리 보내도 어깨가 귀에 닿지 않도록, 편하게 돌아올 수 있는 높이에서 멈춰요.',
    },
  },
  {
    ids: ['expanded-cadillac-leg-springs-bicycle', 'world-cadillac-cadillac-side-bend-trapeze'],
    note: {
      benefit: '자전거 페달을 밟듯 다리를 번갈아 접고 펴면서 양쪽 고관절을 부드럽게 움직여요.',
      setup:
        '등을 받치거나 옆으로 누워 골반을 안정시키고 다리를 들어요. 줄을 쓰면 고정을 확인해요.',
      movement:
        '페달을 밟듯 무릎을 접었다 펴며 다리로 둥근 길을 그려요. 돌아오는 반원도 천천히 이어가요.',
      check: '한쪽 무릎을 접을 때 다른 쪽 골반이 따라서 들리지 않는 크기로 원을 그려요.',
    },
  },
  {
    ids: ['expanded-cadillac-leg-springs-beats', 'world-mat-side-kick-beats'],
    note: {
      benefit: '두 다리를 조금 벌렸다 모으며 허벅지 안쪽으로 다리를 모으는 힘을 느껴요.',
      setup: '몸을 안정되게 받치고 다리를 나란히 길게 뻗어요.',
      movement:
        '허벅지에서부터 다리를 작게 벌렸다가 가볍게 모아요. 몇 번 반복한 뒤 가운데에서 멈춰요.',
      check: '발끝끼리 세게 부딪치지 않게 작게 움직이고, 무릎은 편하게 펴 둬요.',
    },
  },
  {
    ids: ['expanded-chair-swan'],
    note: {
      benefit: '가슴을 앞쪽으로 길게 뻗으며 등 윗부분을 펴는 힘을 길러요.',
      setup: '체어에 엎드려 골반과 배를 좌면에 받치고 양손을 페달에 대요.',
      movement:
        '가슴을 앞쪽으로 보내며 윗등을 들어요. 페달이 튀지 않게 손으로 받치면서 천천히 내려와요.',
      check:
        '턱을 들어 올리기보다 정수리를 멀리 보내요. 허리 한곳이 접히는 느낌이 들면 높이를 낮춰요.',
    },
  },
  {
    ids: [
      'expanded-chair-kneeling-push-down',
      'expanded-chair-push-down-front',
      'expanded-chair-push-down-one-arm',
      'world-chair-chair-seated-one-arm-press',
      'world-chair-chair-kneeling-one-arm-press',
    ],
    note: {
      benefit: '팔로 페달을 누르면서 어깨를 받치고, 다시 올라오는 힘도 조절하는 연습이에요.',
      setup: '강사와 시작 위치를 잡고 손을 페달에 안정되게 대요.',
      movement: '손으로 페달을 조금 누른 뒤, 올라오는 힘을 받으면서 처음 높이까지 천천히 따라와요.',
      check: '페달이 올라올 때 손을 먼저 떼지 않고 처음 높이까지 따라가요.',
    },
  },
  {
    ids: ['expanded-chair-table'],
    note: {
      benefit: '손과 발로 몸을 받쳐 엉덩이를 들어 올린 상태에서 페달을 움직이는 동작이에요.',
      setup: '강사의 보조를 받아 좌면 뒤쪽에 손을 두고 발을 페달에 대요.',
      movement: '골반을 들어 몸 앞면을 펴고 페달을 작게 움직여요. 페달을 멈춘 다음 골반을 내려요.',
      check: '페달만 작게 움직여 보고 골반이 같이 내려가면 다시 편하게 앉아요.',
    },
  },
  {
    ids: ['expanded-chair-single-arm-twist', 'world-chair-chair-side-body-twist'],
    note: {
      benefit: '지지하는 곳은 움직이지 않게 두고 가슴을 돌리면서 옆구리를 쓰는 연습이에요.',
      setup: '손이나 골반이 닿는 곳을 먼저 안정시켜요. 줄이나 페달은 강사와 맞춰요.',
      movement:
        '가슴을 한쪽으로 천천히 돌렸다가 가운데로 돌아와요. 골반까지 따라가지 않게 범위를 작게 시작해요.',
      check: '팔만 뒤로 넘기지 말고 시선이 가슴을 따라가게 해요.',
    },
  },
  {
    ids: [
      'expanded-chair-horseback',
      'expanded-barrel-horseback-jockey',
      'expanded-barrel-horseback',
      'crawled-reformer-horseback',
    ],
    note: {
      benefit: '말을 타듯 걸터앉아 허벅지 안쪽과 배로 몸의 무게를 가볍게 받치는 연습이에요.',
      setup: '기구를 사이에 두고 걸터앉아 허벅지 안쪽을 가볍게 붙여요.',
      movement: '허벅지로 기구를 감싸며 배에 힘을 줘 엉덩이 무게를 조금 덜었다가 천천히 앉아요.',
      check:
        '허벅지가 기구에 닿는 느낌을 유지해요. 높이 올라가려 하기보다 내려올 때 소리가 나지 않게 해 봐요.',
    },
  },
  {
    ids: ['expanded-barrel-back-stretch'],
    note: {
      benefit: '바렐 곡면에 등을 기대어 가슴 앞쪽을 펴고 팔을 머리 너머로 보내는 범위를 찾아요.',
      setup: '바렐을 등지고 서서 발을 바닥에 두고 골반을 곡면에 기대요.',
      movement:
        '몸을 뒤로 천천히 기대어 등을 곡면에 맡겨요. 발을 누르며 강사와 함께 다시 몸을 세워요.',
      check: '발로 바닥을 누르고, 강사와 확인한 범위까지만 천천히 기대요.',
    },
  },
  {
    ids: ['expanded-barrel-big-leg-circles'],
    note: {
      benefit: '두 다리가 그리는 길을 조절하면서 골반이 함께 흔들리지 않는 범위를 익혀요.',
      setup: '강사의 보조를 받아 바렐 곡면에 등을 기대고 두 손으로 사다리를 잡아요.',
      movement:
        '몸통이 닿은 곳을 유지하며 두 다리로 원을 그려요. 두 발을 바닥에 돌려놓고 강사와 일어나요.',
      check: '다리가 아래로 내려갈 때 허리가 뜨지 않는 크기부터 시작해요.',
    },
  },
  {
    ids: [
      'crawled-mat-rolling-like-a-ball',
      'crawled-mat-open-leg-rocker',
      'crawled-mat-seal',
      'world-mat-crab',
    ],
    note: {
      benefit: '등을 둥글게 유지하고 구르면서 반동 없이 다시 균형을 잡는 연습이에요.',
      setup: '무릎을 몸 쪽으로 가져와 등을 둥글게 하고 엉덩이로 균형을 잡아요.',
      movement: '등 윗부분까지만 부드럽게 굴렀다가 다리를 몸 가까이 유지하며 다시 균형을 찾아요.',
      check: '머리나 뒷목으로 체중이 넘어가기 전에 방향을 바꿔요. 멈출 위치부터 강사와 확인해요.',
    },
  },
  {
    ids: ['crawled-mat-double-leg-stretch'],
    note: {
      benefit: '누워서 다리를 뻗을 때 배가 다리 무게를 받치고 허리가 편안하게 남는 범위를 익혀요.',
      setup: '등을 받치고 누워 팔과 무릎을 몸 가까이 가져와요.',
      movement:
        '골반을 가만히 두고 팔과 다리를 뻗었다가 천천히 접어 돌아와요. 허리가 편안한 거리를 골라요.',
      check: '다리를 낮췄을 때 허리가 갑자기 뜨면 다리를 조금 높여 보세요.',
    },
  },
  {
    ids: [
      'crawled-mat-corkscrew',
      'world-reformer-reformer-corkscrew',
      'world-reformer-reformer-tictoc',
      'world-barrel-barrel-corkscrew',
    ],
    note: {
      benefit: '두 다리를 함께 움직일 때 옆구리와 배로 골반의 방향을 조절하는 연습이에요.',
      setup: '등을 받치고 누워 다리를 가까이 모아요.',
      movement:
        '다리를 한 덩어리처럼 작게 옆으로 움직여요. 배와 옆구리에 힘을 주면서 천천히 가운데로 되돌려요.',
      check: '움직임은 작게 시작해요. 양어깨가 닿은 곳에서 차례로 들리지 않는지 보세요.',
    },
  },
  {
    ids: [
      'crawled-mat-saw',
      'world-mat-criss-cross',
      'world-mat-oblique-chest-lift',
      'world-mat-miniball-oblique-twist',
    ],
    note: {
      benefit: '가슴을 비스듬히 돌리면서 배와 옆구리를 함께 쓰는 연습이에요.',
      setup: '골반을 받치고 몸의 중심을 먼저 잡아요.',
      movement:
        '가슴과 한쪽 어깨를 반대쪽 다리 방향으로 보내요. 중심으로 돌아온 다음 방향을 바꿔요.',
      check: '팔이나 팔꿈치만 먼저 보내지 않고 가슴뼈부터 천천히 돌려 보세요.',
    },
  },
  {
    ids: [
      'crawled-mat-jack-knife',
      'crawled-mat-control-balance',
      'crawled-mat-scissors-high',
      'crawled-reformer-short-spine-massage',
      'world-mat-roll-over',
      'world-reformer-reformer-overhead',
      'world-reformer-reformer-long-spine-massage',
      'world-cadillac-cadillac-airplane',
      'world-barrel-spine-corrector-roll-over',
      'world-reformer-reformer-control-balance-off',
      'world-reformer-reformer-overhead-scissors',
    ],
    note: {
      benefit: '골반을 들어 다리가 몸 위로 이동할 때 배와 등으로 무게를 조절하는 심화 동작이에요.',
      setup:
        '강사가 보조하는 상태에서 어깨와 등을 받치고 다리를 들어요. 기구를 쓸 때는 머리 받침과 발 지지부터 확인해요.',
      movement:
        '배로 다리 무게를 받으며 골반을 천천히 들어요. 고개를 돌리지 않고 강사가 안내하는 경로로 등을 차례로 내려놔요.',
      check:
        '혼자 높이를 늘리지 않고 강사와 지지할 곳부터 확인해요. 무게가 실린 동안 고개는 그대로 둬요.',
    },
  },
  {
    ids: [
      'crawled-mat-teaser-classic',
      'crawled-reformer-longbox-teaser',
      'crawled-chair-teaser-tricep-press',
      'world-mat-teaser-two',
      'world-mat-teaser-three',
      'world-mat-circle-teaser',
      'world-barrel-barrel-teaser',
      'world-barrel-spine-corrector-teaser',
      'world-chair-chair-reverse-pike',
      'world-reformer-reformer-shortbox-teaser',
    ],
    note: {
      benefit: '상체와 다리가 만드는 V자 균형을 배로 지탱하는 연습이에요.',
      setup: '몸통을 받치고 다리를 몸 가까이 가져와 균형을 잡아요.',
      movement:
        '상체와 다리를 조금씩 펴서 옆에서 봤을 때 V 모양을 만들어요. 처음 자세로 돌아올 때도 배로 무게를 받쳐요.',
      check: '다리를 높이 드는 것보다 상체를 천천히 내려놓을 수 있는 높이에서 시작해요.',
    },
  },
  {
    ids: ['crawled-mat-boomerang'],
    note: {
      benefit: '등을 둥글게 유지하고 구르면서 반동 없이 다시 균형을 잡는 연습이에요.',
      setup: '매트에 다리를 펴고 겹쳐 앉아요. 뒤로 구를 자리와 어깨가 받쳐질 곳을 강사와 확인해요.',
      movement:
        '등을 차례로 굴려 다리를 넘긴 뒤 위쪽 다리를 바꿔요. 앞으로 돌아오며 V자 균형을 잡았다가 다리를 내려요.',
      check: '머리나 뒷목으로 체중이 넘어가기 전에 방향을 바꿔요. 멈출 위치부터 강사와 확인해요.',
    },
  },
  {
    ids: [
      'crawled-mat-pilates-pushup',
      'world-reformer-reformer-balance-control-pushup',
      'world-chair-chair-one-arm-pushup',
    ],
    note: {
      benefit: '팔을 굽혔다 펴면서 몸통이 처지지 않게 가슴과 팔, 배의 힘을 함께 써요.',
      setup: '손을 짚고 발이나 무릎으로 몸을 받쳐 머리부터 골반까지 길게 뻗어요.',
      movement: '팔꿈치를 굽혀 가슴을 조금 낮췄다가 손으로 밀어 올라와요.',
      check: '팔꿈치를 굽힐 때 어깨만 먼저 떨어지지 않게 머리와 몸통을 함께 움직여요.',
    },
  },
  {
    ids: ['crawled-reformer-semicircle', 'world-reformer-reformer-semicircle-single-leg'],
    note: {
      benefit: '골반을 들어 둔 채 무릎을 움직여 엉덩이와 허벅지 뒤가 몸을 받쳐 주도록 연습해요.',
      setup:
        '강사의 보조를 받아 리포머에서 어깨와 발을 받치고 골반을 들어요. 머리 받침은 평평하게 둬요.',
      movement:
        '발로 바를 눌러 판을 조금 보내고 골반을 천천히 내려요. 판을 끌어온 뒤 배와 엉덩이로 다시 골반을 들어요.',
      check: '다리가 움직일 때 골반이 먼저 떨어지면 이동 거리를 짧게 해요.',
    },
  },
  {
    ids: ['crawled-reformer-down-stretch'],
    note: {
      benefit: '무릎으로 기구를 받치고 가슴을 펴면서 움직이는 판의 속도를 등과 다리로 조절해요.',
      setup: '리포머 위에 무릎을 두고 발을 받친 뒤 양손으로 바를 짚어요.',
      movement: '가슴 앞을 길게 펴며 판을 천천히 밀었다가 골반과 가슴을 함께 끌어와요.',
      check: '판이 돌아올 때 허리가 먼저 꺾이지 않도록 가슴을 앞쪽으로 길게 보내요.',
    },
  },
  {
    ids: ['crawled-reformer-breaststroke-longbox', 'world-mat-breast-stroke'],
    note: {
      benefit: '평영을 하듯 팔을 뻗고 벌리면서 가슴을 들고 등 윗부분으로 상체를 지탱해요.',
      setup: '엎드려 몸통을 받치고 팔꿈치를 접어 손을 어깨 가까이 둬요.',
      movement:
        '수영할 때처럼 팔을 앞에서 옆으로 쓸어 가면서 가슴을 들어요. 팔을 접으며 처음 자세로 돌아와요.',
      check: '팔을 멀리 보낼 때 목이 꺾이지 않게 정수리도 앞쪽으로 길게 뻗어요.',
    },
  },
  {
    ids: ['crawled-reformer-shortbox-tree'],
    note: {
      benefit:
        '한쪽 다리를 세우고 손으로 짚어 오르내리며 배의 힘과 허벅지 뒤의 늘어남을 함께 느껴요.',
      setup: '짧은 박스에 앉아 한 발을 줄에 고정하고 다른 다리는 손으로 허벅지를 받쳐 들어요.',
      movement: '허벅지를 받친 채 등을 천천히 뒤로 굴렸다가 손으로 다리를 차례로 짚으며 올라와요.',
      check: '무릎을 완전히 펴는 것보다 골반을 안정되게 둔 채 오갈 수 있는지 먼저 봐요.',
    },
  },
  {
    ids: ['crawled-reformer-snake-twist'],
    note: {
      benefit: '지지하는 곳은 움직이지 않게 두고 가슴을 돌리면서 옆구리를 쓰는 연습이에요.',
      setup: '강사의 보조를 받아 리포머 바를 짚고 판 위에서 발이 포개지는 위치를 맞춰요.',
      movement:
        '몸을 펴며 판을 밀었다가 가슴을 돌려 옆구리를 길게 써요. 옆구리로 골반을 들어 판을 끌어와요.',
      check: '팔만 뒤로 넘기지 말고 시선이 가슴을 따라가게 해요.',
    },
  },
  {
    ids: [
      'crawled-reformer-front-splits',
      'crawled-reformer-russian-splits',
      'world-reformer-reformer-eves-lunge-stretch',
      'world-reformer-reformer-front-splits-hands-free',
    ],
    note: {
      benefit: '앞뒤로 발을 나눠 딛고 체중을 옮기면서 다리 앞뒤가 늘어나는 범위를 익혀요.',
      setup: '기구에서 앞뒤로 발을 나누고 강사와 발이 놓일 곳과 손 지지를 맞춰요.',
      movement:
        '판을 보내 다리 앞뒤를 길게 벌렸다가, 스스로 조절할 수 있는 거리에서 천천히 모아요.',
      check: '돌아올 수 있는 거리까지만 벌려요. 발이 미끄러지지 않는지 강사와 먼저 확인해요.',
    },
  },
  {
    ids: ['crawled-reformer-side-arm-rotation', 'world-reformer-kneeling-side-arm-pull'],
    note: {
      benefit: '한쪽 또는 양쪽 팔을 움직이면서 어깨가 편한 길을 찾고 몸통을 안정되게 유지해요.',
      setup: '옆으로 당기는 줄을 손에 잡고 가슴과 골반이 향할 곳을 정해요.',
      movement:
        '팔을 몸 앞쪽으로 움직였다가 줄을 천천히 되돌려요. 어깨에 힘이 몰리면 거리를 줄여요.',
      check: '팔을 멀리 보내도 어깨가 귀에 닿지 않도록, 편하게 돌아올 수 있는 높이에서 멈춰요.',
    },
  },
  {
    ids: ['crawled-cadillac-monkey'],
    note: {
      benefit: '다리 뒤쪽이 늘어나는 느낌을 따라 천천히 무릎을 펴고 몸을 기울여 봐요.',
      setup: '캐딜락에 누워 강사와 안전 스트랩의 고정을 확인하고 바에 발과 손을 대요.',
      movement:
        '발로 바를 밀어 상체와 다리가 가까워지게 해요. 무릎을 천천히 굽혀 바와 함께 돌아와요.',
      check: '무릎을 끝까지 밀어 펴지 않아도 돼요. 숨을 멈추지 않고 머물 수 있는 범위를 찾아요.',
    },
  },
  {
    ids: ['crawled-cadillac-spread-eagle'],
    note: {
      benefit: '기구의 지지를 이용해 평소보다 천천히 몸을 뻗고, 편하게 늘어나는 범위를 찾아요.',
      setup: '손과 발로 매달리거나 기댈 자리를 강사와 먼저 확인하고 몸을 받쳐요.',
      movement: '기구가 몸을 받쳐 주는 범위 안에서 가슴을 앞쪽으로 펼쳤다가 천천히 돌아와요.',
      check: '발이나 몸이 닿은 곳이 흔들리지 않는지 확인하고 숨을 쉬며 조금씩 움직여요.',
    },
  },
  {
    ids: ['crawled-cadillac-hanging-pullups'],
    note: {
      benefit: '매달린 자세에서 팔을 굽혀 몸을 당기며 등과 팔로 체중을 받치는 힘을 길러요.',
      setup:
        '강사의 보조를 받아 기구의 손잡이나 바를 안정되게 잡아요. 발 지지와 내려올 곳을 먼저 맞춰요.',
      movement: '팔과 등으로 몸을 당겼다가, 어깨가 귀 쪽으로 튀지 않게 천천히 내려와요.',
      check:
        '손이 닿는 위치와 내려오는 방법을 먼저 확인해요. 반동 없이 당길 수 있는 범위로 시작해요.',
    },
  },
  {
    ids: ['crawled-cadillac-prone-scapula-swan', 'world-cadillac-pushthrough-swan-dive'],
    note: {
      benefit: '가슴을 앞쪽으로 길게 뻗으며 등 윗부분을 펴는 힘을 길러요.',
      setup: '캐딜락에 엎드리고 강사와 안전장치를 확인한 뒤 양손으로 바를 잡아요.',
      movement:
        '바의 움직임을 따라 가슴을 앞으로 길게 뻗으며 들어요. 허리가 편한 높이에서 멈추고 천천히 내려와요.',
      check:
        '턱을 들어 올리기보다 정수리를 멀리 보내요. 허리 한곳이 접히는 느낌이 들면 높이를 낮춰요.',
    },
  },
  {
    ids: ['crawled-cadillac-hip-opener-legspring'],
    note: {
      benefit: '다리 스프링의 도움을 받아 두 다리를 벌렸다 모으며 허벅지를 여러 방향으로 움직여요.',
      setup: '캐딜락에 누워 강사와 두 발의 스프링 고정을 확인해요.',
      movement: '다리를 편안한 높이로 들어 조금 벌렸다가 다시 가까이 모아요. 양쪽의 속도를 맞춰요.',
      check: '다리를 움직일 때 골반 뒤쪽이 테이블에서 들리지 않는 범위를 찾아요.',
    },
  },
  {
    ids: ['crawled-cadillac-airplane-magician'],
    note: {
      benefit:
        '골반을 들고 다리 스프링을 움직이며 엉덩이와 배로 몸통 높이를 유지하는 심화 동작이에요.',
      setup: '강사와 발의 스프링을 확인하고 캐딜락에 등을 대고 누워요. 고개는 정면에 두세요.',
      movement:
        '골반을 들어 몸을 사선으로 받친 상태에서 다리를 작게 모았다 벌려요. 골반과 등을 천천히 내려놔요.',
      check: '허리나 뒷목 쪽으로 무게가 쏠리면 강사와 함께 높이를 낮춰요.',
    },
  },
  {
    ids: ['crawled-cadillac-9-essential-flow'],
    note: {
      benefit: '여러 동작을 이어가며 팔이나 다리를 움직일 때마다 몸의 중심을 다시 잡는 연습이에요.',
      setup: '강사와 손과 발이 닿을 곳, 스프링이 걸린 곳을 먼저 확인해요.',
      movement:
        '처음 동작을 천천히 마친 뒤 기구를 멈춰요. 다음 동작에 맞춰 지지를 바꾸고 이어가요.',
      check: '다음 자세로 넘어가기 전에 기구가 멎었는지 확인하고 손발이 닿는 곳을 다시 잡아요.',
    },
  },
  {
    ids: [
      'crawled-chair-mountain-climber',
      'world-mat-sliders-mountain-climber',
      'world-chair-chair-mountain-climber-handsfree',
      'world-mat-fusion-athletic-bosu-mountain-climber',
    ],
    note: {
      benefit: '몸을 받치고 무릎을 번갈아 움직이며 배에 힘을 유지하는 연습이에요.',
      setup: '손이나 발을 지정된 지지면에 대고 몸통이 흔들리지 않게 먼저 중심을 잡아요.',
      movement:
        '한쪽 무릎을 굽혔다가 되돌리고 반대쪽도 해요. 두 발을 바꿀 때 몸이 들썩이지 않는 속도를 골라요.',
      check: '속도를 올리기 전에 양쪽 발이 오갈 때 어깨나 골반이 흔들리지 않는지 봐요.',
    },
  },
  {
    ids: ['crawled-chair-achilles-frogs', 'world-chair-chair-achilles-stretch'],
    note: {
      benefit: '발 앞쪽으로 페달을 받치며 발목을 움직여 종아리의 힘과 늘어나는 느낌을 익혀요.',
      setup: '강사와 페달에 발을 둘 곳을 맞추고 발 앞쪽으로 페달을 받쳐요.',
      movement:
        '뒤꿈치를 조금 내렸다가 올려 보세요. 발목이 기울지 않는 범위에서 페달의 움직임을 따라가요.',
      check: '뒤꿈치가 안팎으로 돌아가지 않는 범위에서 올렸다 내려요. 페달은 발로 끝까지 따라가요.',
    },
  },
  {
    ids: ['crawled-chair-intermediate-core-combo'],
    note: {
      benefit: '페달에 몸을 지지하면서 배로 중심을 잡는 동작을 이어가는 수업이에요.',
      setup: '강사와 손과 발이 닿을 곳, 스프링이 걸린 곳을 먼저 확인해요.',
      movement:
        '처음 동작을 천천히 마친 뒤 기구를 멈춰요. 다음 동작에 맞춰 지지를 바꾸고 이어가요.',
      check: '한 동작을 마칠 때마다 페달을 안정시킨 다음 다음 자세로 넘어가요.',
    },
  },
  {
    ids: ['crawled-barrel-climb-a-tree'],
    note: {
      benefit:
        '한쪽 다리를 세우고 손으로 짚어 오르내리며 배의 힘과 허벅지 뒤의 늘어남을 함께 느껴요.',
      setup: '박스나 바렐 위에 안정되게 앉아 한 다리를 들고 손으로 허벅지를 받쳐요.',
      movement: '등을 조금씩 뒤로 굴렸다가 손으로 다리를 차례로 짚으며 다시 올라와요.',
      check: '무릎을 완전히 펴는 것보다 골반을 안정되게 둔 채 오갈 수 있는지 먼저 봐요.',
    },
  },
  {
    ids: [
      'crawled-barrel-grasshopper',
      'world-barrel-spine-corrector-grasshopper',
      'world-reformer-longbox-grasshopper',
    ],
    note: {
      benefit: '엎드려 무릎을 접고 다리를 뒤로 뻗으며 엉덩이와 허벅지 뒤를 함께 써요.',
      setup: '기구의 곡면이나 박스에 엎드려 손으로 지지하고 무릎을 굽혀요.',
      movement: '다리를 뒤쪽으로 길게 뻗으며 뒤꿈치를 가볍게 모았다가 천천히 낮춰요.',
      check: '허리가 먼저 꺾이지 않게 다리 높이를 조금 낮춰서 시작해요.',
    },
  },
  {
    ids: [
      'crawled-barrel-fullbody-ladder-flow',
      'world-cadillac-cadillac-ballet-stretches',
      'world-barrel-barrel-ballet-stretch-front',
      'world-barrel-barrel-ballet-stretch-side',
      'world-barrel-barrel-ballet-stretch-back',
    ],
    note: {
      benefit: '기구의 지지를 이용해 평소보다 천천히 몸을 뻗고, 편하게 늘어나는 범위를 찾아요.',
      setup: '고정된 기구 옆에 서서 한쪽 다리를 편한 높이에 올려요.',
      movement:
        '발과 골반이 향하는 쪽을 확인하고 상체를 작게 기울여요. 늘어나는 느낌이 편한 곳에서 다시 세워요.',
      check: '발이나 몸이 닿은 곳이 흔들리지 않는지 확인하고 숨을 쉬며 조금씩 움직여요.',
    },
  },
  {
    ids: ['world-mat-side-kick-inner-thigh-lift'],
    note: {
      benefit: '옆으로 누워 아래쪽 다리를 들어 허벅지 안쪽에 힘이 들어오는 느낌을 익혀요.',
      setup: '옆으로 누워 위쪽 발을 앞에 받치고 아래 다리를 길게 펴요.',
      movement: '아래쪽 다리를 살짝 들었다가 같은 속도로 내려요. 골반은 그대로 둬요.',
      check: '다리를 높이 들기보다 발끝을 멀리 보낸 채 작게 올렸다 내리세요.',
    },
  },
  {
    ids: ['world-mat-shell-stretch'],
    note: {
      benefit: '몸을 웅크려 등을 넓게 펴고 숨을 들이쉴 때 등 뒤가 부풀어 오르는 느낌을 살펴봐요.',
      setup: '무릎을 접고 엉덩이를 뒤꿈치 쪽으로 보내면서 상체를 편하게 숙여요.',
      movement:
        '편한 곳에 팔을 놓고 등 뒤쪽으로 숨이 들어오는 느낌을 느껴요. 손으로 짚고 천천히 일어나요.',
      check: '팔에 힘을 빼고 엉덩이를 편안한 거리까지만 뒤로 보내요.',
    },
  },
  {
    ids: ['world-mat-cat-cow-articulation'],
    note: {
      benefit: '등을 둥글게 말았다 펴며 척추가 차례로 움직이는 감각을 익혀요.',
      setup: '매트에 손과 무릎을 짚어요. 어깨 아래 손목, 골반 아래 무릎이 오게 둬요.',
      movement:
        '골반을 살짝 말며 등을 둥글게 올려요. 다시 골반 끝을 뒤로 보내고 가슴을 앞쪽으로 길게 펴요.',
      check: '고개만 움직이지 않게 골반과 등 가운데의 움직임에도 주의를 기울여 보세요.',
    },
  },
  {
    ids: ['world-mat-prone-dart'],
    note: {
      benefit: '가슴을 앞쪽으로 길게 뻗으며 등 윗부분을 펴는 힘을 길러요.',
      setup: '매트에 엎드려 양팔을 몸 옆에 길게 두고 손바닥은 허벅지 쪽을 향하게 해요.',
      movement:
        '손끝을 발 쪽으로 길게 보내며 가슴을 조금 들어요. 목 뒤를 길게 둔 채 가슴을 다시 내려요.',
      check:
        '턱을 들어 올리기보다 정수리를 멀리 보내요. 허리 한곳이 접히는 느낌이 들면 높이를 낮춰요.',
    },
  },
  {
    ids: ['world-mat-side-plank-thread-needle'],
    note: {
      benefit: '옆으로 몸을 지지하며 위쪽 팔을 아래로 통과시켜 어깨와 옆구리로 균형을 잡아요.',
      setup: '아래쪽 팔로 바닥을 짚고 옆으로 몸을 받쳐요.',
      movement:
        '위쪽 팔을 몸 아래 틈으로 천천히 보내며 가슴을 돌려요. 팔을 열어 처음 자세로 돌아와요.',
      check: '아래쪽 어깨가 처지지 않도록 받쳐요. 팔과 함께 가슴을 천천히 돌려요.',
    },
  },
  {
    ids: [
      'world-mat-bear-hover',
      'world-reformer-reformer-bear-crawl',
      'world-chair-chair-bear-hover-pedal',
    ],
    note: {
      benefit: '네발기기에서 무릎의 무게를 덜어 내면서 배와 어깨로 몸통을 떠받치는 연습이에요.',
      setup: '손과 무릎을 짚고 발가락을 지지한 뒤 어깨를 편하게 둬요.',
      movement: '손과 발로 눌러 무릎을 조금만 띄워요. 등 높이를 유지하다 무릎을 조용히 내려요.',
      check: '무릎을 높이 들기보다 아주 조금만 띄우고 숨을 쉬어 보세요.',
    },
  },
  {
    ids: ['world-mat-quadruped-donkey-kick', 'world-cadillac-cadillac-quadruped-hip-extension'],
    note: {
      benefit: '다리를 뒤로 보낼 때 엉덩이 뒤쪽에 힘을 쓰고 허리를 길게 유지하는 연습이에요.',
      setup: '손과 무릎으로 네발기기 자세를 만들고 양쪽 골반을 나란히 둬요.',
      movement:
        '한 다리를 뒤나 옆으로 들어 올렸다가 천천히 내려요. 가슴은 처음 향한 쪽을 보게 둬요.',
      check:
        '허리가 꺾이기 시작하면 다리를 조금 낮춰요. 발끝보다 허벅지가 뒤로 간다고 생각해 보세요.',
    },
  },
  {
    ids: ['world-mat-quadruped-fire-hydrant'],
    note: {
      benefit: '다리를 옆으로 벌릴 때 골반이 함께 기울지 않게 엉덩이 바깥쪽의 힘을 써요.',
      setup: '손과 무릎으로 네발기기 자세를 만들고 양쪽 골반을 나란히 둬요.',
      movement:
        '한 다리를 뒤나 옆으로 들어 올렸다가 천천히 내려요. 가슴은 처음 향한 쪽을 보게 둬요.',
      check: '발끝을 멀리 보내려다 상체가 기울면 다리가 오가는 폭을 줄여요.',
    },
  },
  {
    ids: [
      'world-mat-standing-curtsy-lunge',
      'world-reformer-fusion-athletic-reformer-bulgarian-squat',
      'world-chair-fusion-athletic-chair-bulgarian-squat',
      'world-barrel-fusion-athletic-barrel-bulgarian-squat',
    ],
    note: {
      benefit: '앞뒤로 다리를 나눠 한쪽 발에 체중을 실으며 허벅지와 엉덩이 힘을 길러요.',
      setup: '앞뒤로 발을 나눠 딛고 체중을 앞발에 실어요. 뒷발 받침은 강사와 맞춰요.',
      movement:
        '무릎과 엉덩이를 접어 몸을 낮췄다가 앞발로 눌러 올라와요. 양쪽을 바꾸기 전에 중심부터 잡아요.',
      check: '앞발 뒤꿈치가 들리지 않는 깊이까지만 내려가고, 발바닥으로 눌러 다시 일어서요.',
    },
  },
  {
    ids: ['world-mat-seated-mermaid-rotation'],
    note: {
      benefit: '지지하는 곳은 움직이지 않게 두고 가슴을 돌리면서 옆구리를 쓰는 연습이에요.',
      setup: '매트에 앉아 엉덩이 양쪽을 받쳐요. 다리를 접어 앉기 어렵다면 편한 자세를 골라도 돼요.',
      movement:
        '팔을 머리 위로 뻗어 옆구리를 늘인 뒤 가슴을 바닥 쪽으로 조금 돌려요. 반대로 열어 몸통을 세워요.',
      check: '팔만 뒤로 넘기지 말고 시선이 가슴을 따라가게 해요.',
    },
  },
  {
    ids: ['world-mat-figure-four-piriformis-stretch'],
    note: {
      benefit: '엉덩이 바깥쪽이 편안하게 늘어나는 자리에서 숨을 쉬며 다리의 긴장을 풀어요.',
      setup: '등을 대고 누워 무릎을 굽혀요. 한쪽 발목을 반대쪽 허벅지 위에 얹어요.',
      movement:
        '지지하는 쪽 허벅지 뒤를 잡아 몸 쪽으로 조금 당겨요. 엉덩이가 편하게 늘어나는 곳에서 숨을 쉬고 다리를 풀어요.',
      check: '무릎으로 눌러 각도를 만들지 않아요. 엉덩이 쪽에 가볍게 당기는 느낌이면 충분해요.',
    },
  },
  {
    ids: ['world-mat-miniball-prone-swan-press'],
    note: {
      benefit: '가슴을 앞쪽으로 길게 뻗으며 등 윗부분을 펴는 힘을 길러요.',
      setup: '매트에 엎드려 양손을 작은 공 위에 가볍게 얹어요.',
      movement:
        '공을 부드럽게 눌러 가슴을 앞쪽으로 길게 들어요. 공에 체중을 쏟지 않고 천천히 내려와요.',
      check:
        '턱을 들어 올리기보다 정수리를 멀리 보내요. 허리 한곳이 접히는 느낌이 들면 높이를 낮춰요.',
    },
  },
  {
    ids: ['world-mat-circle-chest-press'],
    note: {
      benefit: '가슴 앞의 링을 누르면서 가슴과 팔 안쪽에 고르게 힘을 쓰는 연습이에요.',
      setup: '앉아서 가슴 앞에 링을 두고 양손바닥으로 패드를 받쳐요.',
      movement: '손바닥으로 링을 가볍게 눌렀다가 탄성이 풀리는 속도를 따라 천천히 놓아요.',
      check: '손목은 곧게 두고 어깨가 올라가지 않을 만큼만 눌러요.',
    },
  },
  {
    ids: ['world-mat-circle-inner-thigh-press'],
    note: {
      benefit: '허벅지로 링을 살짝 눌러 다리 안쪽으로 힘을 모으는 감각을 익혀요.',
      setup: '링을 동작에 맞춰 허벅지 안쪽이나 바깥쪽에 대요. 무릎뼈를 직접 누르지 않게 해요.',
      movement: '허벅지로 링을 살짝 눌렀다가 탄성이 풀리는 속도를 따라 천천히 힘을 빼요.',
      check: '링을 찌그러뜨릴 만큼 힘을 주지 않아도 돼요. 힘을 풀 때도 천천히 놓아요.',
    },
  },
  {
    ids: ['world-mat-circle-outer-thigh-abduction'],
    note: {
      benefit: '다리를 옆으로 벌릴 때 골반이 함께 기울지 않게 엉덩이 바깥쪽의 힘을 써요.',
      setup: '링을 동작에 맞춰 허벅지 안쪽이나 바깥쪽에 대요. 무릎뼈를 직접 누르지 않게 해요.',
      movement: '허벅지로 링을 살짝 눌렀다가 탄성이 풀리는 속도를 따라 천천히 힘을 빼요.',
      check: '발끝을 멀리 보내려다 상체가 기울면 다리가 오가는 폭을 줄여요.',
    },
  },
  {
    ids: ['world-mat-roller-bridge-rollout', 'world-mat-fitnessball-bridge-curl'],
    note: {
      benefit: '골반을 들어 둔 채 무릎을 움직여 엉덩이와 허벅지 뒤가 몸을 받쳐 주도록 연습해요.',
      setup: '등을 대고 누워 발을 롤러나 공에 올린 뒤 미끄러지지 않는지 확인해요.',
      movement:
        '엉덩이를 천천히 들고 발로 롤러나 공을 조금 굴려요. 다시 가까이 가져온 다음 골반을 내려요.',
      check: '다리가 움직일 때 골반이 먼저 떨어지면 이동 거리를 짧게 해요.',
    },
  },
  {
    ids: ['world-mat-roller-prone-swan'],
    note: {
      benefit: '가슴을 앞쪽으로 길게 뻗으며 등 윗부분을 펴는 힘을 길러요.',
      setup: '매트에 엎드려 손목과 팔꿈치 사이를 폼롤러에 받쳐요.',
      movement:
        '롤러를 몸 쪽으로 조금 끌어오며 가슴을 길게 들어요. 롤러를 되돌리면서 상체를 낮춰요.',
      check:
        '턱을 들어 올리기보다 정수리를 멀리 보내요. 허리 한곳이 접히는 느낌이 들면 높이를 낮춰요.',
    },
  },
  {
    ids: ['world-mat-bosu-prone-extension'],
    note: {
      benefit: '가슴을 앞쪽으로 길게 뻗으며 등 윗부분을 펴는 힘을 길러요.',
      setup: '보수의 둥근 면 가운데에 배와 골반을 대고 발끝은 바닥에 둬요.',
      movement:
        '팔을 옆으로 열고 윗등에 힘을 주며 가슴을 조금 들어요. 보수가 흔들리지 않게 내려와요.',
      check:
        '턱을 들어 올리기보다 정수리를 멀리 보내요. 허리 한곳이 접히는 느낌이 들면 높이를 낮춰요.',
    },
  },
  {
    ids: ['world-mat-theraband-external-rotation'],
    note: {
      benefit: '팔꿈치를 몸 가까이 두고 아래팔을 바깥으로 돌려 어깨 뒤쪽의 작은 근육을 써요.',
      setup: '팔꿈치를 굽혀 옆구리 가까이 두고 양손으로 밴드를 잡아요.',
      movement: '팔꿈치를 둔 채 손을 바깥으로 벌렸다가 서서히 모아요.',
      check: '손을 더 멀리 보내려고 팔꿈치나 몸통까지 돌아가지 않는지 확인해요.',
    },
  },
  {
    ids: ['world-mat-loopband-monster-walk'],
    note: {
      benefit: '다리를 옆으로 벌릴 때 골반이 함께 기울지 않게 엉덩이 바깥쪽의 힘을 써요.',
      setup: '고리 밴드를 다리에 걸고 무릎을 살짝 굽혀 중심을 낮춰요.',
      movement: '밴드가 완전히 느슨해지지 않게 작게 내디뎌요. 반대 발을 천천히 따라오게 해요.',
      check: '발끝을 멀리 보내려다 상체가 기울면 다리가 오가는 폭을 줄여요.',
    },
  },
  {
    ids: [
      'world-mat-toningball-chest-expansion',
      'world-reformer-kneeling-chest-expansion',
      'world-reformer-kneeling-reverse-chest-expansion',
      'world-cadillac-rollback-standing-chest-expansion',
      'world-cadillac-cadillac-kneeling-chest-expansion',
    ],
    note: {
      benefit: '팔을 뒤로 보내면서 어깨가 앞으로 말리지 않게 등과 팔 뒤쪽을 써요.',
      setup: '손에 줄이나 작은 공을 들고 몸통을 세워요. 줄을 쓰는 기구는 당기는 방향을 확인해요.',
      movement:
        '팔을 몸 옆으로 길게 보내 가슴 앞을 편 뒤, 몸통을 그대로 두고 팔을 천천히 되돌려요.',
      check: '가슴을 펴려고 갈비뼈를 불쑥 내밀지 않고 팔이 편하게 갈 수 있는 데까지만 뻗어요.',
    },
  },
  {
    ids: ['world-reformer-footwork-toes-parallel'],
    note: {
      benefit: '발로 바를 밀면서 엉덩이와 허벅지에 힘을 싣는 연습이에요.',
      setup: '리포머에 등을 대고 누워 발 앞쪽을 골반 너비로 나란히 바에 대요.',
      movement:
        '발 앞쪽으로 바를 밀어 판을 보내요. 발목이 흔들리지 않게 무릎을 천천히 굽혀 돌아와요.',
      check: '무릎과 발끝이 같은 쪽을 보게 둬요. 돌아올 때 발 한쪽에만 힘이 몰리는지 느껴 보세요.',
    },
  },
  {
    ids: ['world-reformer-footwork-arches'],
    note: {
      benefit: '발로 바를 밀면서 엉덩이와 허벅지에 힘을 싣는 연습이에요.',
      setup: '리포머에 등을 대고 누워 발바닥 가운데의 오목한 부분을 바에 대요.',
      movement: '바를 발바닥으로 가볍게 감싸며 다리를 펴요. 발이 미끄러지지 않게 무릎을 굽혀요.',
      check: '무릎과 발끝이 같은 쪽을 보게 둬요. 돌아올 때 발 한쪽에만 힘이 몰리는지 느껴 보세요.',
    },
  },
  {
    ids: ['world-reformer-footwork-heels'],
    note: {
      benefit: '발로 바를 밀면서 엉덩이와 허벅지에 힘을 싣는 연습이에요.',
      setup: '리포머에 등을 대고 누워 뒤꿈치를 바에 나란히 대고 발끝은 가볍게 들어요.',
      movement:
        '뒤꿈치로 바를 눌러 판을 보냈다가, 발끝과 무릎이 같은 방향을 보게 해 천천히 돌아와요.',
      check: '무릎과 발끝이 같은 쪽을 보게 둬요. 돌아올 때 발 한쪽에만 힘이 몰리는지 느껴 보세요.',
    },
  },
  {
    ids: ['world-reformer-footwork-pilates-v'],
    note: {
      benefit: '발로 바를 밀면서 엉덩이와 허벅지에 힘을 싣는 연습이에요.',
      setup:
        '리포머에 등을 대고 누워 발 앞쪽을 바에 대요. 뒤꿈치를 가까이 하고 발끝은 살짝 벌려요.',
      movement: '발끝과 무릎 방향을 맞춰 다리를 펴고, 골반을 두고 무릎만 굽혀 돌아와요.',
      check: '무릎과 발끝이 같은 쪽을 보게 둬요. 돌아올 때 발 한쪽에만 힘이 몰리는지 느껴 보세요.',
    },
  },
  {
    ids: ['world-reformer-footwork-second-wide'],
    note: {
      benefit: '발로 바를 밀면서 엉덩이와 허벅지에 힘을 싣는 연습이에요.',
      setup: '리포머에 등을 대고 누워 두 발을 바 양쪽에 넓게 대고 무릎과 발끝 방향을 맞춰요.',
      movement: '발로 바를 눌러 판을 멀리 보냈다가 무릎을 천천히 굽혀요.',
      check: '무릎과 발끝이 같은 쪽을 보게 둬요. 돌아올 때 발 한쪽에만 힘이 몰리는지 느껴 보세요.',
    },
  },
  {
    ids: ['world-reformer-footwork-single-leg'],
    note: {
      benefit: '한 발로 바를 밀어 다리를 펴면서 골반이 기울지 않게 엉덩이와 허벅지로 받쳐요.',
      setup: '리포머에 누워 해당 동작에 맞는 위치에 발을 대요. 바와 스프링은 강사와 맞춰요.',
      movement: '발로 바를 밀어 움직이는 판을 보내고, 무릎을 굽히면서 천천히 돌아와요.',
      check: '무릎과 발끝의 방향을 맞춰요. 돌아오는 동안에도 반대쪽 골반이 들리는지 느껴 보세요.',
    },
  },
  {
    ids: ['world-reformer-footwork-running-prancing'],
    note: {
      benefit: '발로 바를 밀고 뒤꿈치를 움직이면서 허벅지와 종아리에 차례로 힘을 실어요.',
      setup: '리포머에 등을 대고 누워 발 앞쪽을 바에 대고 두 다리를 펴요.',
      movement:
        '한쪽 무릎을 굽히며 반대쪽 뒤꿈치를 바 아래로 조금 내려요. 가운데를 거쳐 좌우를 번갈아 바꿔요.',
      check: '바를 밀 때는 무릎 방향을, 뒤꿈치를 내릴 때는 발목이 기울지 않는지 살펴보세요.',
    },
  },
  {
    ids: [
      'world-reformer-jumpboard-parallel-jump',
      'world-reformer-jumpboard-pilates-v',
      'world-reformer-jumpboard-single-leg-hop',
      'world-reformer-jumpboard-wide-frog',
      'world-reformer-jumpboard-side-lying-jump',
    ],
    note: {
      benefit:
        '발로 점프판을 밀었다가 다시 닿을 때 발목과 무릎을 부드럽게 써서 착지하는 연습이에요.',
      setup: '리포머에 몸을 받치고 강사와 점프판, 스프링, 발을 둘 자리를 확인해요.',
      movement:
        '발로 판을 밀어 낮게 뛰고 발이 닿자마자 무릎을 부드럽게 굽혀요. 판이 돌아오는 속도를 느끼며 반복해요.',
      check: '처음에는 낮게 뛰어요. 발이 닿으면 무릎을 편하게 굽혀 소리가 작게 착지해 보세요.',
    },
  },
  {
    ids: ['world-reformer-shortbox-flat-back'],
    note: {
      benefit: '앉은 자리에서 몸을 기울일 때 배와 옆구리가 상체의 무게를 받치는 느낌을 익혀요.',
      setup: '짧은 박스에 앉아 발을 줄에 걸고 척추를 길게 세워요.',
      movement: '등을 편 채 엉덩이를 중심으로 뒤로 기울였다가 배에 힘을 주며 다시 앉아요.',
      check: '발이 고정되는지 먼저 확인해요. 몸을 다시 세울 힘이 남아 있는 곳까지만 기울여요.',
    },
  },
  {
    ids: ['world-reformer-shortbox-side-to-side'],
    note: {
      benefit: '앉은 자리에서 몸을 기울일 때 배와 옆구리가 상체의 무게를 받치는 느낌을 익혀요.',
      setup: '박스 위에 앉아 발을 줄에 안정되게 걸고 양쪽 엉덩이에 고르게 무게를 실어요.',
      movement: '몸통을 옆으로 조금 기울였다가 반대쪽 옆구리로 몸을 세워요. 좌우를 번갈아 해요.',
      check: '발이 고정되는지 먼저 확인해요. 몸을 다시 세울 힘이 남아 있는 곳까지만 기울여요.',
    },
  },
  {
    ids: ['world-reformer-shortbox-twist-reach'],
    note: {
      benefit: '앉은 자리에서 몸을 기울일 때 배와 옆구리가 상체의 무게를 받치는 느낌을 익혀요.',
      setup: '박스에 앉아 발을 줄에 걸고 가슴과 골반을 정면에 둬요.',
      movement: '가슴을 한쪽으로 돌리고 대각선 뒤로 조금 뻗어요. 다시 몸을 세워 정면으로 돌아와요.',
      check: '발이 고정되는지 먼저 확인해요. 몸을 다시 세울 힘이 남아 있는 곳까지만 기울여요.',
    },
  },
  {
    ids: ['world-reformer-shortbox-around-the-world'],
    note: {
      benefit: '앉은 자리에서 몸을 기울일 때 배와 옆구리가 상체의 무게를 받치는 느낌을 익혀요.',
      setup: '짧은 박스에 앉아 발을 줄에 안정되게 걸고 양팔을 준비해요.',
      movement:
        '등을 말아 조금 기울인 뒤 몸통으로 원을 그려요. 반대쪽을 거쳐 앉은 중심으로 돌아와요.',
      check: '발이 고정되는지 먼저 확인해요. 몸을 다시 세울 힘이 남아 있는 곳까지만 기울여요.',
    },
  },
  {
    ids: ['world-reformer-longbox-overhead-press'],
    note: {
      benefit: '누워 팔을 머리 위로 보냈다 당기며 어깨와 팔의 힘을 쓰는 동작이에요.',
      setup: '긴 박스에 등을 대고 누워 손으로 줄을 잡고 팔을 준비해요.',
      movement:
        '팔을 머리 위쪽으로 보냈다가 몸 옆을 향해 천천히 내려요. 갈비뼈가 들리지 않는 거리를 골라요.',
      check: '팔이 멀어질 때 갈비뼈가 들리거나 허리가 꺾이는지 확인하고, 그 전에 돌아와요.',
    },
  },
  {
    ids: [
      'world-reformer-reformer-arabesque',
      'world-reformer-fusion-barre-footbar-arabesque',
      'world-reformer-fusion-barre-footbar-attitude',
      'world-cadillac-fusion-barre-cadillac-arabesque-pulse',
      'world-cadillac-fusion-barre-cadillac-attitude-passe',
      'world-chair-fusion-barre-chair-arabesque-press',
      'world-barrel-fusion-barre-barrel-attitude-pulse',
    ],
    note: {
      benefit: '한 다리를 뒤로 보냈다가 돌아오며 엉덩이가 다리를 움직이고 몸통은 중심을 잡게 해요.',
      setup: '강사가 안내한 시작 자세에서 한쪽 다리에 무게를 두고 골반의 방향을 잡아요.',
      movement:
        '반대쪽 허벅지를 뒤쪽으로 조금 들었다가 천천히 내려요. 구부린 무릎은 그 각도를 편하게 유지해요.',
      check: '다리를 높이 들려고 허리를 꺾지 않아요. 골반이 향하는 쪽을 일정하게 유지해요.',
    },
  },
  {
    ids: ['world-reformer-reformer-wheelbarrow'],
    note: {
      benefit: '팔로 몸을 받치면서 배와 엉덩이가 몸통을 곧게 유지하도록 연습해요.',
      setup: '해당 동작에서 손이나 팔꿈치를 짚는 곳과 발 또는 무릎이 놓일 곳을 먼저 잡아요.',
      movement:
        '팔로 몸을 받치고 정수리부터 골반까지 길게 뻗어요. 지지한 자리가 무너지기 전에 천천히 내려와 쉬어요.',
      check: '받치는 팔로 바닥이나 기구를 살짝 밀어요. 몸통이 처지기 전에 짧게 쉬었다가 다시 해요.',
    },
  },
  {
    ids: ['world-reformer-reformer-standing-lunge', 'world-reformer-reformer-reverse-lunge'],
    note: {
      benefit: '앞뒤로 발을 나누고 한쪽 다리에 체중을 실어 엉덩이와 허벅지 힘을 길러요.',
      setup: '한 발은 움직이는 판, 다른 발은 고정된 지지면에 놓고 앞뒤로 발을 나눠요.',
      movement:
        '앞 무릎과 엉덩이를 접으며 판을 뒤로 보냈다가 앞발로 눌러 끌어와요. 판이 멎으면 발을 바꿔요.',
      check: '앞 무릎이 발 안쪽으로 무너지지 않는 거리를 찾아요. 돌아올 때도 앞발을 고르게 눌러요.',
    },
  },
  {
    ids: ['world-reformer-reformer-straps-peter-pan'],
    note: {
      benefit: '한 무릎을 접고 반대 다리를 뻗으며 줄의 당김 속에서도 골반을 고르게 받쳐요.',
      setup: '등을 대고 누워 두 발을 줄에 걸고 다리를 편안한 높이로 뻗어요.',
      movement: '한쪽 무릎을 옆으로 접고 다른 다리를 뻗어요. 두 다리를 다시 모은 뒤 방향을 바꿔요.',
      check: '다리를 바꿀 때 줄이 갑자기 느슨해지지 않도록 두 발을 천천히 움직여요.',
    },
  },
  {
    ids: ['world-cadillac-rollback-single-arm-twist'],
    note: {
      benefit: '지지하는 곳은 움직이지 않게 두고 가슴을 돌리면서 옆구리를 쓰는 연습이에요.',
      setup: '캐딜락에 정면으로 앉아 한 손으로 바 가운데를 잡고 엉덩이에 고르게 무게를 실어요.',
      movement:
        '등을 조금 말아 기울이는 동안 빈팔을 뒤로 열며 가슴을 돌려요. 정면으로 돌아오며 몸을 세워요.',
      check: '팔만 뒤로 넘기지 말고 시선이 가슴을 따라가게 해요.',
    },
  },
  {
    ids: ['world-cadillac-rollback-chest-opener'],
    note: {
      benefit: '가슴 앞을 펴면서 등이 뒤로 기울어지는 범위를 천천히 찾아요.',
      setup: '캐딜락에 앉아 발을 기둥에 대고 바를 가슴 앞에서 잡아요.',
      movement: '가슴을 편 채 바를 몸 쪽으로 당겼다가 팔을 천천히 펴요.',
      check:
        '턱부터 젖히지 않고 가슴 앞면을 먼저 길게 펴요. 목을 편안하게 둘 수 있는 곳에서 멈춰요.',
    },
  },
  {
    ids: ['world-cadillac-pushthrough-supine-footwork'],
    note: {
      benefit: '누워서 발로 바를 밀면서 허벅지에 힘을 싣고 무릎을 천천히 굽히는 연습이에요.',
      setup: '캐딜락에 누워 강사의 보조를 받아 발을 바에 올려요. 바의 안전장치를 확인해요.',
      movement: '발로 바를 밀어 무릎을 폈다가, 바가 발을 밀어내는 힘을 받으며 천천히 굽혀요.',
      check:
        '강사와 바의 고정을 확인한 뒤 움직여요. 바가 돌아올 때도 지지하는 발이 떨어지지 않게 끝까지 따라와요.',
    },
  },
  {
    ids: ['world-cadillac-pushthrough-press-up'],
    note: {
      benefit: '누운 채 양손으로 바를 밀어 가슴과 팔이 함께 힘을 내는 느낌을 익혀요.',
      setup: '캐딜락에 등을 대고 누워 강사와 안전 스트랩을 확인하고 바를 가슴 위에서 잡아요.',
      movement: '팔을 펴 바를 밀어 올렸다가 천천히 굽혀 가슴 위로 돌아와요.',
      check: '강사와 바의 안전 스트랩을 확인하고, 팔을 천천히 굽혀 돌아오는 길까지 따라와요.',
    },
  },
  {
    ids: ['world-cadillac-trapeze-breathing'],
    note: {
      benefit: '다리로 매달린 줄을 누르고 팔로 바를 밀며 숨과 함께 골반을 들고 내리는 연습이에요.',
      setup: '캐딜락에 누워 발목을 매달린 고리에 두고 손으로 바를 잡아요. 강사가 고정을 확인해요.',
      movement:
        '바를 허벅지 쪽으로 누르며 엉덩이를 들어요. 등을 천천히 내려놓고 바를 원래 자리로 되돌려요.',
      check:
        '강사와 바와 발걸이 위치부터 맞춰요. 골반을 내려놓을 때도 줄의 움직임을 끝까지 따라와요.',
    },
  },
  {
    ids: ['world-cadillac-cadillac-prone-dart'],
    note: {
      benefit: '가슴을 앞쪽으로 길게 뻗으며 등 윗부분을 펴는 힘을 길러요.',
      setup: '캐딜락 테이블에 엎드려 강사와 맞춘 손잡이를 잡고 골반을 받쳐요.',
      movement:
        '팔을 뒤로 길게 당기면서 윗등과 가슴을 조금 들어요. 팔과 가슴을 천천히 처음 자리로 돌려요.',
      check:
        '턱을 들어 올리기보다 정수리를 멀리 보내요. 허리 한곳이 접히는 느낌이 들면 높이를 낮춰요.',
    },
  },
  {
    ids: ['world-chair-chair-single-leg-pump-seated'],
    note: {
      benefit: '한 발로 페달을 누르는 동안 골반을 한쪽으로 기울이지 않는 연습이에요.',
      setup: '체어에 앉아 강사가 맞춰 준 위치에 발을 놓고 몸통을 곧게 세워요.',
      movement: '발로 페달을 누르고 무릎을 천천히 굽혀요. 올라오는 페달을 발로 따라가요.',
      check:
        '페달을 놓치지 않고 원래 높이까지 따라와요. 양쪽이 얼마나 다르게 느껴지는지도 살펴보세요.',
    },
  },
  {
    ids: ['world-chair-chair-side-lying-pedal-press'],
    note: {
      benefit: '옆으로 누워 발로 밀면서 허벅지와 엉덩이로 힘을 내는 연습이에요.',
      setup: '체어에 옆으로 누워 강사와 발이 페달에 닿는 위치를 맞추고 머리를 받쳐요.',
      movement: '발로 페달을 작게 눌렀다가 천천히 돌아와요. 양쪽 골반은 포개 둬요.',
      check: '위쪽 골반이 뒤로 넘어가지 않게 포개 두고, 무릎을 천천히 굽혀 돌아와요.',
    },
  },
  {
    ids: ['world-chair-chair-hamstring-stretch-1', 'world-chair-chair-hamstring-stretch-2'],
    note: {
      benefit: '다리 뒤쪽이 늘어나는 느낌을 따라 천천히 무릎을 펴고 몸을 기울여 봐요.',
      setup: '발이나 손을 기구에 대고 강사와 바 또는 페달이 움직이는 길을 먼저 맞춰요.',
      movement:
        '다리 뒤가 가볍게 당길 만큼만 무릎을 펴요. 몸통을 길게 유지하고 무릎을 다시 부드럽게 굽혀요.',
      check: '무릎을 끝까지 밀어 펴지 않아도 돼요. 숨을 멈추지 않고 머물 수 있는 범위를 찾아요.',
    },
  },
  {
    ids: [
      'world-chair-chair-scapular-isolations',
      'world-mat-fusion-mobility-scapular-pushup',
      'world-reformer-fusion-mobility-reformer-scapular-pushup',
    ],
    note: {
      benefit: '팔을 편 채 날개뼈가 가까워졌다 멀어지는 움직임으로 어깨 주변의 지지력을 길러요.',
      setup: '팔을 펴 손바닥으로 지지면을 짚고 머리와 몸통을 길게 뻗어요.',
      movement:
        '가슴을 조금 내려 날개뼈를 가까이했다가 바닥을 밀어 다시 벌려요. 팔꿈치는 편안히 펴 둬요.',
      check: '팔꿈치를 굽히지 않고 움직여 봐요. 가슴과 날개뼈 사이가 조금만 오가도 충분해요.',
    },
  },
  {
    ids: ['world-chair-chair-prone-press-up'],
    note: {
      benefit: '가슴을 앞쪽으로 길게 뻗으며 등 윗부분을 펴는 힘을 길러요.',
      setup: '체어 좌면에 배와 골반을 받치고 양손을 페달에 둬요. 두 다리는 뒤로 길게 뻗어요.',
      movement:
        '팔꿈치를 뒤로 접으며 가슴을 낮췄다가 페달을 누르며 펴요. 몸을 편안히 받치는 높이로 돌아와요.',
      check:
        '턱을 들어 올리기보다 정수리를 멀리 보내요. 허리 한곳이 접히는 느낌이 들면 높이를 낮춰요.',
    },
  },
  {
    ids: ['world-chair-chair-frog-facing-front'],
    note: {
      benefit: '발 앞쪽으로 페달을 받치고 팔 뒤쪽과 등으로 몸을 들어 올리는 힘을 길러요.',
      setup: '체어를 마주 보고 좌판 앞쪽 양 모서리를 짚어요. 양발 앞쪽을 페달에 대고 뒤꿈치를 모은 뒤, 무릎을 양옆으로 벌려 낮게 앉아요.',
      movement: '무릎을 벌린 채 쪼그린 모양을 유지해요. 양손으로 좌판을 눌러 팔꿈치를 펴면 몸과 페달이 함께 올라와요. 팔꿈치를 천천히 굽혀 내려와요.',
      check: '엉덩이를 뒤꿈치에 내려앉지 않게 조금 띄워요. 올라갈 때 어깨가 귀 쪽으로 솟거나 뒤꿈치가 벌어지지 않는지 살펴보세요.',
    },
  },
  {
    ids: ['world-barrel-barrel-shortbox-flat-back'],
    note: {
      benefit: '앉은 자리에서 몸을 기울일 때 배와 옆구리가 상체의 무게를 받치는 느낌을 익혀요.',
      setup: '발을 고정하고 박스나 바렐 위에 앉아 척추를 길게 세워요.',
      movement: '등을 편 채 엉덩이를 중심으로 몸통을 뒤로 기울였다가 다시 세워요.',
      check: '발이 고정되는지 먼저 확인해요. 몸을 다시 세울 힘이 남아 있는 곳까지만 기울여요.',
    },
  },
  {
    ids: ['world-barrel-barrel-shortbox-twist'],
    note: {
      benefit: '앉은 자리에서 몸을 기울일 때 배와 옆구리가 상체의 무게를 받치는 느낌을 익혀요.',
      setup: '발을 고정하고 박스나 바렐 중앙에 앉아 가슴을 편하게 세워요.',
      movement: '가슴을 한쪽으로 돌리고 대각선 뒤로 조금 뻗어요. 다시 몸을 세워 정면으로 돌아와요.',
      check: '발이 고정되는지 먼저 확인해요. 몸을 다시 세울 힘이 남아 있는 곳까지만 기울여요.',
    },
  },
  {
    ids: ['world-barrel-barrel-shortbox-around-world'],
    note: {
      benefit: '앉은 자리에서 몸을 기울일 때 배와 옆구리가 상체의 무게를 받치는 느낌을 익혀요.',
      setup: '박스나 바렐 위에 앉아 발 고정을 확인하고 양팔을 준비해요.',
      movement:
        '등을 둥글게 말며 조금 기울이고 옆과 뒤로 작은 원을 그려요. 반대쪽을 지나 앉은 중심으로 돌아와요.',
      check: '발이 고정되는지 먼저 확인해요. 몸을 다시 세울 힘이 남아 있는 곳까지만 기울여요.',
    },
  },
  {
    ids: ['world-barrel-spine-corrector-bicycle'],
    note: {
      benefit: '자전거 페달을 밟듯 다리를 번갈아 접고 펴면서 양쪽 고관절을 부드럽게 움직여요.',
      setup:
        '스파인 코렉터의 곡면에 골반 뒤를 받치고 등을 편하게 둬요. 다리를 들기 전에 중심을 잡아요.',
      movement:
        '자전거를 타듯 무릎을 번갈아 접고 펴서 다리로 둥근 길을 그려요. 원을 작게 줄인 뒤 멈춰요.',
      check: '한쪽 무릎을 접을 때 다른 쪽 골반이 따라서 들리지 않는 크기로 원을 그려요.',
    },
  },
  {
    ids: ['world-barrel-spine-corrector-helicopter'],
    note: {
      benefit: '다리를 가위처럼 벌려 서로 다른 길로 돌리면서 배와 옆구리로 골반을 받쳐요.',
      setup: '등과 골반을 기구에 안정되게 받치고 다리를 들어요.',
      movement:
        '한 다리는 앞쪽으로, 다른 다리는 뒤쪽으로 보내며 원을 겹쳐 그려요. 두 다리를 모아 천천히 내려요.',
      check: '큰 원을 그리는 것보다 양쪽이 끊기지 않고 같은 속도로 이어지는지 느껴 봐요.',
    },
  },
  {
    ids: ['world-barrel-spine-corrector-swan'],
    note: {
      benefit: '가슴을 앞쪽으로 길게 뻗으며 등 윗부분을 펴는 힘을 길러요.',
      setup:
        '스파인 코렉터의 곡면에 엎드려 아랫배와 골반을 받쳐요. 발끝은 바닥에 두고 손은 바닥이나 단에 짚어요.',
      movement: '가슴을 앞으로 길게 뻗어 윗등을 조금 들었다가 천천히 돌아와요.',
      check:
        '턱을 들어 올리기보다 정수리를 멀리 보내요. 허리 한곳이 접히는 느낌이 들면 높이를 낮춰요.',
    },
  },
  {
    ids: ['world-barrel-barrel-glute-kickback'],
    note: {
      benefit: '다리를 뒤로 보낼 때 엉덩이 뒤쪽에 힘을 쓰고 허리를 길게 유지하는 연습이에요.',
      setup: '바렐 옆에 서서 고정된 곳을 잡고 한 발에 중심을 실어요.',
      movement: '동작에 맞춰 반대 다리를 뒤나 옆으로 짧게 뻗었다가 천천히 모아요.',
      check:
        '허리가 꺾이기 시작하면 다리를 조금 낮춰요. 발끝보다 허벅지가 뒤로 간다고 생각해 보세요.',
    },
  },
  {
    ids: ['world-reformer-reformer-supine-lat-pulldown'],
    note: {
      benefit: '팔을 몸 옆으로 당기면서 팔 뒤쪽과 겨드랑이 아래의 힘을 느껴요.',
      setup: '리포머에 등을 대고 누워 줄을 잡은 팔을 위로 뻗어요.',
      movement: '팔을 골반 옆으로 누르며 머리와 가슴을 조금 들었다가 몸과 팔을 천천히 내려놓아요.',
      check: '손을 멀리 보내려다 어깨가 들뜨면 손이 오가는 거리를 조금 줄여요.',
    },
  },
  {
    ids: ['world-reformer-reformer-hip-flexor-stretch'],
    note: {
      benefit: '기구의 지지를 이용해 평소보다 천천히 몸을 뻗고, 편하게 늘어나는 범위를 찾아요.',
      setup: '바를 짚고 기구 위에서 앞뒤로 다리를 나눠요. 앞발과 반대쪽 무릎의 지지를 확인해요.',
      movement:
        '판을 천천히 보내 뒷다리 앞면을 늘였다가 조금 돌아와요. 앞 무릎을 펴며 허벅지 뒤도 편하게 늘여요.',
      check: '발이나 몸이 닿은 곳이 흔들리지 않는지 확인하고 숨을 쉬며 조금씩 움직여요.',
    },
  },
  {
    ids: ['world-cadillac-cadillac-guillotine'],
    note: {
      benefit: '다리 뒤쪽이 늘어나는 느낌을 따라 천천히 무릎을 펴고 몸을 기울여 봐요.',
      setup: '강사의 보조 아래 캐딜락에 누워 안전 스트랩을 확인하고 양발 앞쪽을 바 아래에 대요.',
      movement:
        '무릎을 펴며 바를 천장 쪽으로 밀어요. 강사와 정한 높이에서 멈춘 뒤 무릎을 굽혀 돌아와요.',
      check: '무릎을 끝까지 밀어 펴지 않아도 돼요. 숨을 멈추지 않고 머물 수 있는 범위를 찾아요.',
    },
  },
  {
    ids: ['world-cadillac-cadillac-reverse-pushthrough'],
    note: {
      benefit: '가슴 앞을 펴면서 등이 뒤로 기울어지는 범위를 천천히 찾아요.',
      setup:
        '캐딜락 바를 등지고 앉아 손을 뒤로 보내 바를 넓게 잡아요. 강사와 바의 고정을 확인해요.',
      movement:
        '잡은 바를 따라 가슴을 앞과 위로 길게 열어요. 허리만 꺾이지 않는 범위에서 다시 앉은 중심으로 돌아와요.',
      check:
        '턱부터 젖히지 않고 가슴 앞면을 먼저 길게 펴요. 목을 편안하게 둘 수 있는 곳에서 멈춰요.',
    },
  },
  {
    ids: ['world-cadillac-cadillac-prone-legspring-glute-lift'],
    note: {
      benefit: '다리를 뒤로 보낼 때 엉덩이 뒤쪽에 힘을 쓰고 허리를 길게 유지하는 연습이에요.',
      setup: '캐딜락에 엎드려 발에 단 스프링을 강사와 확인하고 골반 앞쪽을 받쳐요.',
      movement: '다리를 뒤쪽으로 길게 뻗어 조금 들었다가 스프링에 끌려가지 않게 천천히 내려요.',
      check:
        '허리가 꺾이기 시작하면 다리를 조금 낮춰요. 발끝보다 허벅지가 뒤로 간다고 생각해 보세요.',
    },
  },
  {
    ids: ['world-chair-chair-standing-pike-one-arm'],
    note: {
      benefit: '손과 발로 기구를 밀면서 아랫배의 힘으로 골반을 들어 올리는 동작이에요.',
      setup:
        '강사가 보조하는 상태에서 발 앞쪽을 체어 페달에 두고 한 손으로 좌면 한가운데를 짚어요.',
      movement:
        '지지하는 손으로 좌면을 밀면서 골반을 들어 페달을 끌어올려요. 몸이 한쪽으로 돌지 않게 천천히 내려요.',
      check:
        '짚고 있는 손으로 지지면을 눌러 어깨 사이가 푹 꺼지지 않게 해요. 기구가 급하게 돌아오지 않게 천천히 내려와요.',
    },
  },
  {
    ids: ['world-chair-chair-swan-one-arm'],
    note: {
      benefit: '가슴을 앞쪽으로 길게 뻗으며 등 윗부분을 펴는 힘을 길러요.',
      setup:
        '체어에 엎드려 양손으로 페달을 받치고 가슴을 조금 들어요. 강사와 확인한 뒤 한 손을 페달 중앙에 놓아요.',
      movement:
        '중앙을 짚은 손으로 페달을 받치며 반대 팔을 앞으로 길게 뻗어요. 빈손을 다시 올린 뒤 몸을 천천히 내려요.',
      check:
        '턱을 들어 올리기보다 정수리를 멀리 보내요. 허리 한곳이 접히는 느낌이 들면 높이를 낮춰요.',
    },
  },
  {
    ids: ['world-mat-fitnessball-prone-swan'],
    note: {
      benefit: '가슴을 앞쪽으로 길게 뻗으며 등 윗부분을 펴는 힘을 길러요.',
      setup:
        '짐볼 가운데에 골반과 배를 대고 발을 바닥이나 벽에 안정되게 받쳐요. 팔은 편안히 벌려요.',
      movement:
        '공이 구르지 않는 높이까지만 가슴을 앞으로 뻗으며 들어요. 발을 지지한 채 천천히 내려와요.',
      check:
        '턱을 들어 올리기보다 정수리를 멀리 보내요. 허리 한곳이 접히는 느낌이 들면 높이를 낮춰요.',
    },
  },
  {
    ids: [
      'world-mat-dumbbell-standing-row-hinge',
      'world-reformer-fusion-athletic-reformer-birddog-row',
      'world-mat-fusion-athletic-mat-birddog-dumbbell-row',
      'world-cadillac-fusion-athletic-cadillac-single-leg-hinge-row',
    ],
    note: {
      benefit: '몸을 지지한 채 한쪽이나 양쪽 팔꿈치를 당겨 등과 배로 흔들림을 잡는 연습이에요.',
      setup: '발이나 손, 무릎으로 중심을 잡고 한 손 또는 양손에 손잡이나 덤벨을 들어요.',
      movement: '팔꿈치를 뒤로 보내 등으로 당겼다가 손을 처음 위치로 천천히 내려요.',
      check: '팔이 돌아갈 때 가슴이 같이 돌아가지 않게 천천히 펴요.',
    },
  },
  {
    ids: ['world-reformer-reformer-high-bridge'],
    note: {
      benefit:
        '골반을 들어 올린 상태에서 한 다리를 움직여 지지하는 쪽 엉덩이와 허벅지 뒤의 힘을 써요.',
      setup: '리포머에 누워 머리 받침을 평평하게 내리고 발을 바에 대요.',
      movement: '발로 바를 눌러 골반을 조금 들어요. 움직이는 판을 조절하며 등부터 천천히 내려와요.',
      check: '양쪽 골반 높이를 편하게 유지할 수 있는 거리까지만 다리를 보내요.',
    },
  },
  {
    ids: ['world-reformer-reformer-kneeling-side-splits'],
    note: {
      benefit: '다리를 옆으로 벌렸다 모을 때 엉덩이 옆쪽과 허벅지 안쪽을 고르게 쓰는 연습이에요.',
      setup:
        '강사의 보조를 받아 고정된 곳과 움직이는 판 쪽에 무릎을 나눠 대고 가운데에 몸을 세워요.',
      movement:
        '몸통을 세운 채 무릎 사이를 조금 벌렸다가 다리 안쪽에 힘을 주며 판을 천천히 끌어와요.',
      check:
        '다시 모을 수 있는 거리까지만 벌려요. 움직이는 판이 제자리로 돌아올 때까지 천천히 속도를 줄여요.',
    },
  },
  {
    ids: [
      'world-cadillac-cadillac-hanging-back-extension',
      'world-cadillac-cadillac-spread-eagle-single',
      'world-barrel-barrel-layout-extension',
    ],
    note: {
      benefit:
        '기구에 몸을 지지하고 가슴을 펴면서 등과 몸 뒤쪽으로 체중을 조절하는 심화 동작이에요.',
      setup: '손과 발로 매달리거나 기댈 자리를 강사와 먼저 확인하고 몸을 받쳐요.',
      movement: '기구가 몸을 받쳐 주는 범위 안에서 가슴을 앞쪽으로 펼쳤다가 천천히 돌아와요.',
      check:
        '강사가 지지 위치와 내려오는 방법을 확인한 뒤 연습해요. 목을 꺾어서 범위를 늘리지 않아요.',
    },
  },
  {
    ids: ['world-chair-chair-frog-facing-back'],
    note: {
      benefit: '발 앞쪽으로 페달을 받치고 팔 뒤쪽과 등으로 몸을 들어 올리는 힘을 길러요.',
      setup: '체어를 등지고 좌판 앞쪽에 앉아 엉덩이 양옆의 앞 모서리를 짚어요. 양발 앞쪽을 페달에 놓고 뒤꿈치를 모아요. 무릎을 벌리고 엉덩이를 좌판 앞쪽으로 내려요.',
      movement: '무릎을 벌린 채 쪼그린 모양을 유지해요. 양손으로 좌판을 눌러 팔꿈치를 펴면 몸과 페달이 함께 올라와요. 팔꿈치를 천천히 굽혀 내려와요.',
      check: '엉덩이를 뒤꿈치에 내려앉지 않게 조금 띄워요. 올라갈 때 어깨가 귀 쪽으로 솟거나 뒤꿈치가 벌어지지 않는지 살펴보세요.',
    },
  },
  {
    ids: ['world-barrel-barrel-swan-arms-overhead'],
    note: {
      benefit: '가슴을 앞쪽으로 길게 뻗으며 등 윗부분을 펴는 힘을 길러요.',
      setup: '바렐 곡면에 배와 골반을 대고 사다리에 발을 받쳐요. 강사와 지지 위치를 확인해요.',
      movement:
        '가슴을 편 뒤 팔을 옆에서 귀 옆으로 뻗어요. 허리가 편한 높이에서 팔을 내리고 몸통을 돌려놔요.',
      check:
        '턱을 들어 올리기보다 정수리를 멀리 보내요. 허리 한곳이 접히는 느낌이 들면 높이를 낮춰요.',
    },
  },
  {
    ids: ['world-barrel-barrel-handstand-prep'],
    note: {
      benefit:
        '거꾸로 서기 전, 손과 어깨로 몸을 밀어 올리며 체중을 받치는 감각을 배우는 준비 동작이에요.',
      setup: '강사의 보조를 받아 손으로 바닥을 짚고 발을 바렐에 대요.',
      movement: '손으로 바닥을 밀면서 골반을 조금씩 높였다가 강사와 정한 순서로 천천히 내려와요.',
      check: '혼자 다리를 차 올리지 않아요. 강사와 손의 위치, 발이 돌아올 자리를 먼저 맞춰요.',
    },
  },
  {
    ids: ['world-mat-fusion-barre-mat-pretzel-glute'],
    note: {
      benefit: '한 다리를 뒤로 보냈다가 돌아오며 엉덩이가 다리를 움직이고 몸통은 중심을 잡게 해요.',
      setup: '매트에 한 다리는 앞, 다른 다리는 옆뒤로 접어 앉고 앞쪽 손끝을 가볍게 짚어요.',
      movement: '뒤쪽 허벅지를 조금 들어 엉덩이 뒤로 짧게 보냈다가 천천히 내려요.',
      check: '다리를 높이 들려고 허리를 꺾지 않아요. 골반이 향하는 쪽을 일정하게 유지해요.',
    },
  },
  {
    ids: ['world-mat-fusion-barre-mat-passe-releve'],
    note: {
      benefit: '한 다리로 선 채 뒤꿈치를 들며 발목과 엉덩이로 균형을 잡는 연습이에요.',
      setup: '바닥에 서서 한쪽 발끝을 반대쪽 무릎 가까이에 가볍게 둬요.',
      movement:
        '지지하는 발의 뒤꿈치를 조금 들어 중심을 잡고 천천히 내려와요. 방향을 바꾸기 전에 두 발을 짚어요.',
      check: '벽이나 고정된 지지대를 닿는 곳에 두세요. 흔들리면 뒤꿈치를 낮춰 다시 중심을 잡아요.',
    },
  },
  {
    ids: [
      'world-reformer-fusion-athletic-reformer-pallof-press',
      'world-reformer-fusion-athletic-reformer-standing-pallof',
      'world-cadillac-fusion-athletic-cadillac-pallof',
    ],
    note: {
      benefit:
        '옆에서 당기는 힘을 받으며 손을 앞으로 뻗어도 가슴과 골반이 돌아가지 않게 배를 써요.',
      setup: '기구가 옆에 오게 몸을 세우고, 옆에서 당겨지는 손잡이를 가슴 가까이 잡아요.',
      movement:
        '가슴이 정면을 향한 채 손을 앞으로 뻗어요. 몸이 돌아가기 전에 멈췄다가 손을 되돌려요.',
      check: '손이 멀어질수록 몸이 같이 돌면 팔을 덜 펴요. 옆구리에 힘이 들어오는지 느껴 보세요.',
    },
  },
  {
    ids: [
      'world-reformer-fusion-athletic-reformer-copenhagen',
      'world-chair-fusion-athletic-chair-copenhagen',
      'world-mat-fusion-athletic-copenhagen-mat',
    ],
    note: {
      benefit: '옆으로 지지하면서 위쪽 다리 안쪽과 옆구리가 몸의 무게를 받치는 감각을 익혀요.',
      setup:
        '옆으로 몸을 받치고 위쪽 다리를 움직이지 않는 지지면에 올려요. 팔꿈치로 바닥을 짚어요.',
      movement:
        '위쪽 다리 안쪽으로 받침을 누르면서 골반을 조금 들어요. 천천히 내려놓고 반대쪽도 해요.',
      check: '위쪽 다리가 닿는 곳이 움직이지 않는지 확인하고 어깨로 바닥을 밀어요.',
    },
  },
  {
    ids: ['world-reformer-fusion-athletic-reformer-knee-tuck-pike'],
    note: {
      benefit: '팔로 몸을 받치고 배에 힘을 주어 다리와 몸통 사이를 가까이 가져오는 연습이에요.',
      setup: '양손으로 리포머 바를 짚고 발을 움직이는 판에 두어 몸을 곧게 받쳐요.',
      movement:
        '먼저 무릎을 굽혀 판을 가슴 쪽으로 당겼다가 다시 밀어요. 다음엔 다리를 편 채 엉덩이를 높여 판을 끌어오고 천천히 몸을 펴요.',
      check: '다리가 가까워질 때 어깨가 귀 쪽으로 올라오지 않게 지지하는 곳을 가볍게 밀어요.',
    },
  },
  {
    ids: [
      'world-reformer-fusion-athletic-reformer-single-leg-hinge',
      'world-mat-fusion-athletic-mat-single-leg-rdl',
    ],
    note: {
      benefit: '한 발로 서서 몸을 앞으로 기울이며 엉덩이와 허벅지 뒤쪽이 무게를 받게 해요.',
      setup: '한 발에 무게를 싣고 지지하는 무릎을 부드럽게 굽혀요.',
      movement:
        '엉덩이를 뒤로 보내며 상체를 기울이고 반대 다리를 뒤로 뻗어요. 발바닥을 눌러 다시 서요.',
      check: '가슴만 낮추기보다 엉덩이를 뒤로 보내요. 골반 한쪽이 열리기 전까지만 기울여요.',
    },
  },
  {
    ids: ['world-mat-fusion-athletic-toningball-upper-combo'],
    note: {
      benefit: '손에 든 공을 움직이며 팔과 어깨를 쓰고 몸통으로 균형을 잡는 연습이에요.',
      setup: '양손에 작은 공을 가볍게 쥐고 발과 몸통을 안정시켜요.',
      movement:
        '팔꿈치를 접거나 팔을 뻗어 공을 옮겨요. 손목을 꺾지 않고 다시 처음 자리로 돌아와요.',
      check: '손에 힘을 꽉 쥐지 말고 팔을 다시 내려놓는 길까지 부드럽게 조절해요.',
    },
  },
  {
    ids: ['world-mat-fusion-athletic-bosu-single-leg-reach'],
    note: {
      benefit: '한 발로 흔들리는 면을 딛고 손이나 발을 뻗으며 발목과 엉덩이로 균형을 잡아요.',
      setup: '강사와 지지대를 확인하고 보수 위에 한 발을 디뎌요.',
      movement:
        '반대쪽 발끝을 시계의 여러 방향으로 짧게 보냈다가 모아요. 중심을 잡은 뒤 반대쪽으로 바꿔요.',
      check: '가까이 있는 고정된 지지대부터 확인해요. 흔들림이 커지면 뻗는 거리를 줄여요.',
    },
  },
  {
    ids: ['world-mat-fusion-mobility-9090-hip-switch'],
    note: {
      benefit: '앉아서 접어 둔 두 다리의 방향을 바꾸며 고관절이 안팎으로 움직이는 범위를 익혀요.',
      setup: '매트에 앉아 두 무릎을 굽히고 한 다리는 앞에, 다른 다리는 옆에 놓아요.',
      movement: '양 무릎의 방향을 천천히 바꿔 반대쪽으로 앉아 봐요. 엉덩이가 무거우면 손을 짚어요.',
      check: '무릎을 바닥에 억지로 누르지 않아요. 필요하면 뒤에 손을 짚어 몸을 가볍게 받쳐요.',
    },
  },
  {
    ids: ['world-mat-fusion-mobility-9090-shinbox-lift'],
    note: {
      benefit: '두 정강이로 바닥을 눌러 앉았다 일어서면서 엉덩이로 골반을 들어 올리는 연습이에요.',
      setup: '앞뒤로 무릎을 접어 매트에 앉고 두 정강이를 바닥에 안정되게 둬요.',
      movement:
        '정강이로 바닥을 누르며 골반을 앞과 위로 들어 무릎으로 서요. 천천히 같은 쪽으로 다시 앉아요.',
      check: '상체만 앞으로 던지지 않고 다리가 받쳐 주는 힘으로 올라와요.',
    },
  },
  {
    ids: [
      'world-mat-fusion-mobility-worlds-greatest-stretch',
      'world-reformer-fusion-mobility-reformer-wgs-twist',
      'world-mat-fusion-mobility-deep-squat-thoracic-reach',
    ],
    note: {
      benefit: '다리를 굽힌 자세에서 가슴을 돌려 엉덩이와 등 윗부분을 함께 움직여요.',
      setup: '무릎을 굽혀 몸을 낮추고 한 손으로 바닥이나 기구를 받쳐요.',
      movement:
        '가슴을 돌리며 다른 손을 위로 보냈다가 지지하는 손 가까이 되돌려요. 중심을 잡고 방향을 바꿔요.',
      check: '손으로 바닥이나 기구를 받치고, 가슴이 돌아가는 만큼만 위쪽 팔을 따라 보내요.',
    },
  },
  {
    ids: [
      'world-mat-fusion-mobility-thread-the-needle',
      'world-reformer-fusion-mobility-reformer-thread-needle',
    ],
    note: {
      benefit: '가슴과 등 윗부분을 돌려 양쪽의 움직임이 어떻게 다른지 느껴 봐요.',
      setup: '손과 무릎을 짚어 몸을 받치고 한 손에 무게를 옮겨요.',
      movement:
        '반대 팔을 몸 아래로 천천히 밀어 등 윗부분을 돌려요. 지지한 손으로 바닥을 눌러 돌아와요.',
      check:
        '팔을 더 멀리 보내려다 골반이 들리면 조금 돌아와요. 눈은 가슴이 돌아가는 쪽을 따라가요.',
    },
  },
  {
    ids: [
      'world-mat-fusion-mobility-pigeon-hip-release',
      'world-reformer-fusion-mobility-reformer-pigeon-footbar',
      'world-barrel-fusion-mobility-barrel-pigeon-release',
    ],
    note: {
      benefit: '엉덩이 바깥쪽이 편안하게 늘어나는 자리에서 숨을 쉬며 다리의 긴장을 풀어요.',
      setup: '한쪽 다리를 접어 앞쪽에 두고 손이나 기구로 몸을 받쳐요.',
      movement:
        '엉덩이 바깥쪽이 편안하게 당길 만큼만 자세를 잡아요. 숨을 쉰 뒤 손으로 받치며 다리를 풀어요.',
      check: '무릎으로 눌러 각도를 만들지 않아요. 엉덩이 쪽에 가볍게 당기는 느낌이면 충분해요.',
    },
  },
  {
    ids: ['world-mat-fusion-mobility-spinal-wave'],
    note: {
      benefit: '등을 둥글게 말았다 펴며 척추가 차례로 움직이는 감각을 익혀요.',
      setup: '매트에 손발을 짚고 엉덩이를 높여 옆에서 봤을 때 거꾸로 된 V 모양을 만들어요.',
      movement:
        '뒤꿈치를 조금 들고 골반부터 등을 둥글게 말며 앞으로 와요. 어깨가 손목 위에 오면 몸을 길게 편 뒤 엉덩이를 다시 높여요.',
      check: '고개만 움직이지 않게 골반과 등 가운데의 움직임에도 주의를 기울여 보세요.',
    },
  },
  {
    ids: ['world-cadillac-fusion-mobility-cadillac-spinal-wave'],
    note: {
      benefit: '등을 둥글게 말았다 펴며 척추가 차례로 움직이는 감각을 익혀요.',
      setup: '캐딜락 끝에 서서 강사와 안전장치를 확인하고 양손으로 바를 잡아요.',
      movement:
        '등을 둥글게 말며 바를 앞으로 보내요. 가슴을 길게 펴고 바가 돌아오는 속도를 따라 천천히 일어나요.',
      check: '고개만 움직이지 않게 골반과 등 가운데의 움직임에도 주의를 기울여 보세요.',
    },
  },
  {
    ids: ['world-chair-fusion-mobility-chair-spinal-wave'],
    note: {
      benefit: '등을 둥글게 말았다 펴며 척추가 차례로 움직이는 감각을 익혀요.',
      setup: '체어 앞 매트에 무릎을 대고 양손으로 페달을 받쳐요.',
      movement:
        '골반부터 등을 둥글게 말며 페달을 누른 뒤 가슴을 앞으로 길게 펴요. 페달을 받치면서 천천히 처음 자세로 돌아와요.',
      check: '고개만 움직이지 않게 골반과 등 가운데의 움직임에도 주의를 기울여 보세요.',
    },
  },
  {
    ids: ['world-mat-fusion-mobility-thoracic-windmill'],
    note: {
      benefit: '가슴과 등 윗부분을 돌려 양쪽의 움직임이 어떻게 다른지 느껴 봐요.',
      setup: '옆으로 누워 무릎을 포개고 팔을 가슴 앞쪽으로 뻗어요.',
      movement: '위쪽 팔을 크게 열며 가슴을 따라 돌려요. 팔과 가슴을 천천히 처음 자리로 되돌려요.',
      check:
        '팔을 더 멀리 보내려다 골반이 들리면 조금 돌아와요. 눈은 가슴이 돌아가는 쪽을 따라가요.',
    },
  },
];

export const practiceNotesByExerciseId: ReadonlyMap<string, PracticeNote> = new Map(
  noteGroups.flatMap(({ ids, note }) => ids.map((id) => [id, note] as const)),
);

export const singleSideSteps = new Map<string, readonly [string, string]>([
  ...[
    'original-barrel-supported-ankle',
    'world-mat-standing-pilates-v-calf-raise',
    'world-reformer-fusion-barre-footbar-releve',
  ].map(
    (id) =>
      [
        id,
        [
          '고정된 곳을 짚고 한 발에 무게를 실어요. 반대 발은 가볍게 들어요.',
          '지지하는 발의 뒤꿈치를 조금 들었다가 천천히 내려와요. 반대쪽도 해요.',
        ],
      ] as const,
  ),
  ...['original-cadillac-table-ankle'].map(
    (id) =>
      [
        id,
        [
          '테이블에 누워 다리를 편하게 받쳐요. 한쪽 발목부터 시작해요.',
          '한쪽 발끝을 몸 쪽으로 당겼다가 멀리 뻗고 편하게 놓아요. 발을 바꿔요.',
        ],
      ] as const,
  ),
  ...[
    'original-chair-seated-pedal-press',
    'world-chair-chair-footwork-toes',
    'world-chair-chair-footwork-heels',
    'world-chair-chair-footwork-pilates-v',
  ].map(
    (id) =>
      [
        id,
        [
          '체어에 앉아 강사와 맞춘 위치에 한 발을 대고 반대쪽은 편하게 받쳐요.',
          '한 발로 페달을 조금 눌렀다가 천천히 올라오는 힘을 따라와요. 페달을 멈춘 후 발을 바꿔요.',
        ],
      ] as const,
  ),
  ...['world-chair-chair-achilles-stretch'].map(
    (id) =>
      [
        id,
        [
          '체어 앞에 서서 한쪽 발의 앞부분을 페달에 안정되게 올려요. 지지 장치와 손 위치는 강사와 확인해요.',
          '페달에 올린 발목으로 뒤꿈치를 조금 들었다가 낮춰요. 무릎이 같이 꺾이지 않는 거리로 움직인 뒤 발을 바꿔요.',
        ],
      ] as const,
  ),
  ...['original-chair-incline-support'].map(
    (id) =>
      [
        id,
        [
          '움직이지 않는 체어 좌면에 손을 짚고 비스듬한 자세에서 발을 나란히 둬요.',
          '두 팔로 받친 채 한 발의 무게를 조금 덜었다가 내려요. 몸을 비틀지 않고 반대쪽도 해 봐요.',
        ],
      ] as const,
  ),
  ...[
    'ex-footwork-02',
    'world-reformer-footwork-toes-parallel',
    'world-reformer-footwork-arches',
    'world-reformer-footwork-heels',
    'world-reformer-footwork-pilates-v',
    'world-reformer-footwork-second-wide',
    'world-cadillac-pushthrough-supine-footwork',
  ].map(
    (id) =>
      [
        id,
        [
          '누운 채 바를 한 발로 받치고 반대쪽 다리는 강사가 확인한 곳에 둬요. 바와 머리 받침의 고정을 확인해요.',
          '지지하는 발로 바를 밀어 무릎을 폈다가 천천히 굽혀요. 기구가 멎은 뒤 발을 바꿔요.',
        ],
      ] as const,
  ),
  ...['ex-plank-01', 'expanded-reformer-long-stretch'].map(
    (id) =>
      [
        id,
        [
          '리포머 바를 짚고 판 위에 발을 놓아 몸을 곧게 받쳐요. 한 발 지지는 강사의 보조로 확인해요.',
          '한쪽 발로 판을 작게 밀었다가 끌어와요. 판이 멎으면 들었던 발을 짚고 반대쪽으로 바꿔요.',
        ],
      ] as const,
  ),
  ...['expanded-reformer-up-stretch', 'world-reformer-reformer-reverse-elephant'].map(
    (id) =>
      [
        id,
        [
          '리포머에서 손과 발을 짚고 엉덩이를 높여 몸을 접어요. 한쪽 발의 지지를 강사와 확인해요.',
          '한 발로 판을 조금 밀어 몸통을 길게 보낸 뒤 판을 다시 끌어와요. 판을 멈추고 발을 바꿔요.',
        ],
      ] as const,
  ),
  ...['crawled-mat-pilates-pushup'].map(
    (id) =>
      [
        id,
        [
          '매트에 손과 발을 짚어 몸통을 곧게 받쳐요. 팔꿈치를 굽힐 깊이를 먼저 정해요.',
          '한 발을 조금 띄운 채 팔꿈치를 천천히 굽혔다가 펴요. 두 발로 돌아온 다음 반대쪽을 해요.',
        ],
      ] as const,
  ),
  ...['crawled-reformer-knee-stretches-knees-off', 'world-reformer-reformer-bear-crawl'].map(
    (id) =>
      [
        id,
        [
          '손을 바에 두고 판에 무릎과 발을 받쳐요. 강사의 보조로 한쪽 발에 중심을 잡아요.',
          '무릎의 무게를 조금 덜어 배로 몸통을 받치고 판을 짧게 밀었다가 끌어와요. 무릎을 다시 내려놓고 쉬어요.',
        ],
      ] as const,
  ),
  ...['world-mat-inverted-v-pike'].map(
    (id) =>
      [
        id,
        [
          '손발을 짚어 몸을 엎드린 자세로 받친 뒤 한 발에 무게를 옮겨요.',
          '한 발과 두 손으로 바닥을 누르면서 엉덩이를 높였다가 천천히 몸을 펴요. 두 발로 돌아온 뒤 방향을 바꿔요.',
        ],
      ] as const,
  ),
  ...['world-mat-bear-hover', 'world-chair-chair-bear-hover-pedal'].map(
    (id) =>
      [
        id,
        [
          '손과 무릎을 짚어 몸통을 받친 뒤 한쪽 발에 조금 더 무게를 실어 중심을 잡아요.',
          '몸통의 높이를 유지하며 무릎을 조금 띄워요. 한쪽으로 기울기 전에 무릎을 내려놓고 발을 바꿔요.',
        ],
      ] as const,
  ),
  ...[
    'ex-plank-02',
    'ex-kr-chair-01',
    'crawled-chair-pull-up-hamstring3',
    'world-chair-chair-tendon-stretch',
  ].map(
    (id) =>
      [
        id,
        [
          '강사의 보조를 받아 팔과 발로 기구를 받치고, 발을 바꿔 놓을 자리를 확인해요.',
          '지지하는 발 한쪽으로 체중을 옮기며 골반을 조금 들어요. 골반을 내려 다시 두 발로 받친 뒤 반대쪽을 준비해요.',
        ],
      ] as const,
  ),
  ...['crawled-reformer-tendon-stretch'].map(
    (id) =>
      [
        id,
        [
          '리포머의 바를 짚고 판에 발을 둬요. 강사와 한 발로 판을 받칠 자리를 먼저 확인해요.',
          '엉덩이를 높인 채 지지하는 발로 판을 앞으로 밀었다가 배의 힘으로 천천히 끌어와요. 멎은 뒤 발을 바꿔요.',
        ],
      ] as const,
  ),
  ...['ex-kr-reformer-01'].map(
    (id) =>
      [
        id,
        [
          '리포머에 눕고 머리 받침을 평평하게 두세요. 발을 바에 두고 움직이는 판부터 안정시켜요.',
          '기본형의 발로 밀기와 골반 들기를 먼저 따로 익혀요. 한 발을 쓸 구간은 강사와 정하고 판이 멎은 뒤 양쪽을 바꿔요.',
        ],
      ] as const,
  ),
  ...['expanded-mat-footwork'].map(
    (id) =>
      [
        id,
        [
          '매트에 누워 무릎을 굽혀 들어요. 골반이 움직이지 않는 높이에서 한쪽 무릎을 몸 가까이 둬요.',
          '반대 다리를 길게 뻗었다가 다시 접어요. 두 무릎이 나란히 돌아오면 다리를 바꿔요.',
        ],
      ] as const,
  ),
  ...[
    'expanded-cadillac-leg-springs-beats',
    'crawled-cadillac-hip-opener-legspring',
    'world-reformer-reformer-straps-scissors-beats',
  ].map(
    (id) =>
      [
        id,
        [
          '누워서 한쪽 다리로 움직일 줄과 쉬는 다리의 지지를 강사와 맞춰요. 골반 양쪽을 나란히 둬요.',
          '한 다리를 옆으로 조금 열었다가 가운데로 조용히 모아요. 한쪽을 마친 뒤 줄이 흔들리지 않게 멈추고 바꿔요.',
        ],
      ] as const,
  ),
  ...['world-reformer-reformer-straps-leg-lowers'].map(
    (id) =>
      [
        id,
        [
          '리포머에 누워 강사와 한쪽 발의 줄을 맞추고 다른 다리의 지지를 확인해요.',
          '줄을 건 다리를 길게 뻗어 천천히 낮췄다가 골반이 움직이지 않는 높이로 되돌려요. 다리를 바꿔요.',
        ],
      ] as const,
  ),
  ...['world-cadillac-legsprings-circles'].map(
    (id) =>
      [
        id,
        [
          '캐딜락에 누워 양쪽 골반을 나란히 두고, 강사와 한쪽 발의 스프링 고정을 확인해요.',
          '스프링을 건 다리로 작은 원을 그리고 출발 높이로 돌아와요. 스프링이 멎은 뒤 반대편을 준비해요.',
        ],
      ] as const,
  ),
  ...['crawled-reformer-short-spine-massage', 'world-reformer-reformer-long-spine-massage'].map(
    (id) =>
      [
        id,
        [
          '리포머 머리 받침을 평평하게 내리고 누워요. 강사의 보조로 발의 줄을 확인하고 기본형의 골반 들기를 먼저 준비해요.',
          '등을 차례로 들어 올리는 동안 강사와 정한 한쪽 다리의 지지를 유지해요. 골반과 등이 내려온 다음 줄을 안정시켜 다리를 바꿔요.',
        ],
      ] as const,
  ),
  ...['world-cadillac-trapeze-breathing'].map(
    (id) =>
      [
        id,
        [
          '캐딜락에 누워 발걸이와 손에 잡은 바를 강사가 확인해요. 한쪽 발의 지지를 따로 맞춰요.',
          '바를 누르고 발걸이를 지지하며 골반을 조금 들어요. 등을 내려놓은 뒤 양쪽 지지를 되찾고 바를 되돌려요.',
        ],
      ] as const,
  ),
  ...['world-cadillac-cadillac-guillotine'].map(
    (id) =>
      [
        id,
        [
          '캐딜락에 누워 강사와 바의 안전 스트랩을 확인해요. 한쪽 발로 받을 위치를 강사가 보조해요.',
          '발로 바를 천천히 밀어내며 다리 뒤를 길게 펴요. 무릎을 굽혀 바를 되돌리고 힘을 빼기 전 두 발의 지지를 확인해요.',
        ],
      ] as const,
  ),
  ...['world-barrel-barrel-handstand-prep'].map(
    (id) =>
      [
        id,
        [
          '강사의 보조를 받아 바닥에 손을 짚고 바렐 위에 발을 놓아요. 어깨가 몸을 받치는지 먼저 확인해요.',
          '골반을 높인 뒤 바렐을 딛는 한 발에 천천히 무게를 옮겨요. 두 발을 다시 지지한 뒤 강사와 정한 순서로 내려와요.',
        ],
      ] as const,
  ),
  ...['crawled-reformer-semicircle'].map(
    (id) =>
      [
        id,
        [
          '리포머에 누워 어깨와 발을 받치고 강사와 한 발 지지를 맞춰요.',
          '지지하는 발로 판을 조금 보내며 골반을 들어요. 등을 내려 판을 다시 가까이 가져온 뒤 두 발을 짚어요.',
        ],
      ] as const,
  ),
  ...['world-mat-roller-bridge-rollout', 'world-mat-fitnessball-bridge-curl'].map(
    (id) =>
      [
        id,
        [
          '등을 대고 누워 발 하나를 롤러나 공에 안정되게 둬요. 다른 발의 무게를 조금 덜어요.',
          '엉덩이를 들어 지지하는 뒤꿈치로 롤러나 공을 짧게 끌었다 돌려요. 골반부터 내려놓고 발을 바꿔요.',
        ],
      ] as const,
  ),
  ...['world-mat-loopband-glute-bridge-abduction'].map(
    (id) =>
      [
        id,
        [
          '등을 대고 누워 지지하는 발바닥을 고르게 눌러요. 반대 발의 무게를 덜기 전에 골반을 안정시켜요.',
          '지지하는 발로 눌러 엉덩이를 조금 들어요. 골반을 기울이지 않고 천천히 내려놓은 뒤 발을 바꿔요.',
        ],
      ] as const,
  ),
  ...['original-chair-seated-arm-arc', 'original-mat-seated-arm-reach'].map(
    (id) =>
      [
        id,
        [
          '앉아 발을 받치고 한 손은 편하게 두고 반대쪽 팔을 준비해요.',
          '한 팔을 앞으로 길게 뻗었다가 천천히 내려놓아요. 몸통을 정면에 둔 채 팔을 바꿔요.',
        ],
      ] as const,
  ),
  ...[
    'expanded-reformer-arm-circles',
    'world-reformer-supine-arm-circles',
    'world-cadillac-armsprings-supine-circles',
  ].map(
    (id) =>
      [
        id,
        [
          '몸통이 흔들리지 않는 자리를 먼저 잡고 한쪽 손으로 줄을 쥐어요. 반대쪽 어깨는 편하게 둬요.',
          '그 손으로 작은 원을 그렸다가 몸 옆으로 돌아와요. 빈손 쪽으로 가슴이 돌아가지 않는 크기로 해요.',
        ],
      ] as const,
  ),
  ...['expanded-reformer-rowing-from-chest'].map(
    (id) =>
      [
        id,
        [
          '바를 바라보고 앉아 한쪽 손의 줄을 가슴 가까이에 둬요.',
          '팔을 앞으로 뻗고 위와 옆으로 반원을 그린 다음 가슴 쪽으로 되돌려요. 판이 멈추면 손을 바꿔요.',
        ],
      ] as const,
  ),
  ...['expanded-reformer-rowing-from-hips'].map(
    (id) =>
      [
        id,
        [
          '바를 바라보고 앉아 한쪽 손의 줄을 골반 옆에 둬요.',
          '몸을 조금 숙이며 손을 낮게 멀리 보내요. 몸을 세우며 팔을 열어 골반 옆으로 되돌려요.',
        ],
      ] as const,
  ),
  ...['world-mat-toningball-chest-expansion'].map(
    (id) =>
      [
        id,
        [
          '발을 고르게 딛고 서서 한 손에 작은 공을 들어요. 다른 손은 편하게 둬요.',
          '공을 든 팔을 골반 옆에서 뒤쪽으로 길게 뻗었다가 천천히 되돌려요. 어깨가 앞으로 말리기 전에 팔을 바꿔요.',
        ],
      ] as const,
  ),
  ...['world-reformer-seated-hug-a-tree'].map(
    (id) =>
      [
        id,
        [
          '리포머에 앉아 한쪽 손잡이를 잡고 팔을 가볍게 둥글려요.',
          '큰 나무를 안듯 가슴 앞으로 한 팔을 모았다가 천천히 열어요. 가슴을 정면에 두고 손을 바꿔요.',
        ],
      ] as const,
  ),
  ...['ex-upper-02'].map(
    (id) =>
      [
        id,
        [
          '리포머에 앉아 한쪽 손으로 줄을 잡아요. 손과 발을 안정시키고 가슴은 정면에 둬요.',
          '한쪽 팔꿈치를 접어 줄을 당겼다 펴요. 판이 멈추면 반대 손으로 바꿔 같은 길을 따라가요.',
        ],
      ] as const,
  ),
  ...['world-reformer-seated-biceps-curl-tower'].map(
    (id) =>
      [
        id,
        [
          '앉아서 한 손에 손잡이를 쥐고 팔꿈치를 몸 가까이 둬요.',
          '손목을 편 채 한 팔꿈치를 굽혀 당겼다가 천천히 펴요. 방향을 바꿔 반대쪽도 해요.',
        ],
      ] as const,
  ),
  ...['world-cadillac-armsprings-triceps-press'].map(
    (id) =>
      [
        id,
        [
          '캐딜락에 무릎으로 서서 한쪽 손잡이를 잡고, 강사와 스프링의 방향을 확인해요.',
          '가슴을 정면에 두고 한쪽 팔꿈치를 펴 손잡이를 밀었다가 천천히 굽혀요. 손을 바꿔요.',
        ],
      ] as const,
  ),
  ...['world-mat-dumbbell-standing-row-hinge'].map(
    (id) =>
      [
        id,
        [
          '발을 바닥에 두고 몸을 기울인 채 한 손으로 덤벨을 잡아요.',
          '팔꿈치를 뒤로 당겼다가 그 자리에서 팔을 펴요. 팔꿈치를 접고 덤벨을 천천히 내려 반대쪽으로 바꿔요.',
        ],
      ] as const,
  ),
]);
