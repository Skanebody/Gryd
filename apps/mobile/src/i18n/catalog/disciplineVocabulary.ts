/**
 * GRYD — LE VOCABULAIRE DE DISCIPLINE, EN FONCTION PURE (26/07/2026).
 *
 * Le vélo est une discipline RÉELLE depuis le 26/07/2026 (décision fondateur ;
 * `runs.activity`, `hex_claims (h3index, activity)`, bornes par discipline).
 * Quatre tours de nettoyage successifs ont pourtant laissé passer, à chaque
 * fois, des libellés qui nomment UNE discipline là où l'app en sert DEUX — et
 * la revue finale a fini par les trouver à la regex, dans les cinq langues.
 *
 * Ce module transforme cette regex en GARDE-FOU : une fonction PURE, sans état,
 * sans réseau, sans React — donc testable sous Deno, et exécutée par les tests
 * des catalogues (`profil.test.ts`, `reglages.test.ts`). Le prochain libellé
 * qui nommera « la course » sur une surface qui sert aussi le vélo échouera au
 * test au lieu d'attendre un cinquième tour.
 *
 * ─── CE QU'IL NE FAIT PAS, ET C'EST VOULU ───────────────────────────────────
 * Il ne dit PAS qu'une entrée est fautive : nommer une discipline est LÉGITIME
 * quand l'écran la lit (les jumeaux `scopeRun`/`scopeBike`, la copie « à vélo »
 * d'un bloc titré « Territoire à vélo »…). Le jugement reste au test, qui
 * confronte les entrées repérées à une LISTE REVUE. Ce module ne fait que
 * repérer, exhaustivement et dans les 5 langues.
 */

/**
 * Phrases où un mot du vocabulaire apparaît SANS parler de la discipline :
 * « en cours » (chargement), « parcours » (tracé), « läuft » (fonctionne).
 * Retirées AVANT la détection — sinon le garde-fou crie sur des faux positifs
 * et devient un bruit qu'on finit par désactiver.
 */
const FAUX_AMIS =
  /en cours|parcours|concours|discours|läuft|Aktivitäts-Feed|build runs|app runs/gi;

/**
 * Mots qui désignent la COURSE À PIED (et ses pratiquants) dans les 5 langues.
 * Les frontières `\b` sont indispensables : sans elles « parcours » et
 * « recorrido » déclencheraient.
 */
const MOTS_COURSE: readonly RegExp[] = [
  /\bcourses?\b/i, // fr — « une course », « mes courses »
  /\bcours\b/i, // fr — impératif « Cours … » (« en cours » est déjà retiré)
  /\bcourir\b/i,
  /\bcoureu(r|rs|se|ses)\b/i,
  /\bcarreras?\b/i, // es
  /\bcorre(r|s)?\b/i,
  /\bcorredor(es)?\b/i,
  /\bcorridas?\b/i, // pt
  /\bcorra\b/i,
  // de — « läuft » (fonctionner) est déjà retiré par les faux amis. Le drapeau
  // `i` n'est pas décoratif : les sur-titres et les pastilles sont en CAPITALES
  // (« MEIN GEBIET · LAUFEN »), et un motif sensible à la casse les ratait tous.
  /\bLauf\b/i,
  /\bLaufs\b/i,
  /\bLäufe(n)?\b/i,
  /\bLäufer(in)?(nen)?\b/i,
  /\bLaufen\b/i,
  /\bLauf-/i,
  /\bruns?\b/i, // en
  /\brunners?\b/i,
  /\brunning\b/i,
  // « à pied » nomme la course à pied aussi sûrement que « course » : sans
  // cette famille, une phrase « à pied comme à vélo » se lirait « vélo seul »
  // et le garde-fou signalerait comme fautive la neutralisation la plus
  // explicite qui soit.
  //
  // ⚠️ BORNES UNICODE, PAS `\b` : `\b` est ASCII en JavaScript, et « à », « ß »
  // ou « é » n'y sont PAS des caractères de mot — `/\bà pied\b/` ne matche
  // donc JAMAIS « , à pied comme… », et `/\bzu Fuß\b/` jamais « zu Fuß wie… ».
  // Le piège est silencieux : le garde-fou aurait juste laissé passer.
  /(?<!\p{L})à pied(?!\p{L})/iu,
  /(?<!\p{L})on foot(?!\p{L})/iu,
  /(?<!\p{L})a pie(?!\p{L})/iu,
  /(?<!\p{L})zu Fuß(?!\p{L})/iu,
  /(?<!\p{L})a pé(?!\p{L})/iu,
];

/** Mots qui désignent le VÉLO dans les 5 langues (symétrique, même exigence). */
const MOTS_VELO: readonly RegExp[] = [
  /\bvélos?\b/i,
  /\bbikes?\b/i,
  /\bbicis?\b/i,
  /\bcyclistes?\b/i,
  /\bcycling\b/i,
  /\brides?\b/i,
  // Même exigence de casse qu'au-dessus : « MEIN GEBIET · RAD » est en
  // capitales sur la planche E15.
  /\bRad\b/i,
  /\bRad-/i,
  // L'allemand compose : « Radtour », « Radausfahrt », « Fahrrad » sont des
  // MOTS, pas « Rad » suivi d'autre chose — `\bRad\b` les rate tous. On les
  // nomme un par un plutôt que d'ouvrir un `\bRad\w*` qui attraperait « Radio ».
  /\bRadtour(en)?\b/i,
  /\bRadausfahrt(en)?\b/i,
  /\bRadfahr(en|er|erin|erinnen)\b/i,
  /\bFahrrad\w*/i,
  /\bAusfahrt(en)?\b/i,
  /\bpedal(ada|adas)?\b/i,
];

/** Ce que le texte nomme : rien, une seule discipline, ou les deux. */
export type PorteeDiscipline = 'neutre' | 'course' | 'velo' | 'les-deux';

/**
 * PURE. Rend la portée nommée par un texte, faux amis retirés.
 *
 * `'les-deux'` n'est PAS une faute : c'est la formulation d'un texte qui
 * couvre explicitement les deux mondes (« à pied comme à vélo »), donc la
 * neutralisation la plus honnête qui soit quand il faut être concret.
 */
export function porteeDuTexte(texte: string): PorteeDiscipline {
  const propre = texte.replace(FAUX_AMIS, ' ');
  const course = MOTS_COURSE.some((rx) => rx.test(propre));
  const velo = MOTS_VELO.some((rx) => rx.test(propre));
  if (course && velo) return 'les-deux';
  if (course) return 'course';
  if (velo) return 'velo';
  return 'neutre';
}

/** Entrée i18n vue comme une simple table langue → texte (aucun import de type
 *  React ni du catalogue : ce module reste utilisable par n'importe quel test). */
export type TableLangues = Readonly<Record<string, string>>;

/**
 * PURE. Clés d'un catalogue dont AU MOINS UNE langue nomme UNE SEULE
 * discipline. Triées, pour que l'écart affiché par un test soit stable et
 * lisible d'un run à l'autre.
 *
 * On ne signale PAS `'les-deux'` : un texte qui nomme les deux mondes ne peut
 * exclure personne.
 */
export function clesQuiNommentUneDiscipline(
  catalogue: Readonly<Record<string, TableLangues>>,
): readonly string[] {
  return Object.entries(catalogue)
    .filter(([, entree]) =>
      Object.values(entree).some((texte) => {
        const portee = porteeDuTexte(texte);
        return portee === 'course' || portee === 'velo';
      }),
    )
    .map(([cle]) => cle)
    .sort();
}
