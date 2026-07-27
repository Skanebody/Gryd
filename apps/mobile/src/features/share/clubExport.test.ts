/**
 * GRYD — LE CLUB PEUT ACHETER DES PIXELS, PAS DU TERRAIN, ET PAS DE LA VIE PRIVÉE.
 *
 * Trois choses se jouent dans ce lot, dans cet ordre de gravité — et ce sont
 * exactement les trois que ce fichier verrouille :
 *
 *  1. CONFIDENTIALITÉ (§12, E66). C'est le piège évident d'un « export HD » :
 *     une image plus définie d'une trace mal masquée exposerait mieux le
 *     domicile. On exige donc l'ÉGALITÉ STRICTE de la trace publiable entre
 *     standard et HD — coupe des extrémités ET zones floutées comprises — et
 *     qu'aucun réglage de qualité ne puisse affaiblir `trimM`.
 *
 *  2. ANTI PAY-TO-WIN (§1.6). Ce qui est vendu doit rester une image. Le test
 *     relit la SOURCE de `clubExport.ts` : aucune grandeur de jeu (points crew,
 *     zones gagnées, rang de saison, multiplicateur, immunité…) n'a le droit d'y
 *     entrer, même « juste pour décider ». Le jour où quelqu'un branche le
 *     territoire sur l'abonnement, ce test tombe.
 *
 *  3. HONNÊTETÉ DE LA PROMESSE. « HD » doit produire PLUS DE PIXELS — sinon
 *     c'est un mot. On vérifie le gain réel sur les largeurs d'aperçu et les
 *     densités d'écran réelles, ET que le plan refuse de dire « HD » quand il ne
 *     peut pas le tenir (pas membre, étage absent, aucun gain).
 *
 * Une garde s'ajoute par-dessus : `shareActions.ts` ne doit JAMAIS passer
 * `width`/`height` à `captureRef` — c'est un rééchantillonnage (Android
 * `Bitmap.createScaledBitmap`, iOS `drawViewHierarchyInRect` étiré), donc du
 * poids sans définition. Ce fichier-là n'est pas importable en Deno (react-
 * native) mais son texte se lit, comme dans `exportedCardCopy.test.ts`.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { SHARE_TRIM_M } from '@klaim/shared';
import {
  EXPORT_QUALITIES,
  HD_TARGET_WIDTH_PX,
  SAFE_CAPTURE_OPTIONS,
  buildExportPlan,
  capturedPixelWidth,
  clubAccess,
  exportQualityOptions,
  hdStageWidthPt,
  qualityAccess,
  type ClubStatus,
  type ExportPlanInput,
} from './clubExport.ts';
import type { PrivacyZone } from './sharePrivacy.ts';
import type { LatLngPoint } from '../map/realAnchors.ts';

// ─── Fixtures ────────────────────────────────────────────────────────────────

/** Paris — la latitude sert à ce que les mètres soient de vrais mètres. */
const HOME: LatLngPoint = { lat: 48.8566, lng: 2.3522 };
const DEG_PER_M = 1 / 111_320;

/** Ligne droite plein nord : `count` points espacés de `stepM`. */
const northLine = (count: number, stepM: number): LatLngPoint[] =>
  Array.from({ length: count }, (_, i) => ({
    lat: HOME.lat + i * stepM * DEG_PER_M,
    lng: HOME.lng,
  }));

/** 1 m en degrés de LONGITUDE à la latitude de HOME. */
const LNG_DEG_PER_M = 1 / (111_320 * Math.cos((HOME.lat * Math.PI) / 180));

/**
 * 2 km de trace SINUEUSE : largement de quoi survivre à une coupe de 250 m aux
 * deux bouts, et surtout assez de relief pour que la SIMPLIFICATION (§12.1,
 * `applySharePrivacy` étape 3) laisse des sommets à compter.
 *
 * Pourquoi pas une ligne droite (ce qu'était cette fixture jusqu'au 27/07/2026) :
 * Douglas-Peucker réduit une droite à ses deux bouts, quel que soit ce qu'on lui
 * donne. Toutes les assertions de ce fichier qui comparent des NOMBRES de points
 * (« la zone a mordu », « une coupe plus large retire davantage ») devenaient
 * alors vraies-vides — 3 points contre 3 points. La fixture doit ressembler à une
 * course, sinon elle ne teste plus le pipeline mais son cas dégénéré.
 */
const LONG_TRACE: readonly LatLngPoint[] = Array.from({ length: 101 }, (_, i) => ({
  lat: HOME.lat + i * 20 * DEG_PER_M,
  lng: HOME.lng + Math.sin(i / 2) * 40 * LNG_DEG_PER_M,
}));

/**
 * Largeurs d'aperçu RÉELLES de /partage (`PREVIEW_WIDTH`) et aspects réels de
 * `ShareCard` (`SHARE_CARD_ASPECT`). Recopiés parce que ces deux modules sont du
 * React Native, donc non importables en Deno — la garde `sanity` plus bas relit
 * leur source pour que cette copie ne puisse pas se périmer en silence.
 */
const PREVIEW_WIDTH_PT: Readonly<Record<string, number>> = {
  story: 232,
  square: 300,
  feed: 280,
  mapOnly: 264,
};
const ASPECT: Readonly<Record<string, number>> = {
  story: 9 / 16,
  square: 1,
  feed: 4 / 5,
  mapOnly: 3 / 4,
};

/** Densités d'écran réellement rencontrées (web = 1, Android mdpi→xxhdpi, iOS 2/3). */
const REAL_SCALES = [1, 1.5, 2, 2.625, 3];

const ALL_STATUSES: readonly ClubStatus[] = ['member', 'nonMember', 'reading', 'unreadable'];

function planInput(over: Partial<ExportPlanInput> = {}): ExportPlanInput {
  return {
    quality: 'standard',
    status: 'member',
    hdStageMounted: true,
    previewWidthPt: PREVIEW_WIDTH_PT.story!,
    aspect: ASPECT.story!,
    deviceScale: 3,
    trace: LONG_TRACE,
    ...over,
  };
}

// ─── 1. CONFIDENTIALITÉ — le piège du lot ────────────────────────────────────

Deno.test('un export HD ne révèle RIEN de plus qu’un export standard', () => {
  for (const scale of REAL_SCALES) {
    const std = buildExportPlan(planInput({ quality: 'standard', deviceScale: scale }));
    const hd = buildExportPlan(planInput({ quality: 'hd', deviceScale: scale }));
    assertEquals(hd.quality, 'hd', `HD attendu à la densité ${scale}`);
    // Égalité STRICTE, point par point : la qualité ne peut pas rallonger la trace.
    assertEquals(hd.trace.length, std.trace.length);
    assertEquals([...hd.trace], [...std.trace]);
    // Et le masquage a bien EU LIEU (sinon on comparerait deux traces brutes).
    assert(std.trace.length < LONG_TRACE.length, 'la coupe des extrémités n’a pas été appliquée');
    assert(std.trace[0]!.lat !== LONG_TRACE[0]!.lat, 'le vrai départ est encore publié');
  }
});

Deno.test('les zones floutées s’appliquent IDENTIQUEMENT en standard et en HD', () => {
  // Une zone au milieu du parcours : elle doit couper la trace dans les deux cas.
  const zones: readonly PrivacyZone[] = [
    { center: { lat: HOME.lat + 1000 * DEG_PER_M, lng: HOME.lng }, radiusM: 200 },
  ];
  const std = buildExportPlan(planInput({ quality: 'standard', zones }));
  const hd = buildExportPlan(planInput({ quality: 'hd', zones }));
  assertEquals([...hd.trace], [...std.trace]);
  // La zone a réellement mordu : moins de points qu'un plan sans zone.
  const sansZone = buildExportPlan(planInput({ quality: 'hd' }));
  assert(hd.trace.length < sansZone.trace.length, 'la zone floutée n’a rien retiré');
});

Deno.test('la QUALITÉ ne peut pas affaiblir la coupe des extrémités', () => {
  // Le défaut est la constante de JEU (source unique), pas une valeur locale.
  const parDefaut = buildExportPlan(planInput({ quality: 'hd' }));
  const explicite = buildExportPlan(planInput({ quality: 'hd', trimM: SHARE_TRIM_M }));
  assertEquals([...parDefaut.trace], [...explicite.trace]);
  // Une coupe PLUS LARGE retire davantage — dans les deux qualités, à l'identique.
  const largeStd = buildExportPlan(planInput({ quality: 'standard', trimM: 600 }));
  const largeHd = buildExportPlan(planInput({ quality: 'hd', trimM: 600 }));
  assertEquals([...largeHd.trace], [...largeStd.trace]);
  assert(largeHd.trace.length < parDefaut.trace.length, 'trimM n’a plus aucun effet');
});

Deno.test('une trace trop courte pour être masquée honnêtement ne sort dans AUCUNE qualité', () => {
  const courte = northLine(5, 20); // 80 m : impossible de couper 250 m aux deux bouts
  for (const quality of EXPORT_QUALITIES) {
    const plan = buildExportPlan(planInput({ quality, trace: courte }));
    assertEquals(plan.trace.length, 0, `${quality} publie une trace insuffisamment masquée`);
  }
});

// ─── 2. ANTI PAY-TO-WIN ──────────────────────────────────────────────────────

const CLUB_EXPORT_SRC = Deno.readTextFileSync(new URL('./clubExport.ts', import.meta.url));

/** Source débarrassée de ses commentaires : ils CITENT les notions interdites. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

/**
 * Grandeurs de JEU. Si l'une entre dans le module qui décide ce que le Club
 * ouvre, c'est qu'un achat touche à une capacité de jeu — le pay-to-win exact
 * que §1.6 interdit. (« zones » seul est exclu de la liste : les zones FLOUTÉES
 * de la confidentialité en portent légitimement le nom.)
 */
const GAME_QUANTITIES = [
  /territo/i,
  /hex_?claim/i,
  /zonesGained/,
  /zonesDefended/,
  /crewPoints/,
  /crewXp/,
  /seasonScore/i,
  /rankLabel/,
  /multipli/i,
  /immunit/i,
  /\bboost/i,
  /decay/i,
];

Deno.test('§1.6 — le module qui ouvre le Club ne touche AUCUNE grandeur de jeu', () => {
  const src = code(CLUB_EXPORT_SRC);
  for (const re of GAME_QUANTITIES) {
    assert(
      !re.test(src),
      `clubExport.ts manipule une grandeur de jeu (${re}) : un achat ne peut pas ` +
        `changer une capacité de jeu (§1.6 anti pay-to-win).`,
    );
  }
});

Deno.test('§1.6 — le plan d’export ne porte que des pixels et une trace masquée', () => {
  const plan = buildExportPlan(planInput({ quality: 'hd' }));
  assertEquals(Object.keys(plan).sort(), [
    'captureOptions',
    'downgradeReason',
    'heightPt',
    'heightPx',
    'quality',
    'requested',
    'stage',
    'trace',
    'widthPt',
    'widthPx',
  ]);
});

// ─── 3. AUCUN BOUTON MORT — quatre états, jamais confondus ───────────────────

Deno.test('les quatre statuts Club donnent quatre accès DISTINCTS', () => {
  assertEquals(clubAccess('member'), 'granted');
  assertEquals(clubAccess('nonMember'), 'invite'); // → /premium, jamais un échec
  assertEquals(clubAccess('reading'), 'pending'); // on n'affirme rien
  assertEquals(clubAccess('unreadable'), 'unreadable'); // on le DIT
  assertEquals(new Set(ALL_STATUSES.map(clubAccess)).size, 4);
});

Deno.test('l’export standard reste ouvert à TOUT LE MONDE, même statut illisible', () => {
  for (const status of ALL_STATUSES) {
    assertEquals(qualityAccess('standard', status), 'granted', status);
    const options = exportQualityOptions(status);
    assertEquals(options.length, 2);
    assertEquals(options[0]!.id, 'standard');
    assert(options[0]!.exports, `standard fermé pour ${status} : plus aucun chemin de partage`);
    // HD n'« exporte » que pour un membre — les autres voient une invitation ou
    // un état, jamais un bouton qui échouerait.
    assertEquals(options[1]!.exports, status === 'member');
  }
});

// ─── 4. « HD » PRODUIT VRAIMENT PLUS DE PIXELS ───────────────────────────────

Deno.test('HD > standard, en pixels réels, sur tous les formats et toutes les densités', () => {
  for (const ratio of Object.keys(PREVIEW_WIDTH_PT)) {
    for (const scale of REAL_SCALES) {
      const base = planInput({
        previewWidthPt: PREVIEW_WIDTH_PT[ratio]!,
        aspect: ASPECT[ratio]!,
        deviceScale: scale,
      });
      const std = buildExportPlan({ ...base, quality: 'standard' });
      const hd = buildExportPlan({ ...base, quality: 'hd' });
      assertEquals(hd.quality, 'hd', `${ratio}@${scale}`);
      assertEquals(hd.stage, 'hd');
      assertEquals(std.stage, 'preview');
      assert(
        hd.widthPx > std.widthPx && hd.heightPx > std.heightPx,
        `${ratio}@${scale} : HD ${hd.widthPx}×${hd.heightPx} n’améliore pas ` +
          `standard ${std.widthPx}×${std.heightPx}`,
      );
      // La cible est atteinte (à l'arrondi de l'étage près), pas approchée de loin.
      assert(hd.widthPx >= HD_TARGET_WIDTH_PX, `${ratio}@${scale} : ${hd.widthPx} px < cible`);
      // L'aspect du format est conservé : le territoire n'est jamais recadré.
      const ecart = Math.abs(hd.widthPt / hd.heightPt - ASPECT[ratio]!);
      assert(ecart < 0.01, `${ratio} : aspect perdu en HD (${ecart})`);
    }
  }
});

Deno.test('la définition vient de l’étage, jamais d’une option de redimensionnement', () => {
  const plan = buildExportPlan(planInput({ quality: 'hd' }));
  assertEquals(plan.captureOptions, SAFE_CAPTURE_OPTIONS);
  assert(!('width' in plan.captureOptions), 'width passée à captureRef = rééchantillonnage');
  assert(!('height' in plan.captureOptions), 'height passée à captureRef = rééchantillonnage');
  assertEquals(Object.keys(SAFE_CAPTURE_OPTIONS).sort(), ['format', 'quality', 'result']);
  // Le calcul de l'étage : autant de points qu'il faut pour atteindre la cible.
  assertEquals(hdStageWidthPt(3), 360);
  assertEquals(hdStageWidthPt(2), 540);
  assertEquals(hdStageWidthPt(1), 1080);
  assertEquals(capturedPixelWidth(360, 3), 1080);
});

// ─── 5. LE PLAN NE PROMET JAMAIS UN HD QU’IL NE PEUT PAS TENIR ───────────────

Deno.test('sans abonnement, sans étage, ou sans gain : repli en standard, et on DIT pourquoi', () => {
  const pasMembre = buildExportPlan(planInput({ quality: 'hd', status: 'nonMember' }));
  assertEquals(pasMembre.quality, 'standard');
  assertEquals(pasMembre.requested, 'hd');
  assertEquals(pasMembre.downgradeReason, 'notClubMember');

  // Statut non résolu / illisible : on n'ouvre pas, mais on n'accuse pas non
  // plus le joueur de ne pas être abonné — deux raisons DISTINCTES.
  const enLecture = buildExportPlan(planInput({ quality: 'hd', status: 'reading' }));
  assertEquals(enLecture.quality, 'standard', 'un statut non résolu n’ouvre rien');
  assertEquals(enLecture.downgradeReason, 'statusUnknown');
  const illisible = buildExportPlan(planInput({ quality: 'hd', status: 'unreadable' }));
  assertEquals(illisible.downgradeReason, 'statusUnknown');

  const sansEtage = buildExportPlan(planInput({ quality: 'hd', hdStageMounted: false }));
  assertEquals(sansEtage.quality, 'standard');
  assertEquals(sansEtage.downgradeReason, 'stageMissing');

  // Aperçu déjà plus grand que l'étage (densité extrême, aperçu géant) : « HD »
  // ne serait qu'un mot — on refuse plutôt que de facturer du vide.
  const sansGain = buildExportPlan(
    planInput({ quality: 'hd', previewWidthPt: 600, deviceScale: 4 }),
  );
  assertEquals(sansGain.quality, 'standard');
  assertEquals(sansGain.downgradeReason, 'noGain');

  // Et un export standard n'est JAMAIS un repli : il n'a rien à expliquer.
  assertEquals(buildExportPlan(planInput()).downgradeReason, 'none');
});

// ─── 6. GARDES ANTI-DÉCOR : les copies locales suivent bien les sources ──────

Deno.test('sanity — les largeurs d’aperçu et les aspects recopiés sont ceux du code', () => {
  const partage = Deno.readTextFileSync(new URL('../../../app/partage.tsx', import.meta.url));
  for (const [ratio, w] of Object.entries(PREVIEW_WIDTH_PT)) {
    assert(
      new RegExp(`${ratio}:\\s*${w}\\b`).test(partage),
      `PREVIEW_WIDTH.${ratio} n’est plus ${w} dans app/partage.tsx : ce test ne mesure plus rien`,
    );
  }
  const shareCard = Deno.readTextFileSync(
    new URL('../../ui/game/ShareCard.tsx', import.meta.url),
  );
  assert(shareCard.includes('story: 9 / 16'), 'aspect story changé');
  assert(shareCard.includes('square: 1,'), 'aspect square changé');
  assert(shareCard.includes('feed: 4 / 5'), 'aspect feed changé');
  assert(shareCard.includes('mapOnly: 3 / 4'), 'aspect mapOnly changé');
});

Deno.test('shareActions ne passe JAMAIS width/height à captureRef', () => {
  const src = code(Deno.readTextFileSync(new URL('./shareActions.ts', import.meta.url)));
  assert(src.includes('captureRef('), 'shareActions.ts ne capture plus rien : test périmé');
  assert(
    !/\bwidth\s*:/.test(src) && !/\bheight\s*:/.test(src),
    'shareActions.ts redimensionne la capture : c’est un rééchantillonnage ' +
      '(Bitmap.createScaledBitmap / drawViewHierarchyInRect étiré), pas de la définition.',
  );
});
