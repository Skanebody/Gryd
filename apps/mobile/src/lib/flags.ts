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
   * Ce drapeau n'affirme PAS que le vélo est implémenté. Il dit une seule chose :
   * « la lentille Bike de la carte est offerte à l'utilisateur ». En mode Bike,
   * la Carte n'affiche AUCUN territoire, AUCUNE mission, AUCUN classement, et le
   * bouton GO se retire — parce que le vélo n'existe toujours pas sous l'écran.
   * L'univers Bike est HONNÊTEMENT VIDE et il le DIT (« Ta carte Bike commence
   * ici · GRYD ne chronomètre pas encore le vélo »), au lieu de rejouer les
   * données Run sous une étiquette vélo, ce qui serait la donnée fabriquée que
   * la charte interdit.
   *
   * CE QUI RESTE À LIVRER avant que « Bike » veuille dire un vrai univers
   * (Spéc Unifiée §5.1-5.2) — rien de tout ça n'existe aujourd'hui :
   *   1. une COLONNE D'ACTIVITÉ sur `runs` (aujourd'hui `source` ne vaut que
   *      gps|healthkit|strava|gpx : impossible de distinguer une sortie vélo) ;
   *   2. un MOTEUR vélo : profil de routage (refusé par game-rules à ce jour),
   *      seuils de vitesse/anti-abus propres au vélo, règles de capture ;
   *   3. des TERRITOIRES et des CLASSEMENTS SÉPARÉS par discipline (§ séparation
   *      stricte de la planche E14 : jamais Run + Bike dans une même lecture
   *      compétitive, jamais sommés) ;
   *   4. la propagation du commutateur aux autres surfaces de la planche
   *      (Classement E11, Historique, Statistiques E18) — la Carte est seule
   *      câblée pour l'instant.
   * Tant que ces quatre points ne sont pas livrés, tout écran qui lit
   * `flags.bike` doit rester dans la même discipline : montrer le VIDE et le
   * NOMMER, jamais un contenu de remplacement.
   */
  bike: true,
} as const;
