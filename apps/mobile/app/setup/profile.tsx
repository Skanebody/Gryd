/**
 * GRYD — E08 « CRÉATION DU PROFIL MINIMAL » (`/setup/profile`, spec produit l.758).
 *
 * Trois champs, pas un de plus : nom d'affichage, @handle, ville de jeu. Photo,
 * bio et crew ne sont PAS demandés (la spec les dit facultatifs, et l'écran le
 * DIT au lieu de laisser croire à un formulaire inachevé). Ni genre, ni âge
 * exact, ni poids — jamais, et c'est écrit en sous-titre : au moment précis où
 * l'on demande des données, une absence annoncée vaut mieux qu'une absence.
 *
 * ═══ 1. LE @handle — LE SEUL CHAMP QUI PEUT REFUSER ═════════════════════════
 *
 * TOUT CE QUI DÉCIDE EST SERVEUR, et rien de ce qui est affiché ici n'accorde
 * quoi que ce soit :
 *   · la RPC `check_handle_available` (migration `0047_handle_verification.sql`,
 *     SECURITY DEFINER, `grant execute … to authenticated`) répond AVANT la
 *     soumission — c'est un CONFORT, elle ne réserve rien et ne fuite pas la
 *     liste des handles (`reserved_handles` n'est lisible par personne : ses
 *     droits sont révoqués, seul le corps du RPC la lit) ;
 *   · le JUGE reste le `handle text not null unique check (handle ~
 *     '^[a-z0-9_]{3,20}$')` de `0011_social.sql:45`, évalué à l'ÉCRITURE. Deux
 *     joueurs qui voient « Libre » à la même seconde ne peuvent pas l'obtenir
 *     tous les deux : le second récolte un 23505, et cet écran le lui DIT
 *     (`errorHandleTakenOnSave`) sans perdre sa saisie.
 * Rien n'est simulé côté client. La seule chose que ce fichier calcule seul est
 * le FORMAT (une propriété du texte, connue sans réseau), et `handleFormatIssue`
 * est verrouillée par test contre `HANDLE_REGEX` — le miroir exact du `check` SQL.
 *
 * LES QUATRE ÉTATS DEMANDÉS PAR LA SPEC SONT DISTINCTS, et un cinquième s'y
 * ajoute parce que la constitution l'exige :
 *   · pas encore saisi     → l'aide (`handleHint`), aucun verdict ;
 *   · vérification EN COURS → `handleChecking`. N'affirme RIEN. Ne gèle rien ;
 *   · libre                 → `handleFree`, au présent, sans promesse de réservation ;
 *   · pris / réservé        → le motif exact, et la rangée de repêchage ;
 *   · on ne SAIT pas        → `handleUnknown` (hors ligne / sans session) ou
 *     `handleNoBackend` (aucun Supabase configuré : la vérification promise
 *     « à l'enregistrement » n'aurait alors jamais lieu — on ne la promet pas).
 *
 * ═══ 2. LES SUGGESTIONS SONT VÉRIFIÉES, PAS FABRIQUÉES ═════════════════════
 *
 * `handleSuggestionCandidates` (PUR, testé) ne rend que des CHAÎNES À SOUMETTRE.
 * Chacune part au serveur, une par une, et SEULES celles que la RPC a confirmées
 * deviennent une pill. Aucune pill n'est peinte pendant la recherche : une pill
 * « libre » que personne n'a vérifiée serait exactement la donnée inventée que la
 * charte interdit. Sans serveur, sans session, ou si rien ne revient libre :
 * `suggestionsUnavailable` — on avoue, on n'invente pas.
 *
 * ═══ 3. LA VILLE VIENT DE LA POSITION, MAIS NE S'IMPOSE PAS ════════════════
 *
 * L'écran LIT la permission de localisation ; il ne la DEMANDE jamais. La boîte
 * système appartient à E05 (elle y est annoncée) et au premier GO : la faire
 * tomber ici, juste après la création du compte, serait exactement le défaut
 * corrigé sur la carte le 21/07. Permission déjà accordée ⇒ un fix, puis la
 * commune RÉELLE la plus proche (`nearestCityEntry`, référentiel partagé).
 * Sinon : le champ reste VIDE et le dit (`cityUnknown`). Jamais de ville par
 * défaut — une ville inventée choisirait un terrain de jeu à la place du joueur.
 * Le choix reste MODIFIABLE à tout instant : c'est le sélecteur PARTAGÉ
 * (`features/city/CityPicker`), celui de `profil-edit.tsx:468`, avec les mêmes
 * communes réelles et les mêmes états de lecture.
 *
 * ═══ 4. LE HANDOFF DE CADRAGE, RÉPARÉ ICI (le trou signalé) ════════════════
 *
 * `app/onboarding/index.tsx` (docblock, « CE QUI RESTE À FAIRE ») constate que
 * `onboarding.cityId` n'est plus alimenté depuis que le choix de ville a quitté
 * l'onboarding, et désigne CET écran pour le recâbler.
 *
 *   ÉCRITURE (ici)  : `updateOnboarding({ cityId, cityName })` dans `submit()`.
 *   LECTURE (carte) : `apps/mobile/src/features/map/MapScreen.tsx:252`
 *                     → `const chosenCity = cityCenter(onboarding.cityId);`
 *                     et son jumeau `MapScreen.web.tsx:307` — même ligne, même clé.
 *
 * Les deux passent par le MÊME store (`features/onboarding/store.ts`, champs
 * `cityId` / `cityName` déclarés l.93-94) : la clé écrite est littéralement
 * celle qui est lue. Ce que ça rend à la carte est un CADRAGE, rien d'autre —
 * aucune zone, aucun propriétaire, aucun classement n'en découle, et une
 * position MESURÉE le supplante toujours (l'ordre de `openCamera` est explicite).
 *
 * ═══ 5. L'ÉCRAN NE S'OUVRE PAS S'IL NE PEUT RIEN ENREGISTRER (27/07/2026) ═══
 *
 * `submit()` enveloppait TOUTE l'écriture serveur dans `if (client && userId)`.
 * Sans backend (O1) ou sans session, la branche était sautée — aucun SELECT,
 * aucun INSERT, aucun `markMinimalProfileDone` — et le code continuait quand
 * même : `track(setup_profile_completed)` puis `router.replace('/setup/activity')`.
 * Le joueur voyait son unique CTA chartreuse aboutir alors que son @handle
 * n'était RÉSERVÉ nulle part. C'est pire qu'un bouton mort (§2) : un bouton qui
 * a l'air d'avoir réussi.
 *
 * DEUX GARDES, à deux niveaux :
 *   · l'écran REDIRIGE vers « / » quand `!configured || session === null` —
 *     même patron que `app/(auth)/email.tsx` (« peindre le CTA ici serait le
 *     bouton mort de la constitution §2 »). Personne n'est perdu : la garde de
 *     route (`decideFirstRun`) n'ouvre ce parcours QUE sur
 *     `configured && hasSession && profile === 'absent'`, et rend « la carte »
 *     dans les deux autres cas ;
 *   · `submit()` ne conclut plus rien sans client ni session (une session peut
 *     expirer entre le montage et le tap) : il rend la main, saisie intacte,
 *     avec l'échec DIT à l'écran.
 *
 * ═══ 6. §A ═════════════════════════════════════════════════════════════════
 * UN seul CTA chartreuse (le sticky au-dessus du clavier) ; les pills de
 * repêchage sont carbone, jamais un second accent. Aucune card dans une card :
 * les trois champs sont posés sur l'espace, séparés par du vide, pas par des
 * boîtes imbriquées. Aucun libellé dupliqué (le sélecteur de ville porte le
 * sien). Aucun texte d'action tronqué. Cibles 44 pt RÉELLES, pas des hitSlop.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardEvent,
} from 'react-native';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  EVENTS,
  HANDLE_MAX_LENGTH,
  HANDLE_MIN_LENGTH,
  HANDLE_SUGGESTION_COUNT,
  colors,
  fontSizes,
  fonts,
  gameColors,
  radii,
  sizes,
  spacing,
  typography,
} from '@klaim/shared';
import { C } from '../../src/i18n/catalog/setupProfile';
import { useT } from '../../src/i18n/store';
import { track } from '../../src/lib/analytics';
import { haptics } from '../../src/lib/haptics';
import { supabase } from '../../src/lib/supabase';
import { useSession } from '../../src/lib/session';
import { Button } from '../../src/ui/Button';
import { CityField } from '../../src/features/city/CityPicker';
import { cityEntryLabel, findCityEntry, nearestCityEntry } from '../../src/features/city/catalog';
import { useCityCatalog } from '../../src/features/city/useCityCatalog';
import { useOnboardingState } from '../../src/features/onboarding/store';
import { parseHandleCheck, useHandleAvailability } from '../../src/features/social/handleCheck';
import { DISPLAY_NAME_MAX, effectiveInitials, saveProfile } from '../../src/features/social/profileStore';
// Lecture de la position PAR PLATEFORME (`location.ts` natif / `location.web.ts`
// web). Le provider natif tire `expo-task-manager`, sans support web : une route
// ne peut pas l'importer en direct sans le mettre dans le bundle navigateur.
// Cette surface n'expose PAS `requestForegroundPermission` — E08 lit, il ne
// demande jamais.
import { checkForegroundPermission, getCurrentPositionOnce } from '../../src/features/setup/location';
import { markMinimalProfileDone } from '../../src/features/setup/minimalProfile';
import {
  HANDLE_SUGGESTION_PROBE_MAX,
  type ProfileDraftBlock,
  type SaveFailureKind,
  citySource,
  handleCheckResult,
  handleSuggestionCandidates,
  normalizeHandleInput,
  profileDraftBlock,
  saveFailureKind,
} from '../../src/features/setup/handle';

/**
 * Étape SUIVANTE du parcours de premier usage (spec : E08 → E09 « Choix
 * d'activité initial »). Nommée en toutes lettres, comme `activity.tsx` nomme la
 * sienne : le parcours setup n'a pas de table de flow, et en inventer une pour
 * trois écrans serait plus de code que de sens.
 *
 * ⚠️ La chaîne complète est figée par un tripwire de source
 * (`src/features/setup/setupChain.test.ts` contre `SETUP_CHAIN` de
 * `firstRun.ts`) : changer cette valeur pour une route inexistante, ou casser
 * l'ordre E08 → E09 → E10 → carte, fait échouer le test au lieu de faire tomber
 * un joueur sur « Unmatched route ».
 *
 * ─── POURQUOI `replace` ET PAS `push` (donc AUCUN retour vers cet écran) ────
 * Parce qu'à l'instant où l'on quitte E08, l'écriture serveur a déjà eu lieu :
 * la ligne `user_profiles` existe et le @handle est PRIS — par ce joueur. Y
 * revenir montrerait un formulaire VIDE (cet écran ne recharge pas la ligne
 * existante), et la vérification répondrait « déjà pris » sur son propre handle.
 * Ce serait un cul-de-sac construit de nos mains. La modification du profil a
 * son écran dédié (`app/profil-edit.tsx`), atteignable depuis le Profil.
 * Conséquence assumée et cohérente : `router.canGoBack()` est faux en E09, donc
 * aucune flèche de retour n'y est peinte — l'affichage se dérive de la capacité
 * RÉELLE, jamais de l'apparence.
 */
const NEXT_STEP = '/setup/activity';

/**
 * Ce que l'écran sait de la ville PROPOSÉE — quatre états distincts, comme
 * partout ailleurs :
 *  · `reading`  — on lit la permission / on attend un fix. On n'affirme rien ;
 *  · `matched`  — une commune réelle a été trouvée près du fix. Elle est
 *                 proposée, et l'écran DIT d'où elle vient (donc qu'on peut la
 *                 corriger) ;
 *  · `none`     — pas de permission, pas de fix, ou aucune commune dans le
 *                 rayon. Le champ reste vide et l'avoue ;
 *  · `edited`   — le joueur a tranché lui-même. L'origine ne se raconte plus.
 */
type CityOrigin = 'reading' | 'matched' | 'none' | 'edited';

/** Hauteur réelle du clavier (0 = fermé) — même technique que `KeyboardSaveBar`. */
function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    // iOS émet `Will` AVANT l'animation (la barre monte AVEC le clavier) ;
    // Android n'a que `Did`.
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: KeyboardEvent) => setHeight(e.endCoordinates?.height ?? 0);
    const subShow = Keyboard.addListener(showEvt, onShow);
    const subHide = Keyboard.addListener(hideEvt, () => setHeight(0));
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);
  return height;
}

export default function SetupProfileScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { session, configured, loading: sessionLoading } = useSession();
  const cityCatalog = useCityCatalog();
  const { update: updateOnboarding } = useOnboardingState();

  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [cityId, setCityId] = useState('');
  /** Ville que la POSITION avait proposée — sert au KPI `city_source`, rien d'autre. */
  const [detectedCityId, setDetectedCityId] = useState<string | null>(null);
  const [cityOrigin, setCityOrigin] = useState<CityOrigin>('reading');
  const [fix, setFix] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<SaveFailureKind | null>(null);

  const backendReady = configured && session !== null && supabase !== null;
  const availability = useHandleAvailability(handle, false);

  // ── §18 analytics : une vue par arrivée sur l'écran ────────────────────────
  useEffect(() => {
    track(EVENTS.setupProfileViewed);
  }, []);

  /**
   * VERDICT AFFICHÉ → event, une fois par verdict (pas une fois par frappe : le
   * hook ne produit un verdict qu'après sa fenêtre de debounce). `idle` et
   * `checking` ne remontent RIEN — ce sont des non-verdicts, et les compter
   * fausserait le KPI « où perd-on les gens ». Le @handle ne part jamais.
   */
  const lastReported = useRef<string | null>(null);
  useEffect(() => {
    const result = handleCheckResult(availability);
    if (result === null || result === lastReported.current) return;
    lastReported.current = result;
    track(EVENTS.setupHandleChecked, { result });
  }, [availability]);

  // ── LA VILLE : on LIT la position, on ne la demande jamais ────────────────
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const permission = await checkForegroundPermission();
        if (cancelled) return;
        if (permission.status !== 'granted') {
          // Ni refus dramatisé, ni demande surprise : on ne sait pas, on le dira.
          setCityOrigin((prev) => (prev === 'reading' ? 'none' : prev));
          return;
        }
        const point = await getCurrentPositionOnce();
        if (cancelled) return;
        if (!point) {
          setCityOrigin((prev) => (prev === 'reading' ? 'none' : prev));
          return;
        }
        setFix({ lat: point.lat, lng: point.lng });
      } catch {
        if (!cancelled) setCityOrigin((prev) => (prev === 'reading' ? 'none' : prev));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Fix + référentiel prêt ⇒ la commune la plus proche. Deux effets séparés
   * parce que ce sont deux attentes indépendantes : le capteur et la lecture du
   * catalogue de villes. Tant que l'une des deux court, on reste en `reading` —
   * un chargement n'affirme rien.
   */
  useEffect(() => {
    if (fix === null || cityOrigin !== 'reading') return;
    // `loading` est le SEUL état où l'on attend : l'index fusionne toujours le
    // référentiel EU, qui est un asset LOCAL (`buildCityIndex(openRows,
    // euReferential())`, useCityCatalog.ts:130). Hors ligne ou sans session, on
    // sait donc toujours quelle commune RÉELLE est la plus proche — ce qu'on
    // ignore alors, c'est laquelle est OUVERTE, et cet écran ne le prétend pas.
    if (cityCatalog.state === 'loading') return;
    const nearest = nearestCityEntry(cityCatalog.index, fix);
    if (!nearest) {
      setCityOrigin('none');
      return;
    }
    setDetectedCityId(nearest.cityId);
    setCityId(nearest.cityId);
    setCityOrigin('matched');
  }, [fix, cityCatalog.state, cityCatalog.index, cityOrigin]);

  // ── SUGGESTIONS : des candidats soumis au serveur, jamais peints à l'avance ─
  const refusedHandle =
    availability.state === 'refused' &&
    (availability.reason === 'taken' || availability.reason === 'reserved')
      ? handle
      : null;
  const [suggestions, setSuggestions] = useState<readonly string[]>([]);
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    setSuggestions([]);
    if (refusedHandle === null) {
      setSuggesting(false);
      return;
    }
    const client = supabase;
    if (!backendReady || !client) {
      // Sans serveur, on ne peut RIEN proposer d'honnête : une pill non vérifiée
      // afficherait « libre » sans que rien ne l'ait dit.
      setSuggesting(false);
      return;
    }
    const candidates = handleSuggestionCandidates(refusedHandle, HANDLE_SUGGESTION_PROBE_MAX);
    if (candidates.length === 0) {
      setSuggesting(false);
      return;
    }

    let cancelled = false;
    setSuggesting(true);
    void (async () => {
      const free: string[] = [];
      for (const candidate of candidates) {
        if (cancelled) return;
        if (free.length >= HANDLE_SUGGESTION_COUNT) break;
        try {
          const { data, error } = await client.rpc('check_handle_available', {
            p_handle: candidate,
          });
          if (cancelled) return;
          // `parseHandleCheck` est la MÊME lecture de contrat que le hook du
          // champ : un seul endroit sait interpréter la réponse de 0047.
          if (!error && parseHandleCheck(data).state === 'free') free.push(candidate);
        } catch {
          if (cancelled) return;
          // Une sonde qui échoue ne dit rien de la suivante : on continue, et
          // ce qui n'a pas répondu ne sera simplement pas proposé.
        }
      }
      if (cancelled) return;
      setSuggestions(free);
      setSuggesting(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [refusedHandle, backendReady]);

  // ── CE QUI EMPÊCHE D'ENREGISTRER (pur, testé) ─────────────────────────────
  const block = profileDraftBlock({ displayName, handle, cityId }, availability);
  const pristine =
    displayName.length === 0 && handle.length === 0 && cityId.length === 0;

  const cityEntry = findCityEntry(cityCatalog.index, cityId.length > 0 ? cityId : null);

  const submit = useCallback(async () => {
    if (block !== null || saving) return;
    haptics.light();
    Keyboard.dismiss();
    setSaving(true);
    setSaveError(null);

    const name = displayName.trim();
    const client = supabase;
    const userId = session?.user?.id ?? null;

    /**
     * SANS SERVEUR, ON NE CONCLUT PAS. L'écran redirige déjà plus haut quand il
     * n'y a ni backend ni session, donc ce cas ne devrait pas arriver — mais
     * une session peut expirer entre le montage et le tap. Avant, la garde
     * s'écrivait `if (client && userId) { … }` : on SAUTAIT l'écriture et on
     * continuait quand même vers l'event et la navigation. Un CTA qui a l'air
     * d'avoir réussi sans que rien ne soit écrit est un mensonge, pas une
     * dégradation. On rend donc la main au joueur, saisie intacte, avec l'échec
     * dit à l'écran.
     */
    if (!client || userId === null) {
      setSaving(false);
      setSaveError('unknown');
      return;
    }

    /**
     * ÉCRITURE SERVEUR — c'est ELLE qui rend le @handle réellement unique
     * (`unique` de 0011). On lit d'abord si la ligne existe : les GRANTS de 0011
     * sont COLONNE PAR COLONNE et `user_id` n'est concédé qu'en INSERT, jamais
     * en UPDATE — un `upsert` PostgREST, qui réécrit toutes les colonnes du
     * payload y compris la clé, se ferait refuser. Deux chemins explicites
     * plutôt qu'un `upsert` qui échouerait toujours (un chemin mort).
     *
     * ⚠️ RÉSIDU ASSUMÉ : entre le SELECT et l'INSERT, une seconde soumission du
     * MÊME compte rendrait un 23505 sur la clé primaire, que `saveFailureKind`
     * nommerait « handle pris ». Le CTA est verrouillé par `saving` pendant tout
     * l'aller-retour, donc ce scénario demande deux appareils sur le même compte
     * à la même seconde. Dit ici plutôt que corrigé à l'aveugle.
     */
    try {
      const existing = await client
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (existing.error) throw existing.error;

      const payload = {
        handle,
        display_name: name,
        main_city: cityEntry?.name ?? null,
        main_country: cityEntry?.country ?? null,
      };
      const written = existing.data
        ? await client.from('user_profiles').update(payload).eq('user_id', userId)
        : await client.from('user_profiles').insert({ user_id: userId, ...payload });
      if (written.error) throw written.error;

      /**
       * LE SERVEUR A ACQUITTÉ. La garde de route (`app/(tabs)/_layout.tsx`)
       * peut le savoir sans refaire un aller-retour — et surtout sans risquer
       * de relire « aucune ligne » à cause d'une latence, ce qui renverrait le
       * joueur dans le formulaire qu'il vient de valider.
       *
       * Ce n'est PAS un optimisme : la ligne est écrite ET acquittée à cet
       * endroit précis du code. Un échec serait parti dans le `catch`
       * ci-dessous, où rien n'est marqué.
       */
      markMinimalProfileDone(userId);
    } catch (error) {
      // La saisie reste À L'ÉCRAN : un échec d'enregistrement ne fait perdre
      // à personne ce qu'il vient de taper.
      setSaving(false);
      setSaveError(saveFailureKind(error));
      return;
    }

    /**
     * ⚠️ AUCUNE NAVIGATION N'ATTEND LE DISQUE. Les deux persistances LOCALES
     * partent, on ne les attend pas — c'est la règle que `features/onboarding/
     * store.ts` énonce pour `finish()` (« un AsyncStorage lent, bloqué ou absent
     * ne peut pas retenir le joueur sur un écran »), et elle vaut ici pour la
     * même raison : `saveProfile` écrit sans plafond de patience, donc un
     * localStorage verrouillé aurait gelé l'inscription sur un spinner.
     *
     * Ce qui restait à attendre, c'était l'écriture SERVEUR — elle vient d'avoir
     * lieu, et c'est la seule qui décide de quoi que ce soit. Aucune course
     * n'est introduite : les écrans qui lisent ces valeurs (la carte deux étapes
     * plus loin) relisent le disque à LEUR montage, et la file d'écriture du
     * store est sérialisée.
     */
    void saveProfile({
      displayName: name,
      handle,
      city: cityEntry ? cityEntryLabel(cityEntry) : '',
      cityId,
    }).catch(() => undefined);

    /**
     * HANDOFF DE CADRAGE. La clé écrite ici est LITTÉRALEMENT celle que la carte
     * lit — `MapScreen.tsx:252` : `cityCenter(onboarding.cityId)` (et son jumeau
     * `MapScreen.web.tsx:307`). Un cadrage, rien de plus : une position mesurée
     * le supplante toujours.
     */
    void updateOnboarding({ cityId, cityName: cityEntry?.name ?? null }).catch(() => undefined);

    track(EVENTS.setupProfileCompleted, { city_source: citySource(detectedCityId, cityId) });
    router.replace(NEXT_STEP);
  }, [
    block,
    saving,
    displayName,
    handle,
    cityId,
    cityEntry,
    session,
    detectedCityId,
    updateOnboarding,
  ]);

  /**
   * VERDICT AFFICHÉ SOUS LE CHAMP @handle — un seul endroit décide, et il DIT
   * quand il ne sait pas. L'ordre des branches est le fond du sujet :
   *   · champ vide          → l'aide, aucun verdict (rien n'a été demandé) ;
   *   · aucun backend       → la vérification n'aura JAMAIS lieu, on ne la promet pas ;
   *   · vérification en vol → n'affirme rien ;
   *   · libre / refusé      → ce que le SERVEUR a dit, avec son motif exact ;
   *   · inconnu             → on se tait sur la disponibilité.
   * Les longueurs des deux motifs de taille sont INJECTÉES depuis game-rules
   * (`{n}`), jamais écrites en toutes lettres dans le catalogue : un texte ne
   * peut donc pas annoncer une borne que la base ne tiendrait pas.
   */
  let verdictText: string;
  let verdictOk = false;
  if (handle.length === 0) {
    verdictText = t(C.handleHint);
    // `!configured` : branche de CEINTURE. L'écran redirige déjà vers « / »
    // dans ce cas (voir la garde juste avant le `return`), donc elle ne se rend
    // plus. On la garde parce qu'elle DIT la vérité — « la vérification n'aura
    // jamais lieu » — et qu'elle resterait juste si la redirection changeait.
  } else if (!configured) {
    verdictText = t(C.handleNoBackend);
  } else if (availability.state === 'checking') {
    verdictText = t(C.handleChecking);
  } else if (availability.state === 'free') {
    verdictText = t(C.handleFree);
    verdictOk = true;
  } else if (availability.state === 'unknown') {
    verdictText = t(C.handleUnknown);
  } else if (availability.state === 'refused') {
    verdictText =
      availability.reason === 'taken'
        ? t(C.handleTaken)
        : availability.reason === 'reserved'
          ? t(C.handleReserved)
          : availability.reason === 'bad_chars'
            ? t(C.handleBadChars)
            : availability.reason === 'too_short'
              ? t(C.handleTooShort, { n: HANDLE_MIN_LENGTH })
              : t(C.handleTooLong, { n: HANDLE_MAX_LENGTH });
  } else {
    verdictText = t(C.handleHint);
  }

  /**
   * La ligne au-dessus du CTA. Elle ne GRONDE pas un formulaire encore vierge :
   * tant que rien n'a été touché, elle dit ce qui n'est PAS demandé (photo, bio,
   * crew). Et elle ne répète jamais un motif déjà affiché sous le champ @handle
   * — deux fois la même phrase pour une seule situation, c'est §A.
   */
  const footerNote = (): string | null => {
    if (saveError !== null) return t(SAVE_ERROR_ENTRY[saveError]);
    if (pristine || block === null) return t(C.optionalNote);
    if (HANDLE_BLOCKS.has(block)) return null;
    if (block === 'name_required') return t(C.nameRequired);
    if (block === 'handle_required') return t(C.handleRequired);
    return t(C.cityRequired);
  };

  const cityNote = (): string => {
    if (cityOrigin === 'reading') return t(C.cityLocating);
    if (cityOrigin === 'matched') return t(C.cityFromLocation);
    if (cityOrigin === 'none' && cityId.length === 0) return t(C.cityUnknown);
    return t(C.cityHint);
  };

  const initials = effectiveInitials({ avatarInitials: '', displayName });
  /** Dégagement du contenu : la barre sticky ne doit jamais couvrir un champ. */
  const bottomClearance = sizes.buttonLg + spacing.xxl + spacing.lg;

  /**
   * ⚠️ Règle des hooks : tous déclarés AVANT ces deux returns.
   *
   * ═══ CE QUE CET ÉCRAN NE PEUT PAS FAIRE SANS SERVEUR (constitution §2) ═════
   * `submit()` enveloppe TOUTE l'écriture dans `if (client && userId)`. Sans
   * backend (O1) ou sans session, cette branche est sautée : aucun SELECT,
   * aucun INSERT sur `user_profiles`, aucun `markMinimalProfileDone`. Le code
   * sortait quand même du bloc, émettait `setup_profile_completed` et naviguait
   * vers E09 — le joueur voyait son CTA aboutir alors que son @handle n'était
   * RÉSERVÉ nulle part, et rien ne le lui disait. C'est le bouton mort de §2,
   * en pire : un bouton qui a l'air de réussir.
   *
   * On ne le corrige pas en bloquant le CTA (ce serait un cul-de-sac : E08 est
   * le premier écran du parcours), mais en n'ouvrant pas un écran qui n'a rien
   * à accomplir. C'est exactement le patron déjà posé par `app/(auth)/email.tsx`
   * (« peindre le CTA ici serait le bouton mort de la constitution §2 ») et la
   * redirection ne perd personne : la garde de route
   * (`app/(tabs)/_layout.tsx` → `decideFirstRun`) n'envoie dans ce parcours QUE
   * quand `configured && hasSession && profile === 'absent'`, et rend « la
   * carte » dans les deux cas ci-dessous.
   *
   * Restauration de session EN COURS → fond noir muet. Un chargement n'affirme
   * rien : ni « pas de compte », ni « compte prêt ».
   */
  if (sessionLoading) return <View style={styles.root} />;
  if (!configured || session === null) return <Redirect href="/" />;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xxl, paddingBottom: bottomClearance + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>{t(C.kicker)}</Text>
        <Text style={styles.title}>{t(C.title)}</Text>
        <Text style={styles.subtitle}>{t(C.subtitle)}</Text>

        {/*
          APERÇU COMPACT (spec : « aperçu compact du profil en haut »).
          Il ne montre QUE ce qui a été tapé. Tant que le nom est vide, il porte
          un placeholder explicite — jamais un faux nom, jamais un persona.
          Volontairement SANS anneau de tier ni cadre de rareté : à l'inscription
          il n'y a ni niveau, ni badge, ni frame, et peindre l'avatar de la
          Player Card ferait miroiter un rang que personne n'a encore.
        */}
        {/* `accessible` groupe le bloc : sans lui, le lecteur d'écran énumère
            avatar / nom / handle / ville en quatre arrêts, et le nom accessible
            du groupe n'est jamais lu. */}
        <View style={styles.preview} accessible accessibilityLabel={t(C.previewA11y)}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <View style={styles.previewText}>
            <Text
              style={displayName.trim().length > 0 ? styles.previewName : styles.previewNameEmpty}
              numberOfLines={1}
            >
              {displayName.trim().length > 0 ? displayName.trim() : t(C.previewPlaceholderName)}
            </Text>
            {/* Le « @ » n'est peint que s'il y a quelque chose derrière : un « @ »
                seul se lirait comme un handle vide déjà attribué. */}
            {handle.length > 0 ? (
              <Text style={styles.previewHandle} numberOfLines={1}>
                @{handle}
              </Text>
            ) : null}
            {cityEntry ? (
              <Text style={styles.previewCity} numberOfLines={1}>
                {cityEntryLabel(cityEntry)}
              </Text>
            ) : null}
          </View>
        </View>

        {/* ── CHAMP 1 · nom d'affichage ── */}
        <Text style={styles.fieldLabel}>{t(C.nameLabel)}</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={displayName}
            onChangeText={(v) => setDisplayName(v.slice(0, DISPLAY_NAME_MAX))}
            placeholder={t(C.namePlaceholder)}
            placeholderTextColor={colors.grisFaible}
            style={styles.input}
            maxLength={DISPLAY_NAME_MAX}
            autoCorrect={false}
            returnKeyType="next"
            accessibilityLabel={t(C.nameLabel)}
          />
          <Text style={styles.counter}>
            {displayName.length}/{DISPLAY_NAME_MAX}
          </Text>
        </View>
        <Text style={styles.hint}>{t(C.nameHint)}</Text>

        {/* ── CHAMP 2 · @handle ── */}
        <Text style={styles.fieldLabel}>{t(C.handleLabel)}</Text>
        <View style={styles.inputRow}>
          {/* Le « @ » est un préfixe AFFICHÉ, hors champ : on ne le tape pas, et
              le filtre de saisie l'écarterait de toute façon. */}
          <Text style={styles.at}>@</Text>
          <TextInput
            value={handle}
            onChangeText={(v) => setHandle(normalizeHandleInput(v))}
            placeholder={t(C.handlePlaceholder)}
            placeholderTextColor={colors.grisFaible}
            style={[styles.input, styles.inputHandle]}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            maxLength={HANDLE_MAX_LENGTH}
            accessibilityLabel={t(C.handleLabel)}
          />
        </View>
        <Text style={verdictOk ? styles.verdictOk : styles.hint}>{verdictText}</Text>

        {/* Repêchage — carbone, jamais un second accent chartreuse (§A4). */}
        {refusedHandle !== null ? (
          suggesting ? (
            <Text style={styles.hint}>{t(C.suggestionsSearching)}</Text>
          ) : suggestions.length > 0 ? (
            <View style={styles.suggestBlock}>
              <Text style={styles.suggestTitle}>{t(C.suggestionsTitle)}</Text>
              <View style={styles.suggestRow}>
                {suggestions.map((candidate, rank) => (
                  <Pressable
                    key={candidate}
                    accessibilityRole="button"
                    accessibilityLabel={t(C.suggestionA11y, { handle: candidate })}
                    onPress={() => {
                      haptics.light();
                      setHandle(candidate);
                      track(EVENTS.setupHandleSuggestionPicked, { rank });
                    }}
                    style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
                  >
                    <Text style={styles.pillLabel} numberOfLines={1}>
                      @{candidate}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <Text style={styles.hint}>{t(C.suggestionsUnavailable)}</Text>
          )
        ) : null}

        {/* ── CHAMP 3 · ville de jeu (sélecteur PARTAGÉ : communes réelles) ──
            Il porte son propre label et sa propre affordance ; on ne lui en
            superpose pas une seconde série. `note` dit ce que lui ne sait pas :
            d'où vient la valeur proposée, et quoi faire quand on n'a rien deviné.
            UNE seule ligne sous le champ, jamais deux empilées (§A) — d'où
            l'absence de `CityC.profileNote` en plus : `cityHint` porte déjà ce
            qui compte ici (« tu peux en changer plus tard »), et rien n'a encore
            été capturé au moment où cet écran s'affiche. */}
        <View style={styles.cityBlock}>
          <CityField
            selectedId={cityId.length > 0 ? cityId : null}
            note={cityNote()}
            onSelect={(entry) => {
              setCityId(entry.cityId);
              setCityOrigin('edited');
            }}
          />
        </View>
      </ScrollView>

      {/*
        CTA STICKY (spec : « CTA sticky au-dessus du clavier »). Hors du
        ScrollView, donc fixe ; posé sur la hauteur RÉELLE du clavier quand il
        est ouvert, sur la safe area sinon. C'est l'UNIQUE bouton chartreuse de
        l'écran, et il est désactivé exactement quand il échouerait à coup sûr
        (champ manquant, format cassé, refus serveur déjà connu) — jamais parce
        qu'une vérification est en vol ou que le réseau manque.
      */}
      <View
        style={[
          styles.footer,
          { paddingBottom: keyboardHeight > 0 ? spacing.sm : insets.bottom + spacing.sm },
          keyboardHeight > 0 ? { bottom: keyboardHeight } : null,
        ]}
      >
        {footerNote() !== null ? (
          <Text style={saveError !== null ? styles.footerError : styles.footerNote} numberOfLines={2}>
            {footerNote()}
          </Text>
        ) : null}
        <Button
          label={saving ? t(C.ctaBusy) : t(C.cta)}
          onPress={() => void submit()}
          disabled={block !== null}
          loading={saving}
          analyticsId="setup_profile_continue"
        />
      </View>
    </View>
  );
}

/** Les blocages DÉJÀ dits sous le champ @handle : la barre du bas les tait. */
const HANDLE_BLOCKS: ReadonlySet<ProfileDraftBlock> = new Set<ProfileDraftBlock>([
  'too_short',
  'too_long',
  'bad_chars',
  'handle_taken',
  'handle_reserved',
]);

/** Échec d'enregistrement → phrase. Trois causes, trois gestes différents. */
const SAVE_ERROR_ENTRY = {
  handle_taken: C.errorHandleTakenOnSave,
  network: C.errorNetwork,
  unknown: C.errorUnknown,
} as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.cardPadding },

  kicker: { ...typography.kicker, color: colors.gris, textTransform: 'uppercase' },
  title: { ...typography.title, color: colors.blanc, marginTop: spacing.xs },
  subtitle: {
    ...typography.body,
    color: colors.gris,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },

  // ── Aperçu compact : UNE surface (N1), aucune card imbriquée dedans ───────
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radii.card,
    backgroundColor: colors.carbone2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    ...typography.cardTitle,
    color: colors.blanc,
    fontSize: fontSizes.lg,
  },
  previewText: { flex: 1, gap: 2 },
  previewName: { ...typography.cardTitle, color: colors.blanc },
  previewNameEmpty: { ...typography.cardTitle, color: colors.grisFaible },
  previewHandle: { ...typography.meta, color: colors.gris, fontVariant: ['tabular-nums'] },
  previewCity: { ...typography.meta, color: colors.grisFaible },

  // ── Champs ────────────────────────────────────────────────────────────────
  fieldLabel: {
    ...typography.kicker,
    color: colors.gris,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.carbone2,
    borderRadius: radii.control,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    // Plancher tactile RÉEL : le champ FAIT 56 pt de haut, il n'est pas agrandi
    // par un hitSlop qui ne se voit pas.
    height: sizes.buttonLg,
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontFamily: fonts.text,
  },
  inputHandle: { fontVariant: ['tabular-nums'] },
  at: { color: colors.gris, fontSize: fontSizes.md, fontFamily: fonts.textSemi, fontWeight: '700' },
  counter: { color: colors.grisFaible, fontSize: fontSizes.xs, fontVariant: ['tabular-nums'] },

  hint: { ...typography.meta, color: colors.gris, marginTop: spacing.xs },
  verdictOk: { ...typography.meta, color: gameColors.successMint, marginTop: spacing.xs },

  // ── Repêchage ─────────────────────────────────────────────────────────────
  suggestBlock: { marginTop: spacing.sm, gap: spacing.xs },
  suggestTitle: { ...typography.kicker, color: colors.gris, textTransform: 'uppercase' },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pill: {
    // 44 pt RÉELS (plancher tactile), pas un hitSlop.
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.carbone2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.grisLigne,
  },
  pillLabel: {
    ...typography.itemTitle,
    color: colors.blanc,
    fontVariant: ['tabular-nums'],
  },
  pressed: { opacity: 0.6 },

  cityBlock: { marginTop: spacing.lg },

  // ── CTA sticky ────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.cardPadding,
    paddingTop: spacing.sm,
    gap: spacing.xs,
    backgroundColor: colors.noir,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.grisLigne,
  },
  footerNote: { ...typography.meta, color: colors.gris },
  footerError: { ...typography.meta, color: colors.blanc },
});
