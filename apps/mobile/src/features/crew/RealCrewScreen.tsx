/**
 * GRYD — CREW RÉEL (écran natif). Remplace la démo Supercell sur device : un
 * crew est RÉEL ou VIDE, jamais fabriqué (doctrine `flags.isShowcasePlatform`).
 *
 * §A épuration : 1 écran = 1 décision, 1 SEUL CTA chartreuse, pas de card-dans-
 * card, textes jamais coupés. Machine à états minimale :
 *   déconnecté → invite à se connecter (aucun mensonge, aucun crew fictif) ;
 *   sans crew  → pitch 1 ligne + « Créer mon crew » (chartreuse) + « J’ai un code » (ghost) ;
 *   création   → nom + ville (si >1) → « Créer le crew » ;
 *   rejoindre  → code {CREW_CODE_LENGTH} caractères → « Rejoindre » ;
 *   avec crew  → nom, X/CREW_MAX_MEMBERS, TERRITOIRE (zones tenues + rang ville),
 *                roster (pseudo + rôle + contribution), « Inviter » (chartreuse,
 *                vrai code via my_crew_code), « Quitter » en action discrète.
 *
 * Territoire + contributions = maillons 2 et 4 de la boucle AMENDEMENT-43 §0
 * (« je vois ce que mon crew contrôle », « ma contribution est visible »),
 * servis par crew_overview() (0044), calculé frais sur hex_claims. Trois états
 * honnêtes : donnée absente (chargement/échec) ⇒ AUCUN bloc ; crew sans hex ⇒
 * phrase explicite, pas un zéro décoré ni une aire inventée ; crew avec hexes ⇒
 * compte + rang. Le bloc reste de l'INFO : le seul CTA chartreuse est « Inviter ».
 * Erreurs du contrat RPC → messages i18n honnêtes (cooldown {days}, full, bad_code…).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  CREW_CODE_LENGTH,
  CREW_SWITCH_COOLDOWN_DAYS,
  colors,
  elevation,
  fontSizes,
  radii,
  spacing,
} from '@klaim/shared';
import { EVENTS, screen, track } from '../../lib/analytics';
import { useSession } from '../../lib/session';
import { Button } from '../../ui/Button';
import { GhostButton } from '../../ui/GhostButton';
import { TabScreen } from '../../ui/TabScreen';
import { useT } from '../../i18n/store';
import type { Entry } from '../../i18n/types';
import { C, CREW_ROLE_E } from '../../i18n/catalog/crew';
import { CrewInviteQRScreen } from './CrewInviteQRScreen';
import {
  crewCreateDecision,
  normalizeCrewCode,
  randomCrewColor,
  useRealCrew,
  type CityOption,
  type CrewRefusal,
} from './real';

/**
 * Rôle serveur (texte) → libellé localisé, ou null si la valeur est inconnue du
 * catalogue (rôle ajouté côté DB avant l'app) : on n'affiche alors RIEN plutôt
 * qu'une clé technique.
 */
function roleLabelEntry(role: string): Entry | null {
  return (CREW_ROLE_E as Readonly<Record<string, Entry | undefined>>)[role] ?? null;
}

type Mode = 'home' | 'create' | 'join' | 'invite';

interface ErrView {
  entry: Entry;
  vars?: Record<string, string | number>;
}

/** Motif de refus RPC → message i18n honnête (jamais un « réessaie » opaque quand on sait pourquoi). */
function refusalError(reason: CrewRefusal, daysLeft?: number): ErrView {
  switch (reason) {
    case 'cooldown':
      return { entry: C.rlErrCooldown, vars: { days: daysLeft ?? CREW_SWITCH_COOLDOWN_DAYS } };
    case 'full':
      return { entry: C.rlErrFull };
    case 'bad_code':
      return { entry: C.rlErrBadCode };
    case 'already_in_crew':
      return { entry: C.rlErrAlreadyInCrew };
    case 'bad_name':
      return { entry: C.rlErrBadName };
    case 'name_unavailable':
      return { entry: C.rlErrNameUnavailable };
    case 'bad_city':
      return { entry: C.rlErrBadCity };
    default:
      return { entry: C.rlErrGeneric };
  }
}

/**
 * MISSION → copie affichable (A-43 §0 maillon 3, format doctrine : une phrase +
 * le manque CONCRET + une action).
 *
 * Cette fonction ne fait QUE traduire des faits déjà dérivés (moteur pur
 * `chooseCrewMission`) : elle n'ajoute aucun chiffre, aucune urgence, aucun nom
 * de lieu. Les délais sont recalculés depuis les VRAIES échéances de la base et
 * arrondis VERS LE BAS (« dans 5 h » quand il reste 5 h 50 : sous-estimer une
 * marge est honnête, la sur-estimer ment) ; sous une heure, on le dit en toutes
 * lettres plutôt que d'afficher « 0 h ».
 *
 * Le crew adverse n'est jamais nommé : la doctrine bannit les rivaux fabriqués,
 * et exposer un vrai crew ici en ferait une cible.
 */
function missionCopy(
  m: CrewMission,
  nowMs: number,
): { title: ErrView; gap: ErrView } | { note: Entry } | null {
  const H = 3_600_000;
  switch (m.kind) {
    case 'defend': {
      const hours = Math.floor(Math.max(0, m.deadlineAt - nowMs) / H);
      const soon = hours < 1;
      return {
        title: m.sectorName
          ? { entry: C.cmDefendNamed, vars: { sector: m.sectorName } }
          : { entry: C.cmDefend },
        gap: {
          entry: m.zones === 1
            ? (soon ? C.cmDefendGapSoonOne : C.cmDefendGapOne)
            : (soon ? C.cmDefendGapSoonN : C.cmDefendGapN),
          vars: { n: m.zones, h: hours },
        },
      };
    }
    case 'reclaim': {
      const hours = Math.floor(Math.max(0, nowMs - m.lastLostAt) / H);
      // Au-delà d'un jour, « il y a 53 h » ne parle à personne.
      const useDays = hours >= 24;
      const days = Math.floor(hours / 24);
      return {
        title: m.sectorName
          ? { entry: C.cmReclaimNamed, vars: { sector: m.sectorName } }
          : { entry: C.cmReclaim },
        gap: {
          entry: m.zones === 1
            ? (useDays ? C.cmReclaimGapOneD : C.cmReclaimGapOneH)
            : (useDays ? C.cmReclaimGapND : C.cmReclaimGapNH),
          vars: { n: m.zones, h: hours, d: days },
        },
      };
    }
    case 'close_loop':
      return {
        title: m.name
          ? { entry: C.cmLoopNamed, vars: { name: m.name } }
          : { entry: C.cmLoop },
        // Mètres arrondis au plus PROCHE : c'est une distance mesurée, pas une
        // marge de sécurité — et jamais en dessous de 1 m tant qu'il en reste.
        gap: { entry: C.cmLoopGap, vars: { m: Math.max(1, Math.round(m.missingM)) } },
      };
    case 'capture':
      return {
        title: m.sectorName
          ? { entry: C.cmCaptureNamed, vars: { sector: m.sectorName } }
          : { entry: C.cmCapture },
        gap: { entry: C.cmCaptureGap, vars: { n: m.freeZones } },
      };
    case 'none':
      return { note: m.reason === 'no_data' ? C.cmNoneNoData : C.cmNoneStable };
    default:
      return null;
  }
}

export function RealCrewScreen() {
  const t = useT();
  const { configured } = useSession();
  // Les callbacks du hook sont mémoïsés (stables tant que `ready` ne change pas) :
  // on les destructure pour des deps d'effet/callback saines (l'objet `crewApi`
  // lui-même change d'identité à chaque render — jamais le mettre en dépendance).
  const {
    ready,
    loading,
    crew,
    members,
    overview,
    mission,
    memberCount,
    maxMembers,
    reload,
    createCrew,
    joinByCode,
    leaveCrew,
    fetchMyCode,
    listCities,
  } = useRealCrew({ withOverview: true });

  const [mode, setMode] = useState<Mode>('home');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [cities, setCities] = useState<CityOption[]>([]);
  const [cityId, setCityId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrView | null>(null);
  const [flash, setFlash] = useState<ErrView | null>(null);

  useEffect(() => {
    screen('crew_real');
  }, []);

  // Charge les villes à l'entrée en création (choix seulement si >1 — §A).
  useEffect(() => {
    if (mode !== 'create') return;
    let cancelled = false;
    void (async () => {
      const list = await listCities();
      if (cancelled) return;
      setCities(list);
      setCityId((prev) => prev ?? list[0]?.cityId ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, listCities]);

  const resetForms = useCallback(() => {
    setName('');
    setCode('');
    setError(null);
  }, []);

  const goHome = useCallback(() => {
    resetForms();
    setMode('home');
  }, [resetForms]);

  const onCreate = useCallback(async () => {
    if (busy || !cityId) return;
    const color = randomCrewColor();
    const pre = crewCreateDecision(name, color, cityId);
    if (!pre.ok) {
      setError(refusalError(pre.reason));
      return;
    }
    setBusy(true);
    setError(null);
    const res = await createCrew(name, color, cityId);
    setBusy(false);
    if (res.ok) {
      track(EVENTS.crewCreated);
      setFlash({ entry: C.rlCreated, vars: { name: res.crew.name } });
      resetForms();
      setMode('home');
      reload();
    } else {
      setError(refusalError(res.reason, res.daysLeft));
    }
  }, [busy, cityId, name, createCrew, reload, resetForms]);

  const onJoin = useCallback(async () => {
    if (busy) return;
    const clean = normalizeCrewCode(code);
    if (clean.length !== CREW_CODE_LENGTH) {
      setError(refusalError('bad_code'));
      return;
    }
    setBusy(true);
    setError(null);
    const res = await joinByCode(clean);
    setBusy(false);
    if (res.ok) {
      track(EVENTS.crewJoined, { via: 'code' });
      setFlash({ entry: C.rlWelcome, vars: { name: res.crew.name } });
      resetForms();
      setMode('home');
      reload();
    } else {
      setError(refusalError(res.reason, res.daysLeft));
    }
  }, [busy, code, joinByCode, reload, resetForms]);

  // « Inviter » n'ouvre plus directement la feuille de partage : il MÈNE à
  // l'écran d'invitation (QR + code + actions). Le CTA chartreuse de cet écran
  // reste unique — c'est la même porte, elle donne juste sur plus (§A).

  const onLeave = useCallback(() => {
    Alert.alert(
      t(C.rlLeaveConfirmTitle),
      t(C.rlLeaveConfirmBody, { days: CREW_SWITCH_COOLDOWN_DAYS }),
      [
        { text: t(C.rlCancel), style: 'cancel' },
        {
          text: t(C.rlLeave),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const res = await leaveCrew();
              if (res.ok) {
                setFlash({ entry: C.rlLeft });
                reload();
              } else {
                setFlash({ entry: C.rlErrGeneric });
              }
            })();
          },
        },
      ],
    );
  }, [leaveCrew, reload, t]);

  const kicker = useMemo(() => t(C.kickerSeason), [t]);

  // Rôle + contribution par membre (crew_overview, 0044). Le roster garde son
  // ORDRE D'ANCIENNETÉ (pas de reclassement quand la donnée arrive : l'écran ne
  // saute pas sous le doigt) ; l'overview ne fait qu'enrichir chaque ligne.
  const detailByUser = useMemo(() => {
    const map = new Map<string, { role: string; contributionPct: number }>();
    for (const c of overview?.contributions ?? []) {
      map.set(c.userId, { role: c.role, contributionPct: c.contributionPct });
    }
    return map;
  }, [overview]);

  // Le crew ne tient RIEN ⇒ aucune contribution affichée : « 0 % » sur toutes
  // les lignes n'apprend rien et encombre (§A). Le bloc territoire dit déjà,
  // en une phrase honnête, qu'il n'y a pas encore de territoire.
  const showContributions = (overview?.territory.hexesHeld ?? 0) > 0;

  // ── DÉCONNECTÉ / sans backend : aucun crew fictif, on invite à se connecter ──
  if (!ready) {
    return (
      <TabScreen title="Crew" kicker={kicker}>
        <View style={styles.block}>
          <Text style={styles.title}>{t(C.rlSignedOutTitle)}</Text>
          <Text style={styles.body}>{t(C.rlSignedOutBody)}</Text>
          {configured ? (
            <View style={styles.cta}>
              <Button label={t(C.rlSignIn)} onPress={() => router.push('/sign-in')} />
            </View>
          ) : null}
        </View>
      </TabScreen>
    );
  }

  // ── AVEC CREW : nom, effectif, roster, inviter (CTA), quitter (discret) ──────
  if (crew) {
    // Écran d'invitation (QR de recrutement) — même état « mon crew », une
    // couche plus loin. Le retour ramène ici sans rien recharger.
    if (mode === 'invite') {
      return (
        <CrewInviteQRScreen
          crewName={crew.name}
          memberCount={memberCount}
          maxMembers={maxMembers}
          fetchMyCode={fetchMyCode}
          onBack={goHome}
        />
      );
    }
    return (
      <TabScreen title={crew.name} kicker={kicker}>
        {flash ? <Text style={styles.flash}>{t(flash.entry, flash.vars)}</Text> : null}
        <Text style={styles.count}>{t(C.rlMembersOf, { count: memberCount, max: maxMembers })}</Text>

        {/*
          BLOC TERRITOIRE — maillon 2 de la boucle A-43 « je vois ce que mon
          crew contrôle ». Bloc d'INFO, pas un bouton : le seul CTA chartreuse
          de l'écran reste « Inviter » (§A). Absent tant que crew_overview n'a
          rien renvoyé (chargement OU échec) : ne rien dire vaut mieux que dire
          « 0 zone » à tort. Aucune aire en m² n'est affichée — le serveur n'en
          émet pas (0044, choix n°1) et on n'en fabrique pas ici.
        */}
        {overview ? (
          <View style={styles.territory}>
            <Text style={styles.sectionLabel}>{t(C.rlTerritoryLabel)}</Text>
            {overview.territory.hexesHeld > 0 ? (
              <>
                <Text style={styles.territoryValue}>
                  {overview.territory.hexesHeld === 1
                    ? t(C.rlZonesHeldOne)
                    : t(C.rlZonesHeldN, { n: overview.territory.hexesHeld })}
                </Text>
                {/* Rang tu si le crew est seul dans sa ville : « 1 sur 1 » n'est
                    pas un classement, c'est du bruit. */}
                {overview.territory.cityRank !== null &&
                overview.territory.crewsInCity !== null &&
                overview.territory.crewsInCity > 1 ? (
                  <Text style={styles.territoryHint}>
                    {t(C.rlCityRank, {
                      rank: overview.territory.cityRank,
                      total: overview.territory.crewsInCity,
                    })}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.territoryEmpty}>{t(C.rlNoTerritory)}</Text>
            )}
          </View>
        ) : null}

        <View style={styles.roster}>
          {members.map((m, i) => {
            const detail = detailByUser.get(m.userId);
            const roleEntry = detail ? roleLabelEntry(detail.role) : null;
            return (
              <View
                key={m.userId}
                style={[styles.memberRow, i < members.length - 1 && styles.memberDivider]}
              >
                <View style={styles.memberIdentity}>
                  <View style={styles.memberNameRow}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {m.pseudo}
                    </Text>
                    {m.isMe ? <Text style={styles.youTag}>{t(C.rlYouTag)}</Text> : null}
                  </View>
                  {/* Le RÔLE rend le fondateur identifiable (correctif A-43). */}
                  {roleEntry ? <Text style={styles.memberRole}>{t(roleEntry)}</Text> : null}
                </View>
                {showContributions && detail ? (
                  <Text style={styles.memberPct}>
                    {t(C.rlContributionPct, { pct: detail.contributionPct })}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>

        <View style={styles.cta}>
          <Button label={t(C.rlShareCode)} icon="partage" onPress={() => setMode('invite')} />
        </View>
        <View style={styles.leaveRow}>
          <GhostButton label={t(C.rlLeave)} onPress={onLeave} />
        </View>
      </TabScreen>
    );
  }

  // ── CRÉATION ────────────────────────────────────────────────────────────────
  if (mode === 'create') {
    const canSubmit = name.trim().length > 0 && !!cityId;
    return (
      <TabScreen title={t(C.rlCreateTitle)} kicker={kicker}>
        <View style={styles.block}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t(C.rlNamePlaceholder)}
            placeholderTextColor={colors.gris}
            maxLength={40}
            autoCapitalize="words"
            returnKeyType="done"
            // « Done » VALIDE (retour terrain 20/07) : la touche existait mais
            // ne faisait rien — il fallait fermer le clavier à la main pour
            // atteindre le CTA. Ici le geste naturel crée le crew.
            onSubmitEditing={() => {
              if (canSubmit && !busy) void onCreate();
            }}
            accessibilityLabel={t(C.rlNamePlaceholder)}
          />

          {cities.length > 1 ? (
            <>
              <Text style={styles.fieldLabel}>{t(C.rlCityLabel)}</Text>
              <View style={styles.cityRow}>
                {cities.map((c) => {
                  const selected = c.cityId === cityId;
                  return (
                    <Pressable
                      key={c.cityId}
                      onPress={() => setCityId(c.cityId)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[styles.cityPill, selected && styles.cityPillOn]}
                    >
                      <Text style={[styles.cityPillText, selected && styles.cityPillTextOn]}>
                        {c.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {error ? <Text style={styles.error}>{t(error.entry, error.vars)}</Text> : null}

          <View style={styles.cta}>
            <Button
              label={t(C.rlCreateCta)}
              onPress={() => void onCreate()}
              loading={busy}
              disabled={!canSubmit}
            />
          </View>
          <View style={styles.leaveRow}>
            <GhostButton label={t(C.rlBack)} onPress={goHome} />
          </View>
        </View>
      </TabScreen>
    );
  }

  // ── REJOINDRE PAR CODE ──────────────────────────────────────────────────────
  if (mode === 'join') {
    const canSubmit = normalizeCrewCode(code).length === CREW_CODE_LENGTH;
    return (
      <TabScreen title={t(C.rlJoinTitle)} kicker={kicker}>
        <View style={styles.block}>
          <TextInput
            style={[styles.input, styles.codeInput]}
            value={code}
            onChangeText={(v) => setCode(normalizeCrewCode(v))}
            placeholder={t(C.rlCodePlaceholder, { n: CREW_CODE_LENGTH })}
            placeholderTextColor={colors.gris}
            maxLength={CREW_CODE_LENGTH}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            // Code complet + « Done » = on rejoint, sans chercher le bouton.
            onSubmitEditing={() => {
              if (canSubmit && !busy) void onJoin();
            }}
            accessibilityLabel={t(C.rlCodePlaceholder, { n: CREW_CODE_LENGTH })}
          />

          {error ? <Text style={styles.error}>{t(error.entry, error.vars)}</Text> : null}

          <View style={styles.cta}>
            <Button
              label={t(C.rlJoinCta)}
              onPress={() => void onJoin()}
              loading={busy}
              disabled={!canSubmit}
            />
          </View>
          <View style={styles.leaveRow}>
            <GhostButton label={t(C.rlBack)} onPress={goHome} />
          </View>
        </View>
      </TabScreen>
    );
  }

  // ── SANS CREW (home) : pitch 1 ligne + créer (CTA) + « J’ai un code » ────────
  return (
    <TabScreen title="Crew" kicker={kicker} subtitle={loading ? undefined : t(C.emptySubtitle)}>
      {flash ? <Text style={styles.flash}>{t(flash.entry, flash.vars)}</Text> : null}
      <View style={styles.block}>
        <Text style={styles.title}>{t(C.emptyTitle)}</Text>
        <Text style={styles.body}>{t(C.emptyBody)}</Text>
        <View style={styles.cta}>
          <Button
            label={t(C.createMyCrew)}
            onPress={() => {
              resetForms();
              setMode('create');
            }}
          />
        </View>
        <View style={styles.leaveRow}>
          <GhostButton
            label={t(C.rlHaveCode)}
            onPress={() => {
              resetForms();
              setMode('join');
            }}
          />
        </View>
      </View>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.lg, gap: spacing.md },
  title: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '600' },
  body: { color: colors.gris, fontSize: fontSizes.md, lineHeight: 22 },
  cta: { marginTop: spacing.sm },
  leaveRow: { marginTop: spacing.xs, alignItems: 'center' },

  // Effectif + roster
  count: { color: colors.gris, fontSize: fontSizes.sm, marginTop: spacing.lg, letterSpacing: 1 },

  // Territoire : bloc à plat (surtout PAS une card — le roster n'en est pas une
  // non plus, deux cards imbriquées ou juxtaposées casseraient §A).
  territory: { marginTop: spacing.lg, gap: spacing.xs },
  sectionLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 1.5 },
  territoryValue: { color: colors.blanc, fontSize: fontSizes.xl, fontWeight: '700' },
  territoryHint: { color: colors.gris, fontSize: fontSizes.sm },
  territoryEmpty: { color: colors.gris, fontSize: fontSizes.md, lineHeight: 22 },

  roster: { marginTop: spacing.lg, marginBottom: spacing.lg },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  memberDivider: { borderBottomWidth: 1, borderBottomColor: colors.grisLigne },
  // flexShrink sur la colonne d'identité : le % (court, jamais tronqué) garde
  // sa place, seul un pseudo très long s'ellipse.
  memberIdentity: { flexShrink: 1, gap: 2 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  memberName: { color: colors.blanc, fontSize: fontSizes.md, flexShrink: 1 },
  memberRole: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 1 },
  memberPct: { color: colors.blanc, fontSize: fontSizes.sm, flexShrink: 0 },
  youTag: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 1 },

  // Formulaires
  input: {
    backgroundColor: elevation.raised,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    color: colors.blanc,
    fontSize: fontSizes.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  codeInput: { letterSpacing: 6, textAlign: 'center', fontSize: fontSizes.lg },
  fieldLabel: { color: colors.gris, fontSize: fontSizes.sm, letterSpacing: 1 },
  cityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cityPill: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: elevation.raised,
  },
  cityPillOn: { borderColor: colors.chartreuse, backgroundColor: colors.chartreuse14 },
  cityPillText: { color: colors.blanc, fontSize: fontSizes.sm },
  cityPillTextOn: { color: colors.blanc, fontWeight: '600' },

  error: { color: colors.blanc, fontSize: fontSizes.sm, lineHeight: 20 },
  flash: { color: colors.chartreuse, fontSize: fontSizes.sm, marginTop: spacing.lg },
});
