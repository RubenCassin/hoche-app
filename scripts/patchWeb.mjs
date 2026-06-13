// Patch post-export web : Expo SDK 54 émet `import.meta.env` (via le middleware
// devtools de zustand) mais charge le bundle en <script> CLASSIQUE (pas module),
// ce qui provoque « SyntaxError: Cannot use 'import.meta' outside a module » et
// un écran blanc. On neutralise `import.meta` (→ ({}) ) dans les bundles JS.
// À lancer après `expo export -p web --output-dir backend/web`.
import fs from 'node:fs';
import path from 'node:path';

const dir = path.join('backend', 'web', '_expo', 'static', 'js', 'web');
if (!fs.existsSync(dir)) {
  console.error('Dossier introuvable :', dir, '— lance d’abord expo export -p web.');
  process.exit(1);
}

let patched = 0;
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.js')) continue;
  const p = path.join(dir, f);
  const src = fs.readFileSync(p, 'utf8');
  if (src.includes('import.meta')) {
    fs.writeFileSync(p, src.split('import.meta').join('({})'), 'utf8');
    patched += 1;
    console.log('  patché', f);
  }
}
console.log(patched > 0 ? `import.meta neutralisé dans ${patched} fichier(s).` : 'Rien à patcher.');
