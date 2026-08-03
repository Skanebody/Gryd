/**
 * GRYD — LE REGISTRE DES HÔTES QUE LE BINAIRE CONTACTE, ET CE QUE LA POLITIQUE
 * DOIT EN DIRE. Module PUR (aucun import React / React Native) — Deno-testable.
 *
 * ─── POURQUOI CE FICHIER EXISTE ───────────────────────────────────────────────
 * En trois jours, la politique de confidentialité embarquée a dû être rattrapée
 * TROIS fois, toujours pour la même raison : un appel réseau existait dans le
 * code sans figurer dans la liste des destinataires, alors que cette liste se
 * présente comme LIMITATIVE.
 *   · 27/07 (1ʳᵉ passe) — OpenStreetMap / Nominatim (noms de lieux) ;
 *   · 27/07 (2ᵉ passe)  — OSRM / FOSSGIS e.V. (calcul d'itinéraires) ;
 *   · 27/07 (3ᵉ passe)  — CARTO, Esri, OpenMapTiles et AWS (fonds de carte),
 *     c'est-à-dire les hôtes appelés à CHAQUE carte affichée, donc les plus
 *     sollicités de toute l'app.
 * Trois rattrapages successifs ne sont pas trois inattentions : c'est la preuve
 * qu'une liste tenue à la main dérive. Un document RGPD qui omet un destinataire
 * est un faux au même titre qu'une donnée fabriquée à l'écran — sauf qu'il
 * engage l'éditeur. Le registre ci-dessous existe pour que la dérive CASSE la
 * suite de tests au lieu de passer.
 *
 * ─── CE QUE LE REGISTRE N'EST PAS ─────────────────────────────────────────────
 * Ce n'est pas une allow-list de sécurité : il n'intercepte aucune requête et
 * n'empêche rien à l'exécution. C'est une DÉCLARATION relue par le test, qui
 * compare deux choses que personne ne comparait :
 *   (1) les hôtes littéralement écrits dans `apps/mobile/{src,app}` ;
 *   (2) les destinataires nommés dans la politique embarquée.
 *
 * ─── AUCUNE VALEUR DE JEU ICI ─────────────────────────────────────────────────
 * Que des noms d'hôtes et de la qualification juridique — rien qui décide d'un
 * claim, d'un point ou d'une couleur.
 */

/**
 * Ce qu'un hôte est, du point de vue de la politique de confidentialité. La
 * distinction n'est pas cosmétique : elle décide de ce que le test EXIGE.
 */
export type HostKind =
  /**
   * Destinataire de données lors du fonctionnement normal : il DOIT être nommé
   * dans la politique (§ « Partage & sous-traitants »).
   */
  | 'recipient'
  /** Notre propre domaine (liens de partage, invitations) — pas un tiers. */
  | 'own'
  /**
   * Ouvert par le joueur, dans le navigateur ou l'app cible, à SON initiative
   * (feuille de partage, fiche App Store). Rien n'est envoyé sans son geste, et
   * ce qui part est ce qu'il a choisi d'envoyer.
   */
  | 'user_initiated'
  /**
   * Présent dans le code mais JAMAIS atteint par le binaire courant : la source
   * n'est pas listée dans le Hub (`features/sources/catalog.ts`, périmètre 5),
   * donc aucun écran ne peut déclencher l'appel. À re-qualifier en `recipient`
   * le jour où la source est re-listée — et la politique avec.
   */
  | 'dormant'
  /** Boucle locale (dev/preview) — ne sort pas de l'appareil. */
  | 'local'
  /** Domaine d'exemple réservé (RFC 2606), utilisé en copie/documentation. */
  | 'placeholder';

export interface ExternalHost {
  /** Hôte tel qu'il apparaît dans une URL du code (sans schéma ni chemin). */
  host: string;
  kind: HostKind;
  /**
   * Mot que la politique DOIT contenir pour que ce destinataire soit nommé.
   * Obligatoire si — et seulement si — `kind === 'recipient'`.
   */
  policyName?: string;
  /** Où l'appel part, et pourquoi. Cité fichier par fichier, pas de mémoire. */
  why: string;
}

/**
 * Les hôtes écrits dans `apps/mobile/{src,app}` hors fichiers de test, relevés
 * le 27/07/2026 et tenus par `networkHosts.test.ts`.
 */
export const EXTERNAL_HOSTS: readonly ExternalHost[] = [
  // ── Destinataires : à nommer dans la politique ──────────────────────────────
  {
    host: 'eu.i.posthog.com',
    kind: 'recipient',
    policyName: 'PostHog',
    why: 'Mesure d’audience produit (lib/analytics) — instance UE.',
  },
  {
    host: 'accounts.google.com',
    kind: 'recipient',
    policyName: 'Google',
    why: 'Sign in with Google (lib/auth) — seulement si le joueur choisit ce fournisseur.',
  },
  {
    host: 'nominatim.openstreetmap.org',
    kind: 'recipient',
    policyName: 'Nominatim',
    why: 'Noms de lieux : features/route/geocode.ts, features/map/sectorNaming.ts, features/run/safety/country.ts.',
  },
  {
    host: 'routing.openstreetmap.de',
    kind: 'recipient',
    policyName: 'OSRM',
    why: 'Calcul d’itinéraires (features/route/liveRouting.ts) — origine arrondie à ~110 m.',
  },
  {
    host: 'tiles.basemaps.cartocdn.com',
    kind: 'recipient',
    policyName: 'CARTO',
    why: 'Fond « nuit » embarqué : TileJSON + glyphes (mvp/map/nightStyle.ts:62 et :70). Chargé dès la première carte.',
  },
  {
    host: 'basemaps.cartocdn.com',
    kind: 'recipient',
    policyName: 'CARTO',
    why: 'Styles distants « nuit » (référence) et « couleur » (features/map/mapStyle.ts:62-63).',
  },
  {
    host: 'server.arcgisonline.com',
    kind: 'recipient',
    policyName: 'Esri',
    why: 'Raster World Imagery du fond satellite (features/map/mapStyle.ts:93) — seulement si le joueur l’active.',
  },
  {
    host: 'fonts.openmaptiles.org',
    kind: 'recipient',
    policyName: 'OpenMapTiles',
    why: 'Glyphes du style satellite (features/map/mapStyle.ts:207).',
  },
  {
    host: 's3.amazonaws.com',
    kind: 'recipient',
    policyName: 'Amazon Web Services',
    why: 'DEM Terrarium du relief (features/map/mapStyle.ts:294) — seulement en vue 3D.',
  },

  // ── Notre domaine ───────────────────────────────────────────────────────────
  {
    host: 'gryd.run',
    kind: 'own',
    why: 'Liens de partage et d’invitation (features/crew/pendingInvite.ts, features/social/profileLink.ts).',
  },
  {
    host: 'gryd.app',
    kind: 'own',
    why: 'Second hôte d’invitation accepté — arbitrage de domaine non rendu (O10).',
  },

  // ── À l’initiative du joueur ────────────────────────────────────────────────
  {
    host: 'wa.me',
    kind: 'user_initiated',
    why: 'Destination de partage WhatsApp (features/share/shareTargets.ts) — ouverte par un tap, avec le texte que le joueur envoie.',
  },
  {
    host: 'apps.apple.com',
    kind: 'user_initiated',
    why: 'Fiche App Store ouverte depuis le partage / la notation.',
  },

  // ── Jamais atteint par ce binaire ───────────────────────────────────────────
  {
    host: 'www.strava.com',
    kind: 'dormant',
    why: 'OAuth Strava : adaptateur complet mais source NON listée dans le Hub (features/sources/catalog.ts, périmètre 5) — aucun écran ne peut le déclencher.',
  },

  // ── Ni tiers, ni réseau ─────────────────────────────────────────────────────
  {
    host: 'localhost',
    kind: 'local',
    why: 'Preview / dev — boucle locale.',
  },
  {
    host: 'exemple.invalide',
    kind: 'placeholder',
    why: 'Domaine d’exemple (RFC 2606) utilisé en copie.',
  },
];

/** Les destinataires — ceux que la politique doit nommer. */
export function recipientHosts(): readonly ExternalHost[] {
  return EXTERNAL_HOSTS.filter((h) => h.kind === 'recipient');
}

/**
 * Hôtes trouvés dans le code que le registre ne connaît pas. Le test échoue
 * dessus : ajouter un appel réseau sans passer par ici est précisément la faute
 * que ce module prévient.
 */
export function unregisteredHosts(found: readonly string[]): string[] {
  const known = new Set(EXTERNAL_HOSTS.map((h) => h.host));
  return [...new Set(found)].filter((h) => !known.has(h)).sort();
}

/**
 * Destinataires que le texte fourni ne nomme PAS. `text` = la section « Partage
 * & sous-traitants » de la politique embarquée.
 */
export function undeclaredRecipients(text: string): string[] {
  return recipientHosts()
    .filter((h) => !text.includes(h.policyName ?? ''))
    .map((h) => h.host)
    .sort();
}
