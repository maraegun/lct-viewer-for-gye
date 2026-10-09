import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildModel,
  validateModel,
  selectBlocks,
  summarizeMaterials,
  DIORITE,
  GLASS,
  SKY,
  GRAY,
  ANDESITE,
  WOOL,
} from '../src/model.mjs';

test('소형 결함 모델의 오류를 종류별로 반환한다', () => {
  const bad = {
    version: 1,
    towers: [{ id: 't', name: '시험동', origin: { x: 0, z: 0 }, height: 2 }],
    materials: {
      [GLASS]: { name: '유리', symbol: 'G', stackSize: 64 },
    },
    bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 0, z: 0 } },
    coordinateSystem: { unit: 'block' },
    blocks: [
      { x: 0, y: 0, z: 0, material: GLASS, tower: 't' },
      { x: 0, y: 0, z: 0, material: GLASS, tower: 't' },
      { x: 1, y: 0, z: 0, material: 'minecraft:stone', tower: 't' },
      { x: 9, y: 0, z: 9, material: GLASS, tower: 't' },
    ],
  };
  const result = validateModel(bad);
  assert.equal(result.ok, false);
  const codes = new Set(result.errors.map((e) => e.code));
  assert.ok(codes.has('duplicate-coordinate'), '중복 좌표 오류 필요');
  assert.ok(codes.has('unknown-material'), '미등록 재료 오류 필요');
  assert.ok(
    codes.has('disconnected-tower') || codes.has('unreachable-block'),
    '떠 있는 독립 블록 오류 필요',
  );
});

test('정상 모델은 총량·재료 분할·동별 연결을 만족한다', () => {
  const model = buildModel();
  const result = validateModel(model);
  assert.equal(result.ok, true, JSON.stringify(result.errors.slice(0, 5)));
  assert.equal(result.stats.total, 17071);
  assert.equal(result.stats.byTower.low1, 4486);
  assert.equal(result.stats.byTower.low2, 4486);
  assert.equal(result.stats.byTower.high, 5918);
  assert.equal(result.stats.byMaterial[GLASS], 3144);
  assert.equal(result.stats.byMaterial[SKY], 3687);
  assert.equal(result.stats.byMaterial[GRAY], 3963);
  assert.equal(result.stats.byMaterial[ANDESITE], 3288);
  assert.equal(result.stats.byMaterial[DIORITE], 1819);
  assert.equal(result.stats.byMaterial[WOOL], 1170);
  // 높이 범위 명시 확인
  for (const b of model.blocks) {
    assert.ok(Number.isInteger(b.x) && Number.isInteger(b.y) && Number.isInteger(b.z));
  }
  const ys = model.blocks.map((b) => b.y);
  assert.equal(Math.min(...ys), -3);
  assert.equal(Math.max(...ys), 71);
});

test('출입구 12칸이 비고 양옆 구조와 위 블록이 남는다', () => {
  const model = buildModel();
  const at = new Set(model.blocks.map((b) => `${b.x},${b.y},${b.z}`));
  // 낮은 동 1 원점 (0,0), 낮은 동 2 원점 (20,4), 높은 동 원점 (40,10)
  // 낮은동 출입구 로컬 (5,6/z11), 높은동 로컬 (5,6/z12)
  const expected = [
    [5, 0, 11], [6, 0, 11], [5, 1, 11], [6, 1, 11],
    [25, 0, 15], [26, 0, 15], [25, 1, 15], [26, 1, 15],
    [45, 0, 22], [46, 0, 22], [45, 1, 22], [46, 1, 22],
  ];
  assert.equal(expected.length, 12);
  for (const [x, y, z] of expected) {
    assert.ok(!at.has(`${x},${y},${z}`), `출입구 (${x},${y},${z})는 공기여야 한다`);
  }
  // 입구 양옆 구조(낮은 동 1 (4,0,11),(8,0,11))와 위층 측벽(4,2,11),(8,2,11)이 존재.
  // 출입구 위(z11 줄기 속)는 원본처럼 빈 통로다.
  for (const [x, y, z] of [[4, 0, 11], [8, 0, 11], [4, 2, 11], [8, 2, 11]]) {
    assert.ok(at.has(`${x},${y},${z}`), `구조 (${x},${y},${z})가 남아 있어야 한다`);
  }
});

test('지붕과 꼭대기 경계 높이를 확인한다', () => {
  const model = buildModel();
  const at = new Map(model.blocks.map((b) => [`${b.x},${b.y},${b.z}`, b]));
  // 낮은 동 1: y=50 지붕은 전면 섬록암, y=51 갈래 시작
  assert.equal(at.get('3,50,8')?.material, DIORITE);
  // 높은 동: y=59 어깨 지붕, y=60 윗몸통, y=70 뿔 2층
  assert.equal(at.get('43,59,18')?.material, DIORITE);
  assert.ok(at.get('46,60,14'), 'y=60 윗몸통 필요');
  assert.equal(at.get('46,69,14')?.material, GRAY);
  assert.ok(at.get('42,70,10'), 'y=70 뿔 필요');
  // y=72에는 모델 블록이 없다
  assert.ok(!model.blocks.some((b) => b.y === 72), 'y=72 블록 없음');
});

test('층 선택 경계와 필터 교집합이 동작한다', () => {
  const model = buildModel();
  const empty = selectBlocks(model, { tower: 'low1', layer: 56 });
  assert.equal(empty.length, 0);
  assert.deepEqual(summarizeMaterials(empty).map((s) => s.count), [0, 0, 0, 0, 0, 0]);
  const crown = selectBlocks(model, { tower: 'high', layer: 71 });
  assert.ok(crown.length > 0);
  assert.ok(crown.every((b) => b.material === GRAY || b.material === DIORITE), '높이 72는 회색 끝+베이지V만');
  assert.ok(crown.some((b) => b.material === GRAY), '원본 B-15처럼 뿔 끝은 회색');
  const through = selectBlocks(model, { tower: 'high', layer: 2, through: true });
  assert.ok(through.every((b) => b.y <= 2));
  assert.equal(
    through.length,
    selectBlocks(model, { tower: 'high', layer: 0 }).length +
      selectBlocks(model, { tower: 'high', layer: 1 }).length +
      selectBlocks(model, { tower: 'high', layer: 2 }).length,
  );
  const inter = selectBlocks(model, {
    tower: 'high',
    layer: 10,
    material: GLASS,
  });
  assert.ok(inter.every((b) => b.tower === 'high' && b.y === 10 && b.material === GLASS));
  assert.throws(() => selectBlocks(model, { tower: 'nope' }), RangeError);
  assert.throws(() => selectBlocks(model, { material: 'nope' }), RangeError);
  assert.throws(() => selectBlocks(model, { layer: 1.5 }), RangeError);
  // 토대 음수층은 정상 선택이다.
  assert.ok(selectBlocks(model, { layer: -3 }).length > 0);
  // 최대 초과 정상 정수: 단층 빈 배열, 누적 전체 반환
  assert.equal(selectBlocks(model, { layer: 999 }).length, 0);
  assert.equal(selectBlocks(model, { layer: 999, through: true }).length, 17071);
});

test('높이 하한에서는 동이 끊어지지 않는다', () => {
  // 높은 동 어깨지붕이 좌우 날개를 잇는다. 하한 미만은 검증 실패여야 한다.
  for (const h of [13, 16, 24]) {
    const model = buildModel({ high: h });
    const result = validateModel(model);
    assert.equal(result.ok, true, `high=${h}: ${JSON.stringify(result.errors.slice(0, 3))}`);
    assert.equal(result.stats.components.high, 1);
  }
  const broken = buildModel({ high: 11 }, { podium: false });
  // buildModel은 하한 13으로 올림하므로 11 요청도 13으로 지어져 끊어지지 않는다.
  assert.equal(broken.towers.find((t) => t.id === 'high').height, 13);
  assert.equal(validateModel(broken).ok, true);
});
