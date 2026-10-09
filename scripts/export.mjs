import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildModel, validateModel } from '../src/model.mjs';
import { renderBlueprintBook } from '../src/blueprints.mjs';
import { serializeBlocksCsv, serializeMaterialsCsv } from '../src/exports.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'output');

const model = buildModel();
const result = validateModel(model);
if (!result.ok) {
  console.error('검증 실패로 생성 중단:');
  for (const e of result.errors.slice(0, 20)) console.error(`- [${e.code}] ${e.message}`);
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
// 생성기 소유 4개만 재생성하고 다른 파일은 건드리지 않는다.
await writeFile(
  join(outDir, 'lct-model.json'),
  JSON.stringify(model, null, 2) + '\n',
  'utf8',
);
await writeFile(join(outDir, 'lct-blocks.csv'), serializeBlocksCsv(model), 'utf8');
await writeFile(
  join(outDir, 'lct-materials.csv'),
  '﻿' + serializeMaterialsCsv(model),
  'utf8',
);
await writeFile(join(outDir, 'lct-blueprints.html'), renderBlueprintBook(model), 'utf8');
console.log(`생성 완료: ${outDir} (블록 ${model.blocks.length}개)`);
