/**
 * GRYD — CATALOGUE DE LA PAGE PARAMÈTRES (source unique de la liste ET des
 * titres de sous-pages).
 *
 * ─── ORDRE DE COMPOSITION ─────────────────────────────────────────────────────
 *   1. COMPTE     — qui je suis, et qui me voit ;
 *   2. JEU        — ce que GRYD fait pendant et autour d'une course ;
 *   3. AIDE & APP — comprendre, changer de langue, savoir ce qu'on utilise.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ─────────────────────────────────────────
 * · Les libellés en FRANÇAIS EN DUR. `label` et `detail` étaient des `string`
 *   rendues telles quelles : neuf lignes sur quinze restaient françaises en
 *   anglais, allemand ou portugais — dans le même écran où la ligne « Langue »,
 *   elle, se traduisait. Ce sont maintenant des `Entry`, résolues à l'affichage.
 * · SEPT sur-titres ramenés à TROIS. « TON COMPTE » et « DONNÉES & COMPTE »
 *   parlaient du même sujet en étant séparés par « JEU » ; « LANGUE » répétait
 *   mot pour mot le libellé de l'unique ligne qu'il coiffait. §A : un écran se
 *   comprend en moins de 3 s, et sept titres pour quinze lignes, ce n'est pas
 *   une structure — c'est du bruit.
 * · « Carte · Couche par défaut, trace » annonçait un RÉGLAGE qui n'existe pas :
 *   la sous-page n'a aucun contrôle, elle explique que la carte choisit seule.
 * · « Sources connectées · GPS, Apple Health, Strava, WHOOP… » citait quatre
 *   sources dont TROIS ne sont pas dans le Hub (retirées faute d'entitlement
 *   Apple / de compte développeur — cf. `features/sources/catalog.ts`). Une
 *   liste d'exemples est une promesse comme une autre.
 * · « Compte · E-mail, connexion, sécurité » promettait deux réglages dont les
 *   lignes n'ouvraient qu'une `Alert` « arrive très bientôt » (retirées, cf.
 *   `app/parametres/[section].tsx`).
 *
 * ─── ÉCARTS ASSUMÉS ───────────────────────────────────────────────────────────
 * · La ligne « Abonnement & achats » reste derrière `flags.arsenal` : la route
 *   `/arsenal` est masquée hors MVP (D8) et une ligne vers une route absente
 *   serait un bouton mort.
 * · Aucun nombre, aucune constante de jeu ici : ce module ne fait que de la
 *   navigation et du texte.
 */
import type { IconName } from '@klaim/shared';
import { flags } from '../../lib/flags';
import { C } from '../../i18n/catalog/reglages';
import { C as CParcours } from '../../i18n/catalog/parcours';
import type { Entry } from '../../i18n/types';

/** Slug d'une sous-page interne rendue par app/parametres/[section].tsx. */
export type SettingsSectionId =
  | 'compte'
  | 'profil'
  | 'crew'
  | 'course'
  | 'notifications'
  | 'carte'
  | 'apropos'
  | 'avance';

export interface SettingsRow {
  /** Cible : soit une sous-page interne (`section`), soit une route existante (`href`). */
  section?: SettingsSectionId;
  href?: string;
  /** Libellé — `Entry` i18n, jamais une chaîne déjà résolue (règle 17). */
  label: Entry;
  /** Une ligne = un sous-titre court, jamais un paragraphe. */
  detail: Entry;
  icon: IconName;
}

export interface SettingsGroup {
  /** Clé de rendu STABLE : le libellé est traduit, il ne peut pas servir de clé. */
  id: string;
  label: Entry;
  rows: readonly SettingsRow[];
}

/**
 * Les trois groupes de la page Paramètres, dans l'ordre d'usage. Les lignes qui
 * pointent vers l'existant (`href`) réutilisent Sources / Confidentialité /
 * Support / Mes parcours / explicabilité / Langue. Les sous-pages internes
 * (`section`) sont Compte, Profil, Crew, Course, Notifications, Carte, À propos,
 * Avancé.
 */
export const SETTINGS_GROUPS: readonly SettingsGroup[] = [
  {
    id: 'compte',
    label: C.grpCompte,
    rows: [
      { section: 'compte', label: C.rowCompte, detail: C.rowCompteDetail, icon: 'profil' },
      { section: 'profil', label: C.rowProfil, detail: C.rowProfilDetail, icon: 'ami' },
      { section: 'crew', label: C.rowCrew, detail: C.rowCrewDetail, icon: 'crew' },
      {
        href: '/confidentialite',
        label: C.rowPrivacy,
        detail: C.rowPrivacyDetail,
        icon: 'verrou',
      },
    ],
  },
  {
    id: 'jeu',
    label: C.grpJeu,
    rows: [
      // Le SLUG reste `course` (URL déjà installée, cf. `SettingsSectionId`) ;
      // le LIBELLÉ, lui, ne peut plus dire « Course » : cette sous-page règle
      // le style de jeu, les haptiques et les unités de TOUTE sortie, vélo
      // compris — et elle ne lit aucune discipline (aucun commutateur E14 ici).
      { section: 'course', label: C.rowActivite, detail: C.rowActiviteDetail, icon: 'route' },
      // Mes parcours : le seul endroit où l'on voit ce que GRYD a déduit des
      // habitudes, et où l'on coupe l'apprentissage. Une page de transparence
      // ne se cache pas derrière un autre réglage.
      { href: '/mes-parcours', label: CParcours.title, detail: CParcours.rowDetail, icon: 'route' },
      {
        section: 'notifications',
        label: C.rowNotifs,
        detail: C.rowNotifsDetail,
        icon: 'cloche',
      },
      { section: 'carte', label: C.rowCarte, detail: C.rowCarteDetail, icon: 'calques' },
      { href: '/sources', label: C.rowSources, detail: C.rowSourcesDetail, icon: 'lien' },
      // D8 : Arsenal masqué hors MVP — la ligne disparaît avec la route.
      ...(flags.arsenal
        ? [
            {
              href: '/arsenal',
              label: C.rowArsenal,
              detail: C.rowArsenalDetail,
              icon: 'boutique',
            } as const,
          ]
        : []),
    ],
  },
  {
    id: 'aide',
    label: C.grpAide,
    rows: [
      { href: '/support', label: C.rowAide, detail: C.rowAideDetail, icon: 'aide' },
      {
        href: '/calcul-zones',
        label: C.explainZonesTitle,
        detail: C.explainZonesDetail,
        icon: 'info',
      },
      { href: '/faq', label: C.explainFaqTitle, detail: C.explainFaqDetail, icon: 'aide' },
      // Langue : le réglage qui conditionne la lecture de tout le reste. Il
      // n'a plus SON sur-titre (qui répétait son propre libellé).
      { href: '/langue', label: C.langueTitle, detail: C.langueDetail, icon: 'info' },
      { section: 'apropos', label: C.rowApropos, detail: C.rowAproposDetail, icon: 'crest' },
      { section: 'avance', label: C.rowAvance, detail: C.rowAvanceDetail, icon: 'radar' },
    ],
  },
] as const;

/** Retrouve un groupe/ligne par son slug de sous-page (titre de la sous-page). */
export function settingsRowBySection(id: SettingsSectionId): SettingsRow | undefined {
  for (const group of SETTINGS_GROUPS) {
    for (const row of group.rows) {
      if (row.section === id) return row;
    }
  }
  return undefined;
}
