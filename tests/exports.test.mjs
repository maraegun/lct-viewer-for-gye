import test from 'node:test';
import assert from 'node:assert/strict';
import { buildModel, selectBlocks } from '../src/model.mjs';
import { renderElevationSvg, renderLayerSvg } from '../src/blueprints.mjs';
import {
  parseBlocksCsv,
  parseMaterialsCsv,
  serializeBlocksCsv,
  serializeMaterialsCsv,
} from '../src/exports.mjs';

test('CSV 왕복 집합이 모델과 같고 재료표가 블록에서 재집계한 값과 같다', () => {
  const model = buildModel();
  const rows = parseBlocksCsv(serializeBlocksCsv(model));
  assert.equal(rows.length, 15103);
  const a = new Set(model.blocks.map((b) => `${b.x},${b.y},${b.z},${b.material},${b.tower}`));
  const b = new Set(rows.map((r) => `${r.x},${r.y},${r.z},${r.material},${r.tower}`));
  assert.deepEqual(b, a);
  // 재료 CSV는 블록 CSV에서 독립 재집계한 값과 같다
  const byScope = new Map();
  for (const r of rows) {
    const scope =
      r.tower === 'low1' ? '낮은 건물 1' : r.tower === 'low2' ? '낮은 건물 2' : r.tower === 'podium' ? '토대' : '높은 건물';
    for (const key of ['전체 건축', scope]) {
      if (!byScope.has(key)) byScope.set(key, new Map());
      const m = byScope.get(key);
      m.set(r.material, (m.get(r.material) ?? 0) + 1);
    }
  }
  for (const row of parseMaterialsCsv(serializeMaterialsCsv(model))) {
    assert.equal(row.count, byScope.get(row.scope)?.get(row.material) ?? 0);
    assert.equal(row.stacks64, Math.floor(row.count / 64));
    assert.equal(row.remainder, row.count % 64);
  }
});

test('75개 도면 레이어 합집합이 모델과 같다', () => {
  const model = buildModel();
  const seen = new Set();
  const maxY = Math.max(...model.blocks.map((b) => b.y));
  assert.equal(maxY, 71);
  const minY = Math.min(...model.blocks.map((b) => b.y));
  assert.equal(minY, -3);
  const layers = [];
  for (let y = minY; y <= maxY; y++) {
    const svg = renderLayerSvg(model, y);
    assert.ok(svg.includes(`data-layer="${y}"`), `높이 ${y} 도면 필요`);
    layers.push(svg);
  }
  assert.equal(layers.length, 75);
  const re = /data-x="(-?\d+)" data-y="(-?\d+)" data-z="(-?\d+)" data-material="([^"]+)" data-tower="([^"]+)"/g;
  for (const svg of layers) {
    for (const m of svg.matchAll(re)) {
      seen.add(`${m[1]},${m[2]},${m[3]},${m[4]},${m[5]}`);
    }
  }
  const expected = new Set(
    model.blocks.map((b) => `${b.x},${b.y},${b.z},${b.material},${b.tower}`),
  );
  assert.deepEqual(seen, expected);
});

test('모델·CSV 순서가 결정적이고 공기·지면을 세지 않는다', () => {
  const first = serializeBlocksCsv(buildModel());
  const second = serializeBlocksCsv(buildModel());
  assert.equal(first, second);
  assert.ok(!first.includes('minecraft:air'));
  assert.ok(!first.includes('관람용 지면'));
  const again = serializeMaterialsCsv(buildModel());
  assert.equal(again, serializeMaterialsCsv(buildModel()));
});

test('입면도는 네 방향 바깥 블록만 투영한다', () => {
  const model = buildModel();
  for (const d of ['north', 'south', 'east', 'west']) {
    const svg = renderElevationSvg(model, d);
    assert.ok(svg.includes(`data-elevation="${d}"`));
    assert.ok(svg.includes('data-x='), `${d} 입면 블록 필요`);
  }
  assert.throws(() => renderElevationSvg(model, 'up'), RangeError);
  // 북쪽 입면의 각 (x,y) 칸은 해당 열에서 z 최소 블록이어야 한다
  const north = new Map();
  for (const b of model.blocks) {
    const key = `${b.x},${b.y}`;
    if (!north.has(key) || b.z < north.get(key).z) north.set(key, b);
  }
  const re = /data-x="(-?\d+)" data-y="(-?\d+)" data-z="(-?\d+)"/g;
  const shown = new Set();
  for (const m of renderElevationSvg(model, 'north').matchAll(re)) {
    shown.add(`${m[1]},${m[2]},${m[3]}`);
  }
  assert.equal(shown.size, north.size);
  void selectBlocks;
});
