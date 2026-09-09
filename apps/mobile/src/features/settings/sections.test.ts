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
 */
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../../i18n/types.ts';
import { SETTINGS_SECTIONS, settingsRowBySection, type SettingsSectionId } from './sections.ts';

/** Les slugs que `app/parametres/[section].tsx` sait rendre. */
const SECTION_IDS: readonly SettingsSectionId[] = [
  'compte', 'profil', 'crew', 'course', 'notifications', 'carte', 'apropos', 'avance',
];

/**
 * Les routes qui n'ont AUCUNE autre porte fiable dans le build MVP, avec la
 * raison — une liste sans raisons finit par accumuler ce que personne n'ose
 * retirer.
 */
const PORTES_DE_DERNIER_RECOURS: ReadonlyMap<string, string> = new Map([
  ['/parametres/compte', 'connexion, export et suppression du compte (RGPD)'],
  ['/parametres/notifications', 'consentements de notification, §14.1'],
  ['/confidentialite', 'audiences, carte partagée, zones protégées (G27)'],
  ['/langue', 'le réglage qui conditionne la lecture de tout le reste'],
  ['/credits-donnees', 'attribution cartographique, obligation de licence'],
  ['/legal/licences', 'licences des dépendances, obligation de licence'],
  ['/mes-parcours', 'transparence sur ce que GRYD déduit des habitudes (A-46)'],
]);

Deno.test('paramètres : chaque porte de dernier recours est peinte par l’ÉCRAN', async () => {
  const source = await Deno.readTextFile(new URL('../../../app/parametres.tsx', import.meta.url));
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const [route, raison] of PORTES_DE_DERNIER_RECOURS) {
    assert(code.includes(`'${route}'`), `${route} n’a plus de porte dans l’écran Paramètres — ${raison}`);
  }
});

Deno.test('paramètres : ces portes ne dépendent d’AUCUN drapeau', async () => {
  const source = await Deno.readTextFile(new URL('../../../app/parametres.tsx', import.meta.url));
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const spread of code.matchAll(/\.\.\.\(flags\.[\w]+[\s\S]*?\)\s*:\s*\[\]\)/g)) {
    for (const route of PORTES_DE_DERNIER_RECOURS.keys()) {
      assert(!spread[0].includes(`'${route}'`), `${route} est repassée derrière un drapeau — l’écran redevient fermé à ceux qu’il sert`);
    }
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
