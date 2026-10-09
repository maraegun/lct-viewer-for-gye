import { buildModel, selectBlocks, summarizeMaterials, HEIGHT_LIMITS, DEFAULT_HEIGHTS } from './model.mjs';
import { renderLayerSvg, distinctLayers } from './blueprints.mjs';
import { createViewer } from './viewer.mjs';

const $ = (id) => document.getElementById(id);
const notice = $('notice');
const pickInfo = $('pick-info');
const layerPanel = $('layer-panel');
const materialPanel = $('material-panel');
const statusLine = $('status-line');
const buildStatus = $('build-status');

const NICE_NAME = {
  'minecraft:cyan_stained_glass': '파란 유리',
  'minecraft:light_blue_stained_glass': '하늘 유리',
  'minecraft:gray_stained_glass': '회색 유리',
  'minecraft:polished_andesite': '회색 돌',
  'minecraft:polished_diorite': '흰 블록',
  'minecraft:black_wool': '검은 블록',
};
const GAME_NAME = {
  'minecraft:cyan_stained_glass': '청록색 색유리',
  'minecraft:light_blue_stained_glass': '하늘색 색유리',
  'minecraft:gray_stained_glass': '회색 색유리',
  'minecraft:polished_andesite': '윤나는 안산암',
  'minecraft:polished_diorite': '윤나는 섬록암',
  'minecraft:black_wool': '검은색 양털',
};

function showError(text) {
  notice.textContent = text;
  notice.hidden = false;
}

let heights = { low: DEFAULT_HEIGHTS.low, high: DEFAULT_HEIGHTS.high };
let showPodium = true;
let model = buildModel(heights, { podium: showPodium });

const state = {
  tower: 'all',
  layer: null,
  through: false,
  material: 'all',
  picked: null,
  building: false,
};

let viewer = null;
try {
  viewer = createViewer($('stage'), model, {
    onPick: (block) => {
      state.picked = block;
      renderPick();
    },
    onError: (text) => showError(text),
  });
} catch {
  showError('입체 보기를 시작하지 못했다. 아래 층 설계도와 필요한 블록은 계속 볼 수 있다.');
}

function currentSelection() {
  return { tower: state.tower, layer: state.layer, through: state.through, material: state.material };
}

function applySelection() {
  viewer?.setSelection(currentSelection());
  try {
    const want = state.layer === null ? '' : '#y=' + (state.layer + 1);
    if (location.hash !== want) history.replaceState(null, '', want || location.pathname);
  } catch { /* 무시 */ }
  renderPanels();
}

function towerName(id) {
  return model.towers.find((t) => t.id === id)?.name ?? id;
}

const BLOCK_SWATCH = {
  'minecraft:cyan_stained_glass': { fill: '#0a7d99', edge: '#065a6e' },
  'minecraft:light_blue_stained_glass': { fill: '#87b5e1', edge: '#5a8ac0' },
  'minecraft:gray_stained_glass': { fill: '#7c7c7c', edge: '#555555' },
  'minecraft:polished_andesite': { fill: '#b0b0b0', edge: '#7a7a7a' },
  'minecraft:polished_diorite': { fill: '#e9e9e9', edge: '#9a9a9a' },
  'minecraft:black_wool': { fill: '#2b2b2b', edge: '#000000' },
};
function swatchSvg(material) {
  const s = BLOCK_SWATCH[material] ?? BLOCK_SWATCH['minecraft:polished_diorite'];
  return `<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><rect x="3" y="3" width="20" height="20" fill="${s.fill}" stroke="${s.edge}" stroke-width="2"/></svg>`;
}
function renderPick() {
  if (!state.picked) {
    pickInfo.innerHTML = '보고 싶은 블록을 화면에서 눌러 보세요.';
    return;
  }
  const b = state.picked;
  pickInfo.innerHTML =
    `${swatchSvg(b.material)}<span><strong>${NICE_NAME[b.material]}</strong> (${GAME_NAME[b.material]}) · ${towerName(b.tower)} ${b.y + 1}층 (가로 ${b.x}, 세로 ${b.z})</span>`;
  pickInfo.style.display = 'flex';
  pickInfo.style.alignItems = 'center';
  pickInfo.style.gap = '8px';
}

function maxHeight() {
  return Math.max(...model.towers.map((t) => t.height));
}

function renderPanels() {
  const sel = currentSelection();
  const bigLink = document.getElementById('layer-big-link');
  if (bigLink) bigLink.href = './lct-drawings.html' + (sel.layer !== null ? `#y=${sel.layer + 1}` : '');
  if (sel.layer === null) {
    layerPanel.innerHTML = '<p>위에서 층을 고르면, 게임에서 그대로 쌓을 설계도가 여기에 나온다.</p>';
  } else {
    const towerDef = model.towers.find((t) => t.id === sel.tower);
    if (towerDef && sel.layer >= towerDef.height) {
      layerPanel.innerHTML =
        `<p>이 건물은 ${sel.layer + 1}층에 둘 블록이 없다. (꼭대기는 ${towerDef.height}층)</p>`;
    } else {
      const layerBlocks = selectBlocks(model, sel);
      layerPanel.innerHTML = renderLayerSvg(model, sel.layer, {
        tower: sel.tower,
        material: sel.material,
        cell: 20,
      });
      const counts = summarizeMaterials(layerBlocks);
      const parts = counts.filter((c) => c.count > 0).map((c) => `${NICE_NAME[c.material]} ${c.count}개`);
      const span = distinctSpan(sel.layer);
      const div = document.createElement('p');
      div.textContent =
        `${sel.layer + 1}층에 둘 것: ${parts.join(' · ') || '없음'}.` +
        (span > 1 ? ` 이 모양대로 ${span}층 쌓는다.` : '') +
        ` 위쪽이 북쪽, 네모 한 칸이 한 블록이다.`;
      layerPanel.appendChild(div);
      layerPanel.querySelectorAll('g[data-x]').forEach((g) => {
        g.style.cursor = 'pointer';
        g.addEventListener('click', () => {
          const b = {
            x: Number(g.dataset.x),
            y: Number(g.dataset.y),
            z: Number(g.dataset.z),
            material: g.dataset.material,
            tower: g.dataset.tower,
          };
          state.picked = b;
          viewer?.highlightBlock(b);
          renderPick();
        });
      });
    }
  }
  const total = summarizeMaterials(model.blocks);
  const current = summarizeMaterials(selectBlocks(model, sel));
  const curById = Object.fromEntries(current.map((c) => [c.material, c]));
  materialPanel.innerHTML =
    `<table><thead><tr><th>블록</th><th>다 지을 때</th><th>이 층</th></tr></thead><tbody>` +
    total
      .map((t) => {
        const c = curById[t.material] ?? { count: 0 };
        return `<tr><td>${swatchSvg(t.material)} ${NICE_NAME[t.material]}<br><small>${GAME_NAME[t.material]}</small></td><td>${t.count}개 (${t.stacks64}묶음+${t.remainder})</td><td>${c.count}개</td></tr>`;
      })
      .join('') +
    `</tbody></table>` +
    `<p>다 지으려면 ${total.filter((t) => t.count > 0).map((t) => `${NICE_NAME[t.material]} ${t.count}개`).join(', ')}. 64개씩 묶어서 챙기면 된다.</p>`;
  const towerText = sel.tower === 'all' ? '건물 전체' : towerName(sel.tower);
  const layerText = sel.layer === null
    ? '전부'
    : sel.through
      ? `${sel.layer + 1}층까지`
      : `${sel.layer + 1}층만`;
  statusLine.textContent =
    `지금 화면: ${towerText} · ${layerText} · 블록 ${selectBlocks(model, sel).length}개`;
}

const MAT_BY_VALUE = {
  glass: 'minecraft:cyan_stained_glass',
  sky: 'minecraft:light_blue_stained_glass',
  gray: 'minecraft:gray_stained_glass',
  andesite: 'minecraft:polished_andesite',
  rock: 'minecraft:polished_diorite',
  wool: 'minecraft:black_wool',
};
function syncControls() {
  $('tower').value = state.tower;
  $('material').value =
    Object.entries(MAT_BY_VALUE).find(([, id]) => id === state.material)?.[0] ?? 'all';
  const top = maxHeight();
  $('layer-num').max = top;
  $('layer-range').max = top;
  $('layer-num').value = state.layer === null ? top : Math.min(state.layer + 1, top);
  $('layer-range').value = state.layer === null ? top : Math.min(state.layer + 1, top);
  const mode = document.querySelector(`input[name="cut"][value="${state.layer === null ? 'all' : state.through ? 'through' : 'only'}"]`);
  if (mode) mode.checked = true;
  $('height-low').value = heights.low;
  $('height-low-num').value = heights.low;
  $('height-high').value = heights.high;
  $('height-high-num').value = heights.high;
}

// 건물 높이 바꾸기: 낮추면 몸통만 짧아지고 지붕 모양은 그대로 둔다.
function rebuildWithHeights() {
  model = buildModel(heights, { podium: showPodium });
  state.picked = null;
  if (state.layer !== null && state.layer >= maxHeight()) {
    state.layer = maxHeight() - 1;
  }
  viewer?.setModel(model);
  syncControls();
  applySelection();
  renderPick();
}
$('podium-toggle').addEventListener('change', (e) => {
  showPodium = e.target.checked;
  rebuildWithHeights();
});

$('tower').addEventListener('change', (e) => {
  state.tower = e.target.value;
  applySelection();
});
$('material').addEventListener('change', (e) => {
  state.material = MAT_BY_VALUE[e.target.value] ?? 'all';
  applySelection();
});
document.querySelectorAll('input[name="cut"]').forEach((r) =>
  r.addEventListener('change', (e) => {
    const v = e.target.value;
    if (v === 'all') {
      state.layer = null;
      state.through = false;
    } else if (v === 'through') {
      if (state.layer === null) state.layer = maxHeight() - 1;
      state.through = true;
    } else {
      if (state.layer === null) state.layer = 0;
      state.through = false;
    }
    syncControls();
    applySelection();
  }),
);
function setLayerFromUI(displayHeight) {
  const top = maxHeight();
  const h = Math.max(1, Math.min(top, Math.round(Number(displayHeight) || 1)));
  state.layer = h - 1;
  syncControls();
  applySelection();
}
// 모양이 바뀌는 층으로 건너뛰기: 일일이 넘기지 않고 도면만 밟는다.
function layerBoundaries() {
  return distinctLayers(model).map(({ y }) => y);
}
// 지금 층과 같은 모양이 몇 층 이어지는지 셈한다.
function distinctSpan(y) {
  const ds = distinctLayers(model);
  const i = ds.findIndex((d) => d.y === y);
  if (i < 0) return 1;
  return Math.max(1, ds[i].through - y);
}
// 한 층씩 오르내리기: 처음 누르면 1층에서 시작한다.
function stepLayer(delta) {
  const top = maxHeight();
  let h = state.layer === null ? (delta > 0 ? 1 : top) : state.layer + 1 + delta;
  h = Math.max(1, Math.min(top, h));
  document.querySelector('input[name="cut"][value="only"]').checked = true;
  state.through = false;
  setLayerFromUI(h);
}
// 모양이 바뀌는 앞·뒤 층으로 점프한다.
function jumpBoundary(delta) {
  const bounds = layerBoundaries().map((y) => y + 1);
  if (!bounds.length) return;
  const top = maxHeight();
  const cur = state.layer === null ? (delta > 0 ? 1 : top) : state.layer + 1;
  let next;
  if (delta > 0) next = bounds.find((h) => h > cur) ?? top;
  else next = [...bounds].reverse().find((h) => h < cur) ?? 1;
  document.querySelector('input[name="cut"][value="only"]').checked = true;
  state.through = false;
  setLayerFromUI(next);
}
$('layer-prev').addEventListener('click', () => stepLayer(-1));
$('layer-next').addEventListener('click', () => stepLayer(1));
$('layer-jump-prev').addEventListener('click', () => jumpBoundary(-1));
$('layer-jump-next').addEventListener('click', () => jumpBoundary(1));
document.addEventListener('keydown', (e) => {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    stepLayer(e.key === 'ArrowUp' ? 1 : -1);
  }
});
$('layer-range').addEventListener('input', (e) => setLayerFromUI(e.target.value));
$('layer-num').addEventListener('change', (e) => setLayerFromUI(e.target.value));

function setHeight(kind, value) {
  const limit = HEIGHT_LIMITS[kind];
  heights[kind] = Math.max(limit.min, Math.min(limit.max, Math.round(Number(value) || limit.max)));
  rebuildWithHeights();
}
$('height-low').addEventListener('input', (e) => setHeight('low', e.target.value));
$('height-low-num').addEventListener('change', (e) => setHeight('low', e.target.value));
$('height-high').addEventListener('input', (e) => setHeight('high', e.target.value));
$('height-high-num').addEventListener('change', (e) => setHeight('high', e.target.value));
$('height-reset').addEventListener('click', () => {
  heights = { low: DEFAULT_HEIGHTS.low, high: DEFAULT_HEIGHTS.high };
  rebuildWithHeights();
});
document.querySelectorAll('[data-heights]').forEach((b) =>
  b.addEventListener('click', () => {
    const [low, high] = b.dataset.heights.split(',').map(Number);
    heights = { low, high };
    rebuildWithHeights();
  }),
);

// 처음부터 쌓기: 1층부터 차례로 올라간다. GrabCraft처럼 1층부터 짓는다.
$('btn-build').addEventListener('click', () => {
  if (!viewer) return;
  if (state.building) {
    viewer.stopBuild();
    state.building = false;
    $('btn-build').textContent = '처음부터 쌓기';
    buildStatus.textContent = '';
    return;
  }
  viewer.stopBuild();
  // 쌓기를 볼 때는 전체 보기로 맞춘다.
  document.querySelector('input[name="cut"][value="all"]').checked = true;
  state.layer = null;
  state.through = false;
  syncControls();
  applySelection();
  state.building = true;
  $('btn-build').textContent = '멈추기';
  const total = viewer.playBuild({
    onProgress: (shown, want) => {
      buildStatus.textContent = `쌓는 중 ${shown} / ${want}개 · 실제 지을 때도 1층부터 이 순서로 쌓는다`;
    },
    onDone: () => {
      state.building = false;
      $('btn-build').textContent = '처음부터 쌓기';
      buildStatus.textContent = `다 쌓았다 · ${model.blocks.length}개 · 이제 1층 설계도부터 지어 보자`;
    },
  });
  if (total === 0) {
    state.building = false;
    $('btn-build').textContent = '처음부터 쌓기';
    buildStatus.textContent = '보여줄 블록이 없다.';
  }
});

$('btn-home').addEventListener('click', () => {
  viewer?.stopBuild();
  state.building = false;
  $('btn-build').textContent = '처음부터 쌓기';
  buildStatus.textContent = '';
  state.tower = 'all';
  state.layer = null;
  state.through = false;
  state.material = 'all';
  state.picked = null;
  viewer?.highlightBlock(null);
  viewer?.reset();
  syncControls();
  applySelection();
  renderPick();
});
// 안에서 보기·입구 가기는 뺐다. 겉에서 돌려보기만 둔다.
$('btn-clear-pick').addEventListener('click', () => {
  state.picked = null;
  viewer?.highlightBlock(null);
  renderPick();
});

// 처음 화면: 건물 전체 · 전부 · 모든 블록
// 도면 탭에서 돌아오면(#y=층) 해당 층을 고른 채로 연다.
try {
  const m = /^#y=(\d+)$/.exec(location.hash);
  if (m) {
    const top = Math.max(...model.towers.map((t) => t.height));
    const h = Math.max(1, Math.min(top, Math.round(Number(m[1]))));
    state.layer = h - 1;
    state.through = false;
  }
} catch { /* 해시 없으면 전부 */ }
syncControls();
applySelection();
renderPick();
