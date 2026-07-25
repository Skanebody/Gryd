/**
 * GRYD — sign-in, variante WEB. Metro/expo-router résolvent `.web.tsx` avant
 * `.tsx` : les modules natifs-only (expo-apple-authentication) ne sont PAS
 * importés dans le bundle web.
 *
 * ═══ ORDRE DE COMPOSITION (parité stricte avec sign-in.tsx) ═════════════════
 *  1. le champ d'hexagones, en plan de fond (`features/onboarding/PromiseHexField`) ;
 *  2. la flèche de retour vers l'onboarding ;
 *  3. le hero : kicker gris → titre display → sous-titre ;
 *  4. le bloc d'actions, en pied — UNE branche à la fois :
 *       âge refusé · lecture du gate en cours · question d'âge · voie e-mail ;
 *  5. l'erreur, puis l'avis de non-persistance (gris, toutes branches confondues).
 *
 * ─── CE QUE CE FICHIER FAISAIT DE FAUX (corrigé le 21/07/2026) ──────────────
 * Il renvoyait `<Redirect href="/" />` INCONDITIONNEL, en s'appuyant sur un
 * commentaire devenu faux (« en aperçu web la session est en mode non
 * configuré »). Depuis que `session.web.tsx` lit la VRAIE session Supabase,
 * `configured` vaut true sur web : (tabs)/_layout voyait `configured && !session`
 * et redirigeait ici, qui renvoyait vers `/`, qui redirigeait ici… Boucle, DOM
 * vide, ÉCRAN NOIR MORT. Aucun message, aucun spinner, aucune erreur console —
 * l'état exactement interdit par « état vide ≠ écran blanc ».
 *
 * ─── CE QU'IL FAIT MAINTENANT ───────────────────────────────────────────────
 * Un VRAI écran de connexion, e-mail OTP (code à 6 chiffres). Trois états
 * distincts, jamais confondus :
 *   · session en cours de restauration → fond noir muet, on n'affirme RIEN sur
 *     le joueur (un chargement n'est pas un état vide) ;
 *   · pas connecté → cet écran, invite à se connecter ;
 *   · échec (réseau, code faux, e-mail refusé) → le dit et laisse réessayer,
 *     jamais un mur (§4.1).
 *
 * POURQUOI PAS DE BOUTON APPLE / GOOGLE ICI : ils n'ont aucun chemin utilisable
 * dans un navigateur aujourd'hui (cf. entête de src/lib/auth.web.ts — O2 et URL
 * de redirection). Les peindre serait peindre deux boutons morts. Leur ABSENCE
 * n'est pas un mensonge ; un bouton qui échoue toujours en serait un. L'e-mail
 * étant DONC la seule porte, elle est peinte comme telle : CTA chartreuse, champ
 * ouvert d'emblée. Le natif (sign-in.tsx) applique la même règle dès qu'Apple et
 * Google sont tous deux hors jeu.
 *
 * ─── LA SORTIE VERS L'ONBOARDING (21/07/2026, parité avec sign-in.tsx) ──────
 * Le lien « J'ai déjà un compte » du premier écran marque l'onboarding FAIT
 * avant de router ici (obligatoire, sinon (tabs)/_layout renvoie le joueur
 * fraîchement connecté vers /onboarding — rebond déjà payé une fois). Sans
 * retour, cette porte était à SENS UNIQUE : qui renonce à se connecter ne
 * revoyait jamais l'onboarding et retombait ici à chaque lancement. La flèche
 * discrète du haut l'y ramène.
 *
 * ═══ LE GATE D'ÂGE VIT ICI AUSSI (21/07/2026) ═══════════════════════════════
 * Raisonnement complet en tête de `sign-in.tsx` — en deux lignes : le gate 16+
 * a d'abord été posé sur l'ACCÈS à cet écran (un `(auth)/_layout` qui
 * redirigeait tant qu'`ageConfirmed` n'était pas relu du stockage). Sur WEB
 * c'était le pire endroit possible : navigation privée, localStorage bloqué ou
 * données de site purgées → l'écriture échouait en silence, la relecture ne
 * rendait jamais `true`, et /sign-in devenait DÉFINITIVEMENT inatteignable.
 *
 * L'obligation (Apple 5.1.1, RGPD mineurs) est de ne pas CRÉER de compte pour un
 * mineur. Le gate est donc posé devant la création — ici, avant `requestEmailOtp`
 * qui envoie `shouldCreateUser: true`. Il est posé EN PLACE, sans navigation :
 * un stockage défaillant coûte un tap de plus par lancement (et on le DIT), il
 * ne peut plus fermer la porte.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI (recalage Vague 1, 25/07/2026) ────────
 * · L'EVENT `onboarding_step { n: 1 }` ÉMIS AU MONTAGE — le n RÉSERVÉ du splash
 *   `hook` supprimé le 22/07/2026, que `content.ts` interdit explicitement de
 *   réattribuer. Cet écran recollait deux populations sans rapport dans le même
 *   pas d'entonnoir. Supprimé, pas renuméroté : /sign-in n'est pas une étape de
 *   l'onboarding, et son entrée est déjà mesurée par le `screen()` du routeur.
 * · ~85 LIGNES DE CHAMP D'HEXAGONES dupliquées verbatim avec le natif → elles
 *   vivent dans `features/onboarding/PromiseHexField`. Le fork entre les deux
 *   fichiers n'existe que pour un module natif ; ce visuel n'en dépend pas.
 * · LE KICKER CHARTREUSE → `ui/SectionLabel` (gris, rôle R1).
 * · LES BOUTONS RECODÉS (52 px, et leur `ghostDisabled` maison) → `ui/Button`.
 *
 * ─── ÉCARTS ASSUMÉS ─────────────────────────────────────────────────────────
 * · PAS DE PLANCHE Vague 1 pour cet écran — il emprunte sa grammaire aux écrans
 *   recalés plutôt que d'inventer une forme.
 * · LE HERO N'EST PAS UN BANDEAU PLEIN CADRE (loi 1) — raison : le bloc
 *   d'actions doit rester atteignable en fenêtre basse (ScrollView).
 * · ⚠️ PARITÉ TENUE À LA MAIN avec sign-in.tsx : hero, copie (même catalogue),
 *   gate d'âge et styles. Raison technique : le fork n'existe QUE pour tenir
 *   `expo-apple-authentication` hors du bundle web. Tout ce qui pouvait être
 *   partagé l'est désormais (catalogue, gate, `PromiseHexField`, `Button`,
 *   `SectionLabel`) ; ce qui reste dupliqué, ce sont les styles. Toute évolution
 *   de l'un se reporte sur l'autre.
 */
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, fonts, iconSizes, radii, sizes, spacing, typography } from '@klaim/shared';
import { C } from '../../src/i18n/catalog/auth';
import { useT } from '../../src/i18n/store';
import { Button } from '../../src/ui/Button';
import { Icon } from '../../src/ui/Icon';
import { SectionLabel } from '../../src/ui/SectionLabel';
import type { Entry } from '../../src/i18n/types';
import { AGE } from '../../src/features/onboarding/content';
import { PromiseHexField } from '../../src/features/onboarding/PromiseHexField';
import {
  STORAGE_UNAVAILABLE_NOTICE,
  useOnboardingState,
} from '../../src/features/onboarding/store';
import { requestEmailOtp, verifyEmailOtp, type AuthResult } from '../../src/lib/auth';
import { useSession } from '../../src/lib/session';

/** Retourne l'Entry i18n (résolue à l'affichage — la bascule de langue suit). */
function failureMessage(result: AuthResult): Entry | null {
  if (result.ok) return null;
  // `cancelled` n'existe pas sur le chemin e-mail (aucune feuille système à
  // fermer) ; tout autre échec est dit, avec la même phrase que le natif.
  return C.errorSignInFailed;
}

export default function SignInScreenWeb() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const { session, loading, configured } = useSession();
  const [error, setError] = useState<Entry | null>(null);
  const [busy, setBusy] = useState(false);
  // Le web n'a que le filet e-mail : il est OUVERT d'emblée (§A — 1 écran =
  // 1 décision). Le replier derrière un bouton ajouterait un tap pour rien.
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  // Gate légal (voir l'entête) : mémoire de la déclaration + statut de lecture.
  const {
    state: onboarding,
    status: storageStatus,
    persistenceFailed,
    update: updateOnboarding,
  } = useOnboardingState();
  // « Moins de 16 » : état LOCAL, terminal pour cette vue. Rien n'est persisté,
  // et la flèche retour reste ouverte — une auto-déclaration est par nature
  // contournable ; c'est le gate attendu, pas une preuve d'âge.
  const [ageDeclined, setAgeDeclined] = useState(false);

  // ⚠️ Règle des hooks : tous les hooks sont déclarés AVANT ces returns.
  // Restauration de session en cours → on n'affirme rien (ni « connecte-toi »,
  // ni « connecté »). Fond noir muet, comme (tabs)/_layout.
  if (loading) return <View style={styles.root} />;
  // Déjà connecté, ou mode dev sans backend (O1) → carte directement.
  if (session || !configured) return <Redirect href="/" />;

  const run = async (fn: () => Promise<AuthResult>): Promise<AuthResult> => {
    setBusy(true);
    setError(null);
    const result = await fn();
    setError(failureMessage(result));
    setBusy(false);
    return result;
  };

  /**
   * LES TROIS ÉTATS DU GATE, jamais confondus (parité stricte avec sign-in.tsx).
   * `ageDeclared` est le SEUL laissez-passer ; lecture en cours, lecture
   * impossible et réponse absente ne sont pas des réponses — on attend ou on
   * redemande, et aucune branche ne ferme l'écran.
   */
  const ageDeclared = onboarding.ageConfirmed;
  const ageUnknown = storageStatus === 'reading' && !ageDeclared;
  const askAge = !ageDeclared && !ageUnknown;

  return (
    // Le flux e-mail OTP saisit du texte : sans esquive du clavier, le champ et
    // le CTA (bas de l'écran) sont masqués sur petit écran → connexion
    // impossible. Sur web `behavior` est undefined (pas de clavier logiciel qui
    // recouvre le viewport), mais le ScrollView reste nécessaire en fenêtre basse.
    <KeyboardAvoidingView style={styles.root}>
      {/* Visuel promesse : un champ d'hexagones égocentré, derrière le hero. */}
      <PromiseHexField />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Un seul enfant pour garder le `space-between` à DEUX blocs (haut/bas) :
            la flèche vit avec le hero, elle ne devient pas un 3e bloc réparti.
            (Parité stricte avec sign-in.tsx.) */}
        <View>
          {/* LA SORTIE : sans elle, « J'ai déjà un compte » enfermait le joueur
              ici pour toujours (l'onboarding est marqué fait avant d'arriver). */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.backToOnboarding)}
            hitSlop={12}
            onPress={() => router.replace('/onboarding')}
            style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
          >
            {/* Chevron pointé à gauche (le tracé pointe à droite → miroir). */}
            <View style={styles.backMirror}>
              <Icon name="chevron" size={iconSizes.lg} color={colors.gris} />
            </View>
          </Pressable>
          <View style={styles.hero}>
            {/* Le kicker dit à quelle étape on est : la vérification légale
                d'abord, la connexion ensuite. Il bascule avec le bloc du bas. */}
            <SectionLabel style={styles.kicker}>
              {t(askAge ? AGE.kickerSignIn : C.kicker)}
            </SectionLabel>
            <Text style={styles.title}>{t(C.title)}</Text>
            <Text style={styles.subtitle}>{t(C.subtitle)}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          {/* ── LE GATE, EN PLACE (parité sign-in.tsx) ── */}
          {ageDeclined ? (
            /* Moins de 16 : terminal ICI, mais l'écran reste quittable par la
               flèche. Aucune voie d'auth n'est peinte — il n'y a rien à créer. */
            <>
              <Text style={styles.gateTitle}>{t(AGE.blockedTitle)}</Text>
              <Text style={styles.gateNote}>{t(AGE.blockedTagline)}</Text>
            </>
          ) : ageUnknown ? (
            /* Lecture EN COURS : on n'affirme rien. Ni le champ e-mail (ce serait
               ouvrir la création sans gate), ni la question (ce serait la poser à
               quelqu'un qui y a déjà répondu). Le hero porte l'écran, et c'est
               borné (3 s → `unavailable`, donc question reposée). */
            null
          ) : askAge ? (
            <>
              <Text style={styles.gateTitle}>{t(AGE.title)}</Text>
              <Text style={styles.gateNote}>{t(AGE.tagline)}</Text>
              {/* L'UNIQUE CTA chartreuse tant que la question est posée (§A4). */}
              <Button
                label={t(AGE.confirm)}
                accessibilityLabel={t(AGE.confirmA11y)}
                onPress={() => void updateOnboarding({ ageConfirmed: true })}
                variant="primary"
                size="lg"
                analyticsId="signin_age_confirm"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(AGE.under)}
                onPress={() => setAgeDeclined(true)}
                style={({ pressed }) => [styles.gateLink, pressed && styles.backPressed]}
              >
                <Text style={styles.gateLinkLabel}>{t(AGE.under)}</Text>
              </Pressable>
            </>
          ) : step === 'email' ? (
            <>
              {/* Dit AVANT la saisie ce que le code va faire : connecter un
                  compte existant, ou en créer un. C'est la porte d'entrée de
                  celui qui réinstalle — il doit savoir qu'il est au bon endroit.
                  (Parité stricte avec sign-in.tsx.) */}
              <Text style={styles.otpHint}>{t(C.otpCreatesOrSignsIn)}</Text>
              {/* Champ 56 pt à LABEL PERSISTANT (planche E21) : un placeholder
                  seul disparaît à la première frappe. */}
              <Text style={styles.fieldLabel}>{t(C.emailFieldA11y)}</Text>
              <TextInput
                accessibilityLabel={t(C.emailFieldA11y)}
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder={t(C.emailPlaceholder)}
                placeholderTextColor={colors.gris}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoFocus
              />
              {/* LA SEULE PORTE DE L'ÉCRAN : elle est donc LE CTA. `Button` porte
                  l'état désactivé (visible ET annoncé) — un bouton qui ne répond
                  pas sans l'expliquer fait conclure que l'app est cassée. */}
              <Button
                label={t(C.otpRequestCta)}
                onPress={() => {
                  // N'avance vers la saisie du code QUE si l'envoi a réussi.
                  void run(() => requestEmailOtp(email.trim())).then((r) => {
                    if (r.ok) setStep('code');
                  });
                }}
                variant="primary"
                size="lg"
                loading={busy}
                disabled={!email.includes('@')}
                analyticsId="signin_email_request"
              />
            </>
          ) : (
            <>
              <Text style={styles.otpHint}>{t(C.otpSent, { email: email.trim() })}</Text>
              <Text style={styles.fieldLabel}>{t(C.otpFieldA11y)}</Text>
              <TextInput
                accessibilityLabel={t(C.otpFieldA11y)}
                style={styles.input}
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                placeholderTextColor={colors.gris}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <Button
                label={t(C.otpVerifyCta)}
                onPress={() => void run(() => verifyEmailOtp(email.trim(), code.trim()))}
                variant="primary"
                size="lg"
                loading={busy}
                disabled={code.length < 6}
                analyticsId="signin_email_verify"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(C.otpResendCta)}
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={() => {
                  setCode('');
                  void run(() => requestEmailOtp(email.trim()));
                }}
                style={styles.resendHit}
              >
                <Text style={styles.otpResend}>{t(C.otpResendCta)}</Text>
              </Pressable>
            </>
          )}
          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {t(error)}
            </Text>
          ) : null}
          {/* L'ÉTAT QU'ON NE PEUT PAS RETENIR SE DIT (toutes branches confondues).
              C'est le cas COURANT sur web : navigation privée, cookies/données de
              site bloqués. Sans cette ligne, le joueur redonnait sa réponse à
              chaque lancement sans jamais comprendre pourquoi. */}
          {persistenceFailed ? (
            <Text style={styles.gateNote}>{t(STORAGE_UNAVAILABLE_NOTICE)}</Text>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Interligne du titre hero : 64 px serrés (mesure de composition). */
const HERO_LINE_RATIO = 1.02;
/** Largeur de lecture confortable du sous-titre — ~60 caractères. */
const SUBTITLE_MAX_WIDTH = 320;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.noir,
    paddingHorizontal: spacing.xl,
  },
  scrollContent: { flexGrow: 1, justifyContent: 'space-between' },
  // Flèche de retour vers l'onboarding : cible ≥ 44×44 (+hitSlop), gris discret,
  // jamais un 2e CTA (§A). `marginLeft` négatif : le glyphe est centré dans sa
  // boîte de 44, on le recale optiquement sur la marge du texte.
  back: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    marginLeft: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPressed: { opacity: 0.7 },
  backMirror: { transform: [{ scaleX: -1 }] },
  hero: { marginTop: spacing.lg },
  // Le kicker CONSOMME `ui/SectionLabel` (gris, rôle R1) : ne reste ici que la
  // marge de CETTE page et les chiffres tabulaires. Il était CHARTREUSE.
  kicker: { marginBottom: spacing.md, fontVariant: ['tabular-nums'] },
  title: {
    color: colors.blanc,
    fontFamily: fonts.display, // Inter Tight 800 — la famille porte la graisse
    fontSize: fontSizes.hero,
    lineHeight: fontSizes.hero * HERO_LINE_RATIO,
    letterSpacing: -1.2,
  },
  subtitle: {
    color: colors.gris,
    fontFamily: fonts.text,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.5,
    marginTop: spacing.lg,
    maxWidth: SUBTITLE_MAX_WIDTH,
  },
  actions: { gap: spacing.sm },
  // Champ 56 pt à label persistant (planche E21) — même patron que /profil-edit.
  fieldLabel: {
    color: colors.gris,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
  },
  input: {
    height: sizes.buttonLg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone2,
    color: colors.blanc,
    fontFamily: fonts.text,
    paddingHorizontal: spacing.lg,
    fontSize: fontSizes.md,
  },
  otpHint: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.xs, textAlign: 'center' },
  // Le « renvoyer » est un LIEN, pas un bouton : plancher tactile quand même.
  resendHit: {
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpResend: {
    color: colors.gris,
    fontFamily: fonts.text,
    fontSize: fontSizes.xs,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  error: {
    color: colors.blanc,
    fontFamily: fonts.text,
    fontSize: fontSizes.sm,
    textAlign: 'center',
    marginTop: spacing.xxs,
  },

  // ── GATE D'ÂGE, POSÉ AU POINT DE CRÉATION (parité stricte avec sign-in.tsx) ──
  gateTitle: {
    ...typography.cardTitle, // R3 — Inter Tight 600
    color: colors.blanc,
  },
  /** Sert aussi à l'avis de non-persistance : gris, jamais chartreuse (≠ action). */
  gateNote: {
    color: colors.gris,
    fontFamily: fonts.text,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.45,
    marginBottom: spacing.xxs,
  },
  gateLink: { minHeight: sizes.touchTarget, alignItems: 'center', justifyContent: 'center' },
  gateLinkLabel: { color: colors.gris, fontFamily: fonts.textMedium, fontSize: fontSizes.sm },
});
