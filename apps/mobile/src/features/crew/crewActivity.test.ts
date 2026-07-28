/**
 * GRYD — E48 · ACTIVITÉ ET ANNONCES CREW : les décisions du fil, prouvées.
 *
 * Cinq familles, et chacune couvre une faute qui NE SE LIT PAS dans le code :
 *
 *   1. L'ORDRE DES SECTIONS. C'est une constante de la spéc, pas un tri. Un
 *      `sort()` global glissé un jour dans l'écran enterrerait une annonce
 *      épinglée sous la dernière capture — et personne ne verrait la
 *      régression, parce que l'écran resterait joli.
 *
 *   2. LE TRI INTERNE N'EST PAS LE MÊME PARTOUT. Les sorties se trient par
 *      PROXIMITÉ (la plus proche d'abord), tout le reste par RÉCENCE. Un tri
 *      unique « par date » mettrait en tête le rendez-vous annoncé hier pour
 *      dans trois mois et enterrerait celui de ce soir. C'est le bug le plus
 *      probable de cet écran, et le moins visible.
 *
 *   3. LA GARDE DE VIE PRIVÉE. `ANNOUNCEMENT_PRIVACY_FIXTURES` est la liste
 *      PARTAGÉE avec le serveur (le test PGlite la relit et exige le même
 *      verdict de `crew_announcement_refusal`). Ce test-ci prouve le côté
 *      client. Les deux ensemble interdisent la divergence : un écran qui
 *      accepterait « 48.8566, 2.3522 » peindrait un CTA que le serveur refuse
 *      (bouton mort), et un écran qui le refuserait alors que le serveur
 *      l'accepte laisserait croire à une protection inexistante.
 *
 *   4. « AUCUN BOUTON MORT » (§A4). `announcementBlockReason` doit refuser
 *      AVANT l'envoi ce que le serveur refusera : pas le droit, vide, trop
 *      long, lieu précis, plafond atteint.
 *
 *   5. LA LECTURE DÉFENSIVE du jsonb. Une réponse partielle ne devient JAMAIS
 *      une annonce à moitié inventée affichée à tout un crew — et un `payload`
 *      dont le serveur aurait changé la forme ne produit pas une ligne muette.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  CREW_ANNOUNCEMENT_BODY_MAX,
  CREW_ANNOUNCEMENT_MAX_ACTIVE_PER_CREW,
} from '@klaim/shared';
import {
  ANNOUNCEMENT_PRIVACY_FIXTURES,
  CREW_ACTIVITY_SECTION_ORDER,
  activityRefusalKindOf,
  activityRefusalOf,
  announcementBlockReason,
  announcementPrivacyRefusal,
  announcementRemaining,
  buildCrewActivity,
  canRemoveAnnouncement,
  isCrewActivityEmpty,
  parseCrewActivityContext,
  parseCrewAnnouncement,
  parseCrewConquest,
  type CrewActivityInputs,
  type CrewAnnouncement,
  type CrewConquest,
} from './crewActivity.ts';
import type { CrewOuting } from './crewOuting.ts';
import type { CrewPing } from './engine/crewSignals.ts';

// ─── Fabriques minimales (aucune donnée « de démonstration » : ce sont des
//     entrées de test, elles ne sont rendues nulle part) ──────────────────────

const ann = (id: string, atMs: number, pseudo: string | null = 'A'): CrewAnnouncement => ({
  id,
  body: `corps ${id}`,
  authorId: `u-${id}`,
  authorPseudo: pseudo,
  createdAtMs: atMs,
});

const conq = (id: string, atMs: number): CrewConquest => ({
  id,
  kind: 'boundary_completed',
  name: 'Boucle',
  actorPseudo: 'A',
  createdAtMs: atMs,
});

const outing = (id: string, startsAt: string | null): CrewOuting => ({
  id,
  title: `sortie ${id}`,
  startsAt,
  whenLabel: null,
  activity: 'run',
  objective: 'conquete',
  placeLabel: null,
  zoneLabel: null,
  capacity: null,
  hostPseudo: 'A',
});

const ping = (id: string, atMs: number, pseudo = 'A'): CrewPing => ({
  id,
  authorUserId: `u-${id}`,
  authorPseudo: pseudo,
  signal: 'defend_tonight',
  sectorId: null,
  sectorName: null,
  createdAt: atMs,
  expiresAt: atMs + 3_600_000,
});

const NEVER_BLOCKED = () => false;

const inputs = (over: Partial<CrewActivityInputs> = {}): CrewActivityInputs => ({
  announcements: [],
  outings: [],
  conquests: [],
  pings: [],
  isBlocked: NEVER_BLOCKED,
  ...over,
});

// ═══ 1. L'ordre des sections est une CONSTANTE ═══════════════════════════════

Deno.test('E48 — les quatre sections suivent l’ordre de la spéc, quoi qu’il arrive', () => {
  assertEquals(CREW_ACTIVITY_SECTION_ORDER, [
    'announcement',
    'outing',
    'conquest',
    'help',
  ]);

  // Alimentées dans le DÉSORDRE, et avec des instants qui inverseraient un tri
  // chronologique global : la capture est la plus récente, l'annonce la plus
  // ancienne. L'annonce reste EN TÊTE.
  const groups = buildCrewActivity(
    inputs({
      conquests: [conq('c1', 9_000)],
      pings: [ping('p1', 8_000)],
      outings: [outing('o1', new Date(7_000).toISOString())],
      announcements: [ann('a1', 1_000)],
    }),
  );
  assertEquals(
    groups.map((g) => g.section),
    ['announcement', 'outing', 'conquest', 'help'],
  );
});

Deno.test('E48 — une section sans ligne est OMISE, jamais un en-tête au-dessus du néant', () => {
  const groups = buildCrewActivity(inputs({ announcements: [ann('a1', 1_000)] }));
  assertEquals(groups.length, 1);
  assertEquals(groups[0]?.section, 'announcement');
});

Deno.test('E48 — fil entièrement vide : aucun groupe, et l’écran le saura', () => {
  const groups = buildCrewActivity(inputs());
  assertEquals(groups, []);
  assertEquals(isCrewActivityEmpty(groups), true);
  assertEquals(isCrewActivityEmpty(buildCrewActivity(inputs({ pings: [ping('p', 1)] }))), false);
});

// ═══ 2. Le tri INTERNE : récence partout, PROXIMITÉ pour les sorties ═════════

Deno.test('E48 — annonces, faits et demandes d’aide : le plus RÉCENT d’abord', () => {
  const groups = buildCrewActivity(
    inputs({
      announcements: [ann('vieille', 1_000), ann('neuve', 9_000)],
      conquests: [conq('vieux', 2_000), conq('neuf', 8_000)],
      pings: [ping('vieux', 3_000), ping('neuf', 7_000)],
    }),
  );
  const ids = groups.map((g) =>
    g.items.map((i) =>
      i.section === 'announcement'
        ? i.announcement.id
        : i.section === 'conquest'
          ? i.conquest.id
          : i.section === 'help'
            ? i.ping.id
            : '?',
    ),
  );
  assertEquals(ids, [
    ['neuve', 'vieille'],
    ['neuf', 'vieux'],
    ['neuf', 'vieux'],
  ]);
});

Deno.test('E48 — les sorties se trient par PROXIMITÉ, pas par récence de publication', () => {
  // Le piège exact : « dans 3 mois » a été publié en dernier. Un tri par
  // récence le mettrait en tête et enterrerait le rendez-vous de ce soir.
  const soir = new Date('2026-08-01T18:00:00Z').toISOString();
  const loin = new Date('2026-10-01T09:00:00Z').toISOString();
  const groups = buildCrewActivity(inputs({ outings: [outing('loin', loin), outing('soir', soir)] }));
  const ids = groups[0]?.items.map((i) => (i.section === 'outing' ? i.outing.id : '?'));
  assertEquals(ids, ['soir', 'loin']);
});

Deno.test('E48 — une sortie SANS starts_at (ligne héritée de 0019) passe en dernier, pas à la poubelle', () => {
  const soir = new Date('2026-08-01T18:00:00Z').toISOString();
  const groups = buildCrewActivity(
    inputs({ outings: [outing('herite', null), outing('soir', soir)] }),
  );
  const ids = groups[0]?.items.map((i) => (i.section === 'outing' ? i.outing.id : '?'));
  assertEquals(ids, ['soir', 'herite']);
});

// ═══ 3. Le BLOCAGE masque des PAROLES, jamais des FAITS ═════════════════════

Deno.test('E48 — un auteur bloqué disparaît des annonces ET des demandes d’aide', () => {
  const isBlocked = (p: string | null) => p === 'GENANT';
  const groups = buildCrewActivity(
    inputs({
      announcements: [ann('a1', 1_000, 'GENANT'), ann('a2', 2_000, 'OK')],
      pings: [ping('p1', 1_000, 'GENANT'), ping('p2', 2_000, 'OK')],
      isBlocked,
    }),
  );
  assertEquals(groups.length, 2);
  assertEquals(groups[0]?.items.length, 1);
  assertEquals(groups[1]?.items.length, 1);
});

Deno.test('E48 — bloquer quelqu’un ne fait PAS disparaître une capture (c’est un fait, pas une parole)', () => {
  const groups = buildCrewActivity(
    inputs({ conquests: [conq('c1', 1_000)], isBlocked: () => true }),
  );
  assertEquals(groups.length, 1);
  assertEquals(groups[0]?.section, 'conquest');
  assertEquals(groups[0]?.items.length, 1);
});

// ═══ 4. La garde de VIE PRIVÉE — liste PARTAGÉE avec le serveur ═════════════

Deno.test('E48 — ANNOUNCEMENT_PRIVACY_FIXTURES : le verdict client, cas par cas', () => {
  for (const [body, expected] of ANNOUNCEMENT_PRIVACY_FIXTURES) {
    assertEquals(
      announcementPrivacyRefusal(body),
      expected,
      `« ${body} » devait rendre ${expected ?? 'null'}`,
    );
  }
});

Deno.test('E48 — un corps VIDE n’est pas un refus de vie privée (c’est « champ obligatoire »)', () => {
  assertEquals(announcementPrivacyRefusal(''), null);
  assertEquals(announcementPrivacyRefusal('   '), null);
});

Deno.test('E48 — deux décimales ne sont PAS une position (~1 km) : une distance passe', () => {
  assertEquals(announcementPrivacyRefusal('12,50 km puis 3,25 km'), null);
  // Trois décimales de chaque côté ET un séparateur : là, c’est un point GPS.
  assertEquals(announcementPrivacyRefusal('48.8566, 2.3522'), 'coordinates');
});

// ═══ 5. « Aucun bouton mort » — ce qui empêche de publier ═══════════════════

const CTX = { canPost: true, activeCount: 0, maxActive: CREW_ANNOUNCEMENT_MAX_ACTIVE_PER_CREW };

Deno.test('E48 — sans le droit d’épingler, rien ne part (CREW_PERMISSIONS.pinMessage)', () => {
  assertEquals(announcementBlockReason('Objectif du week-end', { ...CTX, canPost: false }), 'forbidden');
});

Deno.test('E48 — vide, espaces seuls, trop long : refusés AVANT le réseau', () => {
  assertEquals(announcementBlockReason('', CTX), 'empty');
  assertEquals(announcementBlockReason('    ', CTX), 'empty');
  assertEquals(announcementBlockReason('x'.repeat(CREW_ANNOUNCEMENT_BODY_MAX), CTX), null);
  assertEquals(announcementBlockReason('x'.repeat(CREW_ANNOUNCEMENT_BODY_MAX + 1), CTX), 'too_long');
});

Deno.test('E48 — les espaces de bord ne comptent pas (même règle que le CHECK SQL)', () => {
  const juste = ` ${'x'.repeat(CREW_ANNOUNCEMENT_BODY_MAX)} `;
  assertEquals(announcementBlockReason(juste, CTX), null);
  assertEquals(announcementRemaining(juste), 0);
  assertEquals(announcementRemaining('abc'), CREW_ANNOUNCEMENT_BODY_MAX - 3);
  // NÉGATIF quand on dépasse : l'écran doit pouvoir dire « 2 de trop ».
  assertEquals(announcementRemaining('x'.repeat(CREW_ANNOUNCEMENT_BODY_MAX + 2)), -2);
});

Deno.test('E48 — un lieu précis bloque le CTA, et le plafond aussi', () => {
  assertEquals(announcementBlockReason('RDV 48.8566, 2.3522', CTX), 'privacy');
  assertEquals(
    announcementBlockReason('Objectif du week-end', { ...CTX, activeCount: CTX.maxActive }),
    'too_many',
  );
});

Deno.test('E48 — le plafond lu est celui du SERVEUR, pas la constante locale', () => {
  // Un serveur qui en accepte 5 ne doit pas être bridé à 3 par le client.
  assertEquals(
    announcementBlockReason('Objectif', { canPost: true, activeCount: 4, maxActive: 5 }),
    null,
  );
});

// ═══ 6. Lecture défensive du jsonb ═════════════════════════════════════════

Deno.test('E48 — une annonce incomplète est ÉCARTÉE, jamais complétée', () => {
  const ok = parseCrewAnnouncement({
    id: 'a1',
    body: '  Objectif  ',
    authorId: 'u1',
    authorPseudo: 'KORO',
    createdAt: '2026-07-28T10:00:00Z',
  });
  assertEquals(ok?.body, 'Objectif'); // détouré, comme le CHECK SQL
  assertEquals(ok?.authorPseudo, 'KORO');

  assertEquals(parseCrewAnnouncement(null), null);
  assertEquals(parseCrewAnnouncement({ id: 'a1', authorId: 'u1', createdAt: '2026-07-28T10:00:00Z' }), null);
  assertEquals(parseCrewAnnouncement({ id: 'a1', body: '   ', authorId: 'u1', createdAt: '2026-07-28T10:00:00Z' }), null);
  assertEquals(parseCrewAnnouncement({ id: 'a1', body: 'x', authorId: 'u1', createdAt: 'pas une date' }), null);
  // Un profil supprimé : pseudo null, mais l'annonce reste réelle et lisible.
  assertEquals(
    parseCrewAnnouncement({ id: 'a1', body: 'x', authorId: 'u1', createdAt: '2026-07-28T10:00:00Z' })
      ?.authorPseudo,
    null,
  );
});

Deno.test('E48 — un event_type inconnu de ce build ne produit PAS de ligne muette', () => {
  const base = { id: 'e1', actorPseudo: 'KORO', createdAt: '2026-07-28T10:00:00Z' };
  assertEquals(parseCrewConquest({ ...base, kind: 'boundary_completed', name: 'République' })?.name, 'République');
  assertEquals(parseCrewConquest({ ...base, kind: 'contested' })?.name, null);
  // Les huit types du CHECK que RIEN n'écrit — et tout type futur.
  assertEquals(parseCrewConquest({ ...base, kind: 'capture' }), null);
  assertEquals(parseCrewConquest({ ...base, kind: 'chest' }), null);
  assertEquals(parseCrewConquest({ ...base, kind: 42 }), null);
});

Deno.test('E48 — VIE PRIVÉE : « contesté » ne nomme JAMAIS personne', () => {
  // `ingest_run` insère 'contested' dans LES DEUX flux (attaquant ET victime)
  // avec l'id de l'ATTAQUANT (index.ts:1915-1918). Le fil du crew attaqué
  // nommait donc un joueur du crew rival, avec l'heure de sa sortie. La
  // migration 0099 coupe la fuite côté serveur ; ce parseur la coupe côté
  // client — indispensable tant que 0096/0099 ne sont pas appliquées, et contre
  // un client à jour qui parle à une base en retard.
  const base = { id: 'e1', actorPseudo: 'KORO', createdAt: '2026-07-28T10:00:00Z' };
  assertEquals(
    parseCrewConquest({ ...base, kind: 'contested' })?.actorPseudo,
    null,
    'aucun pseudo sur un fait inséré des deux côtés',
  );
  // Et l'attribution LÉGITIME survit : une boucle fermée a un auteur, dans le
  // crew qui la lit (ingest_run n'écrit ce fait que là).
  assertEquals(
    parseCrewConquest({ ...base, kind: 'boundary_completed', name: 'République' })?.actorPseudo,
    'KORO',
  );
});

// ═══ « AUCUN BOUTON MORT » — LE RETRAIT D'UNE ANNONCE ═══════════════════════
// `crew_announcement_remove` (0096 §7) refuse `forbidden` dès que l'appelant
// n'est ni l'auteur ni la direction. Le bouton « Retirer » était pourtant peint
// sur CHAQUE ligne : un rookie le voyait sur l'annonce de son capitaine, et le
// geste échouait toujours (constitution §2).
Deno.test('E48 — « Retirer » n’est peint que pour l’auteur ou la direction', () => {
  const mine = { authorId: 'moi', myUserId: 'moi', canPost: false };
  const theirs = { authorId: 'autre', myUserId: 'moi', canPost: false };

  assertEquals(canRemoveAnnouncement(mine), true, 'mon annonce, même simple membre');
  assertEquals(canRemoveAnnouncement(theirs), false, 'celle d’un autre : le serveur refusera');
  assertEquals(
    canRemoveAnnouncement({ ...theirs, canPost: true }),
    true,
    'la direction retire n’importe laquelle (même prédicat serveur que canPost)',
  );
});

Deno.test('E48 — sans identité lue, on ne promet pas un geste qu’on ne sait pas vérifier', () => {
  assertEquals(
    canRemoveAnnouncement({ authorId: 'moi', myUserId: null, canPost: false }),
    false,
    'session non lue : « c’est la mienne » n’est pas vérifiable',
  );
  assertEquals(
    canRemoveAnnouncement({ authorId: 'moi', myUserId: '', canPost: false }),
    false,
    'un id vide n’est pas un id',
  );
  assertEquals(
    canRemoveAnnouncement({ authorId: 'x', myUserId: null, canPost: true }),
    true,
    'la direction, elle, est établie SERVEUR — elle ne dépend pas de mon id',
  );
});

Deno.test('E48 — le contexte : refus, formes cassées, et plafonds de repli', () => {
  assertEquals(parseCrewActivityContext({ ok: false, reason: 'no_crew' }), null);
  assertEquals(parseCrewActivityContext({ ok: true }), null); // sans rôle : pas un contexte

  const ctx = parseCrewActivityContext({
    ok: true,
    role: 'founder',
    canPost: true,
    announcements: [
      { id: 'a1', body: 'x', authorId: 'u1', createdAt: '2026-07-28T10:00:00Z' },
      { id: 'casse' }, // écartée, sans casser la lecture des autres
    ],
    conquests: [{ id: 'e1', kind: 'contested', createdAt: '2026-07-28T09:00:00Z' }],
    maxAnnouncements: 5,
    bodyMax: 400,
  });
  assertEquals(ctx?.announcements.length, 1);
  assertEquals(ctx?.conquests.length, 1);
  assertEquals(ctx?.maxAnnouncements, 5);
  assertEquals(ctx?.bodyMax, 400);

  // Serveur plus ancien : les plafonds retombent sur les constantes locales.
  const vieux = parseCrewActivityContext({ ok: true, role: 'runner' });
  assertEquals(vieux?.canPost, false);
  assertEquals(vieux?.maxAnnouncements, CREW_ANNOUNCEMENT_MAX_ACTIVE_PER_CREW);
  assertEquals(vieux?.bodyMax, CREW_ANNOUNCEMENT_BODY_MAX);
  assertEquals(vieux?.announcements, []);
});

Deno.test('E48 — les refus serveur sont lus tels quels, et un motif inconnu n’en devient pas un', () => {
  assertEquals(activityRefusalOf({ ok: false, reason: 'too_many_active' }), 'too_many_active');
  assertEquals(activityRefusalOf({ ok: false, reason: 'body_looks_like_place' }), 'body_looks_like_place');
  assertEquals(activityRefusalOf({ ok: false, reason: 'inconnu_de_ce_build' }), null);
  assertEquals(activityRefusalOf({ ok: true }), null);
  assertEquals(activityRefusalOf(null), null);

  assertEquals(
    activityRefusalKindOf({ ok: false, reason: 'body_looks_like_place', kind: 'coordinates' }),
    'coordinates',
  );
  assertEquals(activityRefusalKindOf({ ok: false, reason: 'body_looks_like_place' }), null);
});
