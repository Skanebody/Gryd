/**
 * GRYD — A-46 × A-45 : LA ZONE DU JOUR À LA DISTANCE QU'ON COURT VRAIMENT.
 *
 * ═══ LE PROBLÈME ════════════════════════════════════════════════════════════
 * La Zone du Jour (`engine/dailyZone.ts`) désigne un secteur RÉEL sans rien
 * savoir de la personne : elle propose la même conquête à qui court 4 km et à
 * qui en court 12. Une proposition qui ignore la distance réelle est une
 * proposition morte — pas fausse, juste inutilisable.
 * A-46 (`features/route/suggestion.ts`) sait, lui, quelle distance cette
 * personne court vraiment, et D'OÙ vient ce chiffre. Ce module est le pont.
 *
 * ═══ CE QUE CE MODULE NE FAIT SURTOUT PAS : RE-TIRER LA ZONE ════════════════
 * Il aurait été tentant de FILTRER les candidats par distance habituelle. C'est
 * exactement ce qu'il ne faut pas faire, pour deux raisons dures :
 *
 *  1. LA ZONE DU JOUR EST UN FAIT PARTAGÉ. `engine/dailyZone.ts` défend
 *     longuement le tirage PAR VILLE : deux coureurs de la même ville voient la
 *     même zone, peuvent se le dire et s'y croiser. Un filtre personnel
 *     re-fragmenterait le tirage joueur par joueur et détruirait la seule
 *     propriété qui rend la mécanique vérifiable par un tiers.
 *  2. LE SERVEUR REJOUE LE TIRAGE. La distinction est DÉRIVÉE côté serveur
 *     (migration 0053) en comparant le secteur capturé au secteur tiré. Si le
 *     client tirait sur un sous-ensemble que le serveur ignore, l'écran
 *     annoncerait une zone que le serveur n'accorderait jamais — le bug
 *     `daily_zone_awards` réintroduit une couche plus haut.
 *
 * Donc : la zone ne bouge pas. C'est la LECTURE qu'on rend honnête — on dit
 * quelle distance est proposée, d'où elle sort, et si le terrain réellement
 * libre là-bas tient la comparaison. Quand la réponse est « non », on le DIT
 * (`fit: 'tight'`) au lieu d'aller chercher un autre secteur : « ne pas élargir
 * le rayon en silence » est une règle, pas une préférence.
 *
 * ═══ HONNÊTETÉ STRUCTURELLE (et pas seulement gardée par un `if`) ═══════════
 * « Adapté à tes habitudes » est LA phrase qu'A-46 a été écrit pour rendre
 * vraie. Ici elle n'est pas protégée par une condition : elle est portée par un
 * VARIANT du type de sortie. Seul `{ kind: 'learned' }` peut la produire, et
 * seule une distance de `source === 'learned'` peut produire ce variant. Un
 * réglage manuel, un apprentissage coupé, un profil trop maigre ou une lecture
 * ratée sortent par d'autres variants, qui n'ont pas accès à cette copie —
 * l'écran indexe une table exhaustive par `kind`. Pour faire mentir l'écran, il
 * faudrait changer le TYPE, pas oublier un test.
 *
 * De même, `fit` n'existe QUE sur les variants qui portent une distance
 * réellement voulue par la personne (`learned`, `manual`). Juger le terrain
 * contre la distance PAR DÉFAUT — un nombre que personne n'a choisi — serait un
 * verdict sur un coureur imaginaire : le type l'interdit.
 *
 * ═══ ANTI PAY-TO-WIN ════════════════════════════════════════════════════════
 * Rien ici ne donne quoi que ce soit. La sortie de ce module est une distance,
 * un motif et un verdict de lecture. Aucun identifiant de zone, aucun score,
 * aucune durée de protection, aucun multiplicateur ne peut en sortir — donc
 * aucun chemin de code ne peut transformer « on t'a proposé 5 km » en avantage.
 * Un coureur qui ignore la proposition joue exactement le même jeu.
 *
 * ═══ ZÉRO IMPORT — ET C'EST VOULU ═══════════════════════════════════════════
 * Le module n'importe RIEN : ni game-rules, ni les types d'A-46, ni React. Les
 * seuils sont INJECTÉS (même patron que `SuggestionBounds`). Deux conséquences
 * utiles : le test Deno l'importe tel quel par chemin relatif (le mobile ne peut
 * pas importer @klaim/engine, et Deno ne résout pas `@klaim/shared`), et
 * l'appelant reste le seul endroit où les constantes de jeu sont lues.
 */

// ─── Entrées ────────────────────────────────────────────────────────────────

/** D'où vient la distance — miroir exact de `SuggestionSource` (A-46). */
export type ZoneEffortSource = 'manual' | 'learned' | 'default';

/** Pourquoi on est retombé sur le défaut — miroir de `DefaultCause` (A-46). */
export type ZoneEffortCause = 'learning' | 'off' | 'unavailable';

/**
 * La distance proposée par A-46, réduite à ce dont ce module a besoin.
 *
 * `runsLeft` est CALCULÉ PAR L'APPELANT avec `runsBeforeLearning`
 * (features/route/suggestion.ts) : le seuil « combien de courses encore » a déjà
 * une implémentation testée, et une seconde ici serait une seconde vérité —
 * exactement le genre d'écart qui fait dire « encore 2 courses » quand il en
 * faut 3.
 */
export interface ZoneEffortInput {
  /** Distance proposée, en kilomètres (déjà bornée par A-46). */
  km: number;
  source: ZoneEffortSource;
  /** Renseigné UNIQUEMENT quand `source === 'default'`. */
  cause: ZoneEffortCause | null;
  /** Courses restantes avant que la personnalisation devienne vraie. */
  runsLeft: number | null;
}

/**
 * Le terrain RÉEL du secteur tiré, tel que compté en base — jamais estimé.
 *
 * `freeZones === null` signifie INCONNU (secteur sans total fiable), ce qui
 * n'est PAS « 0 libre » : un total inconnu interdit tout verdict, il ne le rend
 * pas négatif.
 *
 * Le rôle est repris tel quel du tirage. Sur un secteur `fragile`, aucun verdict
 * n'est rendu : la RPC (0053) n'expose qu'un BOOLÉEN de fragilité, pas un
 * compte. Rendre un verdict de volume sur un booléen serait inventer le nombre
 * qui manque.
 */
export interface DailyZoneGround {
  role: 'neutral' | 'fragile';
  freeZones: number | null;
}

// ─── Sortie ─────────────────────────────────────────────────────────────────

/**
 * Le terrain libre du secteur tient-il la comparaison avec la distance voulue ?
 *  · `ample`   — il y a au moins autant de zones libres que la sortie pourrait
 *                en traverser : la conquête a de quoi remplir la course ;
 *  · `tight`   — il y en a moins. Fait réel, dit tel quel : ce n'est ni une
 *                erreur, ni une raison de changer de secteur ;
 *  · `unknown` — total inconnu, secteur fragile, ou distance sans portée
 *                calculable. On ne tranche pas, et on ne le maquille pas.
 */
export type ZoneFit = 'ample' | 'tight' | 'unknown';

/**
 * L'effort que l'écran a le droit d'annoncer, et RIEN d'autre.
 *
 * Un variant = une phrase. La table de copie de l'écran est indexée par `kind`
 * et exhaustive : ajouter un variant sans sa copie est une erreur de TypeScript.
 */
export type DailyZoneEffort =
  /**
   * SEUL état où « adapté à tes habitudes » est vrai : la distance vient des
   * courses réellement enregistrées par cette personne.
   */
  | { kind: 'learned'; km: number; fit: ZoneFit }
  /** Réglage explicite : c'est SA distance, mais elle n'a rien d'appris. */
  | { kind: 'manual'; km: number; fit: ZoneFit }
  /** Pas encore assez de courses. On annonce le reste à courir, jamais un flou. */
  | { kind: 'learning'; runsLeft: number | null }
  /** L'apprentissage est coupé — droit inconditionnel, dit sans reproche. */
  | { kind: 'off' }
  /** On ne sait pas (lecture ratée, hors session). L'écran ne prétend rien. */
  | { kind: 'unknown' };

// ─── Portée d'une sortie, en zones ──────────────────────────────────────────

/**
 * Combien de zones une sortie de `km` peut-elle AU PLUS traverser ?
 *
 * `spacingM` est la distance centre à centre entre deux zones voisines — une
 * propriété GÉOMÉTRIQUE de la grille (H3 res-10), injectée par l'appelant depuis
 * game-rules. Le calcul suppose une trajectoire RECTILIGNE, ce qui est le
 * meilleur des cas : une course réelle serpente et en traverse moins. Cette
 * borne HAUTE est délibérée — elle rend le verdict `ample` plus DIFFICILE à
 * obtenir (il faut au moins autant de zones libres que ce maximum théorique),
 * donc on ne promet jamais « il y a de quoi faire » à la légère. Se tromper du
 * côté prudent est la seule erreur acceptable quand l'app ne ment pas.
 *
 * Toute entrée aberrante (NaN, ≤ 0, Infinity) donne 0 — « je ne sais pas
 * calculer », qui remonte en `unknown`, jamais en verdict.
 */
export function zonesWithinReach(km: number, spacingM: number): number {
  if (!Number.isFinite(km) || km <= 0) return 0;
  if (!Number.isFinite(spacingM) || spacingM <= 0) return 0;
  return Math.floor((km * 1000) / spacingM);
}

/**
 * Verdict de terrain. Toute incertitude — sur le compte, sur le rôle, sur la
 * portée — sort en `unknown`. Aucune valeur de repli n'est substituée : c'est
 * la substitution silencieuse qui fabrique les fausses promesses.
 */
function judgeFit(ground: DailyZoneGround | null, km: number, spacingM: number): ZoneFit {
  if (ground === null) return 'unknown';
  // Secteur tiré pour ses échéances : le compte fragile n'est pas exposé
  // (booléen côté RPC). Pas de compte ⇒ pas de verdict.
  if (ground.role !== 'neutral') return 'unknown';
  const free = ground.freeZones;
  if (free === null || !Number.isFinite(free) || free < 0) return 'unknown';
  const reach = zonesWithinReach(km, spacingM);
  if (reach <= 0) return 'unknown';
  return Math.floor(free) >= reach ? 'ample' : 'tight';
}

/**
 * LA dérivation. Pure, totale : toute entrée produit exactement un variant, et
 * il y a toujours quelque chose de vrai à dire (au pire `unknown`, qui se traduit
 * à l'écran par le silence — pas par une phrase inventée).
 *
 * Une distance non finie ou ≤ 0 est traitée comme une absence de distance :
 * `unknown`. La « corriger » en un nombre plausible reviendrait à proposer une
 * sortie que personne n'a demandée en la présentant comme la sienne.
 */
export function resolveDailyZoneEffort(
  ground: DailyZoneGround | null,
  distance: ZoneEffortInput | null,
  spacingM: number,
): DailyZoneEffort {
  if (distance === null) return { kind: 'unknown' };

  const km = distance.km;
  const usable = typeof km === 'number' && Number.isFinite(km) && km > 0;

  switch (distance.source) {
    case 'learned':
      // Une distance « apprise » illisible ne devient PAS un défaut présenté
      // comme appris : elle perd le variant qui autorise la phrase.
      return usable ? { kind: 'learned', km, fit: judgeFit(ground, km, spacingM) } : { kind: 'unknown' };

    case 'manual':
      return usable ? { kind: 'manual', km, fit: judgeFit(ground, km, spacingM) } : { kind: 'unknown' };

    case 'default': {
      // La distance affichée serait la constante par défaut : on ne la montre
      // pas du tout ici. L'écran dit POURQUOI il ne personnalise pas, ce qui est
      // la seule information utile — et la seule qui soit vraie.
      if (distance.cause === 'learning') {
        const left = distance.runsLeft;
        return {
          kind: 'learning',
          runsLeft:
            typeof left === 'number' && Number.isFinite(left) && left > 0 ? Math.floor(left) : null,
        };
      }
      if (distance.cause === 'off') return { kind: 'off' };
      return { kind: 'unknown' };
    }

    default:
      // Source inconnue (payload futur, régression) : silence, jamais un
      // verdict par défaut.
      return { kind: 'unknown' };
  }
}
