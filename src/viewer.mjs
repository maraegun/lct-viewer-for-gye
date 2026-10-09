import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { DIORITE, GLASS, SKY, GRAY, ANDESITE, WOOL } from './model.mjs';

// 고정 시드 난수: 텍스처를 결정적으로 생성한다.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeDioriteTexture() {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const g = c.getContext('2d');
  const rnd = mulberry32(20261219);
  g.fillStyle = '#e9e9e9';
  g.fillRect(0, 0, 16, 16);
  for (let i = 0; i < 16; i++) {
    const v = 222 + Math.floor(rnd() * 18);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(Math.floor(rnd() * 16), Math.floor(rnd() * 16), 1, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGlassTexture(aniso = 4) {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const g = c.getContext('2d');
  g.fillStyle = '#a5e0f0';
  g.fillRect(0, 0, 16, 16);
  g.fillStyle = '#2b9ec2';
  g.fillRect(2, 2, 12, 5);
  g.fillStyle = '#e8f2fa';
  g.fillRect(0, 0, 16, 1);
  g.fillRect(0, 15, 16, 1);
  g.fillRect(0, 0, 1, 16);
  g.fillRect(15, 0, 1, 16);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = aniso;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function boundsCenter(bounds) {
  return new THREE.Vector3(
    (bounds.min.x + bounds.max.x) / 2 + 0.5,
    (bounds.min.y + bounds.max.y) / 2 + 0.5,
    (bounds.min.z + bounds.max.z) / 2 + 0.5,
  );
}

// 겉에서 돌려보는 뷰어: createViewer(container, model, {onPick, onError})
// 돌리기·휠 확대·우클릭 이동, 블록 고르기, 한 층씩 쌓기만 한다.
export function createViewer(container, model, hooks = {}) {
  const onPick = hooks.onPick ?? (() => {});
  const onError = hooks.onError ?? (() => {});
  const towerIds = new Set((model?.towers ?? []).map((t) => t.id));

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch (e) {
    onError(`3D를 시작하지 못했습니다(WebGL2 필요): ${e?.message ?? e}`);
    throw e;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.tabIndex = 0;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#87bfe8');

  const camera = new THREE.PerspectiveCamera(
    45,
    Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1),
    0.1,
    2000,
  );
  const center = boundsCenter(model.bounds);
  // 건물 몸통을 본다. 토대가 있으면 중심이 낮아져 땅에 박힌다.
  const viewCenter = new THREE.Vector3(center.x, 32, center.z);
  // 정면에서 살짝 비스듬히. 옆에서 보면 한쪽이 크게 보여 치우쳐 보인다.
  const HOME_DIR = new THREE.Vector3(-30, 32, 100).normalize();
  function homePosition() {
    const size = new THREE.Vector3(
      model.bounds.max.x - model.bounds.min.x + 1,
      model.bounds.max.y - model.bounds.min.y + 1,
      model.bounds.max.z - model.bounds.min.z + 1,
    );
    return viewCenter.clone().addScaledVector(HOME_DIR, (size.length() / 2) * 3.0);
  }
  camera.position.copy(homePosition());
  camera.lookAt(viewCenter);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(viewCenter);
  controls.enableDamping = false;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };
  controls.update();

  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-40, 90, -30);
  scene.add(sun);

  // 관람용 지면과 격자: 건축 블록이 아니며 재료 집계에서 제외한다.
  // 토대(y -3..-1)가 있으면 지면을 토대 밑에 깐다.
  const groundY = model?.podium ? model.podium.y0 - 0.01 : 0;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshLambertMaterial({ color: '#7da86b' }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(center.x, groundY, center.z);
  scene.add(ground);
  const grid = new THREE.GridHelper(120, 60, '#ffffff', '#5c8a52');
  grid.position.set(center.x, groundY + 0.01, center.z);
  scene.add(grid);

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  // 유리는 비치게, 돌·양털은 꽉 차게. 그래야 겉에서 봐도 구분된다.
  function glassMaterial(map, color, opacity) {
    return new THREE.MeshLambertMaterial({
      map: map ?? null,
      color,
      transparent: true,
      opacity,
      depthWrite: true,
      side: THREE.FrontSide,
    });
  }
  const glassMat = glassMaterial(makeGlassTexture(Math.min(8, maxAniso)), '#ffffff', 0.75);
  const skyMat = glassMaterial(null, '#87b5e1', 0.75);
  const grayMat = glassMaterial(null, '#9aa0a6', 0.8);
  const rockMat = new THREE.MeshLambertMaterial({
    map: makeDioriteTexture(),
    side: THREE.FrontSide,
  });
  const woolMat = new THREE.MeshLambertMaterial({ color: '#232323', side: THREE.FrontSide });
  const andesiteMat = new THREE.MeshLambertMaterial({ color: '#b0b0b0', side: THREE.FrontSide });
  const solidMats = {
    [GLASS]: glassMat,
    [SKY]: skyMat,
    [GRAY]: grayMat,
    [ANDESITE]: andesiteMat,
    [DIORITE]: rockMat,
    [WOOL]: woolMat,
  };
  // 흐릿한 나머지 층: 고른 층만 볼 때도 맥락이 보이게 밑에 깐다.
  const ghostGlassMat = new THREE.MeshLambertMaterial({
    map: makeGlassTexture(Math.min(8, maxAniso)),
    transparent: true,
    opacity: 0.07,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  const ghostRockMat = new THREE.MeshLambertMaterial({
    map: makeDioriteTexture(),
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  const ghostWoolMat = new THREE.MeshBasicMaterial({
    color: '#232323',
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  const ghostSkyMat = new THREE.MeshBasicMaterial({ color: '#87b5e1', transparent: true, opacity: 0.1, depthWrite: false, side: THREE.FrontSide });
  const ghostGrayMat = new THREE.MeshBasicMaterial({ color: '#7c7c7c', transparent: true, opacity: 0.1, depthWrite: false, side: THREE.FrontSide });
  const ghostAndesiteMat = new THREE.MeshBasicMaterial({ color: '#b0b0b0', transparent: true, opacity: 0.12, depthWrite: false, side: THREE.FrontSide });
  const ghostMats = {
    [GLASS]: ghostGlassMat,
    [SKY]: ghostSkyMat,
    [GRAY]: ghostGrayMat,
    [ANDESITE]: ghostAndesiteMat,
    [DIORITE]: ghostRockMat,
    [WOOL]: ghostWoolMat,
  };

  // 동×재료별 InstancedMesh. 인스턴스 인덱스와 원본 block을 연결한다.
  const meshes = new Map();
  const meshBlocks = new Map();
  const ghostMeshes = [];
  const dummy = new THREE.Object3D();
  let selection = { tower: 'all', layer: null, through: false, material: 'all' };

  function matches(b) {
    // 토대는 층 고르기와 상관없이 항상 보인다.
    if (b.tower === 'podium') {
      if (selection.material !== 'all' && b.material !== selection.material) return false;
      return true;
    }
    if (selection.tower !== 'all' && b.tower !== selection.tower) return false;
    if (selection.material !== 'all' && b.material !== selection.material) return false;
    if (selection.layer !== null) {
      if (selection.through) {
        if (b.y > selection.layer) return false;
      } else if (b.y !== selection.layer) {
        return false;
      }
    }
    return true;
  }
  // 흐릿하게 둘 것: 지금 고른 층 빼고 같은 건물·재료 조건에 드는 나머지.
  function matchesGhost(b) {
    if (selection.layer === null || selection.through) return false;
    if (selection.tower !== 'all' && b.tower !== selection.tower) return false;
    if (selection.material !== 'all' && b.material !== selection.material) return false;
    return b.y !== selection.layer;
  }

  // 쌓기: 한 층씩 아래부터 차례로. rebuild가 전량을 즉시 그린다.
  let buildAnim = null;
  function buildCursor(elapsedMs) {
    if (!buildAnim) return null;
    const fullLayers = Math.floor(elapsedMs / buildAnim.msPerLayer);
    const inLayer = (elapsedMs % buildAnim.msPerLayer) / buildAnim.msPerLayer;
    return { fullLayers, inLayer };
  }
  function visibleCount(list, elapsedMs) {
    if (!buildAnim) return list.length;
    const cursor = buildCursor(elapsedMs);
    const y = list[0]?.y ?? 0;
    const rel = y - buildAnim.minY;
    if (rel < cursor.fullLayers) return list.length;
    if (rel > cursor.fullLayers) return 0;
    return Math.floor(list.length * cursor.inLayer);
  }
  function rebuild() {
    for (const m of meshes.values()) {
      scene.remove(m);
      m.dispose?.();
    }
    for (const m of ghostMeshes) {
      scene.remove(m);
      m.dispose?.();
    }
    meshes.clear();
    meshBlocks.clear();
    ghostMeshes.length = 0;
    const groups = new Map();
    const ghosts = new Map();
    for (const b of model.blocks) {
      if (matches(b)) {
        // 쌓기는 층별로 따로 세야 한 층씩 올라간다. 묶음 키에 높이 포함.
        const key = buildAnim ? `${b.tower}|${b.material}|${b.y}` : `${b.tower}|${b.material}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(b);
      } else if (!buildAnim && matchesGhost(b)) {
        const key = `${b.tower}|${b.material}`;
        if (!ghosts.has(key)) ghosts.set(key, []);
        ghosts.get(key).push(b);
      }
    }
    // 쌓기 중에는 층 순서(y, z, x)로 잘라 보여준다.
    for (const list of groups.values()) {
      list.sort((a, b) => a.y - b.y || a.z - b.z || a.x - b.x);
    }
    const elapsed = buildAnim ? performance.now() - buildAnim.startedAt : 0;
    for (const [key, list] of groups) {
      const m0 = list[0].material;
      const mat = solidMats[m0] ?? rockMat;
      const shown = visibleCount(list, elapsed);
      const mesh = new THREE.InstancedMesh(geometry, mat, Math.max(shown, 1));
      mesh.count = shown;
      // 투명한 유리는 꽉 찬 돌보다 나중에 그려야 안쪽이 비친다.
      if (mat.transparent) mesh.renderOrder = 10;
      list.slice(0, shown).forEach((b, i) => {
        dummy.position.set(b.x + 0.5, b.y + 0.5, b.z + 0.5);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.userData.key = buildAnim ? key.split('|').slice(0, 2).join('|') : key;
      scene.add(mesh);
      if (buildAnim) {
        // 같은 묶음·여러 층의 mesh가 생기므로 키 충돌 시 합친다.
        const base = mesh.userData.key;
        if (meshes.has(base)) {
          const prev = meshBlocks.get(base);
          meshBlocks.set(base, prev.concat(list.slice(0, shown)));
          // 화면에는 층별 mesh를 따로 둔다.
          meshes.set(key, mesh);
        } else {
          meshes.set(base, mesh);
          meshBlocks.set(base, list.slice(0, shown));
        }
      } else {
        meshes.set(key, mesh);
        meshBlocks.set(key, list.slice(0, shown));
      }
    }
    // 흐릿한 나머지는 클릭이 안 걸리게 따로 그린다.
    for (const [key, list] of ghosts) {
      const m0 = list[0].material;
      const mat = ghostMats[m0] ?? ghostRockMat;
      const mesh = new THREE.InstancedMesh(geometry, mat, list.length);
      mesh.renderOrder = -5;
      list.forEach((b, i) => {
        dummy.position.set(b.x + 0.5, b.y + 0.5, b.z + 0.5);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      scene.add(mesh);
      ghostMeshes.push(mesh);
    }
  }
  function refreshBuildFrame() {
    if (!buildAnim) return;
    const elapsed = performance.now() - buildAnim.startedAt;
    const total = [...meshBlocks.values()].reduce((n, l) => n + l.length, 0);
    void total;
    rebuild();
    const want = buildAnim.total;
    const shownNow = [...meshBlocks.values()].reduce((n, l) => n + l.length, 0);
    buildAnim.onProgress?.(shownNow, want);
    if (shownNow >= want && want > 0) {
      const done = buildAnim.onDone;
      buildAnim = null;
      rebuild();
      done?.();
    }
  }
  function playBuild({ secondsPerLayer = 0.55, onProgress = null, onDone = null } = {}) {
    // 층 단위로 아래부터: 같은 층 안에서만 함께 쌓인다.
    let total = 0;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const b of model.blocks) {
      if (!matches(b)) continue;
      total++;
      if (b.y < minY) minY = b.y;
      if (b.y > maxY) maxY = b.y;
    }
    buildAnim = { startedAt: performance.now(), msPerLayer: secondsPerLayer * 1000, total, minY, maxY, onProgress, onDone };
    if (total === 0) {
      const done = buildAnim.onDone;
      buildAnim = null;
      done?.();
      return 0;
    }
    rebuild();
    return total;
  }
  function stopBuild() {
    buildAnim = null;
    rebuild();
  }

  // 고른 블록 표시: 선만 그으면 잘 안 보여서 주황 상자를 통째로 덧씌운다.
  const pickBox = new THREE.Mesh(
    new THREE.BoxGeometry(1.08, 1.08, 1.08),
    new THREE.MeshBasicMaterial({ color: 0xff6a00, transparent: true, opacity: 0.42, depthTest: false }),
  );
  const pickEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.1, 1.1, 1.1)),
    new THREE.LineBasicMaterial({ color: 0xb23c00, depthTest: false }),
  );
  const pickGroup = new THREE.Group();
  pickGroup.add(pickBox, pickEdges);
  pickGroup.visible = false;
  pickBox.renderOrder = 999;
  pickEdges.renderOrder = 1000;
  scene.add(pickGroup);
  let highlighted = null;
  function highlightBlock(blockOrNull) {
    highlighted = blockOrNull ?? null;
    if (!highlighted) {
      pickGroup.visible = false;
      return;
    }
    pickGroup.visible = true;
    pickGroup.position.set(highlighted.x + 0.5, highlighted.y + 0.5, highlighted.z + 0.5);
  }

  // 겉에서 돌려보기만 둔다. 안에서 다니기는 뺐다.
  function reset() {
    camera.position.copy(homePosition());
    controls.target.copy(viewCenter);
    controls.update();
  }


  // 블록 고르기: 눌린 자리에서 가장 앞에 걸리는 블록을 부모에 알린다.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  renderer.domElement.addEventListener('click', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects([...meshes.values()], false);
    if (!hits.length) {
      onPick(null);
      return;
    }
    const hit = hits[0];
    const key = hit.object.userData.key;
    // 쌓기 중 층별 mesh는 전체 키를 갖고 있어 층을 덧붙여 찾는다.
    const list = meshBlocks.get(key) ?? meshBlocks.get(`${key}|${Math.round(hit.point.y - 0.5)}`);
    onPick(list?.[hit.instanceId] ?? null);
  });

  function resize() {
    const w = Math.max(container.clientWidth, 1);
    const h = Math.max(container.clientHeight, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  // 칸이 다 잡힌 뒤에 크기를 잰다. 일찍 재면 좁게 잡힌다.
  requestAnimationFrame(() => requestAnimationFrame(resize));
  window.addEventListener('load', resize);
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(resize).observe(container);
  } else {
    resize();
  }
  rebuild();

  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    onError('3D 컨텍스트가 손실되었습니다. 도면·재료표·다운로드는 계속 쓸 수 있다. 다시 불러오기로 복구한다.');
  });

  let raf = 0;
  let disposed = false;
  function loop() {
    if (disposed) return;
    raf = requestAnimationFrame(loop);
    if (buildAnim) refreshBuildFrame();
    controls.update();
    renderer.render(scene, camera);
  }
  loop();

  function setSelection(next) {
    selection = {
      tower: next?.tower ?? 'all',
      layer: next?.layer ?? null,
      through: next?.through ?? false,
      material: next?.material ?? 'all',
    };
    if (selection.tower !== 'all' && !towerIds.has(selection.tower)) {
      throw new RangeError(`알 수 없는 동: ${selection.tower}`);
    }
    if (
      selection.material !== 'all' &&
      selection.material !== GLASS &&
      selection.material !== SKY &&
      selection.material !== GRAY &&
      selection.material !== ANDESITE &&
      selection.material !== DIORITE &&
      selection.material !== WOOL
    ) {
      throw new RangeError(`알 수 없는 재료: ${selection.material}`);
    }
    if (
      selection.layer !== null &&
      !Number.isInteger(selection.layer)
    ) {
      throw new RangeError(`layer는 정수이거나 null이어야 한다: ${selection.layer}`);
    }
    // 고르는 게 바뀌면 쌓기는 멈추고 전량을 보여준다.
    buildAnim = null;
    rebuild();
    // 필터 밖으로 나간 강조를 지운다.
    if (highlighted && !matches(highlighted)) highlightBlock(null);
  }
  function setModel(next) {
    model = next;
    for (const t of model.towers) towerIds.add(t.id);
    buildAnim = null;
    highlighted = null;
    pickGroup.visible = false;
    // 토대를 끄면 지면도 올라온다.
    const gy = model?.podium ? model.podium.y0 - 0.01 : 0;
    ground.position.y = gy;
    grid.position.y = gy + 0.01;
    rebuild();
  }

  function dispose() {
    disposed = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    controls.dispose();
    geometry.dispose();
    glassMat.dispose();
    rockMat.dispose();
    woolMat.dispose();
    skyMat.dispose();
    grayMat.dispose();
    andesiteMat.dispose();
    ghostGlassMat.dispose();
    ghostRockMat.dispose();
    ghostWoolMat.dispose();
    ghostSkyMat.dispose();
    ghostGrayMat.dispose();
    ghostAndesiteMat.dispose();
    for (const m of meshes.values()) m.dispose?.();
    renderer.dispose();
    renderer.domElement.remove();
  }

  return {
    setSelection,
    setModel,
    highlightBlock,
    reset,
    dispose,
    playBuild,
    stopBuild,
    isBuilding: () => buildAnim !== null,
  };
}
