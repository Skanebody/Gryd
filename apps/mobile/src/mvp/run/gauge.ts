/**
 * GRYD — LA JAUGE DE FERMETURE : quand parler, et quoi dire. PURE (lot M5).
 *
 * ─── LE PIÈGE QUE CE MODULE EXISTE POUR ÉVITER ──────────────────────────────
 * `loopClosureVerdict` compare le départ et le point courant. Trois secondes
 * après le GO, les deux sont confondus : l'écart vaut zéro, et le verdict dit
 * « fermée ». Affiché tel quel, GRYD annoncerait une boucle bouclée à quelqu'un
 * qui n'a pas quitté son trottoir — puis ne lui donnerait rien. C'est le
 * mensonge le plus coûteux du produit, parce qu'il arrive à TOUS les joueurs,
 * à CHAQUE course, dans les premières secondes.
 *
 * La jauge ne parle donc qu'à partir du moment où la trace est un CANDIDAT
 * crédible : au moins le périmètre minimal de la discipline. Avant ça, elle se
 * tait — et le silence est la bonne réponse, pas une lacune.
 *
 * ─── ET ELLE SE TAIT AUSSI QUAND ON EST TROP LOIN ───────────────────────────
 * Au-delà de `loopHintDistanceM`, annoncer « il te manque 2 400 m » n'aide
 * personne : le joueur n'est pas en train de refermer, il court. Une jauge qui
 * parle tout le temps ne se lit plus (L5 — cinq informations maximum).
 *
 * ─── AUCUNE DÉCISION DE JEU ─────────────────────────────────────────────────
 * Ce module dit ce que l'ÉCRAN affiche, jamais ce que le joueur obtient. Le
 * claim est décidé côté serveur, sur la trace envoyée, par la même fonction
 * `loopClosureVerdict` — copie générée, drift testé. C'est ce partage qui
 * garantit qu'un « boucle fermée » à l'écran ne sera pas démenti après coup.
 */
import { activityRules, DEFAULT_ACTIVITY, type Activity } from '@klaim/shared';
import { loopClosureVerdict, traceLengthM, type LatLngPoint } from './engine/closure';

/**
 * Ce que la jauge affiche.
 *
 *   · `silent`  — rien à dire : trace trop courte pour être une boucle, ou
 *     fermeture hors de portée d'annonce. L'écran n'affiche AUCUNE ligne.
 *   · `closed`  — la boucle se fermerait maintenant.
 *   · `almost`  — dans la bande assistée : GRYD refermera à sa place. Nommé à
 *     part de `closed` parce que le produit doit savoir ce qu'il a donné.
 *   · `missing` — ouverte, mais à portée : on annonce le manque EN MÈTRES.
 */
export type Gauge =
  | { readonly kind: 'silent' }
  | { readonly kind: 'closed' }
  | { readonly kind: 'almost' }
  | { readonly kind: 'missing'; readonly missingM: number };

const SILENCE: Gauge = { kind: 'silent' };

/**
 * État de la jauge pour la trace courante. PURE.
 *
 * `isFirstCapture` abaisse le seuil de candidature (`loopMinPerimeterFirstM`) :
 * la toute première boucle d'un joueur a le droit d'être plus courte, et la
 * jauge doit lui parler au même moment que le moteur l'accepterait. Par défaut
 * `false` — le seuil le plus HAUT, donc la jauge la plus TARDIVE. Se tromper
 * dans ce sens fait dire moins que ce qu'on pourrait ; se tromper dans l'autre
 * ferait promettre une boucle que le moteur refuserait ensuite.
 */
export function gauge(
  points: readonly LatLngPoint[],
  activity: Activity = DEFAULT_ACTIVITY,
  isFirstCapture = false,
): Gauge {
  const rules = activityRules(activity);
  const seuilM = isFirstCapture ? rules.loopMinPerimeterFirstM : rules.loopMinPerimeterM;
  // La trace doit d'abord être un CANDIDAT — voir l'en-tête.
  if (traceLengthM(points) < seuilM) return SILENCE;

  const verdict = loopClosureVerdict(points, activity);
  if (verdict.gapM === null) return SILENCE;
  if (verdict.kind === 'closed') return { kind: 'closed' };
  if (verdict.kind === 'assisted') return { kind: 'almost' };
  // Ouverte : on n'annonce le manque que si le joueur est en train de refermer.
  if (verdict.gapM > rules.loopHintDistanceM) return SILENCE;
  // `missingM` est toujours > 0 quand `kind === 'open'` avec un écart mesuré :
  // un « 0 m restants » affiché sur une boucle non accordée serait un zéro nu
  // ET un mensonge — les deux à la fois.
  return verdict.missingM > 0 ? { kind: 'missing', missingM: verdict.missingM } : SILENCE;
}
