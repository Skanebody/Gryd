/**
 * GRYD — PARTAGER SA SORTIE EN UN GESTE : LE MODÈLE, PUR ET SANS UI.
 *
 * ─── LE PROBLÈME MESURÉ (10/09/2026, demande fondateur) ─────────────────────
 * « Comment se passe le partage du run ? Est-ce que tout est mis en place pour
 * pouvoir partager sur les réseaux facilement ? »
 * L'app savait DÉJÀ tout faire — affiche 9:16, PNG, sticker transparent, film
 * MP4 natif, masquage de vie privée. Elle le faisait mal DE LOIN : le bouton
 * « Partager » du Résultat POUSSAIT UN ÉCRAN (`/partage`, le Studio), qui
 * s'ouvre sur quatre familles, cinq compositions, trois formats et deux fonds
 * avant qu'une seule image ne parte. Entre la fin de la course et l'application
 * de destination, il y avait une navigation, un écran de composition, et un
 * choix à faire — alors que dans 90 % des cas le joueur veut EXACTEMENT ce que
 * l'app sait déjà rendre : sa trace, ses chiffres, en 9:16.
 *
 * Ce module décrit donc la feuille COURTE : elle s'ouvre PAR-DESSUS l'écran de
 * résultat (aucune navigation), montre l'affiche déjà rendue, et n'offre que
 * les deux décisions qui changent vraiment le visuel — le cadre et le fond.
 * Le Studio reste entier, à un lien de là, pour qui veut composer.
 *
 * ─── CE QU'IL NE FAIT PAS ───────────────────────────────────────────────────
 * Il ne rend rien, n'ouvre rien, ne capture rien, et n'importe NI React NI
 * react-native : il est pur, donc testable en Deno (même discipline que
 * `shareTargets.ts` et `clubExport.ts`). Il ne décide d'aucune grandeur de jeu
 * (anti pay-to-win §1.6) : choisir un fond ne donne ni terrain, ni points.
 *
 * ─── ET IL NE DÉCIDE PAS DE LA VIE PRIVÉE ───────────────────────────────────
 * Le masquage des extrémités reste où il vit déjà : `protectedShareSegments2026`
 * → `packages/engine/src/tracePrivacy.ts`, avec `SHARE_TRIM_M` de game-rules.
 * Ce module n'a AUCUN accès à une coordonnée. Ce qu'il fait, en revanche, c'est
 * refuser de nommer « prête » une feuille dont les protections ne sont pas
 * encore résolues : voir `quickShareTraceState2026`.
 */

import type { ShareTheme2026 } from './shareModel2026';

/**
 * LES DEUX CADRES DE LA FEUILLE COURTE, et seulement eux.
 *
 * Le Studio en propose trois (`SHARE_EXPORT_FORMATS_2026` : story, portrait,
 * square). Ici il y en a DEUX, parce qu'ils répondent à deux questions
 * différentes du monde réel — « une story » (9:16 plein écran, Instagram /
 * TikTok / Snapchat) ou « un post » (1:1, le feed). Le 4:5 est une nuance de
 * cadrage : c'est une décision de Studio, pas une décision de fin de course.
 */
export const QUICK_SHARE_FORMATS_2026 = ['story', 'square'] as const;
export type QuickShareFormat2026 = (typeof QUICK_SHARE_FORMATS_2026)[number];

/**
 * LES TROIS FONDS. Noir (le défaut GRYD), chartreuse (l'accent de marque en
 * valeur d'affichage), minimal (fond clair, pour qui poste sur un feed clair).
 *
 * ─── POURQUOI UN VOCABULAIRE À PART, ET PAS UN `ShareTheme2026` DE PLUS ─────
 * `ShareTheme2026` vaut `'dark' | 'light'` et cette valeur VOYAGE JUSQU'AU
 * NATIF : `buildRunFilmScene2026` la sérialise dans la scène JSON que
 * `RunFilmEncoder.swift` / `RunFilmScene.kt` décodent en Codable strict. Y
 * ajouter une troisième valeur ferait échouer le décodage d'un binaire déjà
 * installé — un film qui marche aujourd'hui cesserait de marcher demain, pour
 * une teinte de titre. Le fond « chartreuse » est donc EXACTEMENT le fond
 * sombre, avec l'accent porté sur la mesure principale : une décision de
 * rendu, pas un nouveau thème. `quickShareRendering2026` fait la traduction,
 * et c'est le seul endroit du dépôt qui la fait.
 *
 * ─── ET LES THÈMES COSMÉTIQUES, ALORS ? ────────────────────────────────────
 * Le lot cosmétiques expose `CardThemeCosmetic2026` (arsenal/cosmetics2026.ts)
 * — quatre thèmes d'affiche `{background, ink, accent}` gagnés au NIVEAU ou
 * avec GRYD+. Ils ne sont volontairement pas branchés ICI, pour deux raisons
 * qui tiennent au rôle de cette feuille :
 *   1. elle doit marcher pour TOUT LE MONDE, y compris sans compte — une
 *      sortie enregistrée en invité vit sur l'appareil et lui appartient
 *      (cahier §9.2). Trois fonds gratuits, disponibles tout de suite ;
 *   2. `SharePoster2026` rend un thème, pas un triplet de couleurs libres :
 *      l'accepter demande de reprendre aussi `StudioComposition2026` et la
 *      scène du film. C'est un chantier, pas une option de feuille rapide.
 * Le Studio est l'endroit naturel de ce branchement : il gère DÉJÀ les objets
 * possédés et GRYD+ (`StudioObjectArtwork2026`, `verifyStudioObject2026`).
 */
export const QUICK_SHARE_THEMES_2026 = ['noir', 'chartreuse', 'minimal'] as const;
export type QuickShareTheme2026 = (typeof QUICK_SHARE_THEMES_2026)[number];

/** Ce que l'affiche doit recevoir pour rendre un fond de la feuille courte. */
export interface QuickShareRendering2026 {
  /** Le thème que `SharePoster2026` connaît déjà. Jamais une valeur nouvelle. */
  readonly theme: ShareTheme2026;
  /** La mesure principale passe en chartreuse (`refonteColors.accent`). */
  readonly accent: boolean;
}

export function quickShareRendering2026(theme: QuickShareTheme2026): QuickShareRendering2026 {
  switch (theme) {
    case 'chartreuse':
      return { theme: 'dark', accent: true };
    case 'minimal':
      return { theme: 'light', accent: false };
    case 'noir':
      return { theme: 'dark', accent: false };
  }
}

/**
 * L'ÉTAT DE LA TRACE, tel que la feuille a le DROIT de l'annoncer.
 *
 * Quatre états distincts, jamais trois (L8/L14/L19) :
 *   · `checking`  les préférences de vie privée ou les zones privées ne sont
 *                 pas encore lues. On ne rend AUCUNE trace, et on le dit ;
 *   · `failed`    la lecture a échoué. On partage les mesures SANS tracé, et on
 *                 le dit — on ne retombe jamais sur la trace brute ;
 *   · `masked`    une trace protégée existe et sera dessinée ;
 *   · `none`      il n'y a pas de trace partageable (aucun point, ou tout a été
 *                 masqué). Les mesures partent seules, et l'écran le dit.
 */
export type QuickShareTraceState2026 = 'checking' | 'failed' | 'masked' | 'none';

export function quickShareTraceState2026(input: {
  readonly privacyResolved: boolean;
  readonly privacyFailed: boolean;
  readonly protectedSegmentCount: number;
}): QuickShareTraceState2026 {
  if (input.privacyFailed) return 'failed';
  if (!input.privacyResolved) return 'checking';
  return input.protectedSegmentCount > 0 ? 'masked' : 'none';
}

/**
 * LES ACTIONS DE LA FEUILLE, DÉRIVÉES DE LA CAPACITÉ RÉELLE (constitution §2,
 * « aucun bouton mort »).
 *
 *   · `image`   toujours présente sur natif : `captureRef` + `expo-sharing`
 *               savent remettre un PNG à la feuille système, et la feuille
 *               système contient Instagram, TikTok, WhatsApp et Messages. C'est
 *               le chemin qui MARCHE aujourd'hui, sur un binaire déjà installé.
 *               Sur le web il n'y a pas de capture : l'action existe encore
 *               mais l'écran doit annoncer un résumé TEXTE, jamais une image
 *               (`shareAsImage` retombe sur `openShareSheet`).
 *   · `film`    seulement si le module natif `GrydRunFilm` répond présent DANS
 *               CE BINAIRE (`getRunFilmCompatibility2026`). Un JS à jour sur un
 *               vieux binaire n'a pas l'encodeur : le bouton ne se peint pas.
 *   · `studio`  toujours : c'est une navigation interne.
 *
 * L'ordre est STABLE, et c'est la seule source de l'ordre : un geste appris ne
 * doit pas devenir une loterie d'un rendu à l'autre.
 */
export const QUICK_SHARE_ACTIONS_2026 = ['image', 'film', 'studio'] as const;
export type QuickShareAction2026 = (typeof QUICK_SHARE_ACTIONS_2026)[number];

export interface QuickShareCapabilityInput2026 {
  readonly platform: 'ios' | 'android' | 'web';
  /**
   * `null` = la compatibilité du film n'a pas ENCORE répondu. Traité comme un
   * non : on ne peint pas ce qu'on n'a pas mesuré (même règle que les sondes de
   * `shareTargets.ts`).
   */
  readonly filmAvailable: boolean | null;
}

export function quickShareActions2026(input: QuickShareCapabilityInput2026): readonly QuickShareAction2026[] {
  const actions: QuickShareAction2026[] = ['image'];
  if (input.platform !== 'web' && input.filmAvailable === true) actions.push('film');
  actions.push('studio');
  return actions;
}

/**
 * CE QUE LE BOUTON PRIMAIRE A LE DROIT DE PROMETTRE.
 *
 * Sur natif, une image part vraiment. Sur le web, `captureRef` n'existe pas et
 * `openShareSheet` envoie la LÉGENDE : dire « Partager l'image » y serait un
 * mensonge, et le dépôt en a déjà payé un (le sticker texte annoncé « PNG »,
 * cf. `shareActions.ts`).
 */
export function quickSharePrimaryClaim2026(platform: 'ios' | 'android' | 'web'): 'image' | 'text' {
  return platform === 'web' ? 'text' : 'image';
}

/**
 * LES MESURES DE L'AFFICHE, dans l'ordre où elles se lisent.
 *
 * ─── LA RÈGLE, ET ELLE N'A PAS D'EXCEPTION ──────────────────────────────────
 * Une mesure ABSENTE ne produit pas de ligne. Pas de « 0 » nu, pas de tiret de
 * remplissage, pas de valeur empruntée : une sortie sans allure mesurée montre
 * distance et durée, et rien de plus (interdits L8/L14/L19). C'est pour cette
 * raison que l'entrée accepte `null` partout et que la sortie est une LISTE —
 * l'affiche dessine ce qu'elle reçoit, elle ne comble aucun trou.
 *
 * ─── LE TERRAIN N'EST PAS UNE MESURE COMME LES AUTRES ───────────────────────
 * `gain` n'arrive ici QUE si le serveur a publié la capture : c'est
 * `buildShareFacts2026` qui le décide (statut `published` / `scheduled` et
 * `newTerrainM2 > 0`), jamais l'écran. Une boucle refusée, en attente ou privée
 * ne produit aucune ligne « terrain gagné » — l'app ne s'attribue pas un
 * territoire que le serveur n'a pas accordé.
 */
export interface QuickShareStat2026 {
  readonly key: 'distance' | 'duration' | 'rate' | 'elevation' | 'gain';
  readonly label: string;
  readonly value: string;
  /** Rendue dans l'accent de marque (le terrain gagné, et lui seul). */
  readonly accent: boolean;
}

export interface QuickShareStatsInput2026 {
  readonly distance: string | null;
  readonly duration: string | null;
  readonly rate: string | null;
  readonly rateLabel: string;
  readonly elevation: string | null;
  readonly gain: string | null;
}

export function quickShareStats2026(
  input: QuickShareStatsInput2026,
  locale: 'fr' | 'en',
): readonly QuickShareStat2026[] {
  const fr = locale === 'fr';
  const rows: QuickShareStat2026[] = [];
  const push = (key: QuickShareStat2026['key'], label: string, value: string | null, accent = false) => {
    const trimmed = value?.trim();
    if (trimmed) rows.push({ key, label, value: trimmed, accent });
  };
  push('distance', fr ? 'DISTANCE' : 'DISTANCE', input.distance);
  push('duration', fr ? 'DURÉE' : 'TIME', input.duration);
  push('rate', input.rateLabel, input.rate);
  push('elevation', fr ? 'DÉNIVELÉ' : 'ELEVATION', input.elevation);
  push('gain', fr ? 'TERRAIN GAGNÉ' : 'TERRITORY GAINED', input.gain, true);
  return rows;
}
