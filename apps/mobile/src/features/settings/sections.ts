/**
 * GRYD — catalogue Paramètres (AMENDEMENT-17 §CHANTIER 3). Une liste de
 * sous-pages COURTES : chaque ligne = icône + label + chevron, ouvre une
 * sous-page (ou pointe vers un écran existant). Résumé + détail : la liste
 * décide, le détail est au tap. Réglages techniques (tolérance boucle…)
 * regroupés sous « Avancé ». Vocabulaire varié (zones/frontières/routes).
 *
 * Source unique consommée par app/parametres.tsx (la liste) ET
 * app/parametres/[section].tsx (les sous-pages MVP). Aucun nombre magique de
 * jeu ici — uniquement de la navigation et du texte.
 */
import type { IconName } from '@klaim/shared';
import { flags } from '../../lib/flags';

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
  label: string;
  /** Une ligne = un sous-titre court, jamais un paragraphe. */
  detail: string;
  icon: IconName;
}

export interface SettingsGroup {
  label: string;
  rows: readonly SettingsRow[];
}

/**
 * Les groupes de la page Paramètres, dans l'ordre d'usage. Les lignes qui
 * pointent vers l'existant (`href`) réutilisent Sources / Arsenal / Support /
 * Confidentialité. Les sous-pages MVP actionnables (`section`) sont Compte,
 * Notifications, Course, À propos, Carte, Crew, Profil, Avancé.
 */
export const SETTINGS_GROUPS: readonly SettingsGroup[] = [
  {
    label: 'TON COMPTE',
    rows: [
      { section: 'compte', label: 'Compte', detail: 'E-mail, connexion, sécurité', icon: 'profil' },
      { section: 'profil', label: 'Profil', detail: 'Nom affiché, titre, avatar', icon: 'ami' },
      { section: 'crew', label: 'Crew', detail: 'Notifs crew, quitter le crew', icon: 'crew' },
    ],
  },
  {
    label: 'JEU',
    rows: [
      { section: 'course', label: 'Course', detail: 'Unités, audio, style de jeu', icon: 'route' },
      {
        section: 'notifications',
        label: 'Notifications',
        detail: 'Frontières, défenses, rivaux',
        icon: 'cloche',
      },
      { section: 'carte', label: 'Carte', detail: 'Couche par défaut, trace', icon: 'calques' },
    ],
  },
  {
    label: 'DONNÉES & COMPTE',
    rows: [
      {
        href: '/sources',
        label: 'Sources connectées',
        detail: 'GPS, Apple Health, Strava, WHOOP…',
        icon: 'lien',
      },
      // D8 : Arsenal masqué hors MVP — la ligne disparaît avec la route.
      ...(flags.arsenal
        ? [{
            href: '/arsenal',
            label: 'Abonnement & achats',
            detail: 'GRYD Club, skins, objets',
            icon: 'boutique',
          } as const]
        : []),
      {
        href: '/confidentialite',
        label: 'Confidentialité',
        detail: 'Mode privé, zones masquées, RGPD',
        icon: 'verrou',
      },
    ],
  },
  {
    label: 'AIDE',
    rows: [
      {
        href: '/support',
        label: 'Aide',
        detail: 'Course non comptée, signalement',
        icon: 'aide',
      },
      { section: 'apropos', label: 'À propos', detail: 'Version, conditions, licences', icon: 'crest' },
      { section: 'avance', label: 'Avancé', detail: 'Réglages techniques, diagnostics', icon: 'radar' },
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
