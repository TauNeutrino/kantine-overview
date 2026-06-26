import { LANG_MODEL_SEED } from '../src/lang/langModelSeed.js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', 'raw', 'lang_model_seed.json');

writeFileSync(outPath, JSON.stringify(LANG_MODEL_SEED, null, 2), 'utf8');
console.log(`Wrote lang_model_seed.json to ${outPath}`);
