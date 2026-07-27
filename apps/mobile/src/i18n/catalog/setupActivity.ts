/**
 * GRYD — i18n : catalogue de l'écran E09 « Choix d'activité initial »
 * (`/setup/activity`).
 *
 * Spec produit UI/UX complète, l.785 : « Choisir le contexte affiché au premier
 * lancement, sans enfermer l'utilisateur. » Deux grandes lignes — `Course à
 * pied`, `Vélo` — une seule sélection, et la phrase « Vous pourrez changer à
 * tout moment. » La logique : « Ce choix ne mélange jamais les données. Il
 * initialise seulement le filtre. »
 *
 * ─── REGISTRE ───────────────────────────────────────────────────────────────
 * Tutoiement fr (la spec vouvoie ici mot pour mot : « Vous pourrez changer » →
 * `changeAnytime` tutoie, c'est le registre du produit qui gagne), « tú » es,
 * « du » de, « você » pt-BR (jamais teu/tua).
 *
 * ─── CE QU'ON A LE DROIT DE PROMETTRE, ET CE QU'ON NE DIT PAS ───────────────
 * La spec écrit « ne mélange JAMAIS les données ». Le code ne tient pas encore
 * cette phrase-là en entier, donc la copie ne la reprend pas en entier :
 *   · VRAI aujourd'hui — les ZONES sont filtrées par discipline
 *     (`features/map/hexClaims.ts:283-288`, `.eq('activity', activity)`) et
 *     l'HISTORIQUE aussi (`features/history/real.ts:218`, requête `runs` bornée
 *     par `.eq('activity', …)`). `separateNote` ne parle donc que de zones.
 *   · PAS ENCORE VRAI — `user_stats` (~60 colonnes) et la vue
 *     `specialty_leaderboard` restent MONO-POT : une sortie vélo y compte comme
 *     une course (game-rules.ts, bloc « CE QUI RESTE EN SUSPENS », point 4).
 *     Aucune entrée de ce catalogue ne promet donc des stats ou un classement
 *     séparés. Le jour où ils le seront, `separateNote` pourra s'agrandir — pas
 *     avant (« une doc ne promet jamais au-delà du code », et une copie d'écran
 *     est une promesse comme une autre).
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ─── Entête ────────────────────────────────────────────────────────────────
  kicker: {
    fr: 'POUR COMMENCER',
    en: 'TO START',
    es: 'PARA EMPEZAR',
    de: 'ZUM START',
    pt: 'PARA COMEÇAR',
  },
  title: {
    fr: 'Tu commences par quoi ?',
    en: 'What are you starting with?',
    es: '¿Con qué empiezas?',
    de: 'Womit fängst du an?',
    pt: 'Você começa com o quê?',
  },
  /**
   * Ce que le choix FAIT réellement : régler un affichage, rien de plus.
   *
   * Il dit « l'app » et non « la carte » parce que l'écran sème les QUATRE
   * lentilles E14 (`ACTIVITY_SURFACES` : carte, classement, historique, stats)
   * — cf. `app/setup/activity.tsx`. Nommer la seule carte sous-dirait ce que le
   * code fait, et un joueur découvrirait son Classement basculé sans qu'on le
   * lui ait annoncé.
   */
  subtitle: {
    fr: 'Ça règle juste ce que l’app t’affiche en premier.',
    en: 'This only sets what the app shows you first.',
    es: 'Esto solo ajusta lo que la app te muestra primero.',
    de: 'Das legt nur fest, was dir die App zuerst zeigt.',
    pt: 'Isso só define o que o app mostra para você primeiro.',
  },

  // ─── Les deux lignes (une seule sélection) ─────────────────────────────────
  // La spec écrit « Deux grandes lignes : Course à pied · Vélo » — deux NOMS, et
  // rien d'autre. Les deux accroches de style (« Le terrain se prend en
  // foulées. »…) qu'a portées ce fichier ont été RETIRÉES : elles n'aidaient
  // aucune décision (chacun sait s'il court ou s'il roule) et ajoutaient deux
  // lignes de prose à un écran que §A veut compréhensible en moins de 3 s.
  optionRun: {
    fr: 'Course à pied',
    en: 'Running',
    es: 'Correr',
    de: 'Laufen',
    pt: 'Corrida',
  },
  optionBike: {
    fr: 'Vélo',
    en: 'Cycling',
    es: 'Bici',
    de: 'Rad',
    pt: 'Bike',
  },
  /** a11y d'une ligne — l'état sélectionné n'est jamais porté par la couleur seule. */
  optionA11ySelected: {
    fr: '{name}, sélectionné',
    en: '{name}, selected',
    es: '{name}, seleccionado',
    de: '{name}, ausgewählt',
    pt: '{name}, selecionado',
  },
  optionA11yUnselected: {
    fr: '{name}, non sélectionné',
    en: '{name}, not selected',
    es: '{name}, no seleccionado',
    de: '{name}, nicht ausgewählt',
    pt: '{name}, não selecionado',
  },

  // ─── La phrase qui déverrouille (spec, mot pour mot, tutoyée) ──────────────
  changeAnytime: {
    fr: 'Tu pourras changer à tout moment.',
    en: 'You can switch at any time.',
    es: 'Podrás cambiar en cualquier momento.',
    de: 'Du kannst jederzeit wechseln.',
    pt: 'Você pode mudar a qualquer momento.',
  },
  /**
   * « Ce choix ne mélange jamais les données » — réduit à ce que le code tient
   * RÉELLEMENT aujourd'hui : les zones (voir l'en-tête de ce fichier). Rien sur
   * les stats ni les classements, qui restent mono-pot.
   */
  separateNote: {
    fr: 'Course et vélo ne se mélangent pas : chaque discipline garde ses propres zones.',
    en: 'Running and cycling never mix: each discipline keeps its own zones.',
    es: 'Correr y bici no se mezclan: cada disciplina conserva sus propias zonas.',
    de: 'Laufen und Rad vermischen sich nie: Jede Disziplin behält ihre eigenen Zonen.',
    pt: 'Corrida e bike não se misturam: cada modalidade tem as próprias zonas.',
  },

  // ─── CTA (unique, §A4) ─────────────────────────────────────────────────────
  cta: {
    fr: 'CONTINUER',
    en: 'CONTINUE',
    es: 'CONTINUAR',
    de: 'WEITER',
    pt: 'CONTINUAR',
  },
  /**
   * Le CTA reste INERTE tant que rien n'est choisi — il ne se peint donc jamais
   * en action qui échoue (constitution §2). Cette ligne dit pourquoi, plutôt que
   * de laisser un bouton gris muet.
   */
  ctaDisabledHint: {
    fr: 'Choisis une ligne pour continuer.',
    en: 'Pick a row to continue.',
    es: 'Elige una fila para continuar.',
    de: 'Wähl eine Zeile, um weiterzugehen.',
    pt: 'Escolha uma linha para continuar.',
  },
});
