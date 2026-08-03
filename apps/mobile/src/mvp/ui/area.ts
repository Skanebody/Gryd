/**
 * GRYD — LE CHIFFRE HÉROS, ET SEULEMENT QUAND IL EST VRAI. PUR (lot M3).
 *
 * L12 : « un chiffre héros par écran, les m² dominent ». Ce module décide
 * comment il s'écrit — et surtout QUAND il ne s'écrit pas.
 *
 * ─── POURQUOI `null` PLUTÔT QUE « 0 » ───────────────────────────────────────
 * Un compteur à zéro se lit comme un FAIT ; or dans la plupart des cas où l'on
 * serait tenté de l'afficher, l'app ne sait rien (lecture en cours, échec,
 * backend absent). La constitution interdit le « 0 » nu pour cette raison
 * exacte. Ici, `null` remonte jusqu'à l'écran, qui sort alors une PHRASE — et
 * l'état vide devient une invitation (« Ferme ta première boucle ») au lieu
 * d'un échec mis en scène.
 *
 * ─── POURQUOI TOUJOURS DES m², JAMAIS DE km² ────────────────────────────────
 * Deux raisons, et la première suffit : L12 dit « les m² dominent ». Basculer en
 * km² au-delà du million ferait changer d'unité le chiffre le plus regardé du
 * jeu, au moment précis où le joueur commence à comparer ses semaines.
 * La seconde : un km² s'écrit avec une DÉCIMALE, donc avec un séparateur qui
 * dépend de la langue (« 1,24 » / « 1.24 »). Ce module ne connaît pas la
 * langue, et lui en donner une pour un cas rare serait payer cher un affichage
 * que le groupement des milliers rend déjà lisible : « 1 240 000 m² ».
 *
 * ─── POURQUOI PAS `Intl` ────────────────────────────────────────────────────
 * Parce que le rendu dépendrait de la locale de l'appareil ET de la version du
 * moteur JS embarqué : le même joueur pourrait voir « 12,400 » et « 12 400 »
 * selon le téléphone, et les tests passeraient ici en échouant là-bas. Le
 * groupement est donc écrit — espace fine insécable, qui ne se coupe jamais en
 * fin de ligne.
 */

/** Espace fine insécable (U+202F) — sépare les milliers sans jamais casser. */
export const FINE_ESPACE = ' ';

/**
 * Surface en m² → le chiffre héros formaté, ou `null` s'il n'y a rien de vrai
 * à afficher (pas de lecture, valeur non finie, négative, ou nulle).
 *
 * L'unité n'est PAS incluse : elle vient de l'i18n (`unitM2`) et se peint plus
 * petite à côté, comme le veut l'échelle typographique des planches.
 */
export function heroArea(areaM2: number | null): string | null {
  if (areaM2 === null || !Number.isFinite(areaM2)) return null;
  // ⚠️ L'ARRONDI D'ABORD, le test de nullité ENSUITE. Écrit dans l'autre sens
  // (`areaM2 <= 0`), une aire de 0,4 m² passait le garde-fou puis s'affichait
  // « 0 » — le zéro nu que la constitution interdit, arrivé par la porte de
  // service. Aucune surface capturable n'est aussi petite ; ce qui compte est
  // qu'aucun chemin ne mène à ce caractère-là.
  const entier = Math.round(areaM2);
  if (entier <= 0) return null;
  const chiffres = String(entier);
  let out = '';
  for (let i = 0; i < chiffres.length; i += 1) {
    // Un séparateur tous les 3 chiffres EN PARTANT DE LA DROITE.
    if (i > 0 && (chiffres.length - i) % 3 === 0) out += FINE_ESPACE;
    out += chiffres[i];
  }
  return out;
}
