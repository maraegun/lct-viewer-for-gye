import { summarizeMaterials } from './model.mjs';

function csvCell(v) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

// x,y,z,material,tower 헤더. 공기는 기록하지 않는다. 결정적 순서(y,z,x).
export function serializeBlocksCsv(model) {
  const lines = ['x,y,z,material,tower'];
  const rows = [...model.blocks].sort((a, b) => a.y - b.y || a.z - b.z || a.x - b.x);
  for (const b of rows) {
    lines.push([b.x, b.y, b.z, b.material, b.tower].map(csvCell).join(','));
  }
  return lines.join('\n') + '\n';
}

export function parseBlocksCsv(text) {
  const lines = String(text).trim().split('\n');
  const header = lines.shift();
  if (header !== 'x,y,z,material,tower') throw new Error(`잘못된 블록 CSV 헤더: ${header}`);
  return lines.map((line) => {
    const [x, y, z, material, tower] = line.split(',');
    return { x: Number(x), y: Number(y), z: Number(z), material, tower };
  });
}

// scope,material,name,count,stacks64,remainder 헤더. UTF-8 BOM은 파일 쓰기에서 붙인다.
export function serializeMaterialsCsv(model) {
  const lines = ['scope,material,name,count,stacks64,remainder'];
  const scopes = [['전체 건축', model.blocks]];
  for (const t of model.towers) {
    scopes.push([t.name, model.blocks.filter((b) => b.tower === t.id)]);
  }
  scopes.push(['토대', model.blocks.filter((b) => b.tower === 'podium')]);
  for (const [scope, blocks] of scopes) {
    for (const s of summarizeMaterials(blocks)) {
      lines.push(
        [scope, s.material, s.name, s.count, s.stacks64, s.remainder]
          .map(csvCell)
          .join(','),
      );
    }
  }
  return lines.join('\n') + '\n';
}

export function parseMaterialsCsv(text) {
  const body = String(text).replace(/^\uFEFF/, '');
  const lines = body.trim().split('\n');
  const header = lines.shift();
  if (header !== 'scope,material,name,count,stacks64,remainder') {
    throw new Error(`잘못된 재료 CSV 헤더: ${header}`);
  }
  return lines.map((line) => {
    const [scope, material, name, count, stacks64, remainder] = line.split(',');
    return {
      scope,
      material,
      name,
      count: Number(count),
      stacks64: Number(stacks64),
      remainder: Number(remainder),
    };
  });
}
