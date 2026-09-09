/** Render the actual native vector components to the stable design sheet. No runtime dependency. */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'apps/mobile/src/ui/gryd');
const cache = new Map();
const svg = { __esModule: true, default: ({ accessible, accessibilityLabel, ...props }) => React.createElement('svg', props), Path: 'path', Rect: 'rect', Text: 'text', G: 'g', Defs: 'defs', LinearGradient: 'linearGradient', Stop: 'stop' };
function moduleAt(file) {
  if (cache.has(file)) return cache.get(file);
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const req = name => name === 'react-native' ? { Platform: { OS: 'web' } } : name === 'react-native-svg' ? svg : name.startsWith('.') ? moduleAt([`${path.resolve(path.dirname(file), name)}.ts`, `${path.resolve(path.dirname(file), name)}.tsx`].find(fs.existsSync)) : require(name);
  new Function('exports', 'module', 'require', code)(mod.exports, mod, req);
  cache.set(file, mod.exports);
  return mod.exports;
}
const { GrydMark } = moduleAt(path.join(source, 'GrydMark.tsx'));
const { GrydIcon } = moduleAt(path.join(source, 'GrydIcon.tsx'));
const { RewardEmblem } = moduleAt(path.join(source, 'RewardEmblem.tsx'));
const { EMBLEM_ARTWORK, REWARD_VARIANTS } = moduleAt(path.join(source, 'emblems.ts'));
const { GRYD_GLYPHS } = moduleAt(path.join(source, 'glyphs.ts'));
const { grydGraphicColors: c } = moduleAt(path.join(source, 'palette.ts'));
const render = (Component, props, x, y) => `<g transform="translate(${x} ${y})">${renderToStaticMarkup(React.createElement(Component, props))}</g>`;
const label = (x, y, value, size = 12, color = '#A3A3A3', extra = '') => `<text x="${x}" y="${y}" fill="${color}" font-family="Arial, sans-serif" font-size="${size}" ${extra}>${value}</text>`;
const rule = y => `<path d="M48 ${y}h1104" stroke="#292929"/>`;
const names = { map: 'Carte', crew: 'Crew', profile: 'Profil', run: 'Course', bike: 'Vélo', route: 'Parcours', loop: 'Boucle', layers: 'Couches', location: 'Localisation', calendar: 'Calendrier', share: 'Partager', chart: 'Statistiques', collection: 'Collection', lock: 'Verrouiller', check: 'Valider', plus: 'Ajouter', minus: 'Retirer', close: 'Fermer', arrowUpRight: 'Ouvrir', chevronLeft: 'Retour', chevronRight: 'Suivant', chevronDown: 'Déplier', settings: 'Réglages', camera: 'Appareil photo', photo: 'Photo', film: 'Film', download: 'Télécharger', externalLink: 'Lien externe', search: 'Rechercher', clock: 'Historique', pause: 'Pause', play: 'Démarrer', stop: 'Arrêter', heart: 'Favori', shield: 'Protection', link: 'Lien', bell: 'Notification', info: 'Information', pin: 'Repère', spark: 'Éclat', flag: 'Objectif', eye: 'Afficher', eyeOff: 'Masquer' };
let art = `<rect width="1200" height="1350" fill="#0A0A0A"/>`;
art += render(GrydMark, { variant: 'wordmark', size: 28, color: '#FAFAFA' }, 48, 42) + label(860, 62, 'SYSTÈME GRAPHIQUE / 04', 11, '#A3A3A3', 'letter-spacing="1.2"') + rule(109);
art += label(48, 143, 'L’identité d’origine. Des signes de sport.', 21, '#FAFAFA');
art += render(GrydMark, { size: 46, color: '#FAFAFA' }, 48, 180);
['run', 'bike', 'map', 'location'].forEach((name, i) => { art += render(GrydIcon, { name, size: 32, color: '#FAFAFA' }, 295 + i * 190, 184) + label(286 + i * 190, 241, names[name]); });
art += rule(269) + label(48, 305, 'Des traces devenues objets', 21, '#FAFAFA') + label(734, 304, 'ÉDITIONS GRAPHIQUES · AUCUN GAIN ATTRIBUÉ', 10, '#A3A3A3', 'letter-spacing=".7"');
REWARD_VARIANTS.forEach((variant, i) => {
  const x = 70 + (i % 4) * 284, y = 320 + Math.floor(i / 4) * 191;
  art += render(RewardEmblem, { variant, size: 186, tone: 'accent' }, x + 2, y);
  art += label(x + 95, y + 168, EMBLEM_ARTWORK[variant].label, 13, '#FAFAFA', 'text-anchor="middle"');
});
art += rule(728) + label(48, 764, '32 et 72 pixels : une silhouette, sans cadre.', 17, '#FAFAFA');
REWARD_VARIANTS.forEach((variant, i) => {
  const x = 48 + i * 140;
  art += render(RewardEmblem, { variant, size: 32, tone: 'accent' }, x, 813);
  art += render(RewardEmblem, { variant, size: 72, tone: 'accent', state: i === 7 ? 'locked' : 'preview' }, x + 39, 786);
});
art += label(48, 886, 'Huit dessins originaux, des formes ouvertes. Leur affichage ne signifie pas que le badge est obtenu.', 11);
art += rule(912) + label(48, 948, 'Une famille fonctionnelle · base 24', 18, '#FAFAFA');
Object.keys(GRYD_GLYPHS).forEach((name, i) => {
  const x = 50 + (i % 11) * 102, y = 976 + Math.floor(i / 11) * 78;
  art += render(GrydIcon, { name, size: 24, color: '#FAFAFA' }, x + 25, y);
  art += label(x + 37, y + 43, names[name], 10, '#A3A3A3', 'text-anchor="middle"');
});
art += label(48, 1331, 'NOIR · BLANC · GRIS NEUTRES · CHARTREUSE ' + c.accent.toUpperCase(), 10, '#A3A3A3', 'letter-spacing="1"');
const output = path.join(root, 'docs/design/GRYD_GRAPHIC_SYSTEM_2026');
const document = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1350" viewBox="0 0 1200 1350">${art}</svg>`;
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(`${output}.svg`, document);
sharp(Buffer.from(document)).png().toFile(`${output}.png`).then(() => console.log(`Rendered ${output}.{svg,png}`));
