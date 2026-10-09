import { selectBlocks, summarizeMaterials } from './model.mjs';

const CELL = 12;
const PAD_L = 44;
const PAD_T = 96;
const PAD_R = 12;
const PAD_B = 28;

const FILL = {
  'minecraft:cyan_stained_glass': '#0a7d99',
  'minecraft:light_blue_stained_glass': '#87b5e1',
  'minecraft:gray_stained_glass': '#7c7c7c',
  'minecraft:polished_andesite': '#b0b0b0',
  'minecraft:polished_diorite': '#ececec',
  'minecraft:black_wool': '#2b2b2b',
};
const SYM = {
  'minecraft:cyan_stained_glass': 'G',
  'minecraft:light_blue_stained_glass': 'S',
  'minecraft:gray_stained_glass': 'E',
  'minecraft:polished_andesite': 'A',
  'minecraft:polished_diorite': 'D',
  'minecraft:black_wool': 'K',
};
const NICE = {
  'minecraft:cyan_stained_glass': '파란 유리',
  'minecraft:light_blue_stained_glass': '하늘 유리',
  'minecraft:gray_stained_glass': '회색 유리',
  'minecraft:polished_andesite': '회색 돌',
  'minecraft:polished_diorite': '흰 블록',
  'minecraft:black_wool': '검은 블록',
};

function esc(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function layerCells(model, y, selection) {
  const { tower = 'all', material = 'all' } = selection ?? {};
  const at = new Map();
  for (const b of selectBlocks(model, { tower, layer: y, material })) {
    at.set(`${b.x},${b.z}`, b);
  }
  return at;
}

// 지정된 정확히 한 높이를 그린다. 누적 모드에서도 도면은 그 높이만 표시한다.
// 북쪽이 위, x 증가가 오른쪽, z 증가가 아래. 한 칸=한 블록.
export function renderLayerSvg(model, y, selection = { tower: 'all', material: 'all' }) {
  if (!Number.isInteger(y)) {
    throw new RangeError(`도면 높이는 정수 상대 y이어야 한다: ${y}`);
  }
  const { min, max } = model.bounds;
  const cols = max.x - min.x + 1;
  const rows = max.z - min.z + 1;
  const at = layerCells(model, y, selection);
  const summary = summarizeMaterials([...at.values()]);
  const parts = summary.filter((c) => c.count > 0).map((c) => `${NICE[c.material] ?? c.material} ${c.count}개`);
  // 이 층 블록이 차지하는 가로×세로 (GrabCraft처럼 옆에 적어 둔다).
  const ys = [...at.values()].map((b) => b.y);
  void ys;
  const xs = [...at.keys()].map((k) => Number(k.split(',')[0]));
  const zs = [...at.keys()].map((k) => Number(k.split(',')[1]));
  const span = at.size
    ? `가로 ${Math.max(...xs) - Math.min(...xs) + 1}칸 × 세로 ${Math.max(...zs) - Math.min(...zs) + 1}칸`
    : '둘 블록 없음';
  const w = PAD_L + cols * CELL + PAD_R;
  const h = PAD_T + rows * CELL + PAD_B;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" data-layer="${y}" role="img" aria-label="${y < 0 ? `토대 ${y}` : `높이 ${y + 1}`} 평면도">`;
  s += `<text x="${PAD_L}" y="20" font-size="15" font-weight="bold">${y < 0 ? `토대 ${-y}단` : `${y + 1}층 설계도`}</text>`;
  s += `<text x="${PAD_L}" y="40" font-size="12">위쪽이 북쪽 · 네모 한 칸이 블록 한 개 · ${span}</text>`;
  s += `<text x="${PAD_L}" y="58" font-size="12">${parts.join(' · ') || '둘 블록 없음'}</text>`;
  s += `<text x="${PAD_L}" y="76" font-size="12">색칠된 칸이 둘 칸, 빈 칸은 비우기 · 칸에 마우스를 올리면 블록 이름이 나온다</text>`;
  // x 눈금
  for (let x = min.x; x <= max.x; x++) {
    if ((x - min.x) % 2 === 0) {
      s += `<text x="${PAD_L + (x - min.x) * CELL + 1}" y="${PAD_T - 6}" font-size="9" fill="#555">${x}</text>`;
    }
  }
  for (let z = min.z; z <= max.z; z++) {
    const row = z - min.z;
    if (row % 2 === 0) {
      s += `<text x="6" y="${PAD_T + row * CELL + 10}" font-size="9" fill="#555">${z}</text>`;
    }
    for (let x = min.x; x <= max.x; x++) {
      const b = at.get(`${x},${z}`);
      const px = PAD_L + (x - min.x) * CELL;
      const py = PAD_T + row * CELL;
      if (!b) {
        s += `<rect x="${px}" y="${py}" width="${CELL}" height="${CELL}" fill="none" stroke="#cccccc" stroke-width="0.5"/>`;
      } else {
        const sym = SYM[b.material] ?? '?';
        const nice = NICE[b.material] ?? b.material;
        s += `<g data-x="${b.x}" data-y="${b.y}" data-z="${b.z}" data-material="${esc(b.material)}" data-tower="${esc(b.tower)}">`;
        s += `<title>${nice} (${b.x}, ${b.y + 1}층, ${b.z})</title>`;
        s += `<rect x="${px}" y="${py}" width="${CELL}" height="${CELL}" fill="${FILL[b.material]}" stroke="#333333" stroke-width="0.8"/>`;
        s += `<text x="${px + CELL / 2}" y="${py + CELL / 2 + 3.5}" font-size="8" text-anchor="middle" fill="#111111">${sym}</text>`;
        s += `</g>`;
      }
    }
  }
  s += `</svg>`;
  return s;
}

// 입면도: 해당 방향 가장 바깥 블록을 실제 좌표로 투영. 숨은 블록은 그리지 않는다.
export function renderElevationSvg(model, direction) {
  const { min, max } = model.bounds;
  const cell = 7;
  const padL = 44;
  const padT = 40;
  let horizontal;
  const visible = new Map(); // "h,y" -> block
  if (direction === 'north' || direction === 'south') {
    horizontal = { from: min.x, to: max.x, label: 'x' };
    for (const b of model.blocks) {
      const key = `${b.x},${b.y}`;
      const cur = visible.get(key);
      if (!cur) {
        visible.set(key, b);
      } else if (direction === 'north' ? b.z < cur.z : b.z > cur.z) {
        visible.set(key, b);
      }
    }
  } else if (direction === 'east' || direction === 'west') {
    horizontal = { from: min.z, to: max.z, label: 'z' };
    for (const b of model.blocks) {
      const key = `${b.z},${b.y}`;
      const cur = visible.get(key);
      if (!cur) {
        visible.set(key, b);
      } else if (direction === 'east' ? b.x > cur.x : b.x < cur.x) {
        visible.set(key, b);
      }
    }
  } else {
    throw new RangeError(`알 수 없는 입면 방향: ${direction}`);
  }
  const cols = horizontal.to - horizontal.from + 1;
  const rows = max.y - min.y + 1;
  const w = padL + cols * cell + 12;
  const h = padT + rows * cell + 24;
  const names = { north: '북', south: '남', east: '동', west: '서' };
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" data-elevation="${direction}" role="img" aria-label="${names[direction]}쪽 입면도">`;
  s += `<text x="${padL}" y="18" font-size="14" font-weight="bold">${names[direction]}쪽 입면도 (${horizontal.label} ${horizontal.from}..${horizontal.to}, 높이 1..${rows})</text>`;
  for (let y = min.y; y <= max.y; y++) {
    const row = max.y - y; // 위가 높은 쪽
    if ((y - min.y) % 4 === 0) {
      s += `<text x="6" y="${padT + row * cell + 6}" font-size="8" fill="#555">${y + 1}</text>`;
    }
    for (let v = horizontal.from; v <= horizontal.to; v++) {
      const b = visible.get(`${v},${y}`);
      const px = padL + (v - horizontal.from) * cell;
      const py = padT + row * cell;
      if (!b) continue;
      s += `<g data-x="${b.x}" data-y="${b.y}" data-z="${b.z}" data-material="${esc(b.material)}" data-tower="${esc(b.tower)}">`;
      s += `<rect x="${px}" y="${py}" width="${cell}" height="${cell}" fill="${FILL[b.material]}" stroke="#333333" stroke-width="0.4"/>`;
      s += `</g>`;
    }
  }
  s += `</svg>`;
  return s;
}

function materialTable(rows) {
  let s = `<table><thead><tr><th>범위</th><th>재료</th><th>게임 ID</th><th>개수</th><th>64묶음</th><th>나머지</th></tr></thead><tbody>`;
  for (const r of rows) {
    s += `<tr><td>${esc(r.scope)}</td><td>${esc(r.name)}</td><td>${esc(r.material)}</td><td>${r.count}</td><td>${r.stacks64}</td><td>${r.remainder}</td></tr>`;
  }
  return s + `</tbody></table>`;
}

export function materialRows(model) {
  const scopes = [['전체 건축', model.blocks]];
  for (const t of model.towers) {
    scopes.push([t.name, model.blocks.filter((b) => b.tower === t.id)]);
  }
  const rows = [];
  for (const [scope, blocks] of scopes) {
    for (const s of summarizeMaterials(blocks)) {
      rows.push({ scope, ...s });
    }
  }
  return rows;
}

// 독립 인쇄용 전체 시공 도면집. 외부 의존성 없음.
export function renderBlueprintBook(model) {
  const { min, max } = model.bounds;
  const rows = materialRows(model);
  const towerNames = new Map(model.towers.map((t) => [t.id, t]));
  let s = `<!doctype html><html lang="ko"><head><meta charset="utf-8">`;
  s += `<meta name="viewport" content="width=device-width, initial-scale=1">`;
  s += `<title>엘시티 1/2 간소화 시공 도면집</title>`;
  s += `<style>body{font-family:system-ui,"Apple SD Gothic Neo",sans-serif;margin:0 auto;max-width:900px;padding:24px;line-height:1.6;}table{border-collapse:collapse;width:100%;font-size:14px;margin:12px 0;}th,td{border:1px solid #888;padding:6px 8px;text-align:left;}.sheet{margin:24px 0;}svg{max-width:100%;height:auto;border:1px solid #999;}@media print{@page{size:A3 portrait;margin:12mm;}.sheet{page-break-before:always;break-inside:avoid;}svg{max-height:235mm;}}details{margin:8px 0;}</style>`;
  s += `</head><body>`;
  s += `<h1>엘시티 1/2 간소화 시공 도면집</h1>`;
  s += `<p>원본의 정확한 복원이 아닌 독립적인 시공 가능 새 설계다. 외관 특징(세 동, 높이 차이, 잘록한 단면·두 날개, 흰 수직 테두리, 푸른 유리, 분리된 꼭대기)을 축소 격자에 다시 설계했다. 외접 실제값은 X ${max.x - min.x + 1} × Z ${max.z - min.z + 1} × 높이 ${max.y - min.y + 1}이다.</p>`;
  s += `<h2>배치와 좌표</h2><ul>`;
  for (const t of model.towers) {
    s += `<li>${esc(t.name)}: 원점 x=${t.origin.x}, z=${t.origin.z}, 높이 ${t.height} (상대 y 0..${t.height - 1}, 표시 높이 1..${t.height})</li>`;
  }
  s += `</ul>`;
  s += `<p>좌표는 블록 최소 모서리 정수 (x,y,z)다. x는 동쪽, z는 남쪽, y는 위쪽, 북쪽은 -z다. 건물 첫 블록은 y=0(표시 높이 1), 최고 y=${max.y}(표시 높이 ${max.y + 1})다. 지면 윗면은 y=0이다. 게임 Y = 선택한 기초 Y + 상대 y 로만 환산한다.</p>`;
  s += `<p>출입구는 낮은 동 로컬 (x=5 또는 6, z=12, y=0 또는 1), 높은 동 로컬 (x=4 또는 5, z=14, y=0 또는 1)의 4블록씩을 뺀 개방 출입구다. 문 아이템을 설치하지 않는다. 넓은 공통 기단, 내부 층 바닥, 상설 계단, 가구는 만들지 않는다.</p>`;
  s += `<p>설계 근거 원문: <a href="https://m.blog.naver.com/sciencehahn/222157399308">엘시티 마인크래프트 도면 원문</a>. 낮은 두 동은 시공 단순화를 위해 의도적으로 같은 단면과 높이를 사용한다.</p>`;
  s += `<h2>전체 및 동별 재료표</h2>${materialTable(rows)}`;
  s += `<h2>입면도</h2>`;
  for (const d of ['north', 'south', 'east', 'west']) {
    s += `<div class="sheet">${renderElevationSvg(model, d)}</div>`;
  }
  s += `<h2>높이별 평면도 1..${max.y + 1}</h2><p>반복층을 생략하지 않고 전 높이를 싣는다. 각 장은 정확히 그 높이만 표시한다.</p>`;
  for (let y = 0; y <= max.y; y++) {
    const towersHere = model.towers
      .filter((t) => y < t.height)
      .map((t) => `${esc(t.name)} ${t.height}중 높이 ${y + 1}`)
      .join(' · ');
    s += `<div class="sheet"><details open><summary>높이 ${y + 1} — ${towersHere}</summary>${renderLayerSvg(model, y)}</details></div>`;
  }
  // towerNames는 표지 동 이름 해석용으로 유지한다.
  void towerNames;
  s += `</body></html>`;
  return s;
}
