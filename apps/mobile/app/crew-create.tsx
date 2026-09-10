/**
 * GRYD — CRÉER UN CREW (route `/crew-create`).
 *
 * ══ LE DÉFAUT QUE CET ÉCRAN CORRIGE ═══════════════════════════════════════
 * Retour fondateur, iPhone, 10/09/2026 : « Sur la page Crew on me propose
 * seulement de rejoindre un crew, jamais de créer un crew. »
 *
 * Le geste EXISTAIT pourtant — `create_crew` (0042 → 0050 → 0097) est en
 * production, et `useRealCrew().createCrew` l'appelait déjà. Ce qui manquait
 * n'était ni une RPC ni un droit : c'était le RANG DE L'OFFRE. L'état « sans
 * crew » de l'onglet s'intitulait « Rejoindre un crew », et la création y était
 * une ligne de texte posée sur la photo du hero, entre ce titre et deux CARTES
 * qui menaient toutes les deux à une adhésion (« Avec un code », « À
 * proximité »). Trois affordances d'adhésion, zéro surface de création : le
 * lecteur voyait exactement ce que le fondateur a décrit.
 *
 * La création a donc son écran, au même rang que l'adhésion, et l'onglet
 * n'offre plus qu'UNE porte vers chacune.
 *
 * ══ CE QUE CET ÉCRAN ÉCRIT, ET RIEN DE PLUS ═══════════════════════════════
 * `create_crew(p_name, p_color, p_city_id, p_recruitment_status)` — quatre
 * arguments, quatre champs, aucun de plus :
 *   · NOM — borné 1..40 par la DDL (0002). `NAME_MAX` vient de `crewEdit.ts`,
 *     dont le test PGlite RELIT le schéma : la borne ne peut pas dériver ici.
 *     La modération du nom (0050) reste SERVEUR, avec son motif unique.
 *   · EMBLÈME — la colonne `crews.color`, enfin choisie ET relue (voir
 *     `features/crew/crewEmblem.ts` pour la raison qui en fait un motif de
 *     blason plutôt qu'une teinte : la charte n'a qu'un accent, ADR-008).
 *   · VILLE — `CityField openOnly`. Le serveur refuse une ville absente de
 *     `city_zones` ; proposer les autres fabriquerait un refus garanti.
 *     AUCUNE ville n'est devinée ni pré-remplie : rien dans le compte ne dit où
 *     vit le joueur (pas de colonne de ville sur `users`), et l'inventer serait
 *     une donnée fabriquée.
 *   · ACCÈS — `CREW_RECRUITMENT_AT_CREATION`, c'est-à-dire les TROIS valeurs
 *     que 0097 accepte à la naissance. `closed` n'y est pas : le serveur le
 *     refuse ici, et `/crew-edit` l'ouvre plus tard.
 *
 * Ce qui n'est PAS peint, faute de chemin serveur : bannière, photo de groupe,
 * abréviation (`crews.tag`, jamais écrite), description (`crew_edit` la pose,
 * `create_crew` non). Les demander ici serait promettre quatre champs qui ne
 * partiraient nulle part.
 *
 * ══ CINQ ÉTATS DISTINCTS, JAMAIS CONFONDUS ════════════════════════════════
 *   pas connecté · lecture EN COURS · échec de lecture · lu et DÉJÀ dans un
 *   crew · lu et libre de fonder.
 * Le couple qui compte est le même que dans `/crew-edit` : « échec » n'affirme
 * RIEN. On n'y propose donc pas de fonder un crew — le serveur répondrait
 * `already_in_crew` à quelqu'un qui en a déjà un, et l'écran aurait fait
 * remplir un formulaire pour rien.
 *
 * ══ AUCUN BOUTON MORT (§A4) ═══════════════════════════════════════════════
 * « Créer le crew » est grisé tant qu'un champ obligatoire manque, et le motif
 * s'affiche SOUS le champ concerné. Les refus serveur ont chacun leur phrase :
 * un nom refusé ne se dit pas « réessaie », et un serveur sans 0097 se dit
 * comme un fait sur le serveur.
 */
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  CREW_RECRUITMENT_AT_CREATION,
  EVENTS,
  colors,
  fontSizes,
  fonts,
  gameColors,
  radii,
  sizes,
  spacing,
  typography,
  type CrewRecruitmentStatus,
} from '@klaim/shared';
import { ACCESS_E, ACCESS_HELP_E, C } from '../src/i18n/catalog/crew';
import { useT } from '../src/i18n/store';
import { screen, track } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { useSession } from '../src/lib/session';
import { AccountDoor2026 } from '../src/features/account/AccountDoor2026';
import { StackScreen } from '../src/ui/StackScreen';
import { Button } from '../src/ui/Button';
import { CrewCrest } from '../src/ui/game/CrewCrest';
import { CityField } from '../src/features/city/CityPicker';
import { NAME_MAX } from '../src/features/crew/crewEdit';
import { CREW_EMBLEMS, CREW_EMBLEM_DEFAULT, crewEmblemSeed } from '../src/features/crew/crewEmblem';
import { useRealCrew, type CrewRefusal } from '../src/features/crew/real';

/** Ce qui EMPÊCHE de créer, dit sous le champ concerné. `null` = rien. */
type Blocker = 'name' | 'city';

export default function CrewCreateRoute() {
  const { session, loading } = useSession();
  // Même remontage que l'onglet Crew : un changement de compte ne doit pas
  // laisser le brouillon du compte précédent dans les champs.
  return <CrewCreate key={loading ? 'restoring' : (session?.user.id ?? 'guest')} />;
}

function CrewCreate() {
  const t = useT();
  const { session, loading: sessionLoading } = useSession();
  const crew = useRealCrew();

  const [name, setName] = useState('');
  const [emblem, setEmblem] = useState<number>(CREW_EMBLEM_DEFAULT);
  const [cityId, setCityId] = useState<string | null>(null);
  const [access, setAccess] = useState<CrewRecruitmentStatus>('on_request');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  /**
   * A-t-on TOUCHÉ au formulaire ?
   *
   * Sans ce drapeau, « Donne un nom à ton crew » s'affiche au premier pixel,
   * avant que quiconque ait tapé quoi que ce soit. Même doctrine que le
   * `pristine` de `/crew-edit` : « on ne crie pas "nom vide" à quelqu'un qui
   * vient d'ouvrir la page ». Le CTA, lui, reste grisé dès le départ — un
   * formulaire vide n'a rien à envoyer, et cela se voit sans reproche.
   */
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    screen('crew_create');
  }, []);

  const cleanName = name.trim();
  const blocker: Blocker | null = !cleanName ? 'name' : !cityId ? 'city' : null;
  /** Le motif de blocage n'est DIT qu'une fois le formulaire touché. */
  const saidBlocker: Blocker | null = touched ? blocker : null;

  /** Le refus du serveur, dit par ce qu'il EST. */
  const refusalText = useMemo(
    () =>
      (reason: CrewRefusal, daysLeft?: number): string => {
        switch (reason) {
          case 'bad_name':
          case 'name_unavailable':
            return t(C.createErrName);
          case 'bad_city':
            return t(C.createErrCity);
          case 'already_in_crew':
            return t(C.createErrAlready);
          case 'cooldown':
            // `daysLeft` vient du serveur. Absent, on ne l'invente pas : le
            // message générique vaut mieux qu'un compte à rebours fabriqué.
            return typeof daysLeft === 'number'
              ? t(C.createErrCooldown, { n: daysLeft })
              : t(C.createErrGeneric);
          case 'bad_color':
            return t(C.createErrEmblem);
          case 'bad_recruitment_status':
            return t(C.rlErrBadRecruitment);
          case 'unsupported_server':
            return t(C.createErrServer);
          default:
            return t(C.createErrGeneric);
        }
      },
    [t],
  );

  async function submit() {
    setTouched(true);
    if (busy || blocker !== null || !cityId) return;
    setBusy(true);
    setError(null);
    const result = await crew.createCrew(cleanName, emblem, cityId, access);
    setBusy(false);
    if (!result.ok) {
      haptics.error();
      setError(refusalText(result.reason, result.daysLeft));
      return;
    }
    // L6 — la fondation d'un crew est un événement de jeu, pas un enregistrement.
    haptics.success();
    track(EVENTS.crewCreated);
    // Le nom AFFIRMÉ est celui que le serveur a écrit, jamais celui saisi.
    setDone(t(C.createDone, { name: result.crew.name }));
    crew.reload();
  }

  // ── Pas connecté ───────────────────────────────────────────────────────────
  //   ÉTAPE 0 (10/09/2026) : le bouton disait déjà « Créer mon compte »
  //   (`createSignIn`, f4996f3), mais la porte restait LOCALE et la phrase
  //   au-dessus ordonnait « Connecte-toi pour créer ton crew ». Une porte
  //   dupliquée finit toujours par diverger de l'originale : celle-ci passe
  //   par le composant partagé, et sa raison dit ce que le compte porte ICI.
  if (!session && !sessionLoading) {
    return (
      <StackScreen title={t(C.createTitle)} backHref="/(tabs)/crew">
        <AccountDoor2026 family="ui" reason={t(C.createSignedOut)} />
      </StackScreen>
    );
  }

  // ── Lecture EN COURS — n'affirme RIEN sur l'adhésion ──────────────────────
  if (sessionLoading || crew.loading) {
    return (
      <StackScreen title={t(C.createTitle)} backHref="/(tabs)/crew">
        <View style={styles.center}>
          <ActivityIndicator color={colors.chartreuse} />
        </View>
      </StackScreen>
    );
  }

  // ── Échec de lecture — DISTINCT de « tu n'as pas de crew » ────────────────
  if (crew.loadFailed) {
    return (
      <StackScreen title={t(C.createTitle)} backHref="/(tabs)/crew">
        <View style={styles.block}>
          <Text style={styles.title}>{t(C.createUnknownTitle)}</Text>
          <Text style={styles.body}>{t(C.createUnknownBody)}</Text>
          <Button label={t(C.editRetry)} onPress={crew.reload} variant="ghost" />
        </View>
      </StackScreen>
    );
  }

  // ── Lu, et le joueur EST déjà dans un crew ────────────────────────────────
  // Le succès de création passe aussi par ici (le hook a relu l'adhésion) :
  // c'est ce qui donne à l'écran sa dernière image honnête — le crew existe.
  if (crew.crew) {
    return (
      <StackScreen title={t(C.createTitle)} backHref="/(tabs)/crew">
        <View style={styles.block}>
          <View style={styles.doneCrest}>
            <CrewCrest seed={crewEmblemSeed(crew.crew.color)} name={crew.crew.name} size="l" />
          </View>
          <Text style={styles.title}>{done ?? t(C.createAlreadyTitle)}</Text>
          {done ? null : (
            <Text style={styles.body}>
              {t(C.createAlreadyBody, { name: crew.crew.name })}
            </Text>
          )}
          <Button
            label={t(C.createOpenMyCrew)}
            onPress={() => router.replace('/(tabs)/crew')}
          />
        </View>
      </StackScreen>
    );
  }

  const left = NAME_MAX - cleanName.length;

  return (
    <StackScreen
      title={t(C.createTitle)}
      kicker={t(C.createKicker)}
      subtitle={t(C.createIntro)}
      backHref="/(tabs)/crew"
    >
      {/* ── APERÇU — le blason RÉEL, avec les initiales du nom saisi ─────── */}
      <View style={styles.preview}>
        <CrewCrest seed={crewEmblemSeed(emblem)} name={cleanName || '?'} size="xl" />
        {/* Le nom SAISI se lit comme un nom ; l'invite, comme une invite. Les
            rendre pareils ferait passer « Ton nom apparaîtra ici » pour le nom
            du crew. §A.9 : clip plutôt qu'ellipse. */}
        <Text
          style={cleanName ? styles.previewName : styles.previewEmpty}
          numberOfLines={2}
          ellipsizeMode="clip"
        >
          {cleanName || t(C.createPreviewUnnamed)}
        </Text>
      </View>

      {/* ── LE NOM ────────────────────────────────────────────────────────── */}
      <View style={styles.field}>
        <Text style={styles.label}>{t(C.createNameLabel)}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={(value) => { setTouched(true); setName(value); }}
          maxLength={NAME_MAX}
          autoCapitalize="words"
          autoCorrect={false}
          placeholder={t(C.createNamePlaceholder)}
          placeholderTextColor={colors.gris}
          accessibilityLabel={t(C.createNameLabel)}
        />
        <Text style={styles.hint}>{t(C.createNameLeft, { n: left, max: NAME_MAX })}</Text>
        {saidBlocker === 'name' ? <Text style={styles.blocker}>{t(C.createNameEmpty)}</Text> : null}
      </View>

      {/* ── L'EMBLÈME (crews.color) ───────────────────────────────────────── */}
      <View style={styles.field}>
        <Text style={styles.label}>{t(C.createEmblemLabel)}</Text>
        <View accessibilityRole="radiogroup" style={styles.emblems}>
          {CREW_EMBLEMS.map((value) => {
            const selected = value === emblem;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ selected, checked: selected }}
                aria-checked={selected}
                accessibilityLabel={t(C.createEmblemA11y, {
                  n: value + 1,
                  max: CREW_EMBLEMS.length,
                })}
                onPress={() => {
                  haptics.light();
                  setTouched(true);
                  setEmblem(value);
                }}
                style={({ pressed }) => [
                  styles.emblem,
                  selected && styles.emblemOn,
                  pressed && styles.pressed,
                ]}
              >
                {/* QUOTA D'ACCENT (8-10 %, ADR-008) ET LISIBILITÉ DU CHOIX.
                    `CrewCrest` teinte en chartreuse par défaut — « ceci est MON
                    crew ». Douze aperçus chartreuse d'un coup noieraient l'accent
                    de la page ET le choix lui-même. Seul l'emblème RETENU porte
                    la teinte de possession ; les autres prennent le blanc que le
                    composant réserve déjà aux crews tiers. La sélection se lit
                    donc trois fois : teinte, bordure, état d'accessibilité. */}
                <CrewCrest
                  seed={crewEmblemSeed(value)}
                  name={cleanName || '?'}
                  size="m"
                  tint={selected ? gameColors.crew : colors.blanc}
                />
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>{t(C.createEmblemHelp)}</Text>
      </View>

      {/* ── LA VILLE — jamais devinée, jamais saisie librement ────────────── */}
      <View style={styles.field}>
        <CityField
          selectedId={cityId}
          /* `openOnly` empêche déjà de choisir une ville fermée, mais on relit
             le statut RENDU : un identifiant retenu doit venir d'une ville que
             le serveur accepte, pas d'une confiance dans le composant. */
          onSelect={(city) => { setTouched(true); setCityId(city.status === 'open' ? city.cityId : null); }}
          openOnly
          note={t(C.createCityHelp)}
        />
        {saidBlocker === 'city' ? <Text style={styles.blocker}>{t(C.createCityEmpty)}</Text> : null}
      </View>

      {/* ── L'ACCÈS — les TROIS valeurs que 0097 accepte à la création ────── */}
      <View style={styles.field}>
        <Text style={styles.label}>{t(C.createAccessLabel)}</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel={t(C.rlAccessA11y)}>
          {CREW_RECRUITMENT_AT_CREATION.map((option) => {
            const selected = option === access;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ selected, checked: selected }}
                aria-checked={selected}
                onPress={() => {
                  haptics.light();
                  setAccess(option);
                }}
                style={({ pressed }) => [
                  styles.access,
                  selected && styles.accessOn,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.flex}>
                  <Text style={styles.accessLabel}>{t(ACCESS_E[option])}</Text>
                  <Text style={styles.hint}>{t(ACCESS_HELP_E[option])}</Text>
                </View>
                {/* L15 — le choix ne se lit pas qu'à la couleur : une pastille
                    pleine double le liseré, et le libellé reste au-dessus. */}
                <View style={[styles.radio, selected && styles.radioOn]} />
              </Pressable>
            );
          })}
        </View>
      </View>

      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <View style={styles.cta}>
        <Button
          label={t(C.createSubmit)}
          onPress={() => void submit()}
          loading={busy}
          disabled={blocker !== null}
        />
      </View>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: spacing.xxl, alignItems: 'center' },
  block: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: spacing.md,
  },
  title: { ...typography.cardTitle, color: colors.blanc },
  body: { ...typography.body, color: colors.gris },
  doneCrest: { alignItems: 'center', paddingVertical: spacing.sm },

  preview: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  previewEmpty: { ...typography.body, color: colors.gris, textAlign: 'center' },
  previewName: {
    fontFamily: fonts.display,
    fontSize: fontSizes.lg,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.blanc,
    textAlign: 'center',
  },

  field: { gap: spacing.xs, paddingBottom: spacing.lg },
  label: { ...typography.meta, color: colors.gris },
  input: {
    height: sizes.buttonMd,
    borderRadius: radii.control,
    backgroundColor: colors.carbone2,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: spacing.md,
    color: colors.blanc,
    fontSize: fontSizes.md,
  },
  hint: { ...typography.meta, color: colors.gris, lineHeight: 18 },
  blocker: { ...typography.meta, color: colors.blanc, lineHeight: 18 },
  error: { ...typography.body, color: colors.blanc, paddingBottom: spacing.md },

  emblems: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  emblem: {
    minWidth: sizes.touchTarget + spacing.md,
    minHeight: sizes.touchTarget + spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
    padding: spacing.xxs,
  },
  emblemOn: { borderColor: colors.chartreuse, backgroundColor: colors.carbone2 },

  access: {
    minHeight: sizes.touchTarget + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  accessOn: { borderColor: colors.chartreuse },
  accessLabel: { ...typography.itemTitle, color: colors.blanc },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.grisLigne,
  },
  radioOn: { borderColor: colors.chartreuse, backgroundColor: colors.chartreuse },

  flex: { flex: 1, gap: spacing.xxs },
  pressed: { opacity: 0.6 },
  cta: { paddingTop: spacing.sm, paddingBottom: spacing.xl },
});
