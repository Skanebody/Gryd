/**
 * GRYD — E49 · CRÉER UNE SORTIE CREW (route `/crew-sortie`).
 *
 * ══ CE QUE CET ÉCRAN EST, ET CE QU'IL REMPLACE ═══════════════════════════
 * Rien. La route n'existait pas. La table `crew_events` (0019) attendait
 * depuis un an SANS CHEMIN D'ÉCRITURE : `insert` révoqué pour
 * `authenticated`, aucune Edge Function, aucune RPC. Le dépôt l'avait dit
 * plutôt que peint — `CREW_OUTING_WRITE_PATH_EXISTS = false` dans game-rules,
 * `crew_outing_created` refusé dans events.ts, et un bloc `oUnavailable*` prêt
 * à afficher « publication indisponible ». La migration 0085 crée ce chemin ;
 * cet écran est son unique consommateur.
 *
 * ══ SIX ÉTATS DISTINCTS, JAMAIS CONFONDUS ═══════════════════════════════
 *   pas connecté · lecture EN COURS · échec de lecture · SERVEUR SANS LA
 *   MIGRATION · lu et SANS CREW · lu avec un crew.
 * Les deux couples qui comptent :
 *   · « lu et sans crew » AFFIRME que le joueur n'est dans aucun crew ;
 *     « échec » n'affirme rien du tout. Les rendre pareil ferait dire à un
 *     timeout que le joueur n'a pas de crew.
 *   · « ce serveur ne connaît pas la fonction » n'est PAS un échec réseau :
 *     réessayer n'y changera rien tant que la base n'a pas 0085. Le dire évite
 *     de faire tourner quelqu'un en rond sur un bouton « Réessayer ».
 * Un septième cas se distingue à l'écriture : « je n'ai pas pu envoyer » ne dit
 * PAS « ça n'a pas marché » — on ignore si le serveur a écrit, donc on invite à
 * rouvrir l'écran plutôt qu'à republier à l'aveugle (un doublon de rendez-vous
 * ne se supprime nulle part).
 *
 * ══ CONFIDENTIALITÉ — LE VRAI SUJET DE CET ÉCRAN (constitution §7) ══════
 * Un point de rendez-vous EST une adresse, souvent le domicile de quelqu'un.
 * Le dépôt coupe déjà `SHARE_TRIM_M` (250 m) autour du départ et de l'arrivée
 * d'une trace publiée (`features/share/sharePrivacy.ts`). Ici, la même exigence
 * donne quatre décisions — dont une abstention :
 *   1. AUCUNE COORDONNÉE N'EST DEMANDÉE NI STOCKÉE. Pas de sélecteur de carte,
 *      pas de lat/lng même arrondie (0085 n'a pas de colonne pour ça). La
 *      donnée qu'on ne collecte pas est la seule qui ne fuit jamais.
 *   2. L'ÉCRAN DIT QUI VERRA QUOI, AVANT d'écrire : les membres ACTIFS du crew,
 *      personne d'autre (policy `crew_events_select_member`, 0019). C'est une
 *      garantie VÉRIFIABLE, pas une formule rassurante.
 *   3. LE LIBELLÉ QUI DÉSIGNE UNE PORTE EST REFUSÉ — adresse numérotée dans les
 *      deux ordres (« 12 rue X », « Hauptstrasse 4 ») ou vocabulaire d'entrée
 *      (digicode, interphone, étage). Le refus est ANNONCÉ à l'écran (le CTA se
 *      grise avec son motif) ET revérifié serveur (`crew_outing_place_refusal`).
 *      Les deux verdicts sont prouvés identiques (test PGlite + test Deno).
 *   4. CE QUE LA GARDE NE PROMET PAS est écrit dans `crewOuting.ts` : c'est une
 *      heuristique de forme, elle n'attrape ni « chez moi » ni un nom de
 *      résidence. La copie de l'écran ne revendique donc jamais « ton adresse
 *      est protégée » — elle dit ce qui est publié et à qui.
 *
 * ══ AUCUN BOUTON MORT (§A4) ═════════════════════════════════════════════
 *   · `canCreate` vient du SERVEUR (CREW_PERMISSIONS.createOuting) : un runner
 *     ne voit AUCUN champ, pas un formulaire grisé qui finirait en refus.
 *   · Le CTA est grisé tant que `outingBlockReason` rend un motif, et le motif
 *     s'affiche SOUS le champ concerné — jamais caché derrière le bouton.
 *   · Le plafond de sorties à venir est connu AVANT le geste : au-delà, on
 *     n'invite plus à publier, on dit pourquoi.
 * Les décisions sont PURES et testées (`features/crew/crewOuting.test.ts`).
 *
 * ══ UN SEUL CTA CHARTREUSE (§A) ═════════════════════════════════════════
 * « Publier » vit dans le `headerRight` de StackScreen — hors du ScrollView,
 * donc atteignable clavier ouvert. Tous les autres contrôles (segments,
 * chips de jour/heure) sont en `tone="surface"` : la chartreuse marque l'action
 * décisive, pas une sélection.
 *
 * ══ CE QUE CET ÉCRAN NE FAIT PAS, ET POURQUOI ═══════════════════════════
 *   · AUCUN RSVP. `crew_event_rsvps` n'a pas de chemin d'écriture : peindre
 *     « Je viens » serait un bouton mort, et afficher « 3/10 » un chiffre
 *     inventé. La liste des sorties le DIT (`oUpcomingNote`).
 *   · AUCUNE modification ni annulation d'une sortie publiée : rien côté
 *     serveur ne le permet. Inscrit en suspens plutôt que bricolé.
 *   · AUCUNE notification. Publier n'alerte personne aujourd'hui.
 */
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ACTIVITIES,
  CREW_OUTING_CAPACITY_MAX,
  CREW_OUTING_CAPACITY_MIN,
  CREW_OUTING_HORIZON_DAYS,
  CREW_OUTING_OBJECTIVES,
  CREW_OUTING_PLACE_LABEL_MAX,
  CREW_OUTING_TITLE_MAX,
  CREW_OUTING_ZONE_LABEL_MAX,
  colors,
  elevation,
  fontSizes,
  gameColors,
  radii,
  sizes,
  spacing,
  type CrewOutingObjective,
} from '@klaim/shared';
import { C } from '../src/i18n/catalog/crew';
import { useLocale, useT } from '../src/i18n/store';
import { useSession } from '../src/lib/session';
import { flags } from '../src/lib/flags';
import { EVENTS, track } from '../src/lib/analytics';
import { StackScreen } from '../src/ui/StackScreen';
import { Button } from '../src/ui/Button';
import { Segmented } from '../src/ui/game/Segmented';
import {
  OUTING_MINUTE_STEPS,
  emptyOutingDraft,
  outingBlockReason,
  outingLeadHours,
  outingPayloadOf,
  outingStartsAtMs,
  type CrewOuting,
  type OutingBlock,
  type OutingDraft,
} from '../src/features/crew/crewOuting';
import { publishOuting, useCrewOutingContext } from '../src/features/crew/crewOutingData';

/**
 * Profondeur du sélecteur de jour, en jours.
 *
 * CE N'EST PAS `CREW_OUTING_HORIZON_DAYS` (90) : celui-là est la RÈGLE (ce que
 * le serveur accepte), celui-ci est un choix d'ERGONOMIE (ce qu'on fait défiler
 * au doigt). Quatre-vingt-dix pastilles seraient un ruban interminable pour un
 * rendez-vous qui se donne à quinze jours. Les deux ne peuvent pas diverger
 * dangereusement : `DAYS_SHOWN` est borné par la règle juste en dessous, donc
 * l'écran ne peut jamais proposer un jour que le serveur refuserait.
 */
const DAYS_SHOWN = Math.min(15, CREW_OUTING_HORIZON_DAYS);
/** Heures proposées : la journée entière, en strip défilant. */
const HOURS = Array.from({ length: 24 }, (_, h) => h);

export default function CrewOutingRoute() {
  const t = useT();
  const locale = useLocale();
  const { session } = useSession();
  const { loading, failed, unsupported, refusal, ctx, reload, addOuting } = useCrewOutingContext();

  /**
   * L'instant de RÉFÉRENCE de l'écran, figé à l'ouverture.
   *
   * POURQUOI FIGÉ : « aujourd'hui » et « heure déjà passée » sont calculés à
   * partir de lui. S'il avançait à chaque rendu, un formulaire ouvert à 18 h 59
   * verrait son choix « 19 h 00 » devenir invalide sous les doigts, sans que
   * rien n'ait été touché. Le serveur reste seul juge de l'instant réel : c'est
   * lui qui refusera un rendez-vous devenu passé pendant la saisie, avec son
   * motif — et ce refus-là est honnête, contrairement à un CTA qui se grise
   * tout seul.
   */
  const [now] = useState(() => Date.now());
  /**
   * ⚠️ LA DISCIPLINE SUIT LA CAPACITÉ RÉELLE (constitution §2), pas la planche.
   * Quand `flags.bike` est FERMÉ, le vélo n'existe nulle part dans l'app :
   * proposer un segment « Vélo » serait une fausse affordance, et laisser le
   * choix ouvert imposerait un geste sans alternative. Dans cette
   * configuration-là, « course à pied » n'est pas une présélection — c'est le
   * seul monde du produit, donc un FAIT. Dès que le vélo est ouvert (le cas
   * réel aujourd'hui), rien n'est présélectionné et le choix redevient explicite.
   */
  const bikeOpen = flags.bike;
  const [draft, setDraft] = useState<OutingDraft>(() => {
    const empty = emptyOutingDraft(now);
    return bikeOpen ? empty : { ...empty, activity: 'run' };
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Champs déjà touchés : on ne crie pas « obligatoire » à l'ouverture. */
  const [touched, setTouched] = useState<{ title: boolean; place: boolean; capacity: boolean }>({
    title: false,
    place: false,
    capacity: false,
  });

  const canCreate = ctx?.canCreate === true;
  const atCap = !!ctx && ctx.upcoming.length >= ctx.maxUpcoming && ctx.maxUpcoming > 0;
  const block: OutingBlock | null = ctx ? outingBlockReason(canCreate, draft, now) : 'forbidden';
  const publishBlocked = block !== null || saving || atCap;

  const startsAt = outingStartsAtMs(draft.when, now);

  async function onPublish() {
    const activity = draft.activity;
    if (!ctx || block !== null || atCap || !activity) return;
    setSaving(true);
    setNotice(null);
    setError(null);
    const out = await publishOuting(outingPayloadOf(draft, now));
    setSaving(false);

    if (out.kind === 'failed') {
      setError(t(C.oPublishFailed));
      return;
    }
    if (out.kind === 'unsupported') {
      setError(t(C.oUnavailableBody));
      return;
    }
    if (out.kind === 'refused') {
      setError(refusalText(out, t));
      // Un refus peut venir d'un état serveur qui a bougé (rôle retiré, plafond
      // atteint entre-temps) : on relit plutôt que de rester sur une vue périmée.
      reload();
      return;
    }
    // L'event ne part QU'APRÈS l'écriture serveur, et ne porte ni titre, ni
    // lieu, ni zone (§18 : aucun PII, et le lieu est écrit par un humain).
    track(EVENTS.crewOutingCreated, {
      activity,
      objective: draft.objective,
      hasZone: draft.zoneLabel.trim().length > 0,
      hasCapacity: draft.capacityText.trim().length > 0,
      leadH: outingLeadHours(startsAt, now),
    });
    addOuting(out.outing);
    setNotice(out.duplicate ? t(C.oPublishedDuplicate) : t(C.oPublished));
    // On repart d'un brouillon neuf : le formulaire ne doit pas ressembler à
    // « ta sortie », il doit ressembler à « la prochaine ».
    setDraft(bikeOpen ? emptyOutingDraft(now) : { ...emptyOutingDraft(now), activity: 'run' });
    setTouched({ title: false, place: false, capacity: false });
  }

  // ── Pas connecté ──────────────────────────────────────────────────────────
  if (!session) {
    return (
      <StackScreen title={t(C.oTitle)} kicker={t(C.oKicker)}>
        <View style={styles.block}>
          <Text style={styles.body}>{t(C.oSignedOut)}</Text>
        </View>
      </StackScreen>
    );
  }

  // ── Lecture EN COURS — n'affirme RIEN sur le crew ─────────────────────────
  if (loading && !ctx) {
    return (
      <StackScreen title={t(C.oTitle)} kicker={t(C.oKicker)}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.chartreuse} />
        </View>
      </StackScreen>
    );
  }

  // ── Le serveur RÉPOND, mais n'a pas la migration ──────────────────────────
  if (unsupported) {
    return (
      <StackScreen title={t(C.oTitle)} kicker={t(C.oKicker)}>
        <View style={styles.block}>
          <Text style={styles.title}>{t(C.oUnavailableTitle)}</Text>
          <Text style={styles.body}>{t(C.oUnavailableBody)}</Text>
          <Text style={styles.body}>{t(C.oUnavailableFallback)}</Text>
        </View>
      </StackScreen>
    );
  }

  // ── Échec de lecture — DISTINCT de « aucun crew » ─────────────────────────
  if (failed) {
    return (
      <StackScreen title={t(C.oTitle)} kicker={t(C.oKicker)}>
        <View style={styles.block}>
          <Text style={styles.title}>{t(C.oFailedTitle)}</Text>
          <Text style={styles.body}>{t(C.oFailedBody)}</Text>
          <View style={styles.cta}>
            <Button label={t(C.oRetry)} onPress={reload} loading={loading} />
          </View>
        </View>
      </StackScreen>
    );
  }

  // ── Lu, et le serveur AFFIRME qu'il n'y a pas de crew ─────────────────────
  if (!ctx) {
    return (
      <StackScreen title={t(C.oTitle)} kicker={t(C.oKicker)}>
        <View style={styles.block}>
          <Text style={styles.title}>{t(C.oNoCrewTitle)}</Text>
          <Text style={styles.body}>{t(C.oNoCrewBody)}</Text>
          {refusal && refusal !== 'no_crew' ? (
            <Text style={styles.body}>{t(C.oRefusedGeneric)}</Text>
          ) : null}
        </View>
      </StackScreen>
    );
  }

  return (
    <StackScreen
      title={t(C.oTitle)}
      kicker={t(C.oKicker)}
      /*
        UNIQUE CTA de l'écran, dans la barre FIXE (hors ScrollView) : il reste
        atteignable clavier ouvert. Il n'existe QUE pour qui a le droit de
        publier — un membre sans droit ne voit pas un bouton grisé, il ne voit
        pas de bouton (l'absence d'une fonction n'est pas un mensonge ; un
        contrôle qui échoue toujours en est un).
      */
      headerRight={
        canCreate ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.oPublishCta)}
            accessibilityState={{ disabled: publishBlocked, busy: saving }}
            disabled={publishBlocked}
            onPress={onPublish}
            hitSlop={8}
            style={({ pressed }) => [styles.headerCta, pressed && styles.dim]}
          >
            <Text
              style={[styles.headerCtaText, publishBlocked && styles.headerCtaOff]}
              numberOfLines={1}
            >
              {t(C.oPublishCta)}
            </Text>
          </Pressable>
        ) : undefined
      }
    >
      <Text style={styles.lead}>{t(C.oLead)}</Text>

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* ── Sans le droit : AUCUN champ peint, une explication ─────────────── */}
      {!canCreate ? (
        <View style={styles.block}>
          <Text style={styles.body}>{t(C.oNotAllowed)}</Text>
        </View>
      ) : (
        <>
          {/* Le plafond est dit AVANT le geste, pas après le refus. */}
          {atCap ? (
            <Text style={styles.invalid}>{t(C.oRefusedTooMany, { n: ctx.maxUpcoming })}</Text>
          ) : null}

          {/* ── TITRE ───────────────────────────────────────────────────── */}
          <View style={styles.field}>
            <Text style={styles.label}>{t(C.oFieldTitle)}</Text>
            <TextInput
              style={styles.input}
              value={draft.title}
              onChangeText={(title) => setDraft({ ...draft, title })}
              onBlur={() => setTouched((s) => ({ ...s, title: true }))}
              placeholder={t(C.oTitlePh)}
              placeholderTextColor={colors.gris}
              maxLength={CREW_OUTING_TITLE_MAX}
              accessibilityLabel={t(C.oFieldTitle)}
            />
            {touched.title && block === 'title_empty' ? (
              <Text style={styles.invalid}>{t(C.oBlockTitleEmpty)}</Text>
            ) : null}
            {block === 'title_too_long' ? (
              <Text style={styles.invalid}>{t(C.oBlockTooLong, { n: CREW_OUTING_TITLE_MAX })}</Text>
            ) : null}
          </View>

          {/* ── QUAND : jour, heure, minute ──────────────────────────────── */}
          <View style={styles.field}>
            <Text style={styles.label}>{t(C.oFieldWhen)}</Text>
            <Segmented
              scrollable
              tone="surface"
              accessibilityLabel={t(C.oA11yDay)}
              value={String(draft.when.dayOffset)}
              onChange={(id) =>
                setDraft({ ...draft, when: { ...draft.when, dayOffset: Number(id) } })
              }
              options={Array.from({ length: DAYS_SHOWN }, (_, i) => ({
                id: String(i),
                label: dayLabel(i, now, locale, t),
              }))}
            />
            <Segmented
              scrollable
              tone="surface"
              accessibilityLabel={t(C.oA11yHour)}
              value={String(draft.when.hour)}
              onChange={(id) => setDraft({ ...draft, when: { ...draft.when, hour: Number(id) } })}
              options={HOURS.map((h) => ({ id: String(h), label: `${pad(h)} h` }))}
            />
            <Segmented
              tone="surface"
              accessibilityLabel={t(C.oA11yMinute)}
              value={String(draft.when.minute)}
              onChange={(id) => setDraft({ ...draft, when: { ...draft.when, minute: Number(id) } })}
              options={OUTING_MINUTE_STEPS.map((m) => ({ id: String(m), label: pad(m) }))}
            />
            {/* La date composée, relue en toutes lettres : personne ne doit
                déduire « quel jour » d'une pastille sélectionnée trois lignes
                plus haut. */}
            <Text style={styles.hint}>{fullWhen(startsAt, locale)}</Text>
            {block === 'when_past' ? (
              <Text style={styles.invalid}>{t(C.oBlockWhenPast)}</Text>
            ) : null}
            {block === 'when_too_far' ? (
              <Text style={styles.invalid}>
                {t(C.oBlockWhenTooFar, { n: CREW_OUTING_HORIZON_DAYS })}
              </Text>
            ) : null}
          </View>

          {/* ── DISCIPLINE ──────────────────────────────────────────────── */}
          {bikeOpen ? (
          <View style={styles.field}>
            <Text style={styles.label}>{t(C.oFieldActivity)}</Text>
            {/* AUCUN segment n'est allumé tant que rien n'a été choisi :
                `value` ne correspond alors à aucun `id`. Présélectionner « run »
                ferait publier « course à pied » à un crew de cyclistes qui
                n'aurait rien touché (§ crewOuting.ts, `OutingDraft.activity`). */}
            <Segmented<string>
              tone="surface"
              accessibilityLabel={t(C.oFieldActivity)}
              value={draft.activity ?? ''}
              onChange={(id) =>
                setDraft({ ...draft, activity: id === 'bike' ? 'bike' : 'run' })
              }
              options={ACTIVITIES.map((id) => ({
                id: id as string,
                label: id === 'bike' ? t(C.oActivityBike) : t(C.oActivityRun),
              }))}
            />
            {block === 'activity_unset' ? (
              <Text style={styles.invalid}>{t(C.oBlockActivityUnset)}</Text>
            ) : null}
          </View>
          ) : null}

          {/* ── OBJECTIF ────────────────────────────────────────────────── */}
          <View style={styles.field}>
            <Text style={styles.label}>{t(C.oFieldObjective)}</Text>
            <Segmented
              tone="surface"
              accessibilityLabel={t(C.oFieldObjective)}
              value={draft.objective}
              onChange={(objective: CrewOutingObjective) => setDraft({ ...draft, objective })}
              options={CREW_OUTING_OBJECTIVES.map((id) => ({
                id,
                label: id === 'defense' ? t(C.oObjectiveDefense) : t(C.oObjectiveConquete),
              }))}
            />
          </View>

          {/* ── POINT DE RENDEZ-VOUS + la phrase de vie privée ──────────── */}
          <View style={styles.field}>
            <Text style={styles.label}>{t(C.oFieldPlace)}</Text>
            <Text style={styles.hint}>{t(C.oPlaceHint)}</Text>
            <TextInput
              style={styles.input}
              value={draft.placeLabel}
              onChangeText={(placeLabel) => setDraft({ ...draft, placeLabel })}
              onBlur={() => setTouched((s) => ({ ...s, place: true }))}
              placeholder={t(C.oPlacePh)}
              placeholderTextColor={colors.gris}
              maxLength={CREW_OUTING_PLACE_LABEL_MAX}
              accessibilityLabel={t(C.oFieldPlace)}
            />
            {touched.place && block === 'place_empty' ? (
              <Text style={styles.invalid}>{t(C.oBlockPlaceEmpty)}</Text>
            ) : null}
            {block === 'place_too_long' ? (
              <Text style={styles.invalid}>
                {t(C.oBlockTooLong, { n: CREW_OUTING_PLACE_LABEL_MAX })}
              </Text>
            ) : null}
            {/* Les deux motifs de vie privée s'affichent DÈS LA FRAPPE, sans
                attendre le blur : ils décrivent ce qui est en train d'être
                écrit, pas une omission. */}
            {block === 'place_street_address' ? (
              <Text style={styles.invalid}>{t(C.oBlockPlaceAddress)}</Text>
            ) : null}
            {block === 'place_door_detail' ? (
              <Text style={styles.invalid}>{t(C.oBlockPlaceDoor)}</Text>
            ) : null}
          </View>

          {/* QUI VERRA QUOI — à plat, PAS une card dans une card (§A). */}
          <View style={styles.privacy}>
            <Text style={styles.privacyTitle}>{t(C.oPrivacyTitle)}</Text>
            <Text style={styles.privacyBody}>{t(C.oPrivacyBody)}</Text>
          </View>

          {/* ── ZONE VISÉE (facultatif) ─────────────────────────────────── */}
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{t(C.oFieldZone)}</Text>
              <Text style={styles.counter}>{t(C.oOptional)}</Text>
            </View>
            <TextInput
              style={styles.input}
              value={draft.zoneLabel}
              onChangeText={(zoneLabel) => setDraft({ ...draft, zoneLabel })}
              placeholder={t(C.oZonePh)}
              placeholderTextColor={colors.gris}
              maxLength={CREW_OUTING_ZONE_LABEL_MAX}
              accessibilityLabel={t(C.oFieldZone)}
            />
            {block === 'zone_too_long' ? (
              <Text style={styles.invalid}>
                {t(C.oBlockTooLong, { n: CREW_OUTING_ZONE_LABEL_MAX })}
              </Text>
            ) : null}
          </View>

          {/* ── PLACES (facultatif, ANNONCÉES et non décomptées) ────────── */}
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{t(C.oFieldCapacity)}</Text>
              <Text style={styles.counter}>{t(C.oOptional)}</Text>
            </View>
            <TextInput
              style={styles.input}
              value={draft.capacityText}
              onChangeText={(capacityText) => setDraft({ ...draft, capacityText })}
              onBlur={() => setTouched((s) => ({ ...s, capacity: true }))}
              keyboardType="number-pad"
              placeholderTextColor={colors.gris}
              accessibilityLabel={t(C.oFieldCapacity)}
            />
            <Text style={styles.hint}>{t(C.oCapacityHint)}</Text>
            {touched.capacity && block === 'capacity_invalid' ? (
              <Text style={styles.invalid}>
                {t(C.oBlockCapacity, {
                  min: CREW_OUTING_CAPACITY_MIN,
                  max: CREW_OUTING_CAPACITY_MAX,
                })}
              </Text>
            ) : null}
          </View>
        </>
      )}

      {/* ── CE QUI EST DÉJÀ PRÉVU — la preuve que publier a un effet ────── */}
      <View style={styles.upcoming}>
        <Text style={styles.kicker}>{t(C.oUpcomingKicker)}</Text>
        {ctx.upcoming.length === 0 ? (
          <Text style={styles.body}>{t(C.oUpcomingEmpty)}</Text>
        ) : (
          <>
            {ctx.upcoming.map((o) => (
              <OutingRow key={o.id} outing={o} locale={locale} t={t} />
            ))}
            <Text style={styles.hint}>{t(C.oUpcomingNote)}</Text>
          </>
        )}
      </View>
    </StackScreen>
  );
}

/** Une sortie déjà prévue, à plat. Aucun compteur de participants (§ RSVP). */
function OutingRow({
  outing,
  locale,
  t,
}: {
  outing: CrewOuting;
  locale: string;
  t: ReturnType<typeof useT>;
}) {
  const when = outing.startsAt ? fullWhen(Date.parse(outing.startsAt), locale) : outing.whenLabel;
  const bits = [
    outing.placeLabel,
    outing.zoneLabel,
    outing.capacity !== null ? t(C.oCapacityPlaces, { n: outing.capacity }) : null,
    outing.hostPseudo ? t(C.oHostBy, { host: outing.hostPseudo }) : null,
  ].filter((x): x is string => !!x);
  return (
    <View style={styles.row}>
      {/* Pas de numberOfLines : un titre tronqué par « … » ne se reconnaît pas
          (§A.9), et cette liste n'a pas de contrainte de hauteur. */}
      <Text style={styles.rowTitle}>{outing.title}</Text>
      {when ? <Text style={styles.rowWhen}>{when}</Text> : null}
      <Text style={styles.rowMeta}>{bits.join(' · ')}</Text>
    </View>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Libellé d'une pastille de jour. « Aujourd'hui » / « Demain » sont des mots ;
 * au-delà, on rend une DATE RÉELLE, formatée dans la langue du lecteur.
 *
 * Le repli n'invente rien : si `Intl` n'est pas disponible (build sans ICU
 * complet), on tombe sur `JJ/MM`, qui reste la vraie date — jamais un
 * « jour 5 » que personne ne sait situer.
 */
function dayLabel(
  offset: number,
  nowMs: number,
  locale: string,
  t: ReturnType<typeof useT>,
): string {
  if (offset === 0) return t(C.oToday);
  if (offset === 1) return t(C.oTomorrow);
  const d = new Date(nowMs);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  try {
    return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric' }).format(d);
  } catch {
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  }
}

/** La date-heure complète, relue sous les sélecteurs. Même repli honnête. */
function fullWhen(ms: number, locale: string): string {
  const d = new Date(ms);
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}

/**
 * Motif serveur → phrase. La MODÉRATION reste volontairement vague (doctrine
 * 0050 : détailler la règle qui a mordu serait un mode d'emploi du
 * contournement). La VIE PRIVÉE, elle, est expliquée : la personne n'essaie pas
 * de contourner, elle essaie d'être utile — lui dire quoi corriger est
 * exactement ce qui la fait corriger.
 */
function refusalText(
  out: { refusal: string; placeKind: string | null; max: number | null },
  t: ReturnType<typeof useT>,
): string {
  switch (out.refusal) {
    case 'place_looks_like_address':
      return out.placeKind === 'door_detail' ? t(C.oBlockPlaceDoor) : t(C.oBlockPlaceAddress);
    case 'place_unavailable':
      return t(C.oRefusedUnavailable);
    case 'too_many_upcoming':
      return out.max !== null ? t(C.oRefusedTooMany, { n: out.max }) : t(C.oRefusedGeneric);
    case 'forbidden':
      return t(C.oNotAllowed);
    case 'starts_at_past':
      return t(C.oBlockWhenPast);
    case 'starts_at_too_far':
      return t(C.oBlockWhenTooFar, { n: CREW_OUTING_HORIZON_DAYS });
    default:
      return t(C.oRefusedGeneric);
  }
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.lg, gap: spacing.md },
  title: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '600' },
  body: { color: colors.gris, fontSize: fontSizes.md, lineHeight: 22 },
  lead: { marginTop: spacing.md, color: colors.gris, fontSize: fontSizes.sm, lineHeight: 20 },
  cta: { marginTop: spacing.sm },
  center: { marginTop: spacing.xl, alignItems: 'center' },

  notice: { marginTop: spacing.lg, color: colors.blanc, fontSize: fontSizes.sm, lineHeight: 20 },
  error: {
    marginTop: spacing.lg,
    color: gameColors.danger,
    fontSize: fontSizes.sm,
    lineHeight: 20,
  },

  // Champs à PLAT : aucune card autour, donc aucun risque de card-in-card (§A).
  field: { marginTop: spacing.lg, gap: spacing.xs },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  label: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  counter: { color: colors.gris, fontSize: fontSizes.xs },
  hint: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: 20 },
  invalid: { color: gameColors.danger, fontSize: fontSizes.sm, lineHeight: 20 },

  input: {
    backgroundColor: elevation.raised,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    color: colors.blanc,
    fontSize: fontSizes.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: sizes.touchTarget,
  },

  // Le bloc « qui verra quoi » : un filet à gauche, pas une carte — il informe,
  // il ne se manipule pas.
  privacy: {
    marginTop: spacing.lg,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.grisLigne,
    gap: spacing.xs,
  },
  privacyTitle: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  privacyBody: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: 20 },

  upcoming: { marginTop: spacing.xl, gap: spacing.sm },
  kicker: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 1.2 },
  row: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
    gap: 2,
  },
  rowTitle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '600' },
  rowWhen: { color: colors.blanc, fontSize: fontSizes.sm },
  rowMeta: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: 20 },

  headerCta: { minHeight: sizes.touchTarget, justifyContent: 'center', paddingLeft: spacing.sm },
  headerCtaText: { color: colors.chartreuse, fontSize: fontSizes.sm, fontWeight: '700' },
  headerCtaOff: { color: colors.gris },
  dim: { opacity: 0.6 },
});
