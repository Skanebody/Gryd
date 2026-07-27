/**
 * GRYD — E28 « Vérification » (route `/appel`) : l'écran d'APPEL anti-triche
 * (spec produit §11.4, planche E28).
 *
 * ══ CE QUE CET ÉCRAN RÉPARE ═══════════════════════════════════════════════
 * L'écran de résultat a longtemps annoncé « GRYD Verify examine cette course »
 * alors qu'aucune revue n'existait : `runs.status = 'flagged'` était TERMINAL
 * (0002_schema.sql:105), sans table, sans file, sans opérateur, sans recours.
 * La copie a dû être retirée (docblock de `flaggedWhy`, catalog/result.ts).
 * Cet écran, avec la migration 0081 et `packages/engine/src/anticheat.ts`, est
 * le droit de réponse qui manquait — §11.4 : motif, données concernées, bouton
 * d'appel, délai, statut, décision finale.
 *
 * ══ LE PIÈGE À NE PAS REFAIRE UN CRAN PLUS LOIN ═══════════════════════════
 * §11.4 demande « un délai ». Il n'y en a AUCUN : 0081 crée la file, mais
 * personne ne la dépile, et la table n'a même pas de colonne d'échéance (un test
 * PGlite le vérifie exprès). Écrire ici « une personne examine sous 48 h » serait
 * exactement la faute qu'on vient de corriger. L'écran dit donc ce qui est
 * VRAI : la course est enregistrée, la capture n'est pas créditée, l'appel est
 * reçu — et il DIT qu'il ne prévient pas (aucune notification n'existe).
 * ⚠️ Ne pas réintroduire un délai tant qu'aucun humain ne traite la file.
 *
 * ══ CINQ ÉTATS DISTINCTS, JAMAIS CONFONDUS ════════════════════════════════
 * lecture en cours · aucun serveur relié (O1) · pas connecté · échec de lecture
 * · lu. Et le cas « lu » se scinde en deux : AUCUNE vérification (le cas normal,
 * et aujourd'hui le seul possible en production, cf. plus bas) ou des
 * vérifications réelles. Un chargement n'affirme RIEN sur le joueur ; un échec
 * ne se déguise jamais en « rien à afficher ».
 *
 * ══ ⚠️ EN PRODUCTION, CET ÉCRAN EST VIDE — ET C'EST HONNÊTE ═══════════════
 * `ingest_run` n'appelle pas encore `scoreRun` (câblage hors du lot 9) : aucune
 * ligne n'entre dans `anticheat_reviews`. L'écran affichera donc l'état « aucune
 * vérification » pour tout le monde, ce qui est la stricte vérité. Il ne fabrique
 * AUCUN exemple, AUCUNE démonstration, AUCUN cas d'école : une donnée inventée
 * ici serait une accusation inventée.
 *
 * ══ AUCUN BOUTON MORT ═════════════════════════════════════════════════════
 * Le CTA « Faire appel » n'est peint QUE lorsqu'un appel est réellement
 * possible : une vérification existe, elle est à moi, et aucun appel n'a encore
 * été déposé dessus (la base l'interdirait — un appel par revue). Sinon, aucun
 * bouton. §A : un seul CTA chartreuse à l'écran, et jamais deux à la fois (le
 * « Réessayer » de l'état d'échec ne coexiste avec rien).
 *
 * ══ CE QUE L'ÉCRAN N'AFFICHE PAS, EXPRÈS ══════════════════════════════════
 * Aucun score, aucune sévérité, aucun seuil (§11.2 : « paramètres serveur, non
 * exposés comme règles de contournement »). On NOMME les données concernées ;
 * on n'enseigne pas comment passer entre les mailles. Et aucun mot accusatoire :
 * le joueur lit un constat sur des données, pas un procès sur sa personne.
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontSizes, gameColors, radii, spacing, typography } from '@klaim/shared';
import { C } from '../src/i18n/catalog/appel';
import { useT } from '../src/i18n/store';
import type { Entry } from '../src/i18n/types';
import { screen } from '../src/lib/analytics';
import { useSession } from '../src/lib/session';
import { supabase } from '../src/lib/supabase';
import { Button } from '../src/ui/Button';
import { Card } from '../src/ui/Card';
import { SectionLabel } from '../src/ui/SectionLabel';
import { StackScreen } from '../src/ui/StackScreen';

// ─── Formes lues, telles que 0081 les définit ────────────────────────────────
// Volontairement MINIMALES : on ne lit ni `signals[].severity`, ni `suspicion`,
// ni les preuves chiffrées. Les charger « au cas où » ferait entrer dans le
// client des nombres que §11.2 interdit d'exposer — et ce qui est chargé finit
// toujours par être affiché.

type ReviewStatus = 'open' | 'in_progress' | 'closed';
type FinalDecision = 'upheld' | 'overturned' | 'partially_overturned';

interface ReviewRow {
  id: string;
  run_id: string;
  system_decision: 'MANUAL_REVIEW' | 'REJECT';
  status: ReviewStatus;
  opened_at: string;
  final_decision: FinalDecision | null;
  /** `AntiCheatSignal[]` — SEULS `id` et `available` sont lus ici. */
  signals: { id?: string; available?: boolean; severity?: number }[] | null;
}

interface AppealRow {
  id: string;
  review_id: string;
  status: 'received' | 'in_progress' | 'closed';
  decision: FinalDecision | null;
}

type Etat =
  | { kind: 'loading' }
  | { kind: 'unconfigured' }
  | { kind: 'signed_out' }
  | { kind: 'failed' }
  | { kind: 'loaded'; reviews: ReviewRow[]; appeals: AppealRow[] };

/** Signaux du moteur → libellés. Un id inconnu (version serveur plus récente)
 *  retombe sur « Autre mesure » : on ne peint jamais un identifiant technique. */
const SIGNAL_LABELS: Record<string, Entry> = {
  sustained_speed: C.sigSustainedSpeed,
  acceleration: C.sigAcceleration,
  gps_accuracy: C.sigGpsAccuracy,
  gps_jumps: C.sigGpsJumps,
  distance_time_ratio: C.sigDistanceTimeRatio,
  step_coherence: C.sigStepCoherence,
  trace_regularity: C.sigTraceRegularity,
  duplicate_trace: C.sigDuplicateTrace,
  future_timestamps: C.sigFutureTimestamps,
};

const STATUS_LABELS: Record<ReviewStatus, Entry> = {
  open: C.statutOpen,
  in_progress: C.statutInProgress,
  closed: C.statutClosed,
};

const DECISION_LABELS: Record<FinalDecision, Entry> = {
  upheld: C.decisionUpheld,
  overturned: C.decisionOverturned,
  partially_overturned: C.decisionPartial,
};

export default function AppelScreen() {
  const t = useT();
  const { session, loading: sessionLoading, configured } = useSession();
  const [etat, setEtat] = useState<Etat>({ kind: 'loading' });
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [echecEnvoi, setEchecEnvoi] = useState(false);

  useEffect(() => {
    screen('appel');
  }, []);

  const charger = useCallback(async () => {
    if (!configured || !supabase) {
      setEtat({ kind: 'unconfigured' });
      return;
    }
    if (sessionLoading) {
      setEtat({ kind: 'loading' });
      return;
    }
    const userId = session?.user.id;
    if (!userId) {
      setEtat({ kind: 'signed_out' });
      return;
    }
    setEtat({ kind: 'loading' });
    // `.eq('user_id', …)` alors que la RLS le fait déjà : la policy est la
    // garantie, ce filtre est la lisibilité. Si la policy sautait un jour, la
    // requête resterait bornée — deux serrures valent mieux qu'une sur une
    // donnée qui dit « ce compte a été vérifié ».
    const rev = await supabase
      .from('anticheat_reviews')
      .select('id, run_id, system_decision, status, opened_at, final_decision, signals')
      .eq('user_id', userId)
      .order('opened_at', { ascending: false })
      .limit(20);
    if (rev.error) {
      setEtat({ kind: 'failed' });
      return;
    }
    const app = await supabase
      .from('anticheat_appeals')
      .select('id, review_id, status, decision')
      .eq('user_id', userId);
    if (app.error) {
      setEtat({ kind: 'failed' });
      return;
    }
    setEtat({
      kind: 'loaded',
      reviews: (rev.data ?? []) as ReviewRow[],
      appeals: (app.data ?? []) as AppealRow[],
    });
  }, [configured, session?.user.id, sessionLoading]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function faireAppel(review: ReviewRow): Promise<void> {
    if (!supabase || !session?.user.id) return;
    setEnvoi(review.id);
    setEchecEnvoi(false);
    // Trois colonnes, et pas une de plus : ce sont exactement celles que 0081
    // accorde au client (`grant insert (review_id, user_id, message)`). Le
    // statut et la décision viennent des DEFAULT — un joueur ne se rend pas
    // justice tout seul.
    const { error } = await supabase.from('anticheat_appeals').insert({
      review_id: review.id,
      user_id: session.user.id,
      message: message.trim().length > 0 ? message.trim() : null,
    });
    setEnvoi(null);
    if (error) {
      setEchecEnvoi(true);
      return;
    }
    setMessage('');
    await charger();
  }

  return (
    <StackScreen title={t(C.title)} kicker={t(C.kicker)} icon="bouclier">
      {etat.kind === 'loading' && (
        <Card style={styles.bloc}>
          <View style={styles.ligneAttente}>
            <ActivityIndicator color={colors.gris} />
            <Text style={styles.titreBloc}>{t(C.chargementTitle)}</Text>
          </View>
          <Text style={styles.corps}>{t(C.chargementBody)}</Text>
        </Card>
      )}

      {etat.kind === 'unconfigured' && (
        <Card style={styles.bloc}>
          <Text style={styles.titreBloc}>{t(C.horsLigneTitle)}</Text>
          <Text style={styles.corps}>{t(C.horsLigneBody)}</Text>
        </Card>
      )}

      {etat.kind === 'signed_out' && (
        <Card style={styles.bloc}>
          <Text style={styles.titreBloc}>{t(C.nonConnecteTitle)}</Text>
          <Text style={styles.corps}>{t(C.nonConnecteBody)}</Text>
          <View style={styles.cta}>
            <Button
              label={t(C.seConnecter)}
              onPress={() => router.push('/(auth)/sign-in')}
              analyticsId="appel_sign_in"
            />
          </View>
        </Card>
      )}

      {etat.kind === 'failed' && (
        <Card style={styles.bloc}>
          <Text style={styles.titreBloc}>{t(C.echecTitle)}</Text>
          <Text style={styles.corps}>{t(C.echecBody)}</Text>
          <View style={styles.cta}>
            <Button
              label={t(C.reessayer)}
              onPress={() => void charger()}
              analyticsId="appel_retry"
            />
          </View>
        </Card>
      )}

      {etat.kind === 'loaded' && etat.reviews.length === 0 && (
        <Card style={styles.bloc}>
          <Text style={styles.titreBloc}>{t(C.videTitle)}</Text>
          <Text style={styles.corps}>{t(C.videBody)}</Text>
        </Card>
      )}

      {etat.kind === 'loaded' && etat.reviews.length > 0 && (
        <>
          <SectionLabel style={styles.section}>{t(C.sectionCourses)}</SectionLabel>
          {etat.reviews.map((review) => {
            const appeal = etat.appeals.find((a) => a.review_id === review.id) ?? null;
            // Les données CONCERNÉES : les signaux qui ont pesé. Ceux qui étaient
            // indisponibles ne sont pas listés — les montrer laisserait croire
            // qu'une donnée absente a compté contre le joueur.
            const concernes = (review.signals ?? [])
              .filter((s) => s.available === true && (s.severity ?? 0) > 0)
              .map((s) => s.id)
              .filter((id): id is string => typeof id === 'string');
            return (
              <Card key={review.id} style={styles.bloc}>
                <Text style={styles.date}>{formatDate(review.opened_at)}</Text>
                <Text style={styles.titreBloc}>
                  {t(review.system_decision === 'REJECT' ? C.motifReject : C.motifReview)}
                </Text>

                <Text style={styles.label}>{t(C.resteLabel)}</Text>
                <Text style={styles.corps}>{t(C.resteBody)}</Text>

                {concernes.length > 0 && (
                  <>
                    <Text style={styles.label}>{t(C.donneesLabel)}</Text>
                    {concernes.map((id) => (
                      <Text key={id} style={styles.puce}>
                        {`· ${t(SIGNAL_LABELS[id] ?? C.sigInconnu)}`}
                      </Text>
                    ))}
                  </>
                )}

                <Text style={styles.label}>{t(C.statutLabel)}</Text>
                <Text style={styles.corps}>{t(STATUS_LABELS[review.status])}</Text>

                {review.final_decision !== null && (
                  <>
                    <Text style={styles.label}>{t(C.decisionLabel)}</Text>
                    <Text style={styles.corps}>{t(DECISION_LABELS[review.final_decision])}</Text>
                  </>
                )}

                <Text style={styles.label}>{t(C.delaiLabel)}</Text>
                <Text style={styles.corps}>{t(C.delaiBody)}</Text>
                <Text style={styles.note}>{t(C.sansPaiement)}</Text>

                <Text style={styles.label}>{t(C.appelLabel)}</Text>
                {appeal === null ? (
                  <>
                    <Text style={styles.corps}>{t(C.appelInvite)}</Text>
                    <TextInput
                      style={styles.champ}
                      value={message}
                      onChangeText={setMessage}
                      placeholder={t(C.appelPlaceholder)}
                      placeholderTextColor={colors.grisFaible}
                      multiline
                      maxLength={2000}
                      accessibilityLabel={t(C.appelPlaceholder)}
                    />
                    {echecEnvoi && <Text style={styles.echec}>{t(C.appelEchec)}</Text>}
                    <View style={styles.cta}>
                      <Button
                        label={envoi === review.id ? t(C.appelEnvoi) : t(C.appelCta)}
                        onPress={() => void faireAppel(review)}
                        loading={envoi === review.id}
                        analyticsId="appel_submit"
                      />
                    </View>
                  </>
                ) : (
                  <Text style={styles.corps}>
                    {t(
                      appeal.status === 'closed'
                        ? C.appelClos
                        : appeal.status === 'in_progress'
                          ? C.appelEnCours
                          : C.appelRecu,
                    )}
                  </Text>
                )}
                {appeal?.decision != null && (
                  <Text style={styles.corps}>{t(DECISION_LABELS[appeal.decision])}</Text>
                )}
              </Card>
            );
          })}

          <SectionLabel style={styles.section}>{t(C.honneteteLabel)}</SectionLabel>
          <Text style={styles.note}>{t(C.honneteteBody)}</Text>
        </>
      )}
    </StackScreen>
  );
}

/**
 * Date locale COURTE. `toLocaleDateString` sans argument de langue suit la
 * locale de l'appareil : c'est le bon comportement pour une date, et ça évite
 * d'inventer un format par langue dans le catalogue.
 */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
}

const styles = StyleSheet.create({
  bloc: { marginTop: spacing.md, gap: spacing.sm },
  section: { marginTop: spacing.lg },
  ligneAttente: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titreBloc: { ...typography.cardTitle, color: colors.blanc },
  corps: { ...typography.body, color: colors.blanc },
  note: { ...typography.meta, color: colors.gris },
  date: { ...typography.meta, color: colors.grisFaible },
  label: { ...typography.kicker, color: colors.gris, textTransform: 'uppercase', marginTop: spacing.sm },
  puce: { ...typography.body, color: colors.blanc },
  echec: { ...typography.meta, color: gameColors.danger },
  cta: { marginTop: spacing.sm },
  champ: {
    ...typography.body,
    color: colors.blanc,
    backgroundColor: colors.carbone2,
    borderRadius: radii.control,
    padding: spacing.md,
    minHeight: 88,
    textAlignVertical: 'top',
    fontSize: fontSizes.sm,
  },
});
