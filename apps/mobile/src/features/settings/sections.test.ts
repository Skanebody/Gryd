/**
 * GRYD — LA PAGE PARAMÈTRES EST LA PORTE DE DERNIER RECOURS, ET ON LE PROUVE
 * SUR LA LISTE QUE L'ÉCRAN AFFICHE.
 *
 * ═══ CE QUE CE FICHIER PROUVAIT AVANT, ET POURQUOI C'ÉTAIT FAUX ════════════
 * Il lisait `SETTINGS_GROUPS` — « la liste des réglages telle qu'elle est
 * construite » — et vérifiait que les routes de dernier recours y figuraient.
 * Sauf que depuis le 09/09/2026 `app/parametres.tsx` RÉÉCRIT sa propre liste :
 * plus rien ne rendait ce catalogue. Le vert portait donc sur une liste que
 * personne ne voit, pendant que l'écran réel pouvait perdre une porte sans que
 * rien ne rougisse. Un test qui ne peut pas échouer pour la bonne raison est
 * pire qu'un test absent : il rassure.
 *
 * Le catalogue mort est supprimé (`sections.ts` ne garde que les titres de
 * sous-pages, seule chose réellement lue par `app/parametres/[section].tsx`) et
 * les portes se vérifient désormais dans la SOURCE DE L'ÉCRAN.
 *
 * ⚠️ TENSION LAISSÉE OUVERTE, PAS TRANCHÉE ICI : l'ancien test inversé exigeait
 * que « Abonnement et achats » NE SOIT PAS peinte (ADR-011, « GRYD est 100 %
 * gratuit au lancement »). L'écran la peint, et le cahier de septembre — rang 0
 * depuis ADR-012 — décrit un abonnement RÉEL avec ses prix (§7.5) et ses états
 * (G28). Trancher un ADR n'est pas le rôle d'un test : aucune assertion n'est
 * posée sur cette ligne, et la tension est signalée au fondateur.
 *
 * ═══ AJOUTS DU 10/09/2026 (LOT « RÉGLAGES ET PROFIL ») ═════════════════════
 * Trois classes de défauts VÉCUS dans ce dépôt sont désormais verrouillées :
 *  · une OBLIGATION LÉGALE rendue injoignable par une redirection (les CGV,
 *    dont l'unique ligne vivait dans une branche que la route intercepte) ;
 *  · une SOUS-PAGE que plus aucun écran ne pousse (`/parametres/course` a vécu
 *    des mois avec un vrai réglage et zéro porte) ;
 *  · un DOUBLON D'ONGLET qui revient (« Mon journal », « Mon crew ») parce que
 *    « ça ne coûte rien de le remettre ».
 */
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../../i18n/types.ts';
import { SETTINGS_GLYPHS } from '../../ui/gryd/glyphs.ts';
import { SETTINGS_SECTIONS, settingsRowBySection, type SettingsSectionId } from './sections.ts';

/** Les slugs que `app/parametres/[section].tsx` sait rendre. */
const SECTION_IDS: readonly SettingsSectionId[] = ['compte', 'course', 'notifications'];

/** Le code de l'écran Réglages, commentaires retirés — citer une route en prose
 *  n'est pas la peindre, et c'est exactement ainsi qu'un faux vert commence. */
async function ecran(): Promise<string> {
  const source = await Deno.readTextFile(new URL('../../../app/parametres.tsx', import.meta.url));
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * Les routes qui n'ont AUCUNE autre porte fiable dans le build MVP, avec la
 * raison — une liste sans raisons finit par accumuler ce que personne n'ose
 * retirer.
 */
const PORTES_DE_DERNIER_RECOURS: ReadonlyMap<string, string> = new Map([
  ['/parametres/compte', 'connexion, export et suppression du compte (RGPD)'],
  ['/parametres/notifications', 'consentements de notification, §14.1'],
  ['/parametres/permissions', 'état réel des autorisations système (G27)'],
  ['/parametres/course', 'les haptiques de sortie : un VRAI réglage, sans autre porte'],
  ['/confidentialite', 'audiences, carte partagée, zones protégées (G27)'],
  ['/langue', 'le réglage qui conditionne la lecture de tout le reste'],
  ['/credits-donnees', 'attribution cartographique, obligation de licence'],
  ['/legal/licences', 'licences des dépendances, obligation de licence'],
  ['/mes-parcours', 'transparence sur ce que GRYD déduit des habitudes (A-46)'],
]);

Deno.test('paramètres : chaque porte de dernier recours est peinte par l’ÉCRAN', async () => {
  const code = await ecran();
  for (const [route, raison] of PORTES_DE_DERNIER_RECOURS) {
    assert(code.includes(`'${route}'`), `${route} n’a plus de porte dans l’écran Paramètres — ${raison}`);
  }
});

Deno.test('paramètres : ces portes ne dépendent d’AUCUN drapeau', async () => {
  const code = await ecran();
  for (const spread of code.matchAll(/\.\.\.\(flags\.[\w]+[\s\S]*?\)\s*:\s*\[\]\)/g)) {
    for (const route of PORTES_DE_DERNIER_RECOURS.keys()) {
      assert(!spread[0].includes(`'${route}'`), `${route} est repassée derrière un drapeau — l’écran redevient fermé à ceux qu’il sert`);
    }
  }
});

/**
 * ─── ÉTAPE 0 : LE DÉFAUT EXISTAIT ──────────────────────────────────────────
 * Les CGV sont OBLIGATOIRES dès qu'un service payant est proposé (art. L111-1
 * du Code de la consommation) et `app/legal/cgv.tsx` existe depuis longtemps.
 * Mais son unique ligne dans l'univers Réglages vivait dans la branche
 * `apropos` de `app/parametres/[section].tsx`, et la route intercepte ce slug
 * par un `<Redirect href="/a-propos">` depuis le 09/09 : plus AUCUN chemin de
 * Réglages n'y menait. Le typecheck était vert, l'audit de routes aussi (la
 * page gardait une porte depuis `/abonnement`), et le document était perdu là
 * où on le cherche. Ce test aurait rougi ce jour-là.
 */
Deno.test('paramètres : les DEUX documents contractuels sont dans le groupe Légal', async () => {
  const code = await ecran();
  assert(code.includes("'/legal/cgu'"), 'les conditions d’utilisation ont disparu de Réglages');
  assert(
    code.includes("'/legal/cgv'"),
    'les conditions de VENTE ne sont plus atteignables depuis Réglages — obligation L111-1, et c’est exactement le trou qu’une redirection avait creusé',
  );
  assert(code.includes("'/legal/confidentialite'"), 'la politique de confidentialité a disparu de Réglages');
});

/**
 * ─── ÉTAPE 0 : LE DÉFAUT EXISTAIT ──────────────────────────────────────────
 * « Mon journal » → `/(tabs)/profil` et « Mon crew » → `/(tabs)/crew` ont été
 * peintes dans cet écran jusqu'au 10/09/2026 : deux lignes de RÉGLAGES qui ne
 * réglaient rien et rejouaient un onglet déjà présent en bas de l'écran. Elles
 * reviennent facilement (« ça ne coûte rien »), et chaque retour rallonge la
 * liste où l'on cherche une obligation légale.
 */
Deno.test('paramètres : la liste ne rejoue pas la barre d’onglets', async () => {
  const code = await ecran();
  for (const onglet of ['/(tabs)/profil', '/(tabs)/crew', '/(tabs)/classement']) {
    assert(
      !code.includes(`push('${onglet}')`),
      `${onglet} est redevenu une ligne de Réglages — un onglet est à un tap, une table des matières qui le recopie apprend à ranger tout deux fois`,
    );
  }
});

Deno.test('paramètres : le catalogue ne peut plus redevenir une deuxième liste', async () => {
  const source = await Deno.readTextFile(new URL('./sections.ts', import.meta.url));
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  // Ni destination, ni drapeau : ce module décrit des sous-pages, il ne navigue pas.
  assert(!code.includes('href'), 'sections.ts porte à nouveau des destinations : deux listes, deux vérités');
  assert(!code.includes('flags.'), 'sections.ts porte à nouveau une condition de drapeau');
});

Deno.test('paramètres : chaque sous-page a un titre et un détail dans les 5 langues', () => {
  assert(Object.keys(SETTINGS_SECTIONS).length === SECTION_IDS.length, 'un slug rendu sans métadonnée, ou l’inverse');
  for (const id of SECTION_IDS) {
    const meta = settingsRowBySection(id);
    assert(meta !== undefined, `${id} : aucune métadonnée`);
    for (const locale of LOCALES) {
      assert(meta!.label[locale]?.trim().length > 0, `${id} : label ${locale} vide`);
      assert(meta!.detail[locale]?.trim().length > 0, `${id} : detail ${locale} vide`);
    }
  }
  // Un slug inconnu venu de l'URL ne fabrique pas un titre.
  assert(settingsRowBySection('inventé' as SettingsSectionId) === undefined);
});

/**
 * ─── ÉTAPE 0 : LE DÉFAUT EXISTAIT, ET IL A DURÉ DES MOIS ───────────────────
 * `app/parametres/[section].tsx` rendait HUIT slugs. Cinq étaient interceptés
 * par un `<Redirect>` avant tout rendu (leur JSX était donc mort), et le
 * sixième — `course`, qui porte les haptiques, un réglage RÉEL et persisté —
 * n'était poussé par AUCUN fichier du dépôt : `grep -rn "parametres/course"`
 * ne rendait que le commentaire d'un catalogue i18n. Un écran complet,
 * traduit en cinq langues, atteignable par personne.
 *
 * Ce test croise les deux listes : ce que le composant de route sait rendre, et
 * ce que le dépôt pousse. Un slug qui n'est ni redirigé ni poussé rougit.
 */
Deno.test('paramètres : aucune sous-page n’est atteignable par personne', async () => {
  const route = await Deno.readTextFile(new URL('../../../app/parametres/[section].tsx', import.meta.url));
  const code = route.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  // Les slugs que le composant intercepte AVANT de rendre quoi que ce soit :
  // ce sont des liens profonds de compatibilité, pas des pages.
  const redirects = new Set(
    [...code.matchAll(/raw === '([\w-]+)'/g)].map((m) => m[1]!),
  );
  assert(redirects.size > 0, 'plus aucune redirection lue : la regex ne décrit plus le fichier');

  // Ce que l'écran Réglages (et le reste de l'app) pousse réellement.
  const dossier = new URL('../../../', import.meta.url);
  const pousses = new Set<string>();
  for (const chemin of ['app/parametres.tsx', 'app/confidentialite.tsx', 'app/activite.tsx', 'app/parametres/permissions.tsx']) {
    const source = await Deno.readTextFile(new URL(chemin, dossier));
    const propre = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const m of propre.matchAll(/'\/parametres\/([\w-]+)'/g)) pousses.add(m[1]!);
  }
  assert(pousses.size > 0, 'aucun `push` vers une sous-page : le chemin de lecture est faux');

  for (const id of SECTION_IDS) {
    assert(
      pousses.has(id),
      `/parametres/${id} est rendu par la route mais poussé par personne — un écran traduit en cinq langues que nul ne peut ouvrir`,
    );
    assert(
      !redirects.has(id),
      `/parametres/${id} est à la fois redirigé et rendu : la redirection gagne, la branche est morte`,
    );
  }
  // Et l'inverse : un slug redirigé ne doit plus avoir de métadonnée de page.
  for (const slug of redirects) {
    assert(
      !Object.hasOwn(SETTINGS_SECTIONS, slug),
      `${slug} est redirigé mais garde un titre de sous-page dans sections.ts — le catalogue d'un écran qui n'existe plus`,
    );
  }
});

/**
 * ─── ÉTAPE 0 : LE DÉFAUT EXISTAIT ──────────────────────────────────────────
 * `SETTINGS_GLYPHS` porte « un dessin sémantique par ligne de Réglages ». Trois
 * de ses clés — `collection`, `crew`, `replayDiscovery` — décrivaient des lignes
 * retirées de l'écran, et `glyphs.test.ts` les comptait sans sourciller : son
 * assertion `names.length === 19` était vraie d'un inventaire, pas de l'écran.
 * Ici on croise le catalogue avec la SOURCE : une clé sans ligne rougit.
 */
Deno.test('paramètres : chaque glyphe du catalogue sert une ligne de l’écran', async () => {
  const code = await ecran();
  for (const cle of Object.keys(SETTINGS_GLYPHS)) {
    assert(
      code.includes(`SETTINGS_GLYPHS.${cle}`),
      `SETTINGS_GLYPHS.${cle} ne sert plus aucune ligne de Réglages — un inventaire qui survit à son écran`,
    );
  }
});
