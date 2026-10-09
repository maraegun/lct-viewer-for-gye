import { buildModel, validateModel } from '../src/model.mjs';

// 원본 B-1 절반축소 대조 후: 내벽(검은 양털) + 밑면 돌출. 2026-10-09 갱신 수치.
const EXPECTED = {
  total: 16846,
  low1: 4512,
  low2: 4512,
  high: 5623,
  glass: 2940,
  diorite: 1846,
  wool: 4150,
  sky: 3375,
  gray: 1333,
  andesite: 3202,
};

const model = buildModel();
const result = validateModel(model);
if (!result.ok) {
  console.error('모델 검증 실패:');
  for (const e of result.errors.slice(0, 40)) console.error(`- [${e.code}] ${e.message}`);
  console.error(`전체 오류 ${result.errors.length}개`);
  process.exit(1);
}

const fail = [];
const check = (label, actual, expected) => {
  const ok = actual === expected;
  console.log(`${ok ? '통과' : '실패'} ${label}: ${actual} (기대 ${expected})`);
  if (!ok) fail.push(label);
};

const { stats } = result;
check('전체 블록', stats.total, EXPECTED.total);
check('낮은 건물 1', stats.byTower.low1, EXPECTED.low1);
check('낮은 건물 2', stats.byTower.low2, EXPECTED.low2);
check('높은 건물', stats.byTower.high, EXPECTED.high);
check(
  '청록색 색유리',
  stats.byMaterial['minecraft:cyan_stained_glass'],
  EXPECTED.glass,
);
check(
  '윤나는 섬록암',
  stats.byMaterial['minecraft:polished_diorite'],
  EXPECTED.diorite,
);
check(
  '하늘색 색유리',
  stats.byMaterial['minecraft:light_blue_stained_glass'],
  EXPECTED.sky,
);
check(
  '회색 색유리',
  stats.byMaterial['minecraft:gray_stained_glass'],
  EXPECTED.gray,
);
check(
  '윤나는 안산암',
  stats.byMaterial['minecraft:polished_andesite'],
  EXPECTED.andesite,
);
check(
  '검은색 양털',
  stats.byMaterial['minecraft:black_wool'],
  EXPECTED.wool,
);
const sx = stats.bounds.max.x - stats.bounds.min.x + 1;
const sy = stats.bounds.max.y - stats.bounds.min.y + 1;
const sz = stats.bounds.max.z - stats.bounds.min.z + 1;
check('외접 X', sx, 53);
check('외접 Z', sz, 25);
check('외접 높이', sy, 75);
check('토대', stats.byTower.podium, 2199);
check('낮은 건물 1 연결 성분', stats.components.low1, 1);
check('낮은 건물 2 연결 성분', stats.components.low2, 1);
check('높은 건물 연결 성분', stats.components.high, 1);
check('토대 연결 성분', stats.components.podium, 1);

if (fail.length) {
  console.error(`실패 ${fail.length}개: ${fail.join(', ')}`);
  process.exit(1);
}
console.log('모델 가능성 검증 통과: 16846블록, 설치 가능, 동별 단일 연결.');
