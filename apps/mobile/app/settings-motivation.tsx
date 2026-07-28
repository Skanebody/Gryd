/**
 * GRYD — MOTIVATION : LE STYLE DE JEU (écran poussé depuis Paramètres › Course).
 *
 * ─── ORDRE DE COMPOSITION ───────────────────────────────────────────────────
 *  1. Barre de retour + titre + sous-titre (`StackScreen`).
 *  2. KICKER « STYLE DE JEU » → les 3 cartes-options. C'est LA décision de
 *     l'écran, et la seule que la ligne d'entrée de Paramètres annonce.
 *  3. KICKER « CE QUE TON STYLE OUVRE » → la conséquence, énoncée comme une
 *     RÈGLE : les niveaux ouverts en pastilles, les niveaux fermés EN TOUTES
 *     LETTRES, puis la note d'état sur ce que GRYD n'ouvre pas encore.
 *  4. KICKER « MODE DISCRET » → l'interrupteur, présenté comme un droit (§11).
 *  5. Une LIGNE de navigation vers Confidentialité — l'endroit UNIQUE où se
 *     règle la visibilité.
 * Aucun CTA chartreuse : cet écran ne décide rien qu'on « valide », il se règle.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ───────────────────────────────────────
 * · « PROFIL VISIBLE PAR » / « PARTAGE D'ACTIVITÉ » / « TRACE SUR LA CARTE » —
 *   LE MENSONGE PRINCIPAL DE CET ÉCRAN. Ces trois réglages écrivaient dans
 *   `features/motivation/store` alors que le Profil (`(tabs)/profil.tsx:326`) et
 *   l'édition de profil (`profil-edit.tsx:205`) LISENT `features/privacy/store`.
 *   Choisir « Moi seul » ici ne changeait donc RIEN à ce que le Profil affichait :
 *   un interrupteur sans effet, qui est la version « réglages » du bouton mort.
 *   E21 tranche : la visibilité a UN SEUL endroit. Une `ListRow` y renvoie.
 * · « NOTIFICATIONS » — les 4 mêmes `TogglePill`, sur le MÊME store, sont déjà
 *   rendues par `/parametres/notifications` (qui, lui, dit en plus l'état réel
 *   de l'enregistrement push). Deux pages pour un réglage, c'est une page de
 *   trop et deux endroits où le corriger.
 * · « RETOURS HAPTIQUES » — même interrupteur, même store global
 *   (`src/lib/haptics`), déjà dans `/parametres/course`, l'écran d'où l'on
 *   arrive ici.
 * · L'OPACITÉ COMME PORTEUSE DE SENS. Les pastilles masquées étaient peintes en
 *   `colors.gris` à `opacity: 0.5` — sous le plancher de lisibilité, et « masqué »
 *   n'était écrit nulle part. Ce qui est fermé est maintenant NOMMÉ (règle 13 :
 *   la couleur ne porte jamais le sens seule).
 *
 * ─── ÉCARTS ASSUMÉS ─────────────────────────────────────────────────────────
 * · `prefs.activitySharing` et `prefs.mapSharing` ne sont plus réglables nulle
 *   part. RAISON TECHNIQUE : ils n'ont aucune colonne d'écriture serveur (le
 *   store est un miroir AsyncStorage, cf. son en-tête) et leur seul lecteur est
 *   `features/arsenal/signals.ts`, qui sait déjà retomber sur les défauts. Les
 *   rendre ici en attendant, c'était promettre un réglage que rien ne transporte.
 *   Ils reviendront avec l'écriture de profil rôle-gatée (O1), dans
 *   Confidentialité — pas ici.
 * · La liste des niveaux de classement reste affichée alors qu'aucun classement
 *   « région / France / global » n'existe. RAISON TECHNIQUE : il n'y a pas de
 *   source qui dise « ce niveau est ouvert » — `flags.season` ne couvre que
 *   l'onglet Saison. On ne peut donc pas dériver l'état, seulement la RÈGLE :
 *   le titre, la note et la copie disent explicitement que c'est une règle de
 *   visibilité et que tous ces niveaux ne sont pas encore ouverts.
 * · Le mode discret reste sur cet écran bien qu'il soit une seconde décision.
 *   RAISON : c'est le seul endroit de l'app où il se règle, et il entre dans la
 *   MÊME dérivation que le style (`leaderboardVisibility`) — les séparer
 *   afficherait une conséquence dont la moitié des causes serait ailleurs.
 * · Aucun 4ᵉ état de lecture : cet écran ne fait AUCUNE lecture réseau. Le store
 *   est local (AsyncStorage) et affiche ses défauts immédiatement — il n'y a ni
 *   « échec » ni « lecture en cours » à distinguer, donc aucun n'est peint.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  borderState,
  colors,
  gameColors,
  radii,
  spacing,
  typography,
  type PlayStyle,
} from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { ListRow } from '../src/ui/ListRow';
import { SectionLabel } from '../src/ui/SectionLabel';
import { StackScreen } from '../src/ui/StackScreen';
import { OptionCard, SwitchRow } from '../src/features/motivation/ui';
import { LEADERBOARD_LABELS, PLAY_STYLE_LABELS } from '../src/features/motivation/labels';
import { splitLeaderboardLevels } from '../src/features/motivation/leaderboardView';
import { useMotivationPrefs } from '../src/features/motivation/store';
import {
  discreetSyncNeedsWarning,
  type DiscreetSyncOutcome,
} from '../src/features/motivation/discreetSync';
import { syncDiscreetMode } from '../src/features/motivation/discreetSyncClient';
import { useSession } from '../src/lib/session';
import { C } from '../src/i18n/catalog/motivation';
import { useT } from '../src/i18n/store';

const STYLE_ORDER: PlayStyle[] = ['focus_solo', 'mixte', 'crew_war'];
const STYLE_ICON: Record<PlayStyle, 'aujourdhui' | 'crew' | 'cible'> = {
  focus_solo: 'aujourdhui',
  mixte: 'crew',
  crew_war: 'cible',
};

/** Rythme vertical entre deux sections — mesure de composition, pas une règle de jeu. */
const SECTION_GAP = spacing.xl;
/**
 * Diamètre du point d'état d'une pastille de niveau. MESURE DE COMPOSITION, pas
 * une règle de jeu : c'est un repère visuel qui REDOUBLE le texte, il ne porte
 * jamais l'information seul.
 */
const LEVEL_DOT_PX = 6;

export default function SettingsMotivationScreen() {
  const t = useT();
  const { prefs, update } = useMotivationPrefs();
  const { session } = useSession();
  /**
   * Résultat de la DERNIÈRE écriture serveur du mode discret. `null` = rien
   * n'a encore été tenté sur cet écran — on n'affiche donc rien, un état non
   * tenté n'affirme pas plus qu'un chargement.
   */
  const [discreetSync, setDiscreetSync] = useState<DiscreetSyncOutcome | null>(null);

  /**
   * Le mode discret n'est PAS une préférence d'affichage : c'est ce qui décide
   * si ma ligne part vers les autres joueurs. Il doit donc atteindre
   * `user_profiles.discreet_mode`, que la RPC de classement respecte (0092).
   * On écrit local d'abord (l'interrupteur ne doit jamais « coller »), puis on
   * pousse — et on garde l'issue pour la DIRE si elle a échoué.
   */
  async function onDiscreetChange(value: boolean): Promise<void> {
    setDiscreetSync(null);
    await update({ discreetMode: value });
    setDiscreetSync(await syncDiscreetMode(value, session?.user.id ?? null));
  }

  useEffect(() => {
    screen('motivation_settings');
  }, []);

  // Ce que le style OUVRE et ce qu'il FERME — dérivation pure et testée
  // (`leaderboardView.ts`), miroir de engine/challenge.ts via `rules.ts`.
  const { open, hidden } = splitLeaderboardLevels(prefs.playStyle, prefs.discreetMode);
  const closedNames = hidden.map((lvl) => t(LEADERBOARD_LABELS[lvl])).join(', ');

  return (
    <StackScreen title={t(C.motivationTitle)} icon="reglages" subtitle={t(C.motivationSubtitle)}>
      {/* 1. LA décision de l'écran. */}
      <SectionLabel style={styles.kicker}>{t(C.sectionPlayStyle)}</SectionLabel>
      {STYLE_ORDER.map((s) => (
        <OptionCard
          key={s}
          title={t(PLAY_STYLE_LABELS[s].title)}
          subtitle={t(PLAY_STYLE_LABELS[s].subtitle)}
          icon={STYLE_ICON[s]}
          selected={prefs.playStyle === s}
          onPress={() => void update({ playStyle: s })}
        />
      ))}

      {/* 2. La CONSÉQUENCE du choix — énoncée comme une règle, jamais comme un
             état : GRYD n'ouvre à ce jour aucun classement région/France/global. */}
      <View style={styles.section}>
        <SectionLabel style={styles.kicker}>{t(C.sectionLeaderboards)}</SectionLabel>
        <Text style={styles.note}>{t(C.leaderboardsNote)}</Text>
        <View style={styles.levels}>
          {open.map((lvl) => (
            <View key={lvl} style={styles.levelChip}>
              <View style={styles.levelDot} />
              <Text style={styles.levelText}>{t(LEADERBOARD_LABELS[lvl])}</Text>
            </View>
          ))}
        </View>
        {/* « Fermé » se lit en TOUTES LETTRES : pas d'opacité, pas de couleur
            seule (règle 13). Rien du tout si le style n'en ferme aucun. */}
        {hidden.length > 0 ? (
          <Text style={styles.note}>{t(C.leaderboardsClosed, { levels: closedNames })}</Text>
        ) : null}
        <Text style={styles.note}>{t(C.leaderboardsNotOpenYet)}</Text>
      </View>

      {/* 3. Le mode discret — un droit (§11), pas un aveu. */}
      <View style={styles.section}>
        <SectionLabel style={styles.kicker}>{t(C.sectionDiscreet)}</SectionLabel>
        <SwitchRow
          title={t(C.discreetTitle)}
          subtitle={t(C.discreetSubtitle)}
          icon="discret"
          value={prefs.discreetMode}
          onValueChange={(v) => void onDiscreetChange(v)}
        />
        {/* Peint UNIQUEMENT sur l'échec réel : le joueur croirait sinon être
            retiré des classements alors qu'il n'y est plus retiré de rien. */}
        {discreetSync !== null && discreetSyncNeedsWarning(discreetSync) ? (
          <Text style={styles.syncFailed}>{t(C.discreetSyncFailed)}</Text>
        ) : null}
      </View>

      {/* 4. La visibilité n'est PAS réglée ici — elle a un seul écran (E21). */}
      <View style={styles.section}>
        <ListRow
          icon="verrou"
          label={t(C.visibilityRowLabel)}
          sublabel={t(C.visibilityRowSublabel)}
          chevron
          onPress={() => router.push('/confidentialite')}
        />
      </View>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  kicker: { marginBottom: spacing.sm },
  // Rouge d'erreur du système de tokens — jamais une couleur ad hoc.
  syncFailed: { ...typography.meta, color: gameColors.danger, marginTop: spacing.sm, lineHeight: 18 },
  section: { marginTop: SECTION_GAP },
  // Le rôle typo R4 (corps) porté tel quel : gris = note d'état, jamais un
  // second niveau de titre. Aucune valeur de police recodée ici.
  note: { ...typography.body, color: colors.gris, marginTop: spacing.xs },
  levels: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  // AFFICHAGE DÉRIVÉ (lecture seule), pas un contrôle : ni plancher tactile, ni
  // contour d'état — le contour reste neutre pour ne pas imiter les pastilles
  // tappables des autres écrans. Le point chartreuse REDOUBLE le texte.
  levelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: borderState.hairline,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  levelDot: {
    width: LEVEL_DOT_PX,
    height: LEVEL_DOT_PX,
    borderRadius: LEVEL_DOT_PX / 2,
    backgroundColor: colors.chartreuse,
  },
  levelText: { ...typography.body, color: colors.blanc },
});
