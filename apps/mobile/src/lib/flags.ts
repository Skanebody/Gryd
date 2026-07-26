/**
 * GRYD — D8 (MVP_CHANGESET) : feature flags MINIMAUX du pilote fermé.
 *
 * Surface MVP = Carte · Crew · Profil · Run · Résultat · Partage. Tout le
 * reste (Saison/classement, Missions/War Room, Arsenal/boutique) est MASQUÉ :
 * on cache la SURFACE (onglet, liens, route), on ne casse JAMAIS les moteurs —
 * saison/points/badges continuent d'accumuler côté serveur et seront
 * ré-affichés d'un flip de flag, avec l'historique intact.
 *
 * Un seul interrupteur env (pas un système de flags distant — MVP) :
 * EXPO_PUBLIC_FULL_SURFACE=1 ré-affiche tout (tests internes, démos).
 * Lecture statique au bundle (contrainte Expo : les env EXPO_PUBLIC_* sont
 * inlinées) — pas de flip à chaud, c'est assumé pour un pilote.
 */
const FULL_SURFACE = process.env.EXPO_PUBLIC_FULL_SURFACE === '1';

/**
 * ─── LE MODE VITRINE A ÉTÉ ABANDONNÉ LE 21/07/2026 ─────────────────────────
 * Décision fondateur : « ALIGNER LA VITRINE SUR LE VRAI PRODUIT. »
 *
 * Ce fichier exportait `isShowcasePlatform`, un interrupteur qui autorisait une
 * partie de l'app à afficher des données FABRIQUÉES (territoires peints,
 * missions, rivaux, POI, villes, courses, classements). Il a été supprimé, avec
 * toutes les branches qu'il gardait — il n'existe plus AUCUNE surface de GRYD
 * qui montre une donnée inventée : ni sur l'app installée, ni sur le web, ni sur
 * localhost. La règle est « L'APP NE MENT JAMAIS » : données RÉELLES ou VIDES.
 * Une étiquette « données de démonstration » ne suffisait pas — un run fabriqué
 * affiché à la place du sien reste un run fabriqué.
 *
 * POURQUOI CE RETRAIT, ET PAS UN SIMPLE DÉFAUT À OFF : le fondateur doit pouvoir
 * VALIDER SUR LOCALHOST CE QU'IL VERRA SUR SON IPHONE. Tant qu'une vitrine
 * existait, `npx expo start --web` divergeait du natif : le fondateur prenait à
 * raison les résidus de démo pour des bugs de l'app, et la seule validation qui
 * compte — « ce que je vois sur localhost = ce que je verrai sur mon iPhone » —
 * était impossible. Les builds EAS étant bloqués par le quota Expo jusqu'au
 * 1er août, localhost est son SEUL instrument de contrôle : il doit donc être
 * fidèle, connexion comprise. Un flag « défaut OFF » aurait laissé le chemin
 * fabriqué vivant dans le bundle, donc réactivable par accident ; le supprimer
 * est ce qui rend la fidélité vérifiable.
 *
 * CONSÉQUENCE ASSUMÉE : le build mobile-web ne démontre plus rien à un visiteur
 * sans compte. Le lien PUBLIC déménage vers `apps/web` (site Next.js : waitlist,
 * abonnement, pages légales). Le build mobile-web redevient ce qu'il aurait
 * toujours dû être : l'INSTRUMENT DE PREVIEW du fondateur sur localhost.
 *
 * Ne pas réintroduire de flag de ce genre. Un écran sans donnée réelle doit
 * afficher son ÉTAT VIDE (trois cas distincts : pas connecté → invite à se
 * connecter ; connecté sans données → invite à l'action ; échec → le dit et
 * propose de réessayer), jamais un contenu de remplacement.
 */

export const flags = {
  /** Onglet Saison + classements de saison (les scores s'accumulent quand même). */
  season: FULL_SURFACE,
  /** Missions / War Room (la route (tabs)/warroom et ses liens d'entrée). */
  warRoom: FULL_SURFACE,
  /** Arsenal / boutique (skins, objets capés, GRYD Club). */
  arsenal: FULL_SURFACE,
  /**
   * Univers VÉLO (planche E14 : commutateur Run/Bike dans les en-têtes de Carte,
   * Classement, Historique et Statistiques).
   *
   * ─── OUVERT LE 25/07/2026, ET VOICI EXACTEMENT CE QUE ÇA VEUT DIRE ─────────
   * Décision fondateur : « il n'y a pas le bouton pour choisir si c'est la map
   * vélo ou la map running ». Le commutateur est donc VISIBLE sur la Carte, et
   * il bascule RÉELLEMENT (préférence `gryd.mapactivity`, cf. map/mapPref.ts).
   *
   * ─── CE QUE CE DRAPEAU VEUT DIRE DEPUIS LE 26/07/2026 ─────────────────────
   * Décision fondateur : « il faut tout brancher pour que la partie bike
   * fonctionne dès maintenant […] il faut avoir sa propre data, ses propres
   * classements etc ». Le vélo est une DISCIPLINE RÉELLE : `runs.activity`,
   * `hex_claims (h3index, activity)` et `season_scores (season_id, user_id,
   * activity)` existent en base (migration 0070, appliquée le 25/07), les
   * bornes anti-triche sont par discipline, et les lectures clientes portent
   * `.eq('activity', …)`.
   *
   * Ce drapeau ouvre donc la LENTILLE (le commutateur E14 est offert), et la
   * lentille borne de VRAIES lectures : couches de carte, mission, historique,
   * statistiques et classement montrent chacun le monde choisi. Le bouton GO
   * existe dans les deux mondes et DÉCLARE ce qu'il lance
   * (`START_ACTIVITY_PARAM`).
   *
   * Ce commentaire affirmait l'inverse jusqu'au matin du 26/07 (« en mode Bike,
   * la Carte n'affiche AUCUN territoire […] GRYD ne chronomètre pas encore le
   * vélo »). C'était exact la veille. Le garder aurait été le mensonge
   * symétrique : une doc qui NIE ce que le code tient est la même faute qu'une
   * doc qui promet au-delà de lui.
   *
   * IL NE DÉCIDE TOUJOURS AUCUNE DISCIPLINE D'ENREGISTREMENT : une préférence
   * d'affichage ne décide jamais EN SILENCE de la nature d'un effort (voir
   * ci-dessous).
   *
   * ─── CE QUE CE DRAPEAU A FAILLI COÛTER (correctif du 25/07/2026) ───────────
   * Il a été ouvert alors que `features/run/gps/runActivity.ts` DÉRIVAIT la
   * discipline d'une SORTIE de cette même préférence de carte. Un joueur ayant
   * laissé sa carte en lentille Bike (« choix mémorisé ») et lançant une course
   * depuis le PLANIFICATEUR — chemin qui ne passe pas par le GO retiré de la
   * Carte — voyait sa vraie course à pied nettoyée aux bornes du vélo (80 km/h
   * par point au lieu de 25), déclarée `bike` au serveur, et écrite dans un
   * univers de territoire que la lentille Run n'affiche jamais : « 0 zone »
   * après une VRAIE course. La dérivation est SUPPRIMÉE. Une préférence
   * d'AFFICHAGE ne décide jamais de la NATURE d'un effort enregistré : la
   * discipline est désormais DÉCLARÉE par le chemin qui lance la course
   * (`PreflightApi.confirmStart(activity)`, paramètre obligatoire), et tous les
   * chemins déclarent `run` tant que les quatre chantiers ci-dessous manquent.
   *
   * LES QUATRE CHANTIERS QUI MANQUAIENT SONT LIVRÉS : colonne `runs.activity`
   * (1), moteur et routage par discipline (2), territoires et classements
   * séparés (3), commutateur propagé aux quatre surfaces E14 (4).
   *
   * CE QUI RESTE OUVERT, ET QU'AUCUN ÉCRAN NE DOIT MASQUER :
   *   · `sector_snapshot` n'est PAS discipliné (PK `sector_id` seul, 0037,
   *     alimenté par des vues non disciplinées) : les secteurs ne sont peints
   *     que sous la lentille par défaut (`competitiveReadAllowed`) ;
   *   · `specialty_leaderboard` et `user_badges` s'appuient sur `user_stats`,
   *     MONO-POT : mêmes bornes.
   * Sur ces deux points, la règle d'avant tient toujours : montrer le VIDE et
   * le NOMMER, jamais un contenu de remplacement.
   *
   * CE QUI A ÉTÉ REFERMÉ, ET QUE CE COMMENTAIRE DÉCLARAIT ENCORE OUVERT : le
   * planificateur d'itinéraire ne code PLUS le profil piéton en dur. Il dérive
   * son instance OSRM de `plannerRoutingProfile(activity)`
   * (`features/route/liveRouting.ts`) et ses bornes de `plannerBounds(activity)`.
   * « MA ROUTE » n'est donc plus retiré en lentille vélo : le Classement pousse
   * `plannerHref(activity)`, et la discipline voyage jusqu'au planificateur.
   * Un avertissement qui survit à sa cause use la confiance dans les
   * avertissements vrais — les deux ci-dessus — exactement comme une donnée
   * fabriquée.
   */
  bike: true,
} as const;
