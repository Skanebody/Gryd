/**
 * GRYD — TOI : le suivi, le compte, le légal (lot M12).
 *
 * ─── POURQUOI CET ÉCRAN EXISTE ──────────────────────────────────────────────
 * La bascule d'entrée avait rendu injoignables la suppression de compte,
 * l'export, la confidentialité et l'aide. Ce n'était pas une perte de confort :
 * **Apple 5.1.1(v)** exige qu'une app permettant de créer un compte permette de
 * le supprimer DANS l'app, et le RGPD exige la portabilité. Sans cet écran, le
 * build est refusé — et il le mériterait.
 *
 * ─── LE TABLEAU DE BORD, ET SA MARGE DÉLIBÉRÉE ──────────────────────────────
 * Quatre chiffres : territoire, sorties, distance, dernière course. C'est ce
 * qu'un coureur regarde entre deux sorties. Ce qui n'y est pas — allures par
 * segment, dénivelé, tendances, carte de chaleur — n'est pas un oubli : c'est la
 * place laissée à une offre payante future (ADR-011), qui pourra s'installer
 * sans rien reprendre.
 *
 * ─── UNE SEULE ACTION PRIMAIRE, ET CE N'EST PAS LA SUPPRESSION ──────────────
 * Tout est en TEXTE ici. Peindre « Supprimer mon compte » en bouton plein
 * chartreuse en ferait l'action la plus visible de l'écran — exactement
 * l'inverse de ce qu'on veut d'une action irréversible (L17 en miroir).
 */
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ACCOUNT_DELETION_GRACE_DAYS,
  borderState,
  colors,
  fonts,
  fontSizes,
  gameColors,
  spacing,
  typography,
} from '@klaim/shared';
import { useSession } from '../../src/lib/session';
import { signOut } from '../../src/lib/auth';
import {
  canRetryStats,
  statAreaM2,
  statDistanceM,
  statRuns,
  statsStatus,
  type StatsRead,
} from '../../src/mvp/profil/stats';
import {
  accountView,
  canExport,
  DELETION_NEEDS_CONFIRMATION,
  type DeletionStatus,
} from '../../src/mvp/profil/account';
import {
  cancelDeletion,
  readDeletionStatus,
  readMyStats,
  requestDeletion,
} from '../../src/mvp/profil/read';
import { heroArea } from '../../src/mvp/ui/area';
import { Glyph } from '../../src/mvp/ui/Glyph';
import { SkeletonBlock, SkeletonGroup } from '../../src/mvp/ui/Skeleton';
import { C } from '../../src/i18n/catalog/mvp';
import { useT } from '../../src/i18n/store';
import { useAnnonce } from '../../src/mvp/ui/announce';
import { screen } from '../../src/lib/analytics';

const TOUCH_TARGET_PT = 44;

/**
 * Interligne du corps, en MULTIPLE de la taille de police.
 *
 * ⚠️ Pas dans `StyleSheet.create` : un `lineHeight` numérique ne suit PAS
 * Dynamic Type alors que `fontSize` le suit. Figé à 24 pt, il faisait se
 * recouvrir les lignes dès AX3 (~2,35× : un corps à ~38 pt dans un interligne
 * de 24) — y compris sur la phrase de confirmation de suppression de compte,
 * la seule décision de l'app qu'on ne peut pas défaire.
 */
const INTERLIGNE = 1.5;

export default function Profil() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const interligne = { lineHeight: Math.round(fontSizes.md * INTERLIGNE * fontScale) };
  const { session, loading: sessionLoading } = useSession();
  const userId = session?.user?.id ?? null;
  const [read, setRead] = useState<StatsRead>({ kind: 'idle' });
  const [suppression, setSuppression] = useState<DeletionStatus | null>(null);
  /**
   * ⚠️ LA CONFIRMATION EST UN ÉTAT DE L'ÉCRAN, PAS UNE `Alert`.
   *
   * `react-native-web` n'a AUCUN module `Alert` : `Alert.alert` y est un no-op
   * silencieux. Or `app.json` déclare la cible web — donc sur web, taper
   * « Supprimer mon compte » n'affichait RIEN, sur la seule action qu'Apple
   * 5.1.1(v) exige et que le RGPD impose. Le bouton n'était pas discret : il
   * était mort. Rendre la confirmation DANS l'écran la rend vraie partout.
   *
   * `failed` est le troisième état, et il n'est pas décoratif : la RPC répond
   * `{ ok: false }` avec un code 200, donc un refus doit se DIRE.
   */
  const [confirmation, setConfirmation] = useState<'idle' | 'asking' | 'failed'>('idle');

  useEffect(() => {
    screen('profil');
  }, []);

  const charger = useCallback(async () => {
    if (userId === null) return;
    setRead({ kind: 'loading' });
    setRead(await readMyStats(userId));
    setSuppression(await readDeletionStatus());
  }, [userId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  // `restoring` AVANT `signedOut` — même piège que la carte (`homeState.ts`) :
  // au démarrage à froid, la session est lue depuis le stockage avant d'être
  // connue, et la confondre avec « pas de compte » masquerait la suppression
  // de compte exigée par l'App Store le temps d'un aller-retour.
  const etat = {
    session: sessionLoading ? ('restoring' as const) : userId === null ? ('signedOut' as const) : ('signedIn' as const),
    read,
  };
  const statut = statsStatus(etat);
  const compte = accountView(suppression);

  const aire = heroArea(statAreaM2(etat));
  const sorties = statRuns(etat);
  const distM = statDistanceM(etat);
  /**
   * UNE SEULE CONVENTION, et elle tient en une phrase : dans `ready`, tout est
   * connu, donc tout s'écrit — y compris un zéro, qui RÉPOND alors à la question.
   * Ailleurs, ce n'est pas un chiffre qui manque, c'est le bloc entier qui cède
   * la place à une phrase ou à un skeleton.
   *
   * La version précédente mélangeait deux conventions contradictoires sur la même
   * ligne — `?? '0'` pour l'aire, `?? '—'` pour la distance — donc le même
   * « je ne sais pas » se lisait tantôt comme zéro, tantôt comme un blanc.
   */
  const km = distM !== null ? (Math.round(distM / 10) / 100).toFixed(2).replace('.', ',') : null;

  /**
   * Les deux statuts qui apparaissent SANS que le joueur n'ait rien touché.
   * `accessibilityLiveRegion` est une prop Android : sur iOS, seul un appel
   * explicite annonce quoi que ce soit.
   */
  useAnnonce(
    statut === 'failed' ? t(C.statsFailed) : statut === 'empty' ? t(C.statsEmpty) : null,
  );
  useAnnonce(confirmation === 'failed' ? t(C.accountDeleteFailed) : null);

  const supprimer = useCallback(async () => {
    const issue = await requestDeletion();
    // ⚠️ `issue` est un OBJET : `if (await requestDeletion())` serait toujours
    // vrai, y compris sur un refus. C'est le piège que le type a introduit en
    // corrigeant le précédent — il fallait lire `done`, pas la vérité de l'objet.
    if (issue.done) {
      setSuppression(issue.status);
      setConfirmation('idle');
      return;
    }
    setConfirmation('failed');
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.lg }]}>
      <ScrollView
        contentContainerStyle={[styles.contenu, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* `header` : sans lui, le rotor « En-têtes » de VoiceOver ne trouve
            RIEN sur l'écran le plus LONG du MVP — suivi, compte, légal. On ne
            pouvait pas sauter à « Compte » pour supprimer le sien, il fallait
            balayer tout le tableau de bord. */}
        <Text style={styles.titre} accessibilityRole="header">
          {t(C.profilTitle)}
        </Text>

        {/* ── LE SUIVI ───────────────────────────────────────────────────── */}
        {statut === 'ready' ? (
          <View style={styles.chiffres}>
            {/* Le territoire domine (L12) — MAIS un zéro ne peut pas être le
                chiffre héros : « 0 » en chartreuse géant se lit comme un score
                raté, alors qu'avoir couru sans refermer est une étape NORMALE du
                jeu. `heroArea` rend `null` là, et on le dit en toutes lettres.
                Le `?? '0'` d'avant court-circuitait précisément cette garde. */}
            {aire !== null ? (
              // UN SEUL élément d'accessibilité pour le chiffre héros. Le
              // groupe remplace un fragment : le `gap` du parent s'appliquait
              // entre le bloc et sa légende, il s'applique désormais À
              // L'INTÉRIEUR du groupe — l'écran ne bouge pas d'un pixel, mais
              // VoiceOver ne s'arrête plus trois fois (« 64 » … « m² » …
              // « Territoire ») sur le chiffre du jeu.
              <View
                style={styles.heroGroupe}
                accessible
                accessibilityLabel={t(C.a11yAreaTerritory, { n: aire })}
              >
                <View style={styles.bloc}>
                  <Text style={styles.hero} numberOfLines={1} adjustsFontSizeToFit>
                    {aire}
                  </Text>
                  <Text style={styles.unite}>{t(C.unitM2)}</Text>
                </View>
                <Text style={styles.legende}>{t(C.statTerritory)}</Text>
              </View>
            ) : (
              <Text style={[styles.phrase, interligne]}>{t(C.statsNoTerritory)}</Text>
            )}

            <View style={styles.ligne}>
              <View style={styles.demi}>
                <Text style={styles.second}>{sorties}</Text>
                <Text style={styles.statLabel}>{t(C.statRuns)}</Text>
              </View>
              <View style={styles.demi}>
                <Text style={styles.second}>{km}</Text>
                <Text style={styles.statLabel}>
                  {t(C.statDistance)} · {t(C.unitKm)}
                </Text>
              </View>
            </View>
          </View>
        ) : statut === 'loading' ? (
          // L14 — la FORME du tableau de bord, pas un sablier. `accessible` +
          // `accessibilityLabel` portent l'annonce du chargement : le skeleton
          // reste décoratif (voir l'en-tête de `Skeleton.tsx`), sinon un
          // VoiceOver n'apprendrait plus rien pendant tout le chargement — une
          // régression que la version en texte n'avait pas.
          <View accessible accessibilityLabel={t(C.mapLoading)} accessibilityLiveRegion="polite">
            <SkeletonGroup style={styles.chiffres}>
              <View style={styles.blocSkeleton}>
                <SkeletonBlock width={96} height={fontSizes.hero} />
                <SkeletonBlock width={32} height={fontSizes.lg} />
              </View>
              <SkeletonBlock width={120} height={fontSizes.sm} />
              <View style={styles.ligne}>
                <View style={styles.demi}>
                  <SkeletonBlock width={48} height={fontSizes.xl} />
                  <SkeletonBlock width={70} height={fontSizes.sm} style={styles.legendeSkeleton} />
                </View>
                <View style={styles.demi}>
                  <SkeletonBlock width={48} height={fontSizes.xl} />
                  <SkeletonBlock width={90} height={fontSizes.sm} style={styles.legendeSkeleton} />
                </View>
              </View>
            </SkeletonGroup>
          </View>
        ) : (
          // `accessibilityLiveRegion` : cette phrase REMPLACE le skeleton sans
          // que l'écran change. Seul `loading` était annoncé — donc VoiceOver
          // disait « lecture en cours… », puis plus jamais rien, que la lecture
          // ait abouti à un vide, à un échec ou à « sans compte ».
          <Text style={[styles.phrase, interligne]} accessibilityLiveRegion="polite">
            {statut === 'failed'
              ? t(C.statsFailed)
              : statut === 'signedOut'
                ? t(C.mapSignedOut)
                : t(C.statsEmpty)}
          </Text>
        )}

        {canRetryStats(etat) ? (
          <Lien label={t(C.mapRetry)} onPress={() => void charger()} />
        ) : null}

        {/* La porte de RETOUR. Sans elle, « Se déconnecter » était un aller sans
            retour : plus aucun chemin vers la connexion depuis l'app entière.
            `signedOut` et non `userId === null` — pendant la RESTAURATION on ne
            sait pas encore, et proposer de se connecter à quelqu'un qui l'est
            déjà est la même faute, dans l'autre sens. */}
        {statut === 'signedOut' ? (
          <Lien label={t(C.ctaSignIn)} onPress={() => router.push('/connexion')} nav />
        ) : null}

        {/* ── LE COMPTE (App Store 5.1.1(v) + RGPD) ──────────────────────── */}
        {userId !== null ? (
          <>
            <Text style={styles.section} accessibilityRole="header">
              {t(C.accountTitle)}
            </Text>
            <Lien
              label={t(C.accountSignOut)}
              onPress={() => {
                // ATTENDU avant de naviguer : la carte relit la session au
                // montage, et partir trop tôt la lui faisait lire ENCORE
                // connectée — elle peignait alors un état déjà faux.
                void (async () => {
                  await signOut();
                  router.replace('/carte');
                })();
              }}
            />
            {canExport(true) ? (
              // L'export vit sur l'écran legacy de confidentialité, qui le gère
              // déjà. Refaire une surface de portabilité RGPD à la hâte serait
              // exactement le genre de réécriture qu'on ne fait pas sans raison.
              <Lien label={t(C.accountExport)} onPress={() => router.push('/confidentialite')} nav />
            ) : null}

            {/* Une demande EN COURS n'offre PAS de re-supprimer : elle DIT le
                délai et offre d'annuler. Reproposer « Supprimer » ferait croire
                que la première demande n'a pas pris. */}
            {compte.kind === 'pending' ? (
              <>
                <Text style={[styles.phrase, interligne]}>
                  {t(C.accountDeletePending, { d: String(compte.graceDays) })}
                </Text>
                <Lien
                  label={t(C.accountDeleteCancel)}
                  onPress={() => {
                    void (async () => {
                      // Même piège que `supprimer` : l'objet est toujours vrai.
                      const issue = await cancelDeletion();
                      if (issue.done) setSuppression(issue.status);
                    })();
                  }}
                />
              </>
            ) : null}

            {/* La confirmation, RENDUE DANS L'ÉCRAN (voir `confirmation`).
                Le délai vient de `ACCOUNT_DELETION_GRACE_DAYS`, pas de
                `suppression.graceDays` : hors `pending`, le serveur n'envoie
                AUCUN délai, et le `?? 0` d'avant promettait donc « 0 jours pour
                changer d'avis » — un mensonge, sur ce qu'on ne peut pas défaire.
                La constante est la même des deux côtés (migration 0046, drift
                testé au gate). */}
            {compte.kind === 'deletable' ? (
              confirmation === 'asking' ? (
                <View style={styles.confirmation}>
                  <Text style={[styles.phrase, interligne]}>
                    {t(C.accountDeleteConfirm, { d: String(ACCOUNT_DELETION_GRACE_DAYS) })}
                  </Text>
                  {/* « Annuler » d'abord : sur une action irréversible, la sortie
                      se lit avant l'entrée (L17 en miroir). */}
                  <Lien label={t(C.ctaCancel)} onPress={() => setConfirmation('idle')} />
                  <Lien label={t(C.accountDelete)} onPress={() => void supprimer()} danger />
                </View>
              ) : (
                <>
                  <Lien
                    label={t(C.accountDelete)}
                    onPress={() => {
                      if (DELETION_NEEDS_CONFIRMATION) {
                        setConfirmation('asking');
                        return;
                      }
                      void supprimer();
                    }}
                    danger
                  />
                  {/* RÉGION VIVE : la RPC répond `{ ok: false }` avec un code
                      200 — le refus arrive sans que rien d'autre ne bouge. Non
                      annoncé, il laissait croire à une suppression réussie. */}
                  {confirmation === 'failed' ? (
                    <Text style={[styles.phrase, interligne]} accessibilityLiveRegion="polite">
                      {t(C.accountDeleteFailed)}
                    </Text>
                  ) : null}
                </>
              )
            ) : null}
            {/* `unknown` → RIEN. Offrir de supprimer sans savoir où en est une
                demande précédente est le pire des deux mondes. */}
          </>
        ) : null}

        {/* ── LE LÉGAL ───────────────────────────────────────────────────── */}
        <Text style={styles.section} accessibilityRole="header">
          {t(C.legalTitle)}
        </Text>
        <Lien label={t(C.legalPrivacy)} onPress={() => router.push('/confidentialite')} nav />
        <Lien label={t(C.legalConduct)} onPress={() => router.push('/code-conduite')} nav />
        <Lien label={t(C.legalSupport)} onPress={() => router.push('/support')} nav />
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.ctaBackToMap)}
        onPress={() => router.replace('/carte')}
        hitSlop={spacing.sm}
        // L6 — la seule cible de l'écran qui ne répondait PAS au doigt : sur un
        // texte gris de 13 pt sans retour visuel, un tap manqué est
        // indiscernable d'un tap ignoré.
        //
        // ⚠️ À GAUCHE, PAS À DROITE. Sur iOS le coin haut-gauche est le retour ;
        // le coin haut-droit est réservé à la validation/au menu. Posé à droite,
        // ce contrôle occupait la place où le doigt cherche « Modifier » sans
        // jamais en être un.
        style={({ pressed }) => [styles.retour, { top: insets.top + spacing.sm }, pressed && styles.dim]}
      >
        <Glyph name="retour" size={18} color={colors.gris} />
        <Text style={styles.retourLabel}>{t(C.ctaBackToMap)}</Text>
      </Pressable>
    </View>
  );
}

/**
 * Tout est en TEXTE ici — voir l'en-tête : rien ne doit dominer visuellement.
 *
 * `nav` distingue les DEUX vocabulaires que ce composant portait sous un seul
 * style : un lien qui MÈNE ailleurs (chevron + séparateur, liste groupée iOS)
 * contre un lien qui AGIT ici même (texte nu, comme avant). Un chevron promet
 * une destination — en mettre un sur « Se déconnecter » ou « Supprimer mon
 * compte » mentirait sur ce que le tap fait.
 */
function Lien({
  label,
  onPress,
  danger,
  nav,
}: {
  readonly label: string;
  readonly onPress: () => void;
  readonly danger?: boolean;
  readonly nav?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={spacing.xs}
      style={({ pressed }) => [styles.item, nav === true && styles.itemNav, pressed && styles.dim]}
    >
      <Text style={[styles.itemLabel, danger === true && styles.danger]}>{label}</Text>
      {nav === true ? <Glyph name="suite" size={16} color={colors.gris} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  contenu: { paddingHorizontal: spacing.lg, gap: spacing.xs },
  titre: { color: colors.blanc, fontFamily: fonts.display, fontSize: fontSizes.xxl, marginBottom: spacing.md },
  chiffres: { gap: spacing.xs, marginBottom: spacing.md },
  // Le groupe d'accessibilité du chiffre héros. Il reprend le `gap` que le
  // parent appliquait entre le bloc et sa légende : l'écran est identique au
  // pixel près, seul le regroupement à l'oreille change (voir le rendu).
  heroGroupe: { gap: spacing.xs },
  // Colonne, pas ligne : le modèle Apple met l'unité SOUS le nombre, pas à
  // côté — le nombre reste seul sur sa ligne, ce qui double sa présence
  // perçue à taille égale (voir `typography.statUnit`).
  bloc: { flexDirection: 'column', alignItems: 'flex-start', gap: spacing.xxs },
  // Même empilement que `bloc` (nombre au-dessus, unité en dessous) : le
  // skeleton doit annoncer la FORME réelle, pas une ancienne disposition.
  blocSkeleton: { flexDirection: 'column', alignItems: 'flex-start', gap: spacing.xxs },
  // Les vrais `second`/`legende` s'empilent SANS gap, portés par leur propre
  // interligne de texte ; deux blocs opaques n'ont pas cet interligne, d'où ce
  // petit espace explicite pour ne pas les souder visuellement.
  legendeSkeleton: { marginTop: spacing.xxs },
  hero: { color: colors.chartreuse, fontFamily: fonts.display, fontSize: fontSizes.hero },
  // `typography.statUnit` + gris, SOUS le nombre — pas chartreuse à côté :
  // l'unité est une légende, pas une seconde valeur qui concurrence le chiffre.
  unite: { ...typography.statUnit, color: colors.gris },
  ligne: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md },
  demi: { flex: 1 },
  second: { color: colors.blanc, fontFamily: fonts.display, fontSize: fontSizes.xl },
  legende: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.sm },
  // Légendes des DEUX stats secondaires (Sorties, Distance) — rôle typo dédié,
  // distinct de `legende` (qui reste sous le chiffre héros).
  statLabel: { ...typography.statLabel, color: colors.gris },
  // `lineHeight` VOLONTAIREMENT ABSENT : il est dérivé du `fontScale` dans le
  // composant (voir `INTERLIGNE`). Le remettre ici le re-figerait.
  phrase: { color: colors.blanc, fontFamily: fonts.text, fontSize: fontSizes.md },
  section: {
    color: colors.gris,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  item: { minHeight: TOUCH_TARGET_PT, justifyContent: 'center' },
  // Ligne de liste groupée iOS : libellé à gauche, chevron à droite (posé par
  // `Lien` via `Glyph`), séparateur fin entre les lignes qui MÈNENT ailleurs.
  // Réservé aux `Lien nav` — un lien qui AGIT (se déconnecter, supprimer,
  // réessayer) reste un texte nu, sans cette ligne ni ce chevron.
  itemNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: borderState.hairline,
  },
  itemLabel: { color: colors.blanc, fontFamily: fonts.text, fontSize: fontSizes.md },
  // Le rouge dit « irréversible ». Il ne CRIE pas : c'est un TEXTE, pas un
  // bouton plein — l'action la plus grave ne doit pas être la plus visible.
  // ⚠️ Ce commentaire promettait un rouge que le code n'écrivait pas : la règle
  // était `colors.gris`, donc « Supprimer mon compte » avait exactement l'allure
  // des liens légaux voisins. Le jeton rouge existait déjà (`gameColors.danger`).
  // ⚠️ LA COULEUR NE PEUT PAS ÊTRE LE SEUL SIGNAL (L15). Entre « Exporter mes
  // données » et « Supprimer mon compte », seule la TEINTE changeait : pour un
  // daltonien deutan/protan, pour quelqu'un en plein soleil, ou en niveaux de
  // gris, les deux liens étaient identiques — sur la seule action irréversible
  // de l'app. La GRAISSE ajoute un signal non coloré, et c'est le plus sobre :
  // ni icône, ni majuscules, ni bouton plein (l'action la plus grave ne doit
  // pas devenir la plus visible, voir l'en-tête).
  danger: { color: gameColors.danger, fontFamily: fonts.textSemi },
  // La confirmation est en RETRAIT, pas en surimpression : une feuille modale
  // rejouerait le défaut de l'`Alert` (une couche qui peut ne pas s'afficher).
  confirmation: {
    borderLeftWidth: 2,
    borderLeftColor: gameColors.danger,
    paddingLeft: spacing.md,
    marginTop: spacing.xs,
    gap: spacing.xxs,
  },
  retour: {
    position: 'absolute',
    left: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    minHeight: TOUCH_TARGET_PT,
    justifyContent: 'center',
  },
  retourLabel: { color: colors.gris, fontFamily: fonts.textSemi, fontSize: fontSizes.sm },
  dim: { opacity: 0.6 },
});
