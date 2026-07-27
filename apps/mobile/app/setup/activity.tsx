/**
 * GRYD — E09 « CHOIX D'ACTIVITÉ INITIAL » (`/setup/activity`).
 *
 * Spec produit UI/UX complète l.785, mot pour mot :
 *   · Objectif — « Choisir le contexte affiché au premier lancement, sans
 *     enfermer l'utilisateur. »
 *   · Layout  — « Deux grandes lignes : Course à pied · Vélo. Une seule
 *     sélection. Texte : Vous pourrez changer à tout moment. »
 *   · Logique — « Ce choix ne mélange jamais les données. Il initialise
 *     seulement le filtre. »
 *
 * ═══ CE QUE CET ÉCRAN ÉCRIT, ET C'EST TOUT ══════════════════════════════════
 * UNE SEULE CHOSE : la LENTILLE d'affichage E14, dans le store qui existe déjà
 * (`features/map/mapPref.ts` → `setActivityPref`, dont les clés de persistance
 * sont possédées par `ui/activityLens.ts` → `activityStorageKey`). Aucune
 * donnée de jeu ne part d'ici : pas de `runs`, pas de `hex_claims`, pas de
 * profil, pas de score, pas d'appel serveur — rien qui puisse ressembler à une
 * pratique déclarée. Choisir « Vélo » ici n'affirme PAS que le joueur roule ;
 * ça règle ce que l'app lui montre en premier, et ça se défait d'un tap.
 *
 * ⚠️ ET SURTOUT : CE N'EST PAS UN SECOND ÉTAT D'ACTIVITÉ. Le commutateur
 * Run/Bike (`ui/ActivitySwitch.tsx` → `useActivityLens`) lit EXACTEMENT le même
 * store. Un état local persisté « préférence d'onboarding » aurait divergé du
 * commutateur au premier tap, et l'écran aurait alors menti sur ce que l'app
 * affiche. Le garde-fou vit dans `ui/setupActivityLens.test.ts`, qui relit
 * CETTE source et échoue si une autre écriture y apparaît.
 *
 * ─── POURQUOI LES QUATRE SURFACES, ET PAS SEULEMENT LA CARTE ────────────────
 * E14 dit « le choix est mémorisé PAR ONGLET » : quatre emplacements
 * indépendants (`ACTIVITY_SURFACES`). Cette règle gouverne les BASCULES
 * ultérieures — elle empêche qu'un coup d'œil au Classement en vélo téléporte
 * la Carte. Elle ne dit rien de l'AMORCE. Or E09 amorce « le contexte affiché
 * au premier lancement » : n'amorcer que la Carte laisserait un cycliste ouvrir
 * son Classement en monde course juste après avoir déclaré le contraire. On
 * sème donc les quatre, DÉRIVÉES de `ACTIVITY_SURFACES` — jamais une liste
 * recopiée, qui manquerait la cinquième surface du jour où elle existera.
 *
 * ─── LA DISCIPLINE D'UNE SORTIE N'EST TOUJOURS PAS DÉCIDÉE ICI ──────────────
 * Interdit hérité de l'arbitrage du 25/07/2026 (`features/run/gps/runActivity.ts`) :
 * une préférence d'AFFICHAGE ne décide JAMAIS en silence de la NATURE d'un
 * effort enregistré. Rien de ce fichier n'est lu par `features/run/**`.
 *
 * ─── §A ÉPURATION ───────────────────────────────────────────────────────────
 * 1 écran = 1 décision (run ou vélo) + 1 seul CTA chartreuse. Deux lignes
 * PLEINES, sans card dans une card, sans texte d'action tronqué. Le CTA reste
 * INERTE tant que rien n'est choisi — et la ligne au-dessus DIT pourquoi, dans
 * un emplacement de hauteur fixe : un bouton gris muet est une impasse, et un
 * texte qui apparaît en poussant le bouton fait rater le tap.
 *
 * ─── AUCUN BOUTON MORT (constitution §2) ────────────────────────────────────
 * `flags.bike` fermé = il n'y a plus qu'une seule option, donc plus de décision
 * à prendre : l'écran ne se peint pas, il passe la main (même patron que
 * `(tabs)/classement.tsx` avec `flags.season`). Peindre deux lignes dont une
 * mène à un monde masqué partout ailleurs serait la fausse affordance que
 * `ActivitySwitch` a déjà payée une fois.
 */
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ACTIVITIES,
  colors,
  fontSizes,
  gameColors,
  radii,
  spacing,
  typography,
  type Activity,
} from '@klaim/shared';
import { EVENTS, track } from '../../src/lib/analytics';
import { flags } from '../../src/lib/flags';
import { haptics } from '../../src/lib/haptics';
import { C } from '../../src/i18n/catalog/setupActivity';
import { useT } from '../../src/i18n/store';
import type { Entry } from '../../src/i18n/types';
import { BikeGlyph } from '../../src/ui/ActivitySwitch';
import { ACTIVITY_SURFACES } from '../../src/ui/activityLens';
import { Button } from '../../src/ui/Button';
import { Icon } from '../../src/ui/Icon';
import { setActivityPref } from '../../src/features/map/mapPref';

/**
 * Étape SUIVANTE du parcours de premier usage (spec : E09 → E10 « Permissions
 * utiles »). Écrite ici en toutes lettres et pas dérivée d'une table de flow :
 * le parcours setup n'en a pas, et en inventer une pour trois écrans serait
 * plus de code que de sens.
 */
const NEXT_STEP = '/setup/permissions';

/**
 * Le NOM VISIBLE de chaque discipline, indexé par `Activity`. Le `Record`
 * complet est délibéré : une troisième discipline ajoutée à `ACTIVITIES` sans
 * son libellé casse le typecheck au lieu de rendre une ligne muette.
 */
const OPTION_LABEL: Readonly<Record<Activity, Entry>> = {
  run: C.optionRun,
  bike: C.optionBike,
};

/** Taille du picto d'une ligne — au-dessus de la fourchette §3.5 : ces lignes
 *  sont les deux seuls objets de l'écran, elles ont le droit de respirer. */
const OPTION_ICON = 28;

export default function SetupActivityScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  /**
   * AUCUNE PRÉSÉLECTION. Le défaut du store est `run` — le poser ici comme choix
   * ferait passer un défaut technique pour une décision du joueur, et le CTA
   * s'allumerait sur une réponse que personne n'a donnée.
   */
  const [choice, setChoice] = useState<Activity | null>(null);

  // §18 analytics — une vue par arrivée sur l'écran RÉELLEMENT peint (l'écran
  // escamoté par `flags.bike` n'en émet aucune : il n'a rien montré).
  useEffect(() => {
    if (!flags.bike) return;
    track(EVENTS.setupActivityViewed);
  }, []);

  // ⚠️ Règle des hooks : tous déclarés avant ce retour anticipé.
  if (!flags.bike) return <Redirect href={NEXT_STEP} />;

  const select = (next: Activity) => {
    if (next === choice) return;
    haptics.light();
    setChoice(next);
  };

  /**
   * COMMIT — l'unique écriture de cet écran, et elle ne touche que la lentille.
   * L'event part APRÈS l'écriture et dit ce qui a RÉELLEMENT été appliqué : le
   * poser sur chaque tap de ligne aurait compté des hésitations comme des choix.
   */
  const commit = () => {
    if (!choice) return;
    for (const surface of ACTIVITY_SURFACES) setActivityPref(surface, choice);
    track(EVENTS.setupActivityChosen, { activity: choice });
    router.push(NEXT_STEP);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>{t(C.kicker)}</Text>
        <Text style={styles.title}>{t(C.title)}</Text>
        <Text style={styles.subtitle}>{t(C.subtitle)}</Text>
        {/* Spec l.785, texte imposé (tutoyé au registre du produit). Il vit ICI,
            avec l'explication du choix : c'est la phrase qui déverrouille la
            décision, pas une note de bas de page. */}
        <Text style={styles.reassure}>{t(C.changeAnytime)}</Text>

        {/* Les deux grandes lignes, DÉRIVÉES de `ACTIVITIES` — l'ordre du domaine
            fait foi, et une discipline ajoutée apparaît sans toucher ce JSX.
            `radiogroup` dit aux lecteurs d'écran que ces lignes s'excluent : sans
            lui, deux boutons « sélectionné/non sélectionné » se lisent comme deux
            cases à cocher indépendantes — soit l'inverse d'« une seule sélection ». */}
        <View style={styles.options} accessibilityRole="radiogroup">
          {ACTIVITIES.map((activity) => {
            const selected = choice === activity;
            const name = t(OPTION_LABEL[activity]);
            const tint = selected ? gameColors.crew : colors.gris;
            return (
              <Pressable
                key={activity}
                accessibilityRole="radio"
                accessibilityState={{ selected, checked: selected }}
                accessibilityLabel={t(selected ? C.optionA11ySelected : C.optionA11yUnselected, {
                  name,
                })}
                onPress={() => select(activity)}
                style={({ pressed }) => [
                  styles.option,
                  selected && styles.optionOn,
                  pressed && styles.pressed,
                ]}
                testID={`setup-activity-${activity}`}
              >
                {activity === 'bike' ? (
                  <BikeGlyph size={OPTION_ICON} color={tint} />
                ) : (
                  <Icon name="basket" size={OPTION_ICON} color={tint} />
                )}
                {/* §A9 — le nom d'une discipline n'est JAMAIS coupé par « … » :
                    on coupe net plutôt que d'inventer une ellipse, et la ligne a
                    la largeur de l'écran pour deux mots. */}
                <Text style={styles.optionLabel} numberOfLines={1} ellipsizeMode="clip">
                  {name}
                </Text>
                {/* L'état sélectionné n'est PAS porté par la seule couleur : la
                    pastille CHANGE DE FORME (anneau vide → anneau plein). */}
                <View style={[styles.radio, selected && styles.radioOn]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* La garantie de la spec (« ne mélange jamais les données »), réduite à
            ce que le code TIENT aujourd'hui — les zones sont filtrées par
            discipline (features/map/hexClaims.ts:283) et l'historique aussi
            (features/history/real.ts:218). Rien sur les stats ni les badges, qui
            restent mono-pot : cf. l'en-tête du catalogue. */}
        <Text style={styles.note}>{t(C.separateNote)}</Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        {/* Emplacement de HAUTEUR FIXE : le motif d'inertie du CTA apparaît et
            disparaît sans jamais déplacer le bouton sous le doigt. */}
        <View style={styles.hintSlot}>
          {choice === null ? <Text style={styles.hint}>{t(C.ctaDisabledHint)}</Text> : null}
        </View>
        <Button
          label={t(C.cta)}
          onPress={commit}
          disabled={choice === null}
          accessibilityLabel={choice === null ? t(C.ctaDisabledHint) : t(C.cta)}
          analyticsId="setup_activity_continue"
        />
      </View>
    </View>
  );
}

/** Hauteur d'une ligne — très au-dessus du plancher tactile 44, et RÉELLE
 *  (aucun `hitSlop` ne vient élargir une cible plus petite qu'elle en a l'air). */
const OPTION_HEIGHT = 84;
/** Pastille de sélection : anneau 24, pastille pleine 12 quand la ligne est prise. */
const RADIO = 24;
const RADIO_DOT = 12;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },

  kicker: { ...typography.kicker, color: colors.gris },
  title: { ...typography.title, color: colors.blanc, marginTop: spacing.sm },
  subtitle: { ...typography.body, color: colors.gris, marginTop: spacing.sm },
  reassure: { ...typography.body, color: colors.grisFaible, marginTop: spacing.xxs },

  options: { marginTop: spacing.xl, gap: spacing.sm },
  option: {
    minHeight: OPTION_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.card,
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
  optionOn: { backgroundColor: colors.carbone2, borderColor: gameColors.crew },
  pressed: { opacity: 0.7 },
  optionLabel: {
    ...typography.title,
    fontSize: fontSizes.lg,
    lineHeight: 26,
    color: colors.blanc,
    flex: 1,
  },

  radio: {
    width: RADIO,
    height: RADIO,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.gris,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: gameColors.crew },
  radioDot: {
    width: RADIO_DOT,
    height: RADIO_DOT,
    borderRadius: radii.pill,
    backgroundColor: gameColors.crew,
  },

  note: { ...typography.meta, color: colors.grisFaible, marginTop: spacing.lg },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
    backgroundColor: colors.noir,
  },
  hintSlot: { minHeight: 22, justifyContent: 'center', marginBottom: spacing.xs },
  hint: { ...typography.meta, color: colors.gris, textAlign: 'center' },
});
