/**
 * GRYD — DEEP LINKS de partage (doc « partage social viral » §6.4). Chaque story
 * partagée porte UN lien : ouvrir GRYD sur la bonne chose (zone / crew / mission /
 * run). Objectif = acquisition (« le partage est un moteur d'acquisition »).
 *
 *   gryd://zone/republique
 *   gryd://crew/les-foulees-93
 *   gryd://mission/defend-republique
 *   gryd://run/share/<id>
 *
 * L'UI partage l'URL WEB universelle (`https://gryd.run/…`, cliquable partout,
 * rebond App Store si l'app n'est pas installée) ; le scheme natif `gryd://`
 * sert au routage in-app quand l'appareil a déjà l'app. Démo : le token vient du
 * nom (client) ; en prod le serveur émet un id de partage suivi (§8 analytics,
 * install attribution). Aucun secret, aucune valeur de jeu — juste une URL.
 */
import type { RunIntention } from '../run/intention';

/** Hôte web lisible (aligné sur invite.ts — même domaine de partage démo). */
const SHARE_HOST = 'gryd.run';
/** Scheme natif (app.json) — ouverture in-app réelle. */
const SHARE_SCHEME = 'gryd';

/** Cible d'un deep link de partage (doc §6.4). */
export type ShareLinkTarget =
  | { kind: 'zone'; slug: string }
  | { kind: 'crew'; slug: string }
  | { kind: 'mission'; slug: string }
  | { kind: 'run'; id: string };

/** Slug URL sûr (ascii minuscule, tirets) — jamais vide côté sortie. */
export function slugify(raw: string): string {
  const s = raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  return s || 'gryd';
}

/** Chemin relatif commun aux deux formes (web + natif). */
function targetPath(t: ShareLinkTarget): string {
  switch (t.kind) {
    case 'zone':
      return `zone/${slugify(t.slug)}`;
    case 'crew':
      return `crew/${slugify(t.slug)}`;
    case 'mission':
      return `mission/${slugify(t.slug)}`;
    case 'run':
      return `run/share/${slugify(t.id)}`;
  }
}

/** URL web universelle partagée dans la story/DM (`https://gryd.run/…`). */
export function buildShareLink(t: ShareLinkTarget): string {
  return `https://${SHARE_HOST}/${targetPath(t)}`;
}

/** Deep link natif équivalent (`gryd://…`) — routage in-app. */
export function buildShareDeepLink(t: ShareLinkTarget): string {
  return `${SHARE_SCHEME}://${targetPath(t)}`;
}

/**
 * Cible par défaut selon l'intention de la course + la zone/crew concernés
 * (règle §6.4 : « chaque story doit générer un lien »). Une défense → la zone
 * défendue ; une conquête → la zone prise ; un run crew/social → le crew ; à
 * défaut, le run. UN seul lien par story (§6.3 : un seul CTA).
 */
export function defaultShareTarget(args: {
  intention: RunIntention | null;
  zoneName: string;
  crewName: string;
  templateId: string;
}): ShareLinkTarget {
  const { intention, zoneName, crewName, templateId } = args;
  if (templateId === 'crew') return { kind: 'crew', slug: crewName };
  if (templateId === 'classement') return { kind: 'zone', slug: zoneName };
  if (intention === 'defense') return { kind: 'mission', slug: `defend-${zoneName}` };
  if (intention === 'conquest') return { kind: 'zone', slug: zoneName };
  return { kind: 'crew', slug: crewName };
}
