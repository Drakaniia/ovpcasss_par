/**
 * Renders docs/isometric/login-scene.mjs to apps/web/static/brand/login-scene.svg.
 *
 *   node docs/isometric/build.mjs                 write the SVG
 *   node docs/isometric/build.mjs --preview <dir> also write a QA page: the drawing at
 *                                                 the auth column's width and 4x crops
 *
 * Colours are read from tokens.css, so a palette change there is one rebuild
 * away. The build fails when the depth sort reports a cycle or the SVG does not
 * validate.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import scene, { kit, skillRoot } from './login-scene.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const out = path.join(repo, 'apps', 'web', 'static', 'brand', 'login-scene.svg');
const tokensCss = fs.readFileSync(
  path.join(repo, 'apps', 'web', 'src', 'lib', 'styles', 'tokens.css'),
  'utf8',
);

function token(name) {
  const match = new RegExp(`--${name}:\\s*(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))\\s*;`).exec(
    tokensCss,
  );
  if (!match) throw new Error(`tokens.css has no hex value for --${name}`);
  return match[1];
}

const options = {
  style: 'two-tone',
  theme: 'light',
  weight: 1,
  id: 'par-login-scene',
  tokens: {
    bg: token('surface-blueprint'),
    ink: token('text-auth'),
    face: token('surface-card'),
    accent: token('brand-gold-400'),
  },
};

const rendered = kit.render(scene, options);
// The mirrored placement is not shipped, but a cycle there means two parts intersect.
const mirrored = kit.render(scene, { ...options, facing: 'left' }).audit;
if (rendered.audit.cycles || mirrored.cycles) {
  throw new Error(
    `Depth sort has cycles (right ${rendered.audit.cycles}, left ${mirrored.cycles}); parts intersect.`,
  );
}

const svg = kit.toSvg(scene, options);
const { validateSvg } = await import(
  pathToFileURL(path.join(skillRoot, 'scripts', 'validate-svg.mjs')).href
);
const report = validateSvg(svg, { file: path.basename(out) });
if (report.errors.length) throw new Error(`Invalid SVG:\n  ${report.errors.join('\n  ')}`);

fs.writeFileSync(out, svg);

const [vx, vy, vw, vh] = rendered.viewBox;
console.log(`wrote ${path.relative(repo, out)}`);
console.log(
  `  ${rendered.audit.solids} solids, cycles ${rendered.audit.cycles} (mirrored ${mirrored.cycles}), ` +
    `overlaps ${rendered.audit.overlaps}`,
);
console.log(
  `  viewBox ${Math.round(vw)} x ${Math.round(vh)}, ${(report.stats.bytes / 1024).toFixed(1)} KB`,
);
for (const warning of report.warnings) console.log(`  warning: ${warning}`);

const previewAt = process.argv.indexOf('--preview');
if (previewAt > 0) {
  const dir = path.resolve(process.argv[previewAt + 1] ?? 'login-scene-preview');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'login-scene.svg'), svg);

  // 733 px is the figure column at a 1440 px viewport; crops are at 4x that.
  const base = 733;
  const zoom = base * 4;
  const scale = zoom / vw;
  const crop = (label, world) => {
    const [sx, sy] = kit.project(world, kit.UNIT);
    const left = Math.round((sx - vx) * scale - 300);
    const top = Math.round((sy - vy) * scale - 190);
    return `<figure><div class="crop"><img src="login-scene.svg" style="width:${zoom}px;left:${-left}px;top:${-top}px" alt=""></div><figcaption>${label} (4x)</figcaption></figure>`;
  };
  const crops = [
    crop('Sign-in card and button', [-1.2, 2.2, -0.6]),
    crop('Address bar', [-2.0, 4.6, -1.0]),
    crop('Padlock and key', [3.8, 1.0, 1.2]),
    crop('ID card and envelope', [-2.6, 0.1, 1.6]),
    crop('File holder', [-6.3, 1.0, -1.1]),
    crop('Plant', [4.8, 2.3, -2.0]),
  ];
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Login scene QA</title>
<style>body{margin:0;padding:24px;font:13px system-ui;background:${options.tokens.bg};color:#333}
h1{font-size:15px;margin:0 0 12px}.full{width:${base}px;display:block;outline:1px dashed #ccc}
.grid{display:grid;grid-template-columns:repeat(2,600px);gap:16px;margin-top:20px}figure{margin:0}
.crop{position:relative;width:600px;height:380px;overflow:hidden;background:${options.tokens.bg};outline:1px solid #ddd}
.crop img{position:absolute;max-width:none}figcaption{margin-top:4px}</style>
<h1>Login scene at ${base}px (auth column at 1440px)</h1><img class="full" src="login-scene.svg" alt="">
<div class="grid">${crops.join('')}</div></html>`;
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  console.log(`  preview ${path.join(dir, 'index.html')}`);
}
