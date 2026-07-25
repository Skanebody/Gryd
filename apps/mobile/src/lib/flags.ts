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
   * FERMÉ EN DUR, et pas seulement masqué par FULL_SURFACE : contrairement à
   * Saison/War Room/Arsenal — dont les moteurs TOURNENT et n'attendent qu'un flip
   * de surface — le vélo n'existe NULLE PART sous l'écran. `runs` n'a aucune
   * colonne de type d'activité (`source` ne vaut que gps|healthkit|strava|gpx),
   * le profil de routage bike est refusé par game-rules, et aucun territoire ni
   * classement n'est séparé par discipline. Ouvrir ce drapeau ne montrerait donc
   * pas « le monde Bike » : il montrerait le monde Run sous une étiquette vélo —
   * exactement la donnée fabriquée que la charte interdit.
   *
   * Il existe pour que le commutateur ait UNE source de vérité le jour où le
   * chantier vélo (Spéc Unifiée §5.1-5.2) livrera vraiment les deux univers, et
   * pour que d'ici là chaque écran puisse écrire `flags.bike` au lieu de
   * réinventer une condition locale. Tant qu'il est faux, AUCUN commutateur
   * n'est peint : la planche E14 le dit elle-même (« visible seulement quand
   * Bike est activé » — masqué, jamais grisé).
   */
  bike: false,
} as const;
