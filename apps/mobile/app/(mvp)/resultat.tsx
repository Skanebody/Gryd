/**
 * GRYD — LE RÉSULTAT : le pic émotionnel, ou le refus qui n'accuse pas (M7).
 *
 * ─── CE QUE CET ÉCRAN NE FAIT PAS ───────────────────────────────────────────
 * Il ne DÉCIDE rien. L'envoi a eu lieu dans l'écran de course, et l'issue lui
 * est passée telle quelle ; `outcome.resultView` (pur, testé) dit ce qu'on a le
 * droit d'afficher. Ce fichier ne fait que peindre.
 *
 * Une seule chose s'y AJOUTE, et elle n'est pas un jugement : sur `lost` — et
 * sur `lost` seulement — l'écran peut REJOUER l'envoi. Il ne réinterprète rien,
 * il redonne la même charge, avec le même `clientRunId`, à la même fonction
 * d'envoi ; c'est `resultView` qui tranche ce qu'on affiche de la réponse.
 *
 * ─── LES DEUX FAUTES QUI COÛTERAIENT LE PLUS CHER ICI ───────────────────────
 * 1. Annoncer « aucun territoire » sur une course PAS ENCORE ENVOYÉE. Personne
 *    n'a rien refusé : ce serait inventer un verdict, et décourager quelqu'un
 *    qui a peut-être tout gagné. L'attente est une issue à part entière.
 * 2. Annoncer une aire qui SURESTIME le gain (`interiorPartial`). C'est le
 *    chiffre que le joueur retient, annonce à son crew et met dans une carte de
 *    partage : un mensonge chiffré voyage plus loin que tous les autres.
 *
 * ─── L19 — LES STATS SONT TOUJOURS LÀ ───────────────────────────────────────
 * Distance et durée viennent de la trace LOCALE : elles existent avant l'envoi,
 * survivent à un refus et à l'absence de réseau. Ce ne sont pas une consolation
 * qu'on ajoute après un « non » — ce sont des faits mesurés, affichés dans
 * TOUTES les issues (`showsLocalStats`, invariant testé).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fonts, fontSizes, iconSizes, radii, spacing, typography } from '@klaim/shared';
import { resultView, type ResultView, type SendResult } from '../../src/mvp/run/outcome';
import { formatChrono } from '../../src/mvp/run/trace';
import { buildRunPayload, type RunPayload } from '../../src/mvp/run/payload';
import { sendRun } from '../../src/mvp/run/sendRun';
import { clearActiveRun, clearCurrentRun, loadActiveRun } from '../../src/lib/runStore';
import { heroArea } from '../../src/mvp/ui/area';
import {
  CELEBRATION_MS,
  FILL,
  GAIN,
  OUTLINE,
  OUTLINE_SCALE,
} from '../../src/mvp/ui/celebration';
import { Glyph } from '../../src/mvp/ui/Glyph';
import { TerritoryMark } from '../../src/mvp/ui/TerritoryMark';
import { C } from '../../src/i18n/catalog/mvp';
import { useT } from '../../src/i18n/store';
import { screen } from '../../src/lib/analytics';
import { resultHaptic } from '../../src/mvp/run/feedback';
import { haptics } from '../../src/lib/haptics';

const TOUCH_TARGET_PT = 44;

/**
 * Interligne du corps, en MULTIPLE de la taille de police.
 *
 * ⚠️ Pas dans `StyleSheet.create` : un `lineHeight` numérique ne suit PAS
 * Dynamic Type alors que `fontSize` le suit. Figé à 24 pt, il faisait se
 * recouvrir les lignes dès AX3 (~2,35× : un corps à ~38 pt dans un interligne
 * de 24) — ici, sur la phrase qui explique un refus, c'est-à-dire exactement le
 * texte qu'il ne faut pas rendre illisible (L19).
 */
const INTERLIGNE = 1.5;

/**
 * Le rôle typo R6 (`typography.stat`), rendu ÉTALABLE dans un `StyleSheet`.
 *
 * Il porte `fontVariant: ['tabular-nums']` — indispensable ici : le chiffre héros
 * ne s'affiche plus, il se COMPTE (voir `aireComptee`), et sans chasse fixe les
 * digits changent de largeur à chaque incrément. Le nombre danserait pendant
 * toute la montée, sur le seul écran que le joueur regarde fixement.
 *
 * ⚠️ `{ ...typography.stat }` ne compile pas tel quel : le token est figé par
 * `as const`, donc son `fontVariant` est un tuple EN LECTURE SEULE là où
 * `TextStyle` attend un tableau mutable. On recopie le tableau.
 */
const STAT = { ...typography.stat, fontVariant: [...typography.stat.fontVariant] };


/**
 * L'issue de l'envoi transite par l'URL, sérialisée.
 *
 * ⚠️ Une valeur illisible (lien profond bricolé, navigation rejouée) ne devient
 * PAS un refus : elle devient `lost`, la seule issue qui dit honnêtement « on
 * ne sait pas ce qu'il est advenu de ta course ». Se tromper vers un refus
 * annoncerait au joueur une décision que personne n'a prise.
 */
function issueDepuisParam(brut: string | string[] | undefined): SendResult {
  const texte = Array.isArray(brut) ? brut[0] : brut;
  if (typeof texte !== 'string' || texte.length === 0) return { kind: 'lost' };
  try {
    const parsed = JSON.parse(texte) as SendResult;
    if (parsed.kind === 'queued' || parsed.kind === 'lost') return { kind: parsed.kind };
    if (parsed.kind === 'answered' && typeof parsed.verdict === 'object' && parsed.verdict !== null) {
      return parsed;
    }
    return { kind: 'lost' };
  } catch {
    return { kind: 'lost' };
  }
}

function nombre(v: string | string[] | undefined): number {
  const t = Array.isArray(v) ? v[0] : v;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export default function Resultat() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const interligne = { lineHeight: Math.round(fontSizes.md * INTERLIGNE * fontScale) };
  // Même raison que `INTERLIGNE` : le rôle `statUnit` porte un `lineHeight`
  // NUMÉRIQUE (18), qui ne suit pas Dynamic Type. Laissé tel quel, il rognait
  // l'unité dès les grandes tailles — on le remet à l'échelle du corps réel.
  const ligneUnite = { lineHeight: Math.round(typography.statUnit.lineHeight * fontScale) };
  const params = useLocalSearchParams();
  /**
   * L'issue est un ÉTAT, plus une simple lecture de l'URL — parce qu'un RENVOI
   * réussi (voir `renvoyer`) en produit une NOUVELLE, et que la remplacer par
   * une navigation ne rejouerait ni l'haptique ni la célébration.
   *
   * ⚠️ L'écran ne DÉCIDE toujours rien : il ne fait que garder la dernière issue
   * qu'un envoi a réellement rendue. `resultView` reste seul juge de ce qui
   * s'affiche.
   */
  const [issue, setIssue] = useState<SendResult>(() => issueDepuisParam(params.issue));
  const vue: ResultView = resultView(issue);
  const distanceM = nombre(params.distanceM);
  const dureeMs = nombre(params.dureeMs);

  useEffect(() => {
    screen('run_result');
  }, []);

  useEffect(() => {
    // L7 — le pic émotionnel. Un refus, lui, ne vibre pas : ajouter un coup de
    // semonce physique à une nouvelle décevante serait accuser (L19), et ça
    // vaut aussi pour ce que l'app fait SENTIR.
    // Sur `vue.kind` et non au montage : après un renvoi, la nouvelle issue est
    // un événement de jeu à part entière — la première capture d'un joueur peut
    // arriver ici, et elle doit se SENTIR (L6).
    const quoi = resultHaptic(vue.kind);
    if (quoi !== null) haptics[quoi]();
  }, [vue.kind]);

  /** L'aire FINALE, celle que le serveur a réellement écrite. */
  const aireFinaleM2 = vue.kind === 'captured' ? vue.areaM2 : null;
  const aire = heroArea(aireFinaleM2);

  /**
   * LA CÉLÉBRATION (L7) — et ses deux garde-fous.
   *
   * · REDUCE MOTION (L15) : si le système le demande, TOUT est visible
   *   immédiatement. Une animation qu'on ne peut pas refuser est une animation
   *   subie, et pour certains c'est un malaise physique.
   * · SKIPPABLE (L7, mot pour mot) : un tap n'importe où la termine sur-le-champ.
   *   Le pic émotionnel ne doit jamais devenir une attente.
   *
   * Elle ne joue QUE sur une capture : animer un refus mettrait en scène une
   * déception.
   */
  const fete = vue.kind === 'captured' || vue.kind === 'takenNoArea';
  const anim = useRef(new Animated.Value(fete ? 0 : 1)).current;
  /**
   * Reduce Motion — TROIS valeurs, pas deux. `null` = « le système n'a pas
   * encore répondu ». Un booléen à `false` par défaut ferait démarrer
   * l'animation pendant la lecture de la préférence, c'est-à-dire animer chez
   * quelqu'un qui a précisément demandé qu'on ne l'anime pas.
   *
   * Une lecture qui ÉCHOUE vaut `true` : on renonce à l'animation plutôt que de
   * l'imposer sans savoir.
   */
  const [reduit, setReduit] = useState<boolean | null>(null);

  useEffect(() => {
    let vivant = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => {
        if (vivant) setReduit(r);
      })
      .catch(() => {
        if (vivant) setReduit(true);
      });
    return () => {
      vivant = false;
    };
  }, []);

  /**
   * LE DÉCOMPTE — « les valeurs ne se téléportent jamais » (HIG, game-feel).
   *
   * Le gain apparaissait en FONDU : le nombre était déjà écrit derrière une
   * opacité nulle, puis révélé. Sur le pic émotionnel du produit, un fondu est
   * le minimum ; c'est le décompte qui transforme un affichage en récompense.
   *
   * ─── TROIS GARDE-FOUS ─────────────────────────────────────────────────────
   * · MÊME horloge que le reste : on écoute `anim`, on n'ouvre pas un second
   *   timer. Deux horloges finiraient par se désynchroniser, et le chiffre
   *   atterrirait avant ou après la marque.
   * · JAMAIS « 0 » : la valeur intermédiaire repasse par `heroArea`, qui rend
   *   `null` sous 1 m². Tant que le décompte n'a pas atteint le premier entier,
   *   il n'y a rien à peindre — et surtout pas le zéro nu que la constitution
   *   interdit. C'est la MÊME garde que pour la valeur finale, pas une seconde
   *   règle écrite à côté.
   * · REDUCE MOTION : la valeur finale est peinte d'emblée, sans compter (voir
   *   la célébration, juste en dessous). Un tap qui passe l'animation
   *   (`passer`) fait de même, par `setValue(1)`.
   *
   * `p >= 1 ? 1` n'est pas une coquetterie : sans cette borne, un dernier
   * rappel à 0,999 arrondirait 64 m² à 63 — un chiffre FAUX comme mot de la fin.
   */
  const [aireComptee, setAireComptee] = useState<number | null>(null);

  useEffect(() => {
    if (aireFinaleM2 === null) {
      setAireComptee(null);
      return;
    }
    const ecoute = anim.addListener(({ value }) => {
      const brut = (value - GAIN.from) / (GAIN.to - GAIN.from);
      const p = brut <= 0 ? 0 : brut >= 1 ? 1 : brut;
      setAireComptee(aireFinaleM2 * p);
    });
    return () => anim.removeListener(ecoute);
  }, [anim, aireFinaleM2]);

  /** Le chiffre PEINT à cet instant. `null` = rien de vrai à écrire encore. */
  const aireEnCours = heroArea(aireComptee);

  /**
   * ⚠️ Cette célébration se (re)JOUE quand la vue DEVIENT une fête, pas
   * seulement au montage : après un renvoi réussi (constat ②), l'écran passe de
   * `lost` à `captured` sans changer de route. Câblée au montage seulement, la
   * séquence ne repartait pas — et comme le chiffre est désormais piloté par
   * cette même valeur, le joueur voyait la marque… sans aucun nombre.
   */
  useEffect(() => {
    if (reduit === null) return; // on ne sait pas encore : on n'anime pas.
    if (!fete || reduit) {
      anim.setValue(1);
      /**
       * GARDE-FOU REDUCE MOTION, ÉCRIT PLUTÔT QU'ESPÉRÉ.
       *
       * `setValue` notifie ses écouteurs, donc le décompte ci-dessous atterrit
       * en général tout seul sur la valeur finale. « En général » ne suffit pas :
       * quand la vue devient une capture APRÈS un renvoi, React démonte les
       * effets dont les dépendances ont changé AVANT de rejouer leurs corps —
       * l'écouteur est donc déjà retiré à l'instant de ce `setValue`, et le
       * joueur verrait la marque sans aucun chiffre. On peint la valeur finale
       * ici, explicitement : c'est ce que la loi demande (valeur finale d'emblée,
       * sans compter), et ça ne dépend d'aucun ordre.
       */
      setAireComptee(aireFinaleM2);
      return;
    }
    anim.setValue(0);
    const sequence = Animated.timing(anim, {
      toValue: 1,
      duration: CELEBRATION_MS,
      easing: Easing.out(Easing.cubic),
      // ⚠️ `false` OBLIGATOIRE : cette valeur pilote aussi `fillOpacity` et
      // `strokeOpacity`, qui sont des props SVG et non des styles — elles ne
      // passent pas par le pilote natif. Mélanger les deux pilotes sur une
      // MÊME valeur lève une erreur à l'exécution.
      useNativeDriver: false,
    });
    sequence.start();
    return () => sequence.stop();
  }, [anim, aireFinaleM2, fete, reduit]);

  const passer = () => anim.setValue(1);

  // Les trois temps de L7 (voir `mvp/ui/celebration.ts`). `extrapolate: 'clamp'`
  // partout :
  // sans lui, une interpolation déborde de ses bornes et rend des opacités
  // supérieures à 1 ou négatives — invisibles au test, visibles à l'écran.
  // Les bornes viennent de `celebration.ts` — PAS écrites ici. Trois
  // `interpolate` côte à côte se chevauchent sans qu'aucune relecture ne le
  // voie, et une capture d'écran ne le montre pas non plus (son aller-retour
  // dépasse la durée de la séquence). Là-bas, l'ordre se TESTE.
  const opaciteContour = anim.interpolate({
    inputRange: [OUTLINE.from, OUTLINE.to],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const echelleMarque = anim.interpolate({
    inputRange: [...OUTLINE_SCALE.input],
    outputRange: [...OUTLINE_SCALE.output],
    extrapolate: 'clamp',
  });
  const opaciteRemplissage = anim.interpolate({
    inputRange: [FILL.from, FILL.to],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const opaciteChiffre = anim.interpolate({
    inputRange: [GAIN.from, GAIN.to],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  /**
   * ─── LE RENVOI, ET SEULEMENT SUR `lost` ───────────────────────────────────
   *
   * `lost` est le seul vrai échec : l'envoi a échoué ET la file d'envoi a
   * refusé. L'écran le DISAIT (« ta course est encore sur cet appareil ») sans
   * rien proposer pour la faire partir — un état d'erreur sans issue, ce que le
   * HIG (« Error States : Retry action ») refuse.
   *
   * ⚠️ AUCUN IDENTIFIANT N'EST FABRIQUÉ ICI. C'est précisément parce que la
   * course est `lost` que le buffer `runStore` n'a PAS été purgé (voir
   * `course.tsx`) : la trace y attend avec SON `runId`, celui qui a déjà servi
   * au premier essai. On renvoie donc la même clé d'idempotence, et D14 garantit
   * qu'une course ne peut pas compter deux fois. Générer un identifiant ici —
   * ou rejouer une charge reconstruite à la volée — créerait le doublon que
   * cette clé existe pour empêcher.
   *
   * ⚠️ ET AUCUN BOUTON MORT : le lien n'apparaît que si une charge ENVOYABLE
   * a réellement été relue du disque. Une trace absente, illisible ou trop
   * courte ne donne pas un bouton qui échouerait au tap.
   */
  const chargeRef = useRef<RunPayload | null>(null);
  const monteRef = useRef(true);
  useEffect(() => {
    return () => {
      monteRef.current = false;
    };
  }, []);
  const [renvoi, setRenvoi] = useState<'inconnu' | 'indisponible' | 'possible' | 'envoi'>(
    'inconnu',
  );

  useEffect(() => {
    if (vue.kind !== 'lost') return;
    let vivant = true;
    loadActiveRun()
      .then((stocke) => {
        if (!vivant) return;
        if (stocke === null) {
          setRenvoi('indisponible');
          return;
        }
        // `buildRunPayload` est le MÊME constructeur que celui de la course :
        // deux façons de fabriquer la charge finiraient par diverger, et
        // l'écart ne se verrait qu'au 400 du serveur.
        const charge = buildRunPayload({
          clientRunId: stocke.runId,
          startedAt: stocke.startedAt,
          points: stocke.fixes.map((f) => ({
            lat: f.lat,
            lng: f.lng,
            ts: f.ts,
            accuracy: f.accuracy,
          })),
          activity: stocke.activity,
        });
        chargeRef.current = charge;
        setRenvoi(charge === null ? 'indisponible' : 'possible');
      })
      .catch(() => {
        if (vivant) setRenvoi('indisponible');
      });
    return () => {
      vivant = false;
    };
  }, [vue.kind]);

  const renvoyer = useCallback(async () => {
    const charge = chargeRef.current;
    if (charge === null || renvoi === 'envoi') return;
    setRenvoi('envoi');
    haptics.light();
    const suite = await sendRun(charge);
    // Le buffer n'est effacé QUE si la course est en sûreté — répondue ou mise
    // en file. Même arbitrage que `course.tsx`, et pour la même raison : sur un
    // second `lost`, ce buffer reste le dernier filet.
    if (suite.kind !== 'lost') {
      await Promise.all([clearActiveRun(), clearCurrentRun()]);
    }
    if (!monteRef.current) return;
    // Un second échec REDONNE l'action : la charge est toujours là, et un
    // renvoi qui laisserait le lien figé sur « en cours » se lirait en panne.
    setRenvoi(suite.kind === 'lost' ? 'possible' : 'indisponible');
    setIssue(suite);
  }, [renvoi]);

  const phrase =
    vue.kind === 'captured'
      ? vue.assisted
        ? t(C.resAssisted)
        : null
      : vue.kind === 'takenNoArea'
        ? t(C.resTakenNoArea)
        : vue.kind === 'missing'
          ? t(C.verifyGap, { m: String(vue.missingM) })
          : vue.kind === 'noLoop'
            ? t(C.resNoLoop)
            : vue.kind === 'refused'
              ? vue.reason === 'narrow'
                ? t(C.resNarrow)
                : t(C.resRefused)
              : vue.kind === 'pending'
                ? t(C.resPending)
                : t(C.resLost);

  // La distance vient de la trace locale : `formatKm` refuse le zéro nu, donc
  // une course sans mètre parcouru n'affiche pas « 0,00 km ».
  const km = distanceM > 0 ? (Math.round(distanceM / 10) / 100).toFixed(2).replace('.', ',') : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}>
      {/* Toute la scène est tapable : c'est ce qui rend la célébration
          SKIPPABLE sans ajouter un bouton « passer » qui volerait l'unique
          action primaire de l'écran (L2). */}
      <Pressable
        style={styles.centre}
        onPress={passer}
        // ⚠️ `passer` ARRÊTE L'ANIMATION, il ne navigue pas. Cette zone
        // s'annonçait « VOIR LA CARTE » — le libellé exact du vrai bouton, 40 pt
        // plus bas. Un utilisateur VoiceOver la rencontre EN PREMIER, tape,
        // n'entend rien changer, et croit avoir navigué. Deux contrôles
        // homonymes dont un seul tient sa promesse : c'est le même mensonge que
        // partout ailleurs, transposé au canal auditif.
        accessibilityRole={fete && reduit === false ? 'button' : 'none'}
        accessibilityLabel={fete && reduit === false ? t(C.ctaSkipAnimation) : undefined}
      >
        {/* L'objet signature n'apparaît QUE sur une prise : le montrer sur un
            refus ferait miroiter ce qu'on vient de dire non obtenu. */}
        {fete ? (
          <Animated.View style={{ transform: [{ scale: echelleMarque }] }}>
            <TerritoryMark
              size={140}
              strokeOpacity={opaciteContour}
              fillOpacity={opaciteRemplissage}
            />
          </Animated.View>
        ) : null}

        {aire !== null && aireEnCours !== null ? (
          // UN SEUL élément d'accessibilité pour le pic du jeu : le titre, le
          // nombre et l'unité sont trois `Text` à l'œil (échelle typographique),
          // et c'était trois arrêts à l'oreille — « Territoire pris » … « 64 » …
          // « m² ». L'unité est dite en toutes lettres dans le label : « m² » se
          // prononce « m » chez la plupart des synthèses, et 64 m² devenait
          // 64 mètres.
          //
          // ⚠️ LE LABEL DIT `aire`, PAS `aireEnCours` : à l'oreille, un décompte
          // n'existe pas — VoiceOver annonce le chiffre FINAL, jamais une valeur
          // de passage qui serait, elle, un chiffre faux.
          <Animated.View
            style={[styles.bloc, { opacity: opaciteChiffre }]}
            accessible
            accessibilityLabel={t(C.a11yAreaTaken, { n: aire })}
          >
            <Text style={styles.titre}>{t(C.resTakenTitle)}</Text>
            <View style={styles.ligne}>
              <Text style={styles.hero}>{aireEnCours}</Text>
              <Text style={[styles.unite, ligneUnite]}>{t(C.unitM2)}</Text>
            </View>
          </Animated.View>
        ) : null}

        {phrase !== null ? <Text style={[styles.phrase, interligne]}>{phrase}</Text> : null}

        {/* L19 — TOUJOURS présentes, quelle que soit l'issue. */}
        {km !== null ? (
          <Text style={styles.stats}>{t(C.resStats, { km, duree: formatChrono(dureeMs) })}</Text>
        ) : null}
      </Pressable>

      {/* L2 — UNE seule action primaire. « Voir la carte » la garde ; le renvoi
          est un LIEN : il répare un échec, il ne concurrence pas la sortie de
          l'écran. Il n'apparaît que sur `lost`, et seulement quand une charge
          envoyable existe vraiment (voir `renvoi`).
          L15 — le glyphe ne porte pas le sens tout seul : le libellé est écrit
          à côté, et c'est lui que VoiceOver annonce. */}
      {vue.kind === 'lost' && (renvoi === 'possible' || renvoi === 'envoi') ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.ctaRetrySend)}
          // `busy` en plus de `disabled` : VoiceOver dit « en cours » au lieu de
          // « désactivé », qui ferait croire à un lien inerte.
          accessibilityState={{ disabled: renvoi === 'envoi', busy: renvoi === 'envoi' }}
          disabled={renvoi === 'envoi'}
          onPress={() => {
            void renvoyer();
          }}
          style={({ pressed }) => [
            styles.lien,
            (pressed || renvoi === 'envoi') && styles.lienAttenue,
          ]}
        >
          <Glyph name="reessayer" size={iconSizes.sm} color={colors.blanc} />
          <Text style={styles.lienLabel}>{t(C.ctaRetrySend)}</Text>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.ctaBackToMap)}
        onPress={() => router.replace('/carte')}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
      >
        <Text style={styles.ctaLabel}>{t(C.ctaBackToMap)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir, paddingHorizontal: spacing.lg },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  bloc: { alignItems: 'center', gap: spacing.xs },
  titre: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.md },
  ligne: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  // R6 — le rôle du chiffre héros, `tabular-nums` compris (voir `STAT`).
  hero: { ...STAT, color: colors.chartreuse, fontSize: fontSizes.hero },
  // R6 bis — l'unité reste PETITE à côté du nombre : c'est le rôle `statUnit`,
  // pas une taille choisie ici. Son `lineHeight` est remis à l'échelle dans le
  // composant (`ligneUnite`).
  unite: { ...typography.statUnit, color: colors.chartreuse },
  // `lineHeight` VOLONTAIREMENT ABSENT : il est dérivé du `fontScale` dans le
  // composant (voir `INTERLIGNE`). Le remettre ici le re-figerait.
  phrase: {
    color: colors.blanc,
    fontFamily: fonts.text,
    fontSize: fontSizes.md,
    textAlign: 'center',
  },
  stats: { color: colors.gris, fontFamily: fonts.textSemi, fontSize: fontSizes.md },
  cta: {
    minHeight: TOUCH_TARGET_PT,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  ctaPressed: { backgroundColor: colors.chartreusePressed },
  ctaLabel: { color: colors.noir, fontFamily: fonts.textSemi, fontSize: fontSizes.md, fontWeight: '700' },
  // Le renvoi : un LIEN, pas un bouton plein. Sans aplat ni chartreuse, il ne
  // dispute pas la primauté de « Voir la carte » (L2) — mais il garde la cible
  // de 44 pt, parce qu'une action de réparation qu'on rate au doigt n'en est
  // pas une.
  lien: {
    minHeight: TOUCH_TARGET_PT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  // Un seul atténuement pour l'appui ET l'attente : inventer une seconde valeur
  // d'opacité ferait croire à deux états distincts là où il n'y en a qu'un —
  // « ce lien ne répond pas à l'instant ». 0,6 est la valeur déjà employée par
  // l'écran de course pour un envoi en cours.
  lienAttenue: { opacity: 0.6 },
  lienLabel: { color: colors.blanc, fontFamily: fonts.textSemi, fontSize: fontSizes.md },
});
