/**
 * GRYD — LA FILE DE REVUE ANTI-TRICHE, DÉPILÉE PAR UN HUMAIN (route `/moderation`).
 *
 * ══ CE QUE CET ÉCRAN FERME ════════════════════════════════════════════════
 * ADR-015, chantier n° 1 : « Sans opérateur, une vérification est en pratique un
 * refus définitif. » Depuis le lot anti-triche du 11/09, une sortie suspecte
 * entre dans `anticheat_reviews` (0081) et son territoire est gelé
 * (`verification_required`, 0155). PERSONNE ne dépilait cette file. Cet écran,
 * avec la migration 0187, est la personne.
 *
 * ══ TOUT EST DÉCIDÉ SERVEUR, Y COMPRIS « AI-JE LE DROIT D'ÊTRE ICI » ══════
 * L'écran n'a AUCUNE liste de modérateurs, AUCUN drapeau local, AUCUNE règle.
 * Il pose deux questions au serveur et affiche les réponses :
 *   · `am_i_moderator_2026()` — peint ou ne peint pas ;
 *   · `anticheat_reviews_pending_2026(n)` — la file, qui LÈVE `forbidden` pour
 *     qui n'est pas habilité. C'est cette levée qui produit l'état « pas
 *     d'habilitation » : l'écran ne se l'accorde jamais à lui-même.
 * Et l'écriture passe par `resolve_anticheat_review_2026`, qui refuse la propre
 * sortie de l'appelant, journalise, et est idempotente. Aucune table de jeu
 * n'est écrite depuis ce fichier.
 *
 * ══ QUATRE ÉTATS, JAMAIS CONFONDUS (L8/L14/L19) ═══════════════════════════
 * lecture en cours · aucun serveur relié (O1) · pas connecté · pas habilité ·
 * échec de lecture · lu. Et « lu » se scinde en deux : file VIDE (la vérité la
 * plus fréquente aujourd'hui) ou dossiers réels. Un échec de lecture ne se
 * déguise JAMAIS en « aucun dossier » : ce serait dire à un modérateur qu'il n'a
 * rien à faire alors que des dossiers attendent.
 *
 * ══ UN SEUL DOSSIER OUVERT À LA FOIS (§A) ═════════════════════════════════
 * La charte n'admet qu'un CTA chartreuse par écran. Une liste de dix dossiers
 * portant chacun son bouton « Valider » en violerait la lettre ET l'esprit :
 * dix boutons verts poussent au traitement à la chaîne, or c'est exactement ce
 * qu'une revue humaine ne doit pas être. On ouvre donc UN dossier, on décide,
 * on passe au suivant.
 *
 * ══ CE QUE L'ÉCRAN AFFICHE ET QUE E28 CACHE, ET POURQUOI ══════════════════
 * Le score et les preuves chiffrées. §11.2 les interdit au JOUEUR (« non
 * exposés comme règles de contournement ») ; les cacher à la personne qui juge
 * reviendrait à lui demander de trancher sur un résumé. Les libellés de signaux
 * sont ceux de E28, importés et non recopiés : le joueur qui fait appel doit
 * lire les mêmes mots que son modérateur.
 *
 * ══ CE QU'IL NE PROMET PAS ════════════════════════════════════════════════
 * Aucune notification n'est envoyée au joueur : aucun émetteur n'est branché sur
 * le moteur de §14.3 (0141). Le joueur lit la décision sur E28, là où il est
 * déjà allé la chercher. Ne pas ajouter ici « le joueur va être prévenu ».
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontSizes, gameColors, radii, spacing, typography } from '@klaim/shared';
import { C as CAppel } from '../../i18n/catalog/appel';
import { C } from '../../i18n/catalog/moderation';
import { useT } from '../../i18n/store';
import type { Entry } from '../../i18n/types';
import { screen } from '../../lib/analytics';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { SectionLabel } from '../../ui/SectionLabel';
import { StackScreen } from '../../ui/StackScreen';

// ─── Les formes rendues par 0187, lues DÉFENSIVEMENT ─────────────────────────
// Le serveur peut être plus récent que ce build : une clé inconnue est ignorée,
// une clé attendue mais absente ne fait pas tomber l'écran. Un outil de
// modération qui plante est un outil qui n'est pas utilisé.

interface SignalRow {
  readonly id?: string;
  readonly available?: boolean;
  readonly severity?: number;
  readonly evidence?: Record<string, number>;
}

interface Dossier {
  readonly reviewId: string;
  readonly runId: string;
  readonly player: string;
  readonly systemDecision: string;
  readonly suspicion: number;
  readonly signals: readonly SignalRow[] | null;
  readonly openedAt: string;
  readonly run: {
    readonly startedAt?: string | null;
    readonly activity?: string | null;
    readonly distanceM?: number | null;
    readonly durationS?: number | null;
    readonly avgPaceSKm?: number | null;
    readonly captureStatus?: string | null;
  } | null;
  readonly appeal: {
    readonly appealId: string;
    readonly message?: string | null;
    readonly createdAt?: string | null;
  } | null;
}

interface Resultat {
  readonly reviewId: string;
  readonly alreadyClosed: boolean;
  readonly finalDecision: string;
  readonly captureReadmitted: number;
  readonly captureUnconfirmed: number;
  readonly captureRefused: number;
  readonly captureExpired: number;
  readonly appealClosed: boolean;
  readonly xpUnblocked: boolean;
}

type Verdict = 'validated' | 'rejected';

type Etat =
  | { kind: 'loading' }
  | { kind: 'unconfigured' }
  | { kind: 'signed_out' }
  | { kind: 'forbidden' }
  | { kind: 'failed' }
  | { kind: 'loaded'; dossiers: readonly Dossier[] };

/** Libellés de signaux : ceux de E28, importés. Deux tables des mêmes mesures
 *  finiraient par nommer la même chose de deux façons — et le joueur qui fait
 *  appel lirait un mot que son modérateur n'emploie pas.
 *  Les DEUX dernières viennent du catalogue de modération : `catalog/appel.ts`
 *  ne les nomme pas encore (il date d'avant ADR-015), et « Autre mesure » sur
 *  les deux signaux les plus décisifs ferait juger à l'aveugle. */
const SIGNAL_LABELS: Record<string, Entry> = {
  sustained_speed: CAppel.sigSustainedSpeed,
  acceleration: CAppel.sigAcceleration,
  gps_accuracy: CAppel.sigGpsAccuracy,
  gps_jumps: CAppel.sigGpsJumps,
  distance_time_ratio: CAppel.sigDistanceTimeRatio,
  step_coherence: CAppel.sigStepCoherence,
  trace_regularity: CAppel.sigTraceRegularity,
  duplicate_trace: CAppel.sigDuplicateTrace,
  future_timestamps: CAppel.sigFutureTimestamps,
  discipline_mismatch: C.sigDisciplineMismatch,
  mocked_location: C.sigMockedLocation,
};

const nombre = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** Un tableau de dossiers, ou `null` si la réponse n'a pas la forme attendue.
 *  `null` mène à l'état d'ÉCHEC, jamais à une file vide : « je n'ai pas compris
 *  la réponse » et « il n'y a rien » sont deux phrases différentes. */
function lireFile(data: unknown): readonly Dossier[] | null {
  if (!Array.isArray(data)) return null;
  const out: Dossier[] = [];
  for (const brut of data) {
    if (typeof brut !== 'object' || brut === null) continue;
    const d = brut as Record<string, unknown>;
    if (typeof d.reviewId !== 'string' || typeof d.runId !== 'string') continue;
    out.push({
      reviewId: d.reviewId,
      runId: d.runId,
      player: typeof d.player === 'string' ? d.player : d.runId.slice(0, 8),
      systemDecision: typeof d.systemDecision === 'string' ? d.systemDecision : '',
      suspicion: nombre(d.suspicion),
      signals: Array.isArray(d.signals) ? (d.signals as SignalRow[]) : null,
      openedAt: typeof d.openedAt === 'string' ? d.openedAt : '',
      run: (typeof d.run === 'object' && d.run !== null ? d.run : null) as Dossier['run'],
      appeal: (typeof d.appeal === 'object' && d.appeal !== null ? d.appeal : null) as Dossier['appeal'],
    });
  }
  return out;
}

function lireResultat(data: unknown): Resultat | null {
  if (typeof data !== 'object' || data === null) return null;
  const r = data as Record<string, unknown>;
  if (typeof r.reviewId !== 'string') return null;
  return {
    reviewId: r.reviewId,
    alreadyClosed: r.alreadyClosed === true,
    finalDecision: typeof r.finalDecision === 'string' ? r.finalDecision : '',
    captureReadmitted: nombre(r.captureReadmitted),
    captureUnconfirmed: nombre(r.captureUnconfirmed),
    captureRefused: nombre(r.captureRefused),
    captureExpired: nombre(r.captureExpired),
    appealClosed: r.appealClosed === true,
    xpUnblocked: r.xpUnblocked === true,
  };
}

/** Date locale COURTE : `toLocaleDateString` sans argument suit la locale de
 *  l'appareil, ce qui évite d'inventer un format par langue. */
function jour(iso: string | null | undefined): string {
  if (typeof iso !== 'string') return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
}

export default function ReviewQueue2026() {
  const t = useT();
  const { session, loading: sessionLoading, configured } = useSession();
  const [etat, setEtat] = useState<Etat>({ kind: 'loading' });
  /** Le dossier ouvert. UN SEUL (§A) : voir le bloc d'en-tête. */
  const [ouvert, setOuvert] = useState<string | null>(null);
  /** Notes INDEXÉES PAR DOSSIER : un état partagé ferait migrer la note d'un
   *  dossier dans le journal d'un autre, sur des décisions nominatives. */
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [confirmation, setConfirmation] = useState<{ reviewId: string; verdict: Verdict } | null>(null);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [echecEnvoi, setEchecEnvoi] = useState<{ reviewId: string; refus: boolean } | null>(null);
  const [resultat, setResultat] = useState<Resultat | null>(null);

  useEffect(() => {
    screen('moderation');
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
    if (!session?.user.id) {
      setEtat({ kind: 'signed_out' });
      return;
    }
    setEtat({ kind: 'loading' });
    const { data, error } = await supabase.rpc('anticheat_reviews_pending_2026', { p_limit: 25 });
    if (error) {
      // `forbidden` est la LEVÉE du serveur, pas un accident de réseau : c'est
      // ce qui distingue « tu n'es pas habilité » de « je n'ai pas pu lire ».
      setEtat(/forbidden/i.test(error.message) ? { kind: 'forbidden' } : { kind: 'failed' });
      return;
    }
    const dossiers = lireFile(data);
    setEtat(dossiers === null ? { kind: 'failed' } : { kind: 'loaded', dossiers });
  }, [configured, session?.user.id, sessionLoading]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function trancher(reviewId: string, verdict: Verdict): Promise<void> {
    if (!supabase) return;
    setEnvoi(reviewId);
    setEchecEnvoi(null);
    const note = (notes[reviewId] ?? '').trim();
    const { data, error } = await supabase.rpc('resolve_anticheat_review_2026', {
      p_review_id: reviewId,
      p_verdict: verdict,
      p_note: note.length > 0 ? note : null,
    });
    setEnvoi(null);
    if (error) {
      setEchecEnvoi({ reviewId, refus: /own_run_forbidden|forbidden/i.test(error.message) });
      return;
    }
    setConfirmation(null);
    setOuvert(null);
    setNotes((prev) => ({ ...prev, [reviewId]: '' }));
    setResultat(lireResultat(data));
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
              analyticsId="moderation_sign_in"
            />
          </View>
        </Card>
      )}

      {etat.kind === 'forbidden' && (
        <Card style={styles.bloc}>
          <Text style={styles.titreBloc}>{t(C.interditTitle)}</Text>
          <Text style={styles.corps}>{t(C.interditBody)}</Text>
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
              analyticsId="moderation_retry"
            />
          </View>
        </Card>
      )}

      {/* CE QUE LA DÉCISION A RÉELLEMENT FAIT. Rendu au-dessus de la file, et
          non dans le dossier : celui-ci vient de quitter la liste. Les nombres
          viennent du SERVEUR — jamais d'une supposition du client. */}
      {resultat !== null && (
        <Card style={styles.bloc}>
          <Text style={styles.titreBloc}>
            {t(
              resultat.alreadyClosed
                ? C.resultatDejaClos
                : resultat.finalDecision === 'overturned'
                  ? C.resultatValide
                  : C.resultatRejete,
            )}
          </Text>
          {resultat.captureReadmitted > 0 && (
            <Text style={styles.corps}>{t(C.resultatTerrainRendu, { n: resultat.captureReadmitted })}</Text>
          )}
          {resultat.captureRefused > 0 && (
            <Text style={styles.corps}>{t(C.resultatTerrainRefuse, { n: resultat.captureRefused })}</Text>
          )}
          {resultat.captureExpired > 0 && (
            <Text style={styles.corps}>{t(C.resultatTerrainExpire, { n: resultat.captureExpired })}</Text>
          )}
          {resultat.captureUnconfirmed > 0 && (
            <Text style={styles.corps}>
              {t(C.resultatTerrainNonConfirme, { n: resultat.captureUnconfirmed })}
            </Text>
          )}
          {resultat.xpUnblocked && <Text style={styles.corps}>{t(C.resultatXp)}</Text>}
          {resultat.appealClosed && <Text style={styles.note}>{t(C.resultatAppelClos)}</Text>}
        </Card>
      )}

      {etat.kind === 'loaded' && etat.dossiers.length === 0 && (
        <Card style={styles.bloc}>
          <Text style={styles.titreBloc}>{t(C.videTitle)}</Text>
          <Text style={styles.corps}>{t(C.videBody)}</Text>
        </Card>
      )}

      {etat.kind === 'loaded' && etat.dossiers.length > 0 && (
        <>
          <SectionLabel style={styles.section}>{t(C.sectionFile)}</SectionLabel>
          {etat.dossiers.map((d) => {
            const estOuvert = ouvert === d.reviewId;
            const enConfirmation = confirmation?.reviewId === d.reviewId;
            // Les mesures qui ont RÉELLEMENT pesé. Une mesure indisponible n'est
            // pas listée : la montrer laisserait croire qu'une donnée absente a
            // compté contre quelqu'un.
            const pesees = (d.signals ?? []).filter(
              (s) => s.available === true && (s.severity ?? 0) > 0,
            );
            const capture = d.run?.captureStatus ?? null;
            return (
              <Card key={d.reviewId} style={styles.bloc}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: estOuvert }}
                  onPress={() => {
                    setOuvert(estOuvert ? null : d.reviewId);
                    setConfirmation(null);
                    setEchecEnvoi(null);
                  }}
                >
                  <Text style={styles.date}>{jour(d.openedAt)}</Text>
                  <Text style={styles.titreBloc}>{d.player}</Text>
                  <Text style={styles.corps}>
                    {t(C.scoreValeur, { score: d.suspicion })}
                  </Text>
                </Pressable>

                {estOuvert && (
                  <>
                    <Text style={styles.label}>{t(C.sortieLabel)}</Text>
                    <Text style={styles.corps}>{jour(d.run?.startedAt)}</Text>
                    <Text style={styles.corps}>
                      {t(C.sortieResume, {
                        distance: (nombre(d.run?.distanceM) / 1000).toFixed(1),
                        duree: Math.round(nombre(d.run?.durationS) / 60),
                        allure: Math.round(nombre(d.run?.avgPaceSKm) / 60),
                      })}
                    </Text>

                    <Text style={styles.label}>{t(C.scoreLabel)}</Text>
                    <Text style={styles.corps}>{t(C.scoreValeur, { score: d.suspicion })}</Text>

                    <Text style={styles.label}>{t(C.signauxLabel)}</Text>
                    {pesees.length === 0 ? (
                      <Text style={styles.corps}>{t(C.signalAucun)}</Text>
                    ) : (
                      pesees.map((s, i) => (
                        <View key={`${s.id ?? 'x'}-${i}`}>
                          <Text style={styles.puce}>
                            {`· ${t(SIGNAL_LABELS[s.id ?? ''] ?? CAppel.sigInconnu)}`}
                          </Text>
                          {/* Les PREUVES CHIFFRÉES telles que le moteur les a
                              écrites. Aucun seuil n'est ajouté ici : on montre
                              ce qui a été mesuré, pas la règle qui a tranché. */}
                          {Object.entries(s.evidence ?? {}).map(([k, v]) => (
                            <Text key={k} style={styles.preuve}>{`${k} : ${v}`}</Text>
                          ))}
                        </View>
                      ))
                    )}

                    <Text style={styles.label}>{t(C.captureLabel)}</Text>
                    <Text style={styles.corps}>
                      {t(
                        capture === 'pending'
                          ? C.capturePending
                          : capture === 'rejected'
                            ? C.captureExpire
                            : C.captureAutre,
                      )}
                    </Text>

                    <Text style={styles.label}>{t(C.appelLabel)}</Text>
                    {d.appeal === null ? (
                      <Text style={styles.corps}>{t(C.appelAucun)}</Text>
                    ) : typeof d.appeal.message === 'string' && d.appeal.message.trim().length > 0 ? (
                      <Text style={styles.corps}>{d.appeal.message}</Text>
                    ) : (
                      <Text style={styles.corps}>{t(C.appelSansMot)}</Text>
                    )}

                    {enConfirmation ? (
                      <>
                        <Text style={styles.label}>
                          {t(
                            confirmation.verdict === 'validated'
                              ? C.confirmerValiderTitle
                              : C.confirmerRejeterTitle,
                          )}
                        </Text>
                        <Text style={styles.corps}>
                          {t(
                            confirmation.verdict === 'validated'
                              ? C.confirmerValiderBody
                              : C.confirmerRejeterBody,
                          )}
                        </Text>
                        {echecEnvoi?.reviewId === d.reviewId && (
                          <Text accessibilityRole="alert" style={styles.echec}>
                            {t(echecEnvoi.refus ? C.envoiRefus : C.envoiEchec)}
                          </Text>
                        )}
                        <View style={styles.cta}>
                          <Button
                            label={
                              envoi === d.reviewId
                                ? t(C.envoiEnCours)
                                : t(confirmation.verdict === 'validated' ? C.valider : C.rejeter)
                            }
                            loading={envoi === d.reviewId}
                            onPress={() => void trancher(d.reviewId, confirmation.verdict)}
                            analyticsId="moderation_resolve"
                          />
                        </View>
                        <View style={styles.ctaSecondaire}>
                          <Button
                            label={t(C.annuler)}
                            variant="ghost"
                            size="md"
                            onPress={() => setConfirmation(null)}
                            analyticsId="moderation_cancel"
                          />
                        </View>
                      </>
                    ) : (
                      <>
                        <Text style={styles.label}>{t(C.decisionLabel)}</Text>
                        <Text style={styles.note}>{t(C.noteLabel)}</Text>
                        <TextInput
                          style={styles.champ}
                          value={notes[d.reviewId] ?? ''}
                          onChangeText={(v) => setNotes((prev) => ({ ...prev, [d.reviewId]: v }))}
                          placeholder={t(C.notePlaceholder)}
                          placeholderTextColor={colors.grisFaible}
                          multiline
                          maxLength={2000}
                          accessibilityLabel={t(C.noteLabel)}
                        />
                        <View style={styles.cta}>
                          <Button
                            label={t(C.valider)}
                            onPress={() => setConfirmation({ reviewId: d.reviewId, verdict: 'validated' })}
                            analyticsId="moderation_validate_open"
                          />
                        </View>
                        <View style={styles.ctaSecondaire}>
                          <Button
                            label={t(C.rejeter)}
                            variant="ghost"
                            size="md"
                            onPress={() => setConfirmation({ reviewId: d.reviewId, verdict: 'rejected' })}
                            analyticsId="moderation_reject_open"
                          />
                        </View>
                      </>
                    )}
                  </>
                )}
              </Card>
            );
          })}

          <SectionLabel style={styles.section}>{t(C.deontologieLabel)}</SectionLabel>
          <Text style={styles.note}>{t(C.deontologieBody)}</Text>
        </>
      )}
    </StackScreen>
  );
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
  preuve: { ...typography.meta, color: colors.gris, marginLeft: spacing.md },
  echec: { ...typography.meta, color: gameColors.danger },
  cta: { marginTop: spacing.sm },
  ctaSecondaire: { marginTop: spacing.xs },
  champ: {
    ...typography.body,
    color: colors.blanc,
    backgroundColor: colors.carbone2,
    borderRadius: radii.control,
    padding: spacing.md,
    minHeight: 72,
    textAlignVertical: 'top',
    fontSize: fontSizes.sm,
  },
});
