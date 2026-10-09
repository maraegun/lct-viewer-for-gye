const GLASS = 'minecraft:cyan_stained_glass';
const SKY = 'minecraft:light_blue_stained_glass';
const GRAY = 'minecraft:gray_stained_glass';
const ANDESITE = 'minecraft:polished_andesite';
const DIORITE = 'minecraft:polished_diorite';
const WOOL = 'minecraft:black_wool';

export const MATERIALS = {
  [GLASS]: { name: '청록색 색유리', symbol: 'G', stackSize: 64 },
  [SKY]: { name: '하늘색 색유리', symbol: 'S', stackSize: 64 },
  [GRAY]: { name: '회색 색유리', symbol: 'E', stackSize: 64 },
  [ANDESITE]: { name: '윤나는 안산암', symbol: 'A', stackSize: 64 },
  [DIORITE]: { name: '윤나는 섬록암', symbol: 'D', stackSize: 64 },
  [WOOL]: { name: '검은색 양털', symbol: 'K', stackSize: 64 },
};

export const COORDINATE_SYSTEM = {
  unit: 'block',
  origin: 'block-min-corner',
  north: '-z',
  firstLayerY: 0,
};

export const DEFAULT_HEIGHTS = { low: 56, high: 72 };
export const HEIGHT_LIMITS = { low: { min: 10, max: 56 }, high: { min: 10, max: 72 } };
export const TOWERS = [
  // 원본 A-4 배치 절반축소: 동1 (0,0), 동2 (20,4), 동3 (40,10).
  { id: 'low1', name: '낮은 건물 1', origin: { x: 0, z: 0 }, height: DEFAULT_HEIGHTS.low, kind: 'low' },
  { id: 'low2', name: '낮은 건물 2', origin: { x: 20, z: 4 }, height: DEFAULT_HEIGHTS.low, kind: 'low' },
  { id: 'high', name: '높은 건물', origin: { x: 40, z: 10 }, height: DEFAULT_HEIGHTS.high, kind: 'high' },
];

// 수직 흰 테두리 위치(로컬 x,z). 해당 높이에 외피 칸이 있을 때만 적용한다.
// 밑면(z12-14)은 원본 B-1 절반축소 모양을 따르며 좌우 바깥(x2, x11)에 흰 블록을 둔다.
const TRIM = new Set([
  '2,0', '10,0', '0,3', '12,3', '5,2', '7,2', '4,8', '8,8', '2,12', '11,12',
]);

function addRow(set, z, ranges) {
  for (const [a, b] of ranges) {
    for (let x = a; x <= b; x++) set.add(`${x},${z}`);
  }
}

// 낮은 동 바닥 단면 L: z행별 포함 x구간(양끝 포함)
// 원본 B-1(23x22) 절반축소 기반: 날개 V홈 + 줄기 + 밑면 돌출 3줄(z12-14).
function sectionL() {
  const s = new Set();
  addRow(s, 0, [[2, 3], [9, 10]]);
  addRow(s, 1, [[1, 4], [8, 11]]);
  addRow(s, 2, [[0, 5], [7, 12]]);
  addRow(s, 3, [[0, 1], [6], [10, 11]]);
  addRow(s, 4, [[1, 2], [6], [9, 10]]);
  addRow(s, 5, [[2, 10]]);
  addRow(s, 6, [[3, 9]]);
  for (let z = 7; z <= 11; z++) addRow(s, z, [[4, 8]]);
  addRow(s, 12, [[2, 3], [6, 7], [10, 11]]);
  addRow(s, 13, [[2, 11]]);
  addRow(s, 14, [[4, 5], [8]]);
  return s;
}

// 높은 동 바닥 단면 H: L의 z=0..11 유지, z=12..14를 두 갈래 끝으로 교체
function sectionH() {
  const s = new Set();
  addRow(s, 0, [[2, 3], [9, 10]]);
  addRow(s, 1, [[1, 4], [8, 11]]);
  addRow(s, 2, [[0, 5], [7, 12]]);
  addRow(s, 3, [[0, 1], [6], [10, 11]]);
  addRow(s, 4, [[1, 2], [6], [9, 10]]);
  addRow(s, 5, [[2, 10]]);
  addRow(s, 6, [[3, 9]]);
  for (let z = 7; z <= 11; z++) addRow(s, z, [[4, 8]]);
  addRow(s, 12, [[3, 9]]);
  addRow(s, 13, [[3, 5], [7, 9]]);
  addRow(s, 14, [[4, 5], [7, 8]]);
  return s;
}

// 영역 M의 외피: 동서남북 이웃 중 하나라도 M 밖에 있는 칸(대각선 제외)
function rim(cells) {
  const out = new Set();
  for (const key of cells) {
    const [x, z] = key.split(',').map(Number);
    if (
      !cells.has(`${x + 1},${z}`) ||
      !cells.has(`${x - 1},${z}`) ||
      !cells.has(`${x},${z + 1}`) ||
      !cells.has(`${x},${z - 1}`)
    ) {
      out.add(key);
    }
  }
  return out;
}

// 꼭대기 두 갈래 필터: 좌우 날개(x<=3 또는 x>=9)이면서 앞쪽(z<=3)
function isCrown(key) {
  const [x, z] = key.split(',').map(Number);
  return (x <= 3 || x >= 9) && z <= 3;
}

const L = sectionL();
const H = sectionH();
// 윗몸통 U: 원본 B-16(가는 Y자) 절반축소. 줄기 2열 + 밑면.
// H의 z0-8이 아니라 별도 단면이다.
const U = new Set();
for (let y = 0; y <= 6; y++) { U.add(`5,${y}`); U.add(`7,${y}`); }
for (const x of [4, 5, 6, 7, 8]) U.add(`${x},7`);
for (const x of [4, 5, 8]) U.add(`${x},8`);
const RIM_L = rim(L);
const RIM_H = rim(H);
const RIM_U = rim(U);
const CROWN_L = new Set([...RIM_L].filter(isCrown));
const CROWN_U = new Set([...RIM_U].filter(isCrown));
// 높은동 꼭대기: 원본 B-15 뿔(두 갈래) 절반축소. 아래는 이어지고 위로 갈라진다.
const CROWN_HU_LO = new Set([
  '2,0', '3,0', '4,0', '5,0', '6,0', '7,0', '10,0', '11,0', '12,0',
  '1,1', '2,1', '3,1', '4,1', '6,1', '8,1', '9,1', '10,1', '11,1', '12,1',
  '2,2', '3,2', '4,2', '8,2', '9,2', '10,2', '11,2',
]);
const CROWN_HU_HI = new Set(['2,0', '3,0', '4,0', '8,0', '9,0', '10,0', '11,0']);
// 내벽: 외피 안쪽에 닿은 내부 칸 (원본 B 도면의 검은 양털 한 겹).
function innerWall(cells, shell) {
  const out = new Set();
  for (const key of cells) {
    if (shell.has(key)) continue;
    const [x, z] = key.split(',').map(Number);
    if (
      shell.has(`${x + 1},${z}`) ||
      shell.has(`${x - 1},${z}`) ||
      shell.has(`${x},${z + 1}`) ||
      shell.has(`${x},${z - 1}`)
    ) {
      out.add(key);
    }
  }
  return out;
}
const INNER_L = innerWall(L, RIM_L);
const INNER_H = innerWall(H, RIM_H);
const INNER_U = innerWall(U, RIM_U);

// 개방 출입구(로컬 좌표, 문 아이템 없음). 줄기에 내어 양옆 구조가 남는다.
function isEntrance(towerId, x, y, z) {
  if (y !== 0 && y !== 1) return false;
  if (towerId === 'high') {
    return (x === 5 || x === 6) && z === 12;
  }
  return (x === 5 || x === 6) && z === 11;
}

// 높이를 줄이면 몸통만 짧아지고 지붕·꼭대기 모양은 그대로 둔다.
// 낮은 건물: 꼭대기 6(지붕 1 + 갈래 5), 높은 건물: 어깨지붕 1 + 윗몸통 7 + 상부지붕 1 + 꼭대기 3 = 12.
function splitLow(height) {
  return { crown: height - 6 };
}
function splitHigh(height) {
  return { shoulder: height - 12 };
}
// 층별 외벽 재료 (원본 B/C 도면 대조).
// 낮은동 = B동 19구간 × 3블록, 높은동 = C동 8구간 × 9블록.
// B-1 청록 B-2 안산암 B-3 하늘 B-4 하늘 B-5 회색 B-6 하늘 B-7 하늘 B-8 하늘
// B-9 회색 B-10 하늘 B-11 하늘 B-12 하늘 B-13 회색 B-14 청록 B-15 안산암(뿔)
// B-16~18 청록 B-19 안산암(지붕).
// C-2 청록 C-3 하늘 C-4 하늘 C-5 회색 C-6 청록 C-7 청록 C-8 청록 C-9 안산암(지붕).
const LOW_RING = [
  GLASS, GLASS, GLASS, ANDESITE, ANDESITE, ANDESITE,
  SKY, SKY, SKY, SKY, SKY, SKY,
  GRAY, GRAY, GRAY, SKY, SKY, SKY,
  SKY, SKY, SKY, SKY, SKY, SKY,
  GRAY, GRAY, GRAY, SKY, SKY, SKY,
  SKY, SKY, SKY, SKY, SKY, SKY,
  GRAY, GRAY, GRAY, SKY, SKY, SKY,
  SKY, SKY, SKY, GLASS, GLASS, GLASS,
  ANDESITE, ANDESITE,
];
const HIGH_RING = [
  ...Array(9).fill(GLASS), ...Array(9).fill(SKY), ...Array(9).fill(SKY),
  ...Array(9).fill(GRAY), ...Array(9).fill(GLASS), ...Array(9).fill(GLASS),
  ...Array(9).fill(GLASS), ...Array(9).fill(ANDESITE),
];
function ringFor(towerId, y, towerHeight) {
  if (towerId === 'high') {
    const { shoulder } = splitHigh(towerHeight);
    if (y >= shoulder) return GLASS;
    // 아랫몸통 길이에 맞춰 8구간으로 나눈다.
    const idx = Math.min(7, Math.floor((y / shoulder) * 8));
    return [GLASS, SKY, SKY, GRAY, GLASS, GLASS, GLASS, ANDESITE][idx];
  }
  const { crown } = splitLow(towerHeight);
  if (y >= crown) return GLASS;
  const table = [
    GLASS, ANDESITE, SKY, SKY, GRAY, SKY, SKY, SKY,
    GRAY, SKY, SKY, SKY, GRAY, GLASS, ANDESITE, GLASS, GLASS,
  ];
  const idx = Math.min(table.length - 1, Math.floor((y / crown) * table.length));
  return table[idx];
}
// 높이별 로컬 단면: 'shell'은 외피(유리+테두리)+내벽(검은 양털), 'roof'는 전면 섬록암
function layerShape(towerId, y, towerHeight) {
  if (towerId === 'high') {
    const { shoulder } = splitHigh(towerHeight);
    if (y < shoulder) return { kind: 'shell', cells: RIM_H, inner: INNER_H, ring: ringFor(towerId, y, towerHeight) };
    if (y === shoulder) return { kind: 'roof', cells: H };
    if (y < shoulder + 8) return { kind: 'shell', cells: RIM_U, inner: INNER_U, ring: GLASS };
    if (y === shoulder + 8) return { kind: 'roof', cells: H };
    // 뿔 3층. B-15 절반축소 모양 그대로 쌓는다.
    return { kind: 'roof', cells: CROWN_HU_LO };
  }
  const { crown } = splitLow(towerHeight);
  if (y < crown) return { kind: 'shell', cells: RIM_L, inner: INNER_L, ring: ringFor(towerId, y, towerHeight) };
  if (y === crown) return { kind: 'roof', cells: L };
  return { kind: 'roof', cells: CROWN_L };
}

export const PODIUM = {
  // 토대(기단): 원본 A-2 기단 절반축소 (위 좁고 아래 넓다가 좌측이 대각선).
  // 건물 배치를 덮도록 원점을 맞춘다. y -3..-1 (건물 1층 아래), 윤나는 안산암.
  depth: 3,
};
// A-2 half rows (y0-24): [x0, x1] 구간. 건물 외접에 맞춰 평행이동한다.
const PODIUM_ROWS = [
  [0, 14], [0, 15], [0, 17], [0, 18], [0, 32], [0, 33], [0, 34],
  [0, 35], [0, 36], [0, 37], [0, 52], [0, 52], [0, 52],
  [14, 52], [16, 52], [17, 52], [19, 52],
  [32, 52], [33, 52], [34, 52], [34, 52], [35, 52], [36, 52], [36, 52], [37, 52],
];
export function buildModel(heights = {}, { podium = true } = {}) {
  const blocks = [];
  const towers = TOWERS.map((t) => {
    const limit = HEIGHT_LIMITS[t.kind];
    let height = heights[t.id] ?? heights[t.kind] ?? t.height;
    height = Math.max(limit.min, Math.min(limit.max, Math.round(height)));
    return { ...t, origin: { ...t.origin }, height };
  });
  for (const tower of towers) {
    for (let y = 0; y < tower.height; y++) {
      const { kind, cells, inner, ring } = layerShape(tower.id, y, tower.height);
      for (const key of cells) {
        const [lx, lz] = key.split(',').map(Number);
        if (isEntrance(tower.id, lx, y, lz)) continue;
        const material =
          kind === 'roof' || TRIM.has(key) ? DIORITE : (ring ?? GLASS);
        blocks.push({
          x: tower.origin.x + lx,
          y,
          z: tower.origin.z + lz,
          material,
          tower: tower.id,
        });
      }
      // 몸통층 내벽(검은 양털): 출입구와 겹치면 뺀다.
      if (kind === 'shell' && inner) {
        for (const key of inner) {
          const [lx, lz] = key.split(',').map(Number);
          if (isEntrance(tower.id, lx, y, lz)) continue;
          blocks.push({
            x: tower.origin.x + lx,
            y,
            z: tower.origin.z + lz,
            material: WOOL,
            tower: tower.id,
          });
        }
      }
    }
  }
  // 토대: A-2 half 모양 그대로 (x0..52, z0..24), y -3..-1. 건물 외접과 일치한다.
  let podiumInfo = null;
  if (podium) {
    podiumInfo = {
      x0: 0, z0: 0, x1: 52, z1: 24,
      y0: -PODIUM.depth, y1: -1,
      material: ANDESITE,
    };
    for (let y = podiumInfo.y0; y <= podiumInfo.y1; y++) {
      for (let r = 0; r < PODIUM_ROWS.length; r++) {
        const [a, b] = PODIUM_ROWS[r];
        for (let x = a; x <= b; x++) {
          blocks.push({ x, y, z: r, material: ANDESITE, tower: 'podium' });
        }
      }
    }
  }
  blocks.sort((a, b) => a.y - b.y || a.z - b.z || a.x - b.x);

  let min = null;
  let max = null;
  for (const b of blocks) {
    if (!min) {
      min = { x: b.x, y: b.y, z: b.z };
      max = { x: b.x, y: b.y, z: b.z };
    } else {
      if (b.x < min.x) min.x = b.x;
      if (b.y < min.y) min.y = b.y;
      if (b.z < min.z) min.z = b.z;
      if (b.x > max.x) max.x = b.x;
      if (b.y > max.y) max.y = b.y;
      if (b.z > max.z) max.z = b.z;
    }
  }
  const materials = {};
  for (const [id, meta] of Object.entries(MATERIALS)) {
    materials[id] = { ...meta };
  }
  return {
    version: 1,
    blocks,
    towers,
    materials,
    bounds: { min, max },
    podium: podiumInfo,
    coordinateSystem: { ...COORDINATE_SYSTEM },
  };
}

function err(code, message, extra = {}) {
  return { code, message, ...extra };
}

// 동별 6방향 면 연결 성분 수
function countComponents(cells) {
  const set = new Set(cells.map((b) => `${b.x},${b.y},${b.z}`));
  const seen = new Set();
  let count = 0;
  const dirs = [
    [1, 0, 0], [-1, 0, 0], [0, 1, 0],
    [0, -1, 0], [0, 0, 1], [0, 0, -1],
  ];
  for (const key of set) {
    if (seen.has(key)) continue;
    count++;
    const stack = [key];
    seen.add(key);
    while (stack.length) {
      const [x, y, z] = stack.pop().split(',').map(Number);
      for (const [dx, dy, dz] of dirs) {
        const n = `${x + dx},${y + dy},${z + dz}`;
        if (set.has(n) && !seen.has(n)) {
          seen.add(n);
          stack.push(n);
        }
      }
    }
  }
  return count;
}

// 설치 가능 검사: 각 높이에서 지면(y=0) 또는 바로 아래 블록을
// 시작으로 같은 높이 4방향 확장 시 모든 칸에 도달해야 한다.
function unreachableFromBelow(towerBlocks) {
  const byY = new Map();
  for (const b of towerBlocks) {
    if (!byY.has(b.y)) byY.set(b.y, []);
    byY.get(b.y).push(b);
  }
  const below = new Set(towerBlocks.map((b) => `${b.x},${b.y},${b.z}`));
  const bad = [];
  for (const [y, cells] of [...byY.entries()].sort((a, b) => a[0] - b[0])) {
    const at = new Set(cells.map((b) => `${b.x},${b.z}`));
    const seeds = cells.filter(
      (b) => b.y === 0 || below.has(`${b.x},${b.y - 1},${b.z}`),
    );
    const reached = new Set();
    const stack = seeds.map((b) => `${b.x},${b.z}`);
    for (const s of stack) reached.add(s);
    while (stack.length) {
      const [x, z] = stack.pop().split(',').map(Number);
      for (const [nx, nz] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) {
        const k = `${nx},${nz}`;
        if (at.has(k) && !reached.has(k)) {
          reached.add(k);
          stack.push(k);
        }
      }
    }
    for (const b of cells) {
      if (!reached.has(`${b.x},${b.z}`)) bad.push(b);
    }
  }
  return bad;
}

export function validateModel(model) {
  const errors = [];
  const blocks = model?.blocks ?? [];
  const towerDefs = new Map((model?.towers ?? []).map((t) => [t.id, t]));
  // 토대는 동이 아니라 받침이다. 검증에서 따로 다룬다.
  const isPodium = (b) => b?.tower === 'podium';
  const materialIds = new Set(Object.keys(model?.materials ?? {}));

  const seen = new Map();
  for (const b of blocks) {
    if (
      !Number.isInteger(b?.x) || !Number.isInteger(b?.y) || !Number.isInteger(b?.z)
    ) {
      errors.push(err('non-integer-coordinate', '좌표는 정수여야 한다.', {
        coord: { x: b?.x, y: b?.y, z: b?.z },
        tower: b?.tower ?? null,
        y: b?.y ?? null,
      }));
      continue;
    }
    const key = `${b.x},${b.y},${b.z}`;
    if (seen.has(key)) {
      errors.push(err('duplicate-coordinate', `중복 좌표 ${key}이다.`, {
        coord: { x: b.x, y: b.y, z: b.z },
        tower: b.tower,
        y: b.y,
      }));
    } else {
      seen.set(key, b);
    }
    if (!materialIds.has(b.material)) {
      errors.push(err('unknown-material', `미등록 재료 ${b.material}이다.`, {
        coord: { x: b.x, y: b.y, z: b.z },
        tower: b.tower,
        y: b.y,
      }));
    }
    if (!towerDefs.has(b.tower) && !isPodium(b)) {
      errors.push(err('unknown-tower', `미등록 동 ${b.tower}이다.`, {
        coord: { x: b.x, y: b.y, z: b.z },
        tower: b.tower,
        y: b.y,
      }));
    }
  }

  // 동 겹침: 서로 다른 동의 블록이 같은 전역 좌표를 차지
  const owner = new Map();
  for (const b of blocks) {
    if (!Number.isInteger(b?.x) || !Number.isInteger(b?.y) || !Number.isInteger(b?.z)) continue;
    const key = `${b.x},${b.y},${b.z}`;
    if (owner.has(key) && owner.get(key) !== b.tower) {
      errors.push(err('tower-overlap', `동 겹침 ${key}이다.`, {
        coord: { x: b.x, y: b.y, z: b.z },
        tower: b.tower,
        y: b.y,
      }));
    } else if (!owner.has(key)) {
      owner.set(key, b.tower);
    }
  }

  // 높이 범위와 누락: 0..height-1 안에 들고 매 높이에 블록이 있어야 한다
  for (const t of towerDefs.values()) {
    const mine = blocks.filter((b) => b.tower === t.id);
    const levels = new Map();
    for (const b of mine) {
      if (!Number.isInteger(b?.y)) continue;
      if (b.y < 0 || b.y >= t.height) {
        errors.push(err('height-out-of-range', `${t.id} 높이 ${b.y}는 0..${t.height - 1}를 벗어난다.`, {
          coord: { x: b.x, y: b.y, z: b.z },
          tower: t.id,
          y: b.y,
        }));
      }
      if (!levels.has(b.y)) levels.set(b.y, 0);
      levels.set(b.y, levels.get(b.y) + 1);
    }
    for (let y = 0; y < t.height; y++) {
      if (!levels.has(y)) {
        errors.push(err('height-missing', `${t.id} 높이 ${y}에 블록이 없다.`, {
          tower: t.id,
          y,
        }));
      }
    }
  }

  // bounds 재계산 비교
  if (blocks.length) {
    const xs = blocks.map((b) => b.x);
    const ys = blocks.map((b) => b.y);
    const zs = blocks.map((b) => b.z);
    const actual = {
      min: { x: Math.min(...xs), y: Math.min(...ys), z: Math.min(...zs) },
      max: { x: Math.max(...xs), y: Math.max(...ys), z: Math.max(...zs) },
    };
    const claimed = model.bounds;
    const same =
      claimed &&
      claimed.min?.x === actual.min.x && claimed.min?.y === actual.min.y &&
      claimed.min?.z === actual.min.z && claimed.max?.x === actual.max.x &&
      claimed.max?.y === actual.max.y && claimed.max?.z === actual.max.z;
    if (!same) {
      errors.push(err('bad-bounds', 'bounds가 실제 블록 범위와 다르다.', {
        tower: null,
        y: null,
      }));
    }
  }

  // 동별 연결과 설치 가능
  const components = {};
  for (const t of towerDefs.values()) {
    const mine = blocks.filter((b) => b.tower === t.id);
    if (!mine.length) {
      components[t.id] = 0;
      continue;
    }
    components[t.id] = countComponents(mine);
    if (components[t.id] !== 1) {
      errors.push(err('disconnected-tower', `${t.id}가 ${components[t.id]}개 성분으로 끊어졌다.`, {
        tower: t.id,
        y: null,
      }));
    }
    for (const b of unreachableFromBelow(mine)) {
      errors.push(err('unreachable-block', `아래에서 설치할 수 없는 블록 (${b.x},${b.y},${b.z})이다.`, {
        coord: { x: b.x, y: b.y, z: b.z },
        tower: t.id,
        y: b.y,
      }));
    }
  }
  // 토대: 한 덩어리인지, 맨 밑층이 바닥에 닿는지 본다.
  const podiumBlocks = blocks.filter(isPodium);
  if (podiumBlocks.length) {
    components.podium = countComponents(podiumBlocks);
    if (components.podium !== 1) {
      errors.push(err('disconnected-tower', `토대가 ${components.podium}개 성분으로 끊어졌다.`, {
        tower: 'podium',
        y: null,
      }));
    }
    const info = model?.podium;
    if (info) {
      const perLayer = PODIUM_ROWS.reduce((n, [a, b]) => n + (b - a + 1), 0);
      const expected = perLayer * (info.y1 - info.y0 + 1);
      if (podiumBlocks.length !== expected) {
        errors.push(err('podium-incomplete', `토대가 ${podiumBlocks.length}개로 꽉 차지 않았다(기대 ${expected}).`, {
          tower: 'podium',
          y: null,
        }));
      }
    }
  }

  const byTower = {};
  const byMaterial = {};
  for (const t of towerDefs.keys()) {
    byTower[t] = blocks.filter((b) => b.tower === t).length;
  }
  byTower.podium = podiumBlocks.length;
  for (const m of materialIds) {
    byMaterial[m] = blocks.filter((b) => b.material === m).length;
  }
  const stats = {
    total: blocks.length,
    byTower,
    byMaterial,
    components,
    bounds: model?.bounds ?? null,
  };
  return { ok: errors.length === 0, errors, stats };
}

export function selectBlocks(
  model,
  { tower = 'all', layer = null, through = false, material = 'all' } = {},
) {
  const towerIds = new Set((model?.towers ?? []).map((t) => t.id));
  const materialIds = new Set(Object.keys(model?.materials ?? {}));
  if (tower !== 'all' && !towerIds.has(tower)) {
    throw new RangeError(`알 수 없는 동: ${tower}`);
  }
  if (material !== 'all' && !materialIds.has(material)) {
    throw new RangeError(`알 수 없는 재료: ${material}`);
  }
  if (layer !== null && !Number.isInteger(layer)) {
    throw new RangeError(`layer는 정수이거나 null이어야 한다: ${layer}`);
  }
  return (model?.blocks ?? []).filter((b) => {
    if (tower !== 'all' && b.tower !== tower) return false;
    if (material !== 'all' && b.material !== material) return false;
    if (layer !== null) {
      if (through) {
        if (b.y > layer) return false;
      } else if (b.y !== layer) {
        return false;
      }
    }
    return true;
  });
}

export function summarizeMaterials(blocks) {
  return Object.entries(MATERIALS).map(([material, meta]) => {
    const count = (blocks ?? []).filter((b) => b.material === material).length;
    return {
      material,
      name: meta.name,
      count,
      stacks64: Math.floor(count / 64),
      remainder: count % 64,
    };
  });
}

export { GLASS, SKY, GRAY, ANDESITE, DIORITE, WOOL };
