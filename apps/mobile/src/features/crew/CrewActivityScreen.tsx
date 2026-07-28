/**
 * GRYD — E48 · ACTIVITÉ ET ANNONCES CREW (route `/crew-activite`).
 *
 * ══ CE QUE CET ÉCRAN EST, ET CE QU'IL NE REFAIT PAS ═══════════════════════
 * Il rend les QUATRE sections de la spéc (l.1698) en RÉUNISSANT trois lectures
 * qui existaient déjà, et une seule qui manquait :
 *   · annonces épinglées + faits du crew → `crew_activity_feed()` (0096, NEUF) ;
 *   · propositions de sortie            → `useCrewOutingContext()` (E49, 0085) ;
 *   · demandes d'aide (signaux)         → `useCrewPings()` (0051).
 * Les deux hooks existants sont RÉUTILISÉS TELS QUELS. Recopier leur logique
 * aurait créé un SECOND fil, divergeant du premier au premier changement de
 * règle — et le brief de ce chantier l'interdit explicitement.
 *
 * ══ CINQ ÉTATS DISTINCTS, JAMAIS CONFONDUS ══════════════════════════════
 *   pas connecté · lecture EN COURS · échec de lecture · SERVEUR SANS LA
 *   MIGRATION · lu et SANS CREW · lu (le fil, éventuellement VIDE).
 * Et ils valent pour LES TROIS LECTURES, signaux compris. Le 28/07/2026 la 4ᵉ
 * source y échappait : `useCrewPings` rendait `null` aussi bien sur un échec RPC
 * que sur un parse raté, sans exposer de drapeau. Un `crew_pings_feed` tombé
 * pendant qu'un fil vide répondait faisait donc afficher « Rien à afficher pour
 * l'instant » — alors qu'un signal d'aide en cours n'avait simplement pas pu
 * être lu. Le hook expose désormais `loading` et `failed` (pings.ts), et le gate
 * ci-dessous les compose comme les deux autres.
 * Les trois couples qui comptent :
 *   · « lu et vide » AFFIRME qu'il n'y a rien à montrer ; « échec » n'affirme
 *     RIEN. Les rendre pareil ferait dire à un timeout que le crew est calme.
 *   · « lu et vide » n'est pas non plus un CHARGEMENT : un spinner qui reste
 *     laisse croire que ça va arriver.
 *   · « ce serveur ne connaît pas la fonction » n'est PAS un échec réseau :
 *     réessayer n'y changera rien tant que la base n'a pas 0096.
 *
 * ══ LA BASE EST VIDE, ET C'EST L'ÉTAT LE PLUS LU AUJOURD'HUI ═════════════
 * Zéro crew, zéro course, zéro annonce (28/07/2026). L'état vide de cet écran
 * n'est donc pas un cas limite : c'est SA surface principale. Il ne fabrique
 * AUCUN message, AUCUN auteur, AUCUNE capture « pour que ça ait l'air vivant ».
 * Deux écrans de frontière crew ont été SUPPRIMÉS le 21/07/2026 pour avoir fait
 * exactement l'inverse.
 *
 * ══ C'EST DE L'UGC : LES QUATRE OBLIGATIONS D'APPLE 1.2 SONT BRANCHÉES ═══
 * Aucune n'est réécrite ici — chacune est l'EXISTANT du dépôt :
 *   · FILTRAGE   → `crew_description_refusal` (0084), appliqué par 0096 ;
 *   · SIGNALEMENT→ `PlayerModerationSheet` + `content_reports` (0029) ;
 *   · BLOCAGE    → `useBlockedPseudos` (0029) ; un auteur bloqué disparaît du
 *                  fil (décision PURE, `buildCrewActivity`) ;
 *   · RETRAIT    → `crew_announcement_remove` (0096) — l'auteur ou la direction.
 *                  Et le bouton n'est peint QUE pour eux (`canRemoveAnnouncement`,
 *                  miroir exact de la garde serveur) : il était auparavant peint
 *                  sur chaque ligne, donc mort pour tout membre simple.
 *
 * ══ §A ÉPURATION ═══════════════════════════════════════════════════════════
 * UN SEUL CTA chartreuse, et il change avec l'état : « Épingler une annonce »
 * quand on en a le droit et qu'il reste une place ; « Réessayer » dans l'état
 * d'échec, où c'est la seule décision possible ; AUCUN dans les autres. Jamais
 * de card dans une card : les sections sont des listes à plat sous un intertitre
 * mono. Aucun `numberOfLines` sur un texte d'action ou sur une annonce — une
 * annonce tronquée est une annonce mal lue (§A.9), la ligne enveloppe.
 *
 * ══ CONFIDENTIALITÉ ════════════════════════════════════════════════════════
 * Aucune heure n'est affichée sur un FAIT : le serveur tronque à l'heure et
 * diffère la publication de 60 min. L'écran n'affiche qu'un ÂGE RELATIF
 * (`relativeAge`, réutilisé d'E23) — jamais une horloge, qui laisserait croire à
 * un direct et rendrait la troncature serveur inutile.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  colors,
  fontSizes,
  iconSizes,
  radii,
  sizes,
  spacing,
} from '@klaim/shared';
import { EVENTS, screen, track } from '../../lib/analytics';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { TabScreen } from '../../ui/TabScreen';
import { useT } from '../../i18n/store';
import { useSession } from '../../lib/session';
import type { Entry } from '../../i18n/types';
import {
  ANNOUNCEMENT_PRIVACY_E,
  ANNOUNCEMENT_BLOCK_E,
  CREW_ACTIVITY_SECTION_E,
  CREW_FACT_E,
  C,
} from '../../i18n/catalog/crewActivite';
import { C as CrewC, CREW_SIGNAL_E, CREW_OUTING_OBJECTIVE_E } from '../../i18n/catalog/crew';
import { relativeAge } from '../notifications/activityFeed';
import {
  PlayerActionsButton,
  PlayerModerationSheet,
  useBlockedPseudos,
} from './PlayerModerationSheet';
import { displayedPseudo, isPseudoBlocked } from './blocklist';
import {
  announcementBlockReason,
  announcementPrivacyRefusal,
  announcementRemaining,
  buildCrewActivity,
  canRemoveAnnouncement,
  isCrewActivityEmpty,
  type AnnouncementPrivacyRefusal,
  type CrewActivityItem,
} from './crewActivity';
import {
  postAnnouncement,
  removeAnnouncement,
  useCrewActivity,
} from './crewActivityData';
import { useCrewOutingContext } from './crewOutingData';
import { useCrewPings } from './pings';

/** Ce que l'écran vient de faire, dit là où le geste a eu lieu (jamais un Alert
 *  — invisible sur Expo Web, et un accusé de réception doit rester sous l'œil). */
type Flash = { entry: Entry; vars?: Record<string, string | number> } | null;

export function CrewActivityScreen() {
  const t = useT();
  const blocked = useBlockedPseudos();
  // Mon id : la SEULE donnée qui manquait pour savoir si « Retirer » aboutira.
  // `null` tant que la session n'est pas lue — jamais un id de repli.
  const { session } = useSession();
  const myUserId = session?.user.id ?? null;

  const feed = useCrewActivity();
  const outings = useCrewOutingContext();
  // Les TROIS états du flux de signaux sont lus, pas seulement la liste : un
  // `crew_pings_feed` tombé rend `pings === null`, exactement comme « pas encore
  // lu » — sans `loading`/`failed`, l'écran peignait cet échec en « rien à
  // afficher » (constitution §1). Voir le gate composé plus bas.
  const {
    pings,
    loading: pingsLoading,
    failed: pingsFailed,
    reload: pingsReload,
  } = useCrewPings();

  const [composing, setComposing] = useState(false);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<Flash>(null);
  /** Motif PRÉCIS rendu par le serveur sur un refus de vie privée. */
  const [privacyKind, setPrivacyKind] = useState<AnnouncementPrivacyRefusal | null>(null);
  /** Pseudo visé par la feuille de modération, ou `null`. */
  const [moderating, setModerating] = useState<string | null>(null);

  useEffect(() => {
    screen('crew_activite');
  }, []);

  const isBlocked = useCallback(
    (pseudo: string | null) => (pseudo === null ? false : isPseudoBlocked(blocked, pseudo)),
    [blocked],
  );

  const groups = useMemo(
    () =>
      buildCrewActivity({
        announcements: feed.ctx?.announcements ?? [],
        outings: outings.ctx?.upcoming ?? [],
        conquests: feed.ctx?.conquests ?? [],
        pings: pings ?? [],
        isBlocked,
      }),
    [feed.ctx, outings.ctx, pings, isBlocked],
  );

  // ── L'ORDRE DES ÉTATS N'EST PAS ARBITRAIRE ────────────────────────────────
  // On répond d'abord à « qui es-tu ? », puis à « ai-je pu lire ? », et enfin
  // seulement à « qu'y a-t-il ? ». L'inverse ferait dire « rien à afficher » à
  // quelqu'un qu'on n'a même pas identifié.
  if (feed.signedOut) {
    return (
      <Shell>
        <Text style={styles.stateBody}>{t(C.signedOut)}</Text>
      </Shell>
    );
  }

  // « Lecture EN COURS » couvre LES TROIS lectures : rendre le fil pendant que
  // les sorties arrivent afficherait « aucune sortie prévue » à quelqu'un qui en
  // a une ce soir, et le rendre pendant que les signaux arrivent tairait une
  // demande d'aide en cours. « Échec partiel » n'existe pas (doctrine
  // `useActivityEvents`) — et depuis le 28/07/2026 c'est vrai des signaux aussi.
  if (feed.loading || outings.loading || pingsLoading) {
    return (
      <Shell>
        <Text style={styles.stateBody}>{t(C.loading)}</Text>
      </Shell>
    );
  }

  if (feed.unsupported) {
    return (
      <Shell>
        <Text style={styles.stateTitle}>{t(C.unsupportedTitle)}</Text>
        <Text style={styles.stateBody}>{t(C.unsupportedBody)}</Text>
      </Shell>
    );
  }

  if (feed.failed || outings.failed || pingsFailed) {
    return (
      <Shell>
        <Text style={styles.stateTitle}>{t(C.failedTitle)}</Text>
        <Text style={styles.stateBody}>{t(C.failedBody)}</Text>
        <View style={styles.ctaRow}>
          <Button
            label={t(C.retry)}
            onPress={() => {
              feed.reload();
              outings.reload();
              pingsReload();
            }}
            analyticsId="crew_activity_retry"
          />
        </View>
      </Shell>
    );
  }

  if (feed.refusal === 'no_crew' || outings.refusal === 'no_crew') {
    return (
      <Shell>
        <Text style={styles.stateTitle}>{t(C.noCrewTitle)}</Text>
        <Text style={styles.stateBody}>{t(C.noCrewBody)}</Text>
      </Shell>
    );
  }

  // Un refus qu'on n'attendait pas ici (contrat futur) : on le DIT plutôt que de
  // rendre un écran vide qui affirmerait le calme.
  if (feed.ctx === null) {
    return (
      <Shell>
        <Text style={styles.stateTitle}>{t(C.failedTitle)}</Text>
        <Text style={styles.stateBody}>{t(C.failedBody)}</Text>
      </Shell>
    );
  }

  const ctx = feed.ctx;
  const activeCount = ctx.announcements.length;
  const block = announcementBlockReason(body, {
    canPost: ctx.canPost,
    activeCount,
    maxActive: ctx.maxAnnouncements,
  });
  const remaining = announcementRemaining(body);
  /** Motif de vie privée calculé EN LOCAL (miroir exact du SQL) : il prime sur
   *  celui du serveur, qui n'arrive qu'après un aller-retour. */
  const localPrivacy = announcementPrivacyRefusal(body.trim());

  // Le CTA chartreuse UNIQUE de l'écran n'est peint que s'il peut aboutir
  // (§A4 + constitution §2) : ni sans le droit d'épingler, ni quand le crew a
  // atteint son plafond. L'absence d'un bouton n'est pas un mensonge ; un bouton
  // qui échoue toujours en est un.
  const canOpenComposer = ctx.canPost && activeCount < ctx.maxAnnouncements;

  const send = async () => {
    setBusy(true);
    setFlash(null);
    setPrivacyKind(null);
    const res = await postAnnouncement(body.trim());
    setBusy(false);
    if (res.kind === 'published') {
      feed.addAnnouncement(res.announcement);
      setBody('');
      setComposing(false);
      // Émis APRÈS le `ok` serveur, jamais sur le tap : le tap ne prouve rien.
      track(EVENTS.crewAnnouncementPosted, { duplicate: res.duplicate });
      if (res.duplicate) setFlash({ entry: C.okDuplicate });
      return;
    }
    if (res.kind === 'refused') {
      if (res.refusal === 'body_looks_like_place') {
        setPrivacyKind(res.placeKind);
        return;
      }
      if (res.refusal === 'too_many_active') {
        setFlash({ entry: C.blockTooMany, vars: { max: res.max ?? ctx.maxAnnouncements } });
        return;
      }
      if (res.refusal === 'forbidden') {
        setFlash({ entry: C.blockForbidden });
        return;
      }
      // `body_unavailable` (modération) et le reste : motif OPAQUE, doctrine
      // 0050/0084 — le détailler serait un mode d'emploi du contournement.
      setFlash({ entry: C.errUnavailable });
      return;
    }
    if (res.kind === 'unsupported') {
      setFlash({ entry: C.unsupportedBody });
      return;
    }
    // On ignore si le serveur a écrit : on n'invite PAS à republier à l'aveugle.
    setFlash({ entry: C.errSendFailed });
  };

  const drop = async (id: string) => {
    setBusy(true);
    const res = await removeAnnouncement(id);
    setBusy(false);
    if (res.kind === 'removed') {
      feed.dropAnnouncement(id);
      return;
    }
    setFlash({ entry: C.removeFailed });
  };

  const empty = isCrewActivityEmpty(groups);

  return (
    <Shell>
      {/* Le composeur — une seule question à la fois : soit on écrit, soit on lit. */}
      {composing ? (
        <View style={styles.composer}>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder={t(C.postPlaceholder)}
            placeholderTextColor={colors.gris}
            multiline
            style={styles.input}
            accessibilityLabel={t(C.postOpen)}
            editable={!busy}
          />
          <Text style={styles.hint}>
            {remaining >= 0
              ? t(C.postRemaining, { n: remaining })
              : t(C.postOver, { n: -remaining })}
          </Text>
          <Text style={styles.hint}>{t(C.postScope)}</Text>
          {/* Ce qui BLOQUE est dit avant le tap, pas après (§A4).
              ⚠ LE MOTIF PRÉCIS PRIME TOUJOURS, et il est calculable EN LOCAL :
              `announcementPrivacyRefusal` est le miroir exact du SQL, donc dire
              « retire les coordonnées » à quelqu'un qui a écrit « 12 rue X »
              serait une erreur ÉVITABLE — et un conseil faux fait corriger la
              mauvaise chose. `privacyKind` (rendu par le serveur) ne sert que
              lorsque le refus vient de lui, c'est-à-dire quand le client n'avait
              PAS anticipé. */}
          {localPrivacy !== null ? (
            <Text style={styles.blockLine}>{t(ANNOUNCEMENT_PRIVACY_E[localPrivacy])}</Text>
          ) : privacyKind !== null ? (
            <Text style={styles.blockLine}>{t(ANNOUNCEMENT_PRIVACY_E[privacyKind])}</Text>
          ) : block !== null && block !== 'empty' && block !== 'privacy' ? (
            <Text style={styles.blockLine}>
              {t(ANNOUNCEMENT_BLOCK_E[block], { max: ctx.maxAnnouncements })}
            </Text>
          ) : null}
          <View style={styles.ctaRow}>
            <Button
              label={t(C.postSubmit)}
              onPress={() => void send()}
              disabled={block !== null || busy}
              loading={busy}
              analyticsId="crew_announcement_post"
            />
          </View>
          <Pressable
            onPress={() => {
              setComposing(false);
              setBody('');
              setPrivacyKind(null);
            }}
            accessibilityRole="button"
            accessibilityLabel={t(C.postCancel)}
            style={styles.ghostRow}
          >
            <Text style={styles.ghostLabel}>{t(C.postCancel)}</Text>
          </Pressable>
        </View>
      ) : null}

      {flash !== null ? <Text style={styles.flash}>{t(flash.entry, flash.vars ?? {})}</Text> : null}

      {empty ? (
        <View style={styles.emptyBlock}>
          <Text style={styles.stateTitle}>{t(C.emptyTitle)}</Text>
          <Text style={styles.stateBody}>{t(C.emptyBody)}</Text>
        </View>
      ) : (
        groups.map((g) => (
          <View key={g.section} style={styles.section}>
            <Text style={styles.sectionLabel}>{t(CREW_ACTIVITY_SECTION_E[g.section])}</Text>
            {g.section === 'announcement' ? (
              <Text style={styles.hint}>
                {t(C.postSlots, { n: activeCount, max: ctx.maxAnnouncements })}
              </Text>
            ) : null}
            {g.items.map((item) => (
              <Row
                key={rowKey(item)}
                item={item}
                blocked={blocked}
                busy={busy}
                myUserId={myUserId}
                canPost={ctx.canPost}
                onRemove={(id) => void drop(id)}
                onModerate={setModerating}
              />
            ))}
            {g.section === 'conquest' ? (
              <Text style={styles.hint}>{t(C.factDeferredNote)}</Text>
            ) : null}
            {g.section === 'outing' ? (
              <>
                <Text style={styles.hint}>{t(C.outingNoRsvp)}</Text>
                <Pressable
                  onPress={() => router.push('/crew-sortie')}
                  accessibilityRole="link"
                  accessibilityLabel={t(C.outingSee)}
                  style={styles.ghostRow}
                >
                  <Text style={styles.linkLabel}>{t(C.outingSee)}</Text>
                  <Icon name="chevron" size={iconSizes.sm} color={colors.chartreuse} />
                </Pressable>
              </>
            ) : null}
          </View>
        ))
      )}

      {/* Le CTA chartreuse UNIQUE, en bas : la décision de l'écran. */}
      {!composing && canOpenComposer ? (
        <View style={styles.ctaRow}>
          <Button
            label={t(C.postOpen)}
            onPress={() => setComposing(true)}
            analyticsId="crew_announcement_open"
          />
        </View>
      ) : null}
      {/* Sans le droit d'épingler, on DIT pourquoi il n'y a pas de bouton —
          plutôt que de peindre un bouton condamné, ou de laisser un vide muet. */}
      {!composing && !ctx.canPost ? (
        <Text style={styles.hint}>{t(C.blockForbidden)}</Text>
      ) : null}

      <PlayerModerationSheet pseudo={moderating} onClose={() => setModerating(null)} />
    </Shell>
  );
}

/** Coquille commune : le titre est le MÊME dans tous les états (l'écran ne
 *  change pas d'identité selon ce qu'on a réussi à lire). */
function Shell({ children }: { children: React.ReactNode }) {
  const t = useT();
  return (
    <TabScreen title={t(C.title)} icon="crew">
      {children}
    </TabScreen>
  );
}

function rowKey(item: CrewActivityItem): string {
  switch (item.section) {
    case 'announcement':
      return `a:${item.announcement.id}`;
    case 'outing':
      return `o:${item.outing.id}`;
    case 'conquest':
      return `c:${item.conquest.id}`;
    default:
      return `p:${item.ping.id}`;
  }
}

interface RowProps {
  item: CrewActivityItem;
  blocked: ReadonlySet<string>;
  busy: boolean;
  /** Mon id de session, ou `null` — sert UNIQUEMENT à savoir si « Retirer »
   *  aboutirait (jamais affiché, jamais envoyé). */
  myUserId: string | null;
  /** La direction, tranchée SERVEUR (`ctx.canPost`). */
  canPost: boolean;
  onRemove: (id: string) => void;
  onModerate: (pseudo: string) => void;
}

/**
 * Une ligne du fil. Pas de card dans une card (§A) : une puce de RÔLE
 * (chartreuse — tout ce fil vient de MON crew, jamais une couleur par personne,
 * §C), le texte qui enveloppe, et l'âge relatif à droite.
 */
function Row({ item, blocked, busy, myUserId, canPost, onRemove, onModerate }: RowProps) {
  const t = useT();

  if (item.section === 'announcement') {
    const a = item.announcement;
    const pseudo = a.authorPseudo;
    // §A4 + constitution §2 : on ne peint pas un geste que le serveur refusera
    // toujours. `crew_announcement_remove` (0096 §7) n'accepte que l'auteur ou
    // la direction — un rookie voyait auparavant « Retirer » sur l'annonce de
    // son capitaine, et le bouton échouait à tous les coups.
    const mayRemove = canRemoveAnnouncement({ authorId: a.authorId, myUserId, canPost });
    return (
      <View style={styles.row}>
        <View style={styles.dot} />
        <View style={styles.rowBody}>
          {/* Pas de numberOfLines : une annonce tronquée est mal lue (§A.9). */}
          <Text style={styles.rowText}>{a.body}</Text>
          <View style={styles.metaRow}>
            {pseudo !== null ? (
              <Text style={styles.meta}>{displayedPseudo(blocked, pseudo, t(CrewC.blockedPlayerRow))}</Text>
            ) : null}
            <Text style={styles.meta}>{ageLabel(a.createdAtMs, t)}</Text>
          </View>
          {mayRemove ? (
            <Pressable
              onPress={() => onRemove(a.id)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t(C.removeAction)}
              style={styles.ghostRow}
            >
              <Text style={styles.ghostLabel}>{t(C.removeAction)}</Text>
            </Pressable>
          ) : null}
        </View>
        {/* Signalement / blocage : l'affordance EXISTANTE du dépôt, pas une
            seconde. Absente si l'auteur n'a plus de profil public. */}
        {pseudo !== null ? (
          <PlayerActionsButton name={pseudo} onPress={() => onModerate(pseudo)} />
        ) : null}
      </View>
    );
  }

  if (item.section === 'outing') {
    const o = item.outing;
    return (
      <View style={styles.row}>
        <View style={styles.dot} />
        <View style={styles.rowBody}>
          <Text style={styles.rowText}>{o.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>{t(CREW_OUTING_OBJECTIVE_E[o.objective])}</Text>
            {o.placeLabel !== null ? <Text style={styles.meta}>{o.placeLabel}</Text> : null}
          </View>
        </View>
      </View>
    );
  }

  if (item.section === 'conquest') {
    const c = item.conquest;
    const line =
      c.kind === 'boundary_completed' && c.name !== null
        ? t(C.factBoundary, { name: c.name })
        : t(CREW_FACT_E[c.kind]);
    return (
      <View style={styles.row}>
        <View style={styles.dot} />
        <View style={styles.rowBody}>
          <Text style={styles.rowText}>{line}</Text>
          <View style={styles.metaRow}>
            {c.actorPseudo !== null ? (
              <Text style={styles.meta}>
                {t(C.factBy, { pseudo: displayedPseudo(blocked, c.actorPseudo, t(CrewC.blockedPlayerRow)) })}
              </Text>
            ) : null}
            <Text style={styles.meta}>{ageLabel(c.createdAtMs, t)}</Text>
          </View>
        </View>
      </View>
    );
  }

  const p = item.ping;
  return (
    <View style={styles.row}>
      <View style={styles.dot} />
      <View style={styles.rowBody}>
        <Text style={styles.rowText}>
          {p.sectorName
            ? t(CrewC.pingLine, {
                author: displayedPseudo(blocked, p.authorPseudo, t(CrewC.blockedPlayerRow)),
                sector: p.sectorName,
                signal: t(CREW_SIGNAL_E[p.signal]),
              })
            : t(CrewC.pingLineNoSector, {
                author: displayedPseudo(blocked, p.authorPseudo, t(CrewC.blockedPlayerRow)),
                signal: t(CREW_SIGNAL_E[p.signal]),
              })}
        </Text>
        <Text style={styles.meta}>{ageLabel(p.createdAt, t)}</Text>
      </View>
      <PlayerActionsButton name={p.authorPseudo} onPress={() => onModerate(p.authorPseudo)} />
    </View>
  );
}

/**
 * ÂGE RELATIF, jamais une horloge. `relativeAge` vient d'E23 (`activityFeed.ts`,
 * pure et testée) — la réutiliser évite une seconde grammaire du temps dans
 * l'app, et surtout elle ne peut pas exposer une minute : le serveur a déjà
 * tronqué à l'heure, afficher « 18:07 » serait une précision inventée.
 */
function ageLabel(atMs: number, t: ReturnType<typeof useT>): string {
  const age = relativeAge(atMs, Date.now());
  if (age.unit === 'today') return t(C.ageToday);
  if (age.unit === 'day') return t(C.ageDays, { n: age.n });
  return t(C.ageWeeks, { n: age.n });
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm, marginBottom: spacing.lg },
  sectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 1.2,
    fontVariant: ['tabular-nums'],
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  /** Puce par RÔLE (§C) : tout ce fil vient de MON crew → chartreuse. Jamais
   *  une couleur par membre ni par crew. */
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.chartreuse,
    marginTop: 7,
  },
  rowBody: { flex: 1, gap: 2 },
  rowText: { color: colors.blanc, fontSize: fontSizes.sm, lineHeight: 20 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  meta: { color: colors.gris, fontSize: fontSizes.xs },
  hint: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 16 },
  blockLine: { color: colors.blanc, fontSize: fontSizes.xs, lineHeight: 16 },
  flash: { color: colors.blanc, fontSize: fontSizes.sm, marginBottom: spacing.md },
  stateTitle: { color: colors.blanc, fontSize: fontSizes.md, marginBottom: spacing.xs },
  stateBody: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: 20 },
  emptyBlock: { gap: spacing.xs, marginBottom: spacing.lg },
  ctaRow: { marginTop: spacing.md },
  composer: { gap: spacing.sm, marginBottom: spacing.lg },
  input: {
    minHeight: 96,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.gris,
    color: colors.blanc,
    fontSize: fontSizes.sm,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  /** Cible tactile RÉELLE (44 pt), jamais simulée par un hitSlop. */
  ghostRow: {
    minHeight: sizes.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ghostLabel: { color: colors.gris, fontSize: fontSizes.sm },
  linkLabel: { color: colors.chartreuse, fontSize: fontSizes.sm },
});
