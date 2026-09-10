/**
 * GRYD — LA CONTESTATION N'EXISTE PLUS, ET AUCUN TEXTE NE LA REPROPOSE.
 *
 * ─── LE DÉFAUT MESURÉ (10/09/2026) ──────────────────────────────────────────
 * `explain.ts` répondait, à « un rival peut-il fermer ma boucle ? » : « Non. Un
 * rival peut CONTESTER la zone, jamais fermer ta boucle. » Le cahier de
 * septembre §5.3 dit l'inverse, et sans nuance : « Il n'y a ni bouclier, ni
 * contestation de 18 heures, ni défense achetable, ni dette de connexion.
 * Repasser une boucle est la seule façon de reprendre sa zone. » La réponse
 * décrivait donc une mécanique ABOLIE à qui vient justement demander la règle.
 *
 * ─── CE QUE CE TEST DIT AUSSI, ET QU'IL VAUT MIEUX SAVOIR ───────────────────
 * `explain.ts` n'est lu par AUCUN écran atteignable aujourd'hui : tout
 * `features/explain/` (contenu, schémas, FAQ de 20 entrées) n'est plus importé
 * que par ses propres tests, et la FAQ qui s'affiche vraiment — `app/faq.tsx` —
 * écrit ses dix questions en clair, en deux langues. Le catalogue reste corrigé
 * plutôt que supprimé : effacer un domaine de quinze fichiers est une décision
 * à part, mensonge dormant ou pas. Mais la FAQ VIVANTE est vérifiée ici aussi,
 * parce que c'est elle que quelqu'un lit.
 *
 * ⚠ « contesté » n'est PAS interdit partout : un secteur peut être disputé
 * (couleur violette, `SECTOR_CONTESTED_RULE`). Ce qui est aboli, c'est l'ACTION
 * de contester une zone. Ce test vise les phrases qui la promettent, pas le mot.
 */
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES, type Locale } from '../types.ts';
import { C } from './explain.ts';

const read = async (rel: string): Promise<string> => await Deno.readTextFile(new URL(rel, import.meta.url));

/** Les cinq phrases d'avant, mot pour mot. Aucune ne doit revenir. */
const ABOLIES: Record<Locale, string> = {
  fr: 'Un rival peut contester la zone',
  en: 'A rival can contest the zone',
  es: 'Un rival puede disputar la zona',
  de: 'Ein Rivale kann die Zone umkämpfen',
  pt: 'Um rival pode disputar a zona',
};

/** Ce que la réponse doit NOMMER à la place : repasser, et rien d'autre. */
const SEULE_FACON: Record<Locale, RegExp> = {
  fr: /repasser/i,
  en: /again/i,
  es: /volver a pasar/i,
  de: /erneut/i,
  pt: /de novo/i,
};

/** Et ce qu'elle doit NIER : le bouclier, dans chaque langue. */
const PAS_DE_BOUCLIER: Record<Locale, RegExp> = {
  fr: /ni bouclier/i,
  en: /no shield/i,
  es: /no hay escudo/i,
  de: /weder Schutzschild/i,
  pt: /não existe escudo/i,
};

Deno.test('ÉTAPE 0 : le cahier abolit la contestation, en toutes lettres', async () => {
  const cahier = await read('../../../../../docs/product/GRYD_REFONTE_INTEGRALE_2026_09.md');
  assert(
    /ni bouclier, ni contestation de 18 heures/.test(cahier),
    '§5.3 ne dit plus que la contestation est abolie — ce test n’a plus de fondement, relire le cahier avant de le réparer',
  );
  assert(
    /Repasser une boucle est la seule façon de reprendre sa zone/.test(cahier),
    '§5.3 ne nomme plus la seule reprise possible : la réponse de la FAQ est à revoir avec lui',
  );
});

Deno.test('la réponse q6A ne propose plus de contester — les cinq langues', () => {
  for (const locale of LOCALES) {
    const answer = C.q6A[locale];
    assert(answer.trim().length > 0, `q6A.${locale} est vide`);
    assert(
      !answer.includes(ABOLIES[locale]),
      `q6A.${locale} promet à nouveau une contestation que §5.3 a supprimée`,
    );
    assert(SEULE_FACON[locale].test(answer), `q6A.${locale} ne dit pas que repasser est la seule reprise`);
    assert(PAS_DE_BOUCLIER[locale].test(answer), `q6A.${locale} ne nie plus le bouclier — §5.3 le supprime aussi`);
  }
});

Deno.test('MUTATION : les anciennes phrases ne survivent nulle part dans le catalogue', async () => {
  const source = await read('./explain.ts');
  for (const locale of LOCALES) {
    // Le commentaire d'en-tête a le droit de citer la règle abolie ; il ne cite
    // pas les phrases, il les explique. Une phrase entière qui reviendrait ici
    // serait forcément un texte affiché.
    assert(
      !source.includes(ABOLIES[locale]),
      `« ${ABOLIES[locale]} » est revenue dans explain.ts (${locale})`,
    );
  }
});

Deno.test('la FAQ RÉELLEMENT affichée ne promet ni contestation ni bouclier', async () => {
  // `app/faq.tsx` est la seule FAQ atteignable (Réglages → Aide → Questions
  // fréquentes). Elle écrit ses textes en clair : c'est là que le mensonge
  // coûterait vraiment, et rien ne la relie au catalogue corrigé au-dessus.
  const faq = await read('../../../app/faq.tsx');
  for (const promesse of ['contester', 'contest the', 'bouclier', 'shield']) {
    assert(
      !new RegExp(promesse, 'i').test(faq),
      `app/faq.tsx parle de « ${promesse} » : §5.3 ne connaît ni l’un ni l’autre`,
    );
  }
  // Et elle dit, elle, ce qui est vrai : une nouvelle boucle reprend le terrain.
  assert(/nouvelle boucle/i.test(faq) && /new loop/i.test(faq), 'la FAQ ne nomme plus la seule reprise possible');
});
