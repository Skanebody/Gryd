/**
 * GRYD — L'ACCUEIL : la carte, et les trois questions de L1 (lot M3).
 *
 * ─── CE QUE CET ÉCRAN DOIT RÉPONDRE EN MOINS D'UNE SECONDE ──────────────────
 *   « Où suis-je ? »              → la carte, centrée si — et seulement si — la
 *                                   position est autorisée.
 *   « Qu'est-ce qui est à moi ? » → une PHRASE ou un chiffre, selon ce que l'app
 *                                   sait réellement (`homeState`).
 *   « Que dois-je faire ? »       → une seule action, dérivée de la capacité
 *                                   réelle (`homeAction`), jamais de l'écran.
 *
 * ─── POURQUOI IL NE DÉCIDE RIEN LUI-MÊME ────────────────────────────────────
 * Tout le jugement est dans deux modules purs et testés. Ce fichier ne fait que
 * COLLER : il lit trois faits (session, permission, lecture), les passe à
 * `homeState`, et rend ce qu'on lui dit de rendre. C'est ce qui permet de
 * prouver les états qu'on ne sait pas provoquer à la main — un backend
 * injoignable, une permission définitivement bloquée, une lecture qui échoue.
 *
 * ─── LE PIÈGE ÉVITÉ ICI ─────────────────────────────────────────────────────
 * Une carte sans forme chartreuse a la même APPARENCE dans quatre situations
 * différentes : je n'ai rien pris, la lecture tourne, elle a échoué, il n'y a
 * pas de serveur. C'est le bandeau — jamais la carte — qui dit laquelle.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import {
  colors,
  elevation,
  fonts,
  fontSizes,
  radii,
  sizes,
  spacing,
  typography,
  EVENTS,
} from '@klaim/shared';
import { MapCanvas, type MapCanvasHandle } from '../../src/mvp/map/MapCanvas';
import {
  canCenterOnPlayer,
  heroAreaM2,
  homeAction,
  homeStatus,
  openingFraming,
  pendingNotice,
  type HomeInput,
  type LocationAccess,
  type TerritoryRead,
} from '../../src/mvp/map/homeState';
import { readMyTerritories, readRivalTerritories } from '../../src/mvp/map/readTerritories';
import type { TerritoryFeatureCollection } from '../../src/mvp/map/territoryGeo';
import { heroArea } from '../../src/mvp/ui/area';
import { SkeletonBlock, SkeletonGroup } from '../../src/mvp/ui/Skeleton';
import { Glyph } from '../../src/mvp/ui/Glyph';
import { Panel } from '../../src/mvp/ui/Panel';
import { useAnnonce } from '../../src/mvp/ui/announce';
import { recoveryOffer, toSnapshot } from '../../src/mvp/run/persist';
import { hasPendingUpload } from '../../src/lib/pendingUpload';
import { loadActiveRun, loadCurrentRun } from '../../src/lib/runStore';
import { isSupabaseConfigured } from '../../src/lib/supabase';
import { useSession } from '../../src/lib/session';
import { C } from '../../src/i18n/catalog/mvp';
import { useT } from '../../src/i18n/store';
import { screen, track } from '../../src/lib/analytics';

/** Cible tactile minimale (L4) — la même que `Stage`, et le même token. */
const TOUCH_TARGET_PT = sizes.touchTarget;

/** Zoom d'ouverture sur ma position : le quartier, pas la ville ni la rue. */
const ZOOM_EGO = 15;

/**
 * Interligne du corps, en MULTIPLE de la taille de police.
 *
 * ⚠️ Il n'est PAS écrit dans `StyleSheet.create` : un `lineHeight` numérique ne
 * suit pas Dynamic Type, alors que `fontSize` le suit. Figé à 24 pt, il tenait
 * tant que le corps faisait 16 pt — à l'échelle AX3 (~2,35×) le texte atteint
 * ~38 pt dans le même interligne de 24, et les lignes se RECOUVRENT. On le
 * dérive donc du `fontScale` système, à chaque rendu (même dérivation dans
 * `connexion`, `profil`, `resultat` et `Stage`).
 */
const INTERLIGNE = 1.5;

/**
 * Plancher de réduction du chiffre héros, en fraction de sa taille nominale.
 *
 * ⚠️ Ce n'est PAS un réglage esthétique, c'est une mesure. `1 240 000` en 64 pt
 * fait à lui seul ~342 pt de large : sur un iPhone 15 (393 pt moins deux marges
 * `lg`, moins la place réservée au rond « Toi »), il ne rentre pas. Sans
 * `adjustsFontSizeToFit`, RN renvoyait la légende à la ligne et l'alignement
 * `baseline` sautait — le chiffre du jeu se cassait tout seul au moment précis
 * où il devient gros, c'est-à-dire quand le joueur a le plus gagné.
 *
 * 0,5 (donc 32 pt au pire) laisse deux fois la marge nécessaire au plus grand
 * nombre que `heroArea` sait produire, sans jamais descendre sous une taille où
 * le chiffre cesserait de dominer (L12).
 */
const HERO_MIN_SCALE = 0.5;

/** Réponse OS → l'état que `homeState` comprend. Sans réponse encore : inconnu. */
function accesDepuisOS(r: Location.PermissionResponse | null): LocationAccess {
  if (r === null) return 'unknown';
  if (r.granted) return 'granted';
  // `=== false` et non `!canAskAgain` — même prudence que `permissionOutcome` :
  // un `undefined` ne doit pas se lire comme une porte définitivement fermée.
  return r.canAskAgain === false ? 'blocked' : 'unknown';
}

export default function Carte() {
  const t = useT();
  const { fontScale } = useWindowDimensions();
  const interligne = { lineHeight: Math.round(fontSizes.md * INTERLIGNE * fontScale) };
  // Même raison que `INTERLIGNE`, appliquée aux rôles `stat*` : ils portent un
  // `lineHeight` FIGÉ (18 et 16) qui tient à l'échelle 1× et rogne le texte dès
  // qu'on monte en Dynamic Type. On garde le rôle, on suit l'échelle.
  const ligneUnite = { lineHeight: Math.round(typography.statUnit.lineHeight * fontScale) };
  const ligneLegende = { lineHeight: Math.round(typography.statLabel.lineHeight * fontScale) };
  const ligneNote = { lineHeight: Math.round(fontSizes.sm * INTERLIGNE * fontScale) };
  const { session, loading: sessionLoading } = useSession();
  const [permission, setPermission] = useState<Location.PermissionResponse | null>(null);
  const [read, setRead] = useState<TerritoryRead>({ kind: 'idle' });
  const [formes, setFormes] = useState<TerritoryFeatureCollection | null>(null);
  const [trace, setTrace] = useState<TerritoryFeatureCollection | null>(null);
  const [rivaux, setRivaux] = useState<TerritoryFeatureCollection | null>(null);
  const [position, setPosition] = useState<{ lng: number; lat: number } | null>(null);
  const [interrompue, setInterrompue] = useState(false);
  const [enAttente, setEnAttente] = useState(false);
  /** La carte, pour le SEUL ordre que l'écran lui donne : recadrer. */
  const carte = useRef<MapCanvasHandle | null>(null);

  const userId = session?.user?.id ?? null;
  const acces = accesDepuisOS(permission);

  const etat: HomeInput = {
    backend: isSupabaseConfigured ? 'configured' : 'absent',
    session: sessionLoading ? 'restoring' : userId === null ? 'signedOut' : 'signedIn',
    read,
    location: acces,
    interrupted: interrompue,
    pending: enAttente,
  };
  const status = homeStatus(etat);
  const action = homeAction(etat);
  const chiffre = heroArea(heroAreaM2(etat));

  // La permission est LUE, pas demandée : l'onboarding s'en est chargé, et une
  // popup système à l'ouverture de la carte serait exactement le « à froid »
  // que L9 interdit.
  useEffect(() => {
    let vivant = true;
    Location.getForegroundPermissionsAsync()
      .then((r) => {
        if (vivant) setPermission(r);
      })
      .catch(() => {
        // On ne sait pas : `unknown` propose « Autoriser », ce qui rouvre le
        // dialogue si c'est possible et ne coûte qu'un tap sinon.
        if (vivant) setPermission(null);
      });
    return () => {
      vivant = false;
    };
  }, []);

  // Ma position, seulement si elle est autorisée. Sans autorisation, la carte
  // ouvre sur la ville et ne peint AUCUN point : un point au centre serait une
  // position inventée.
  useEffect(() => {
    if (!canCenterOnPlayer(etat)) return;
    let vivant = true;
    Location.getLastKnownPositionAsync()
      .then((p) => {
        if (vivant && p !== null) setPosition({ lng: p.coords.longitude, lat: p.coords.latitude });
      })
      .catch(() => undefined);
    return () => {
      vivant = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acces]);

  const charger = useCallback(async () => {
    if (userId === null || !isSupabaseConfigured) return;
    setRead({ kind: 'loading' });
    const r = await readMyTerritories(userId);
    if (r.kind === 'failed') {
      // ⚠️ On ne garde PAS les formes précédentes : elles dateraient d'avant
      // l'échec et se liraient comme l'état actuel.
      setFormes(null);
      setTrace(null);
      setRivaux(null);
      setRead({ kind: 'failed' });
      return;
    }
    setFormes(r.collection);
    setTrace(r.trace);
    setRead({ kind: 'ok', ownedCount: r.ownedCount, areaM2: r.areaM2 });

    // Les rivaux SÉPARÉMENT, et leur échec n'invalide PAS ma carte : ne pas
    // savoir ce que les autres tiennent n'empêche pas de savoir ce que je
    // tiens. L'inverse — tout perdre parce qu'une lecture secondaire a raté —
    // serait un échec partiel déguisé en panne totale.
    const autres = await readRivalTerritories(userId);
    setRivaux(autres.kind === 'ok' ? autres.collection : null);
  }, [userId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  /**
   * LA DÉCONNEXION VIDE LA CARTE.
   *
   * `retourCarte` (`mvp/ui/nav.ts`) REMONTE désormais à CETTE instance après
   * « Se déconnecter » (`profil.tsx`) au lieu d'en empiler une seconde neuve —
   * qui, elle, serait repartie de zéro gratuitement. En repeignant la MÊME
   * instance, elle doit désormais faire elle-même ce qu'un remontage faisait
   * pour rien : oublier ce qu'elle savait. Sans ce videur, `formes`/`trace`/
   * `rivaux`/`read` restent ceux du compte qui vient de partir — `charger` se
   * tait dès `userId === null`, donc rien ne les efface jamais tout seul — et
   * la carte peindrait les territoires de quelqu'un d'autre à la prochaine
   * personne qui rouvre l'app sur cet appareil, ou à celui qui vient de se
   * déconnecter lui-même.
   *
   * `homeStatus` retombe ensuite sur `signedOut`, comme il sait déjà le faire
   * pour un compte qui n'a jamais rien lu — c'est lui qui porte l'affichage,
   * ce videur ne fait que ne plus mentir en dessous.
   */
  useEffect(() => {
    if (userId !== null) return;
    setFormes(null);
    setTrace(null);
    setRivaux(null);
    setRead({ kind: 'idle' });
  }, [userId]);

  /**
   * SAIT-ON DÉJÀ QUELQUE CHOSE, LÀ, MAINTENANT ? Portée par une RÉFÉRENCE et
   * non par une dépendance directe de `relireAuFocus` : `read.kind` change PAR
   * `relireAuFocus` elle-même (son `setRead`, plus bas), et `useFocusEffect`
   * (plus bas encore) rejoue la fonction qu'on lui passe dès qu'elle change
   * D'IDENTITÉ pendant que l'écran est au premier plan. La mettre en
   * dépendance créerait donc une boucle — lire, `setRead`, nouvelle identité,
   * relire, `setRead`… — exactement ce que la garde « un focus = une lecture »
   * interdit.
   */
  const lectureConnueRef = useRef(false);
  useEffect(() => {
    lectureConnueRef.current = read.kind === 'ok';
  }, [read.kind]);

  /**
   * LA MOITIÉ MANQUANTE DE « REMONTER, PAS EMPILER ».
   *
   * `retourCarte` remonte désormais à CETTE instance plutôt que d'en empiler
   * une seconde — mais `charger` (ci-dessus) ne tourne qu'au montage
   * (`useEffect([charger])`). Sans cette relecture, remonter après une capture
   * afficherait le territoire D'AVANT la boucle qu'on vient de fermer : la
   * carte mentirait par omission sur ce que le joueur vient d'obtenir.
   *
   * ⚠️ UN TERRITOIRE DÉJÀ CONNU RESTE AFFICHÉ PENDANT LA VÉRIFICATION.
   * Repasser par `{ kind: 'loading' }` ferait réapparaître le squelette sur un
   * chiffre acquis, pour une relecture qui ne fait souvent que CONFIRMER ce
   * qu'on sait déjà — un aller-retour vers « Toi » ne doit pas faire clignoter
   * la carte. La forme choisie ici est la plus honnête des deux : ce qu'on
   * sait reste affiché, une lecture tourne en silence derrière lui.
   *
   * ⚠️ UN ÉCHEC DE CETTE RELECTURE N'EFFACE PAS UN ACQUIS RÉEL. Le serveur ne
   * s'est pas dédit : seule CETTE vérification n'a pas abouti. `charger`, lui,
   * efface bien sur un échec — mais le sien est le PREMIER essai, qui n'a rien
   * d'acquis à protéger. Les deux fonctions répondent à deux questions
   * différentes : « que sait-on pour la première fois ? » et « ce qu'on sait
   * tient-il encore ? ».
   */
  const relireAuFocus = useCallback(async () => {
    if (userId === null || !isSupabaseConfigured) return;
    if (!lectureConnueRef.current) {
      void charger();
      return;
    }
    const r = await readMyTerritories(userId);
    if (r.kind === 'failed') return;
    setFormes(r.collection);
    setTrace(r.trace);
    setRead({ kind: 'ok', ownedCount: r.ownedCount, areaM2: r.areaM2 });
    const autres = await readRivalTerritories(userId);
    setRivaux(autres.kind === 'ok' ? autres.collection : null);
  }, [userId, charger]);

  /**
   * ⚠️ UN FOCUS = UNE LECTURE — PAS DEUX. Le tout premier focus coïncide avec
   * le montage, où l'effet de chargement initial (`useEffect([charger])`
   * ci-dessus) s'en charge déjà : relire ici aussi doublerait l'appel réseau
   * pour ce même focus. `focusInitialRef` saute donc UNIQUEMENT ce premier
   * appel ; tout retour ultérieur sur l'écran relit pour de vrai.
   */
  const focusInitialRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!focusInitialRef.current) {
        focusInitialRef.current = true;
        return;
      }
      void relireAuFocus();
    }, [relireAuFocus]),
  );

  useEffect(() => {
    screen('map');
    // L'Annexe B nomme cet événement `map_viewed`. La taxonomie du dépôt a DÉJÀ
    // `map_view` avec une propriété `state` : en ajouter un second créerait deux
    // entonnoirs qui divergeraient dès la première analyse. Même information,
    // un seul nom (même arbitrage qu'en M2 pour `permission_location`).
    track(EVENTS.mapView, { state: status });
    // Volontairement au MONTAGE : un événement par ouverture d'écran, pas un
    // par transition d'état — sinon un simple chargement en produirait trois.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NEVER-LOSE-A-RUN — la moitié visible de la garantie. Une trace qui survit
  // sur le disque sans que personne ne le sache est perdue quand même : c'est
  // ICI qu'on le dit. Les DEUX clés sont lues (cf. `runStore.ts`, cas du 2ᵉ
  // kill pendant qu'une reprise attendait déjà) — n'en lire qu'une effacerait
  // l'autre en silence.
  useEffect(() => {
    let vivant = true;
    Promise.all([loadActiveRun(), loadCurrentRun()])
      .then(([actif, courant]) => {
        if (!vivant) return;
        const offre = recoveryOffer(
          [
            toSnapshot(actif?.runId ?? '', actif),
            toSnapshot(courant?.runId ?? '', courant),
          ],
          Date.now(),
        );
        setInterrompue(offre === 'resume');
      })
      .catch(() => undefined);
    return () => {
      vivant = false;
    };
  }, []);

  /**
   * LA MOITIÉ MANQUANTE DE L'HONNÊTETÉ HORS-LIGNE.
   *
   * Une course terminée sans réseau part en file (`lib/pendingUpload.ts`) et le
   * résultat le dit. La carte, elle, ne lisait JAMAIS cette file : elle
   * réaffichait l'ancien territoire sans un mot sur la sortie qui attend — un
   * mensonge par omission, puisqu'elle affirmait un état qu'elle savait
   * incomplet.
   *
   * ⚠️ `useFocusEffect` ET NON `useEffect` : cet écran reste monté dans la pile,
   * et le fait naît précisément quand on REVIENT d'une fin de course. Au
   * montage seulement, il n'aurait été lu qu'une fois, avant d'exister.
   *
   * `hasPendingUpload` retombe sur `false` quand le stockage est illisible, avec
   * sa raison écrite là-bas : « on n'affiche jamais une promesse inenvoyable ».
   *
   * ⚠️ LIMITE ÉCRITE PLUTÔT QUE MASQUÉE : le drain part aussi tout seul au
   * RETOUR AU PREMIER PLAN (`app/_layout.tsx`), sans repasser par un focus de
   * route. Si la sortie part pendant qu'on regarde la carte, la note reste
   * affichée jusqu'à la prochaine venue sur l'écran. Elle était vraie quand on
   * l'a lue, et elle n'annonce rien de faux — au pire, elle annonce trop
   * longtemps une course déjà arrivée. Écouter `AppState` ne fermerait pas le
   * trou : on relirait la file AVANT que le drain, asynchrone, ne l'ait vidée.
   */
  useFocusEffect(
    useCallback(() => {
      let vivant = true;
      hasPendingUpload()
        .then((attend) => {
          if (vivant) setEnAttente(attend);
        })
        .catch(() => undefined);
      return () => {
        vivant = false;
      };
    }, []),
  );

  const demanderPosition = useCallback(async () => {
    const r = await Location.requestForegroundPermissionsAsync().catch(() => null);
    setPermission(r);
    track(EVENTS.permissionLocation, { result: r?.granted === true ? 'granted' : 'retry' });
  }, []);

  /**
   * La phrase d'état.
   *
   * La course interrompue passe DEVANT le reste, y compris devant un chiffre
   * héros : ce qui peut encore être perdu prime sur ce qui est déjà acquis.
   */
  const phrase = interrompue
    ? t(C.mapInterrupted)
    : status === 'unavailable'
      ? t(C.mapUnavailable)
      : status === 'signedOut'
        ? t(C.mapSignedOut)
        : status === 'loading'
          ? t(C.mapLoading)
          : status === 'failed'
            ? t(C.mapFailed)
            : // Le serveur a répondu « rien », et il a raison : il n'a pas encore
              // vu la course qui dort sur le disque. Dire « Ta ville est vierge »
              // ici, c'est le dire à quelqu'un qui vient de fermer sa boucle.
              status === 'pending'
              ? t(C.mapPending)
              : status === 'empty'
                ? t(C.emptyMap)
                : null;

  /**
   * LA SECONDE VOIX DU BANDEAU — jamais un remplacement.
   *
   * Un état « en attente » n'annule pas ce qui est acquis : quand un territoire
   * est déjà tenu, le chiffre héros RESTE et c'est cette note qui porte le fait.
   * `pendingNotice` décide seul de son apparition — y compris de son SILENCE là
   * où « elle partira » serait une promesse intenable (sans serveur, sans compte).
   */
  const noteAttente = pendingNotice(etat) ? t(C.mapPending) : null;

  /**
   * ⚠️ CHAQUE VALEUR DE `HomeAction` DOIT ÊTRE PEINTE ICI, SAUF `'none'`.
   *
   * `signIn` manquait. `homeAction` le rendait pourtant depuis le matin même —
   * je l'y avais ajouté pour que GO cesse d'être un bouton mort sans compte
   * (une course sans compte s'enregistre mais ne peut JAMAIS devenir un
   * territoire). L'écran, lui, ne connaissait pas la valeur : elle tombait dans
   * le `: null` final, et la carte se retrouvait SANS AUCUN bouton.
   *
   * J'avais donc échangé un bouton mort contre un cul-de-sac — et L8 exige
   * l'inverse : tout état vide porte l'action qui le remplit. Ici c'est de se
   * connecter, pas de courir. `couture.test.ts` vérifie désormais
   * l'exhaustivité, parce que la relecture ne l'a pas vue deux fois de suite.
   */
  // iOS n'a pas de « live region » (`accessibilityLiveRegion` est ANDROID) :
  // sans cette annonce, passer de « lecture en cours » à « échec » change le
  // texte sans qu'aucun lecteur d'écran ne l'apprenne.
  //
  // ⚠️ LA NOTE ENTRE DANS L'ANNONCE, elle aussi. Elle apparaît APRÈS coup (une
  // lecture disque) sans que rien d'autre ne change à l'écran : laissée dehors,
  // aucun lecteur d'écran n'apprendrait jamais qu'une course attend.
  const dits = [phrase, noteAttente].filter((x): x is string => x !== null);
  useAnnonce(dits.length === 0 ? null : dits.join(' '));

  const libelleAction =
    action === 'resume'
      ? t(C.ctaResumeRun)
      : action === 'go'
        ? t(C.ctaGo)
        : action === 'signIn'
          ? t(C.ctaSignIn)
          : action === 'askLocation'
            ? t(C.obPrimingCta)
            : action === 'openSettings'
              ? t(C.obDeniedCta)
              : null;

  const lancerAction = useCallback(() => {
    if (action === 'resume') {
      // DIRECTEMENT la course, sans décompte : elle est déjà partie. Faire
      // recompter « 3, 2, 1 » sur une sortie en cours dirait qu'elle recommence.
      router.push('/course');
      return;
    }
    if (action === 'go') {
      router.push('/prete');
      return;
    }
    // `push` et non `replace` : on vient de la carte, on doit pouvoir y revenir
    // sans se connecter. `/connexion` porte désormais sa propre sortie, mais
    // laisser la pile intacte évite d'en dépendre.
    if (action === 'signIn') {
      router.push('/connexion');
      return;
    }
    if (action === 'askLocation') {
      void demanderPosition();
      return;
    }
    if (action === 'openSettings') void Linking.openSettings();
  }, [action, demanderPosition]);

  const insets = useSafeAreaInsets();

  /**
   * Y a-t-il seulement quelque chose à recadrer ?
   *
   * Même fonction que celle qui décide du cadrage dans `MapCanvas` — c'est
   * VOULU : l'affichage du contrôle se dérive de la capacité RÉELLE de la
   * carte, pas d'un drapeau parallèle qui pourrait diverger d'elle.
   */
  const cadrable = openingFraming({ territories: formes, center: position, zoom: ZOOM_EGO }) !== null;

  return (
    <View style={styles.root}>
      <MapCanvas
        ref={carte}
        center={position}
        zoom={ZOOM_EGO}
        // `formes` n'est jamais une liste vide « par défaut » : il vaut `null`
        // tant qu'aucune lecture n'a abouti. La carte ne peint donc rien, et
        // c'est le bandeau qui dit pourquoi.
        territories={formes}
        trace={trace}
        rivals={rivaux}
        showUser={canCenterOnPlayer(etat)}
      />

      {/* ── Ce qui est à moi (L1 q.2, L12) ─────────────────────────────────── */}
      {/* `pointerEvents` en STYLE et non en prop : la prop est dépréciée sur
          RN-web et fait crier la console à chaque rendu. Le bandeau laisse
          passer les gestes — sinon il volerait le pan de la carte sur tout le
          haut de l'écran. */}
      {/* Le bandeau était posé À NU sur MapLibre. Ça tient tant que le terrain
          est sombre — mais le TERRITOIRE et le TRACÉ sont peints en chartreuse
          vive : dès que l'un passe sous le chiffre héros blanc, le chiffre se
          hache. `Panel` sépare la couche de contenu du terrain (voir son
          en-tête pour pourquoi ce n'est pas un flou). */}
      <Panel edge="top" radius={0} style={[styles.bandeau, { paddingTop: insets.top + spacing.md }]}>
        {chiffre !== null && !interrompue ? (
          // UN SEUL élément d'accessibilité pour LE chiffre du jeu : à l'œil ce
          // sont trois `Text` (le nombre, puis l'unité et la légende aux rôles
          // `stat*`), à l'oreille c'était trois arrêts — « 64 » … « m² » … « à
          // toi ». Le label le redit d'un tenant, unité en toutes lettres (voir
          // `a11yAreaOwned`). ⚠️ Le groupe enveloppe MAINTENANT deux lignes : ne
          // pas le redescendre sur la seule ligne du nombre, la légende
          // redeviendrait un arrêt séparé.
          // La LÉGENDE PASSE SOUS le chiffre. `mvp.ts` la documente depuis
          // toujours comme « légende SOUS le chiffre héros » — le code, lui, la
          // posait à côté, et les trois textes sur une seule ligne ne rentraient
          // pas (voir `HERO_MIN_SCALE`). Reste sur la ligne du haut ce qui forme
          // une grandeur indivisible : le nombre et son unité.
          <View style={styles.heroBloc} accessible accessibilityLabel={t(C.a11yAreaOwned, { n: chiffre })}>
            <View style={styles.heroLigne}>
              <Text
                style={styles.hero}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={HERO_MIN_SCALE}
              >
                {chiffre}
              </Text>
              <Text style={[styles.unite, ligneUnite]}>{t(C.unitM2)}</Text>
            </View>
            <Text style={[styles.heroLabel, ligneLegende]}>{t(C.mapOwnedLabel)}</Text>
          </View>
        ) : status === 'loading' && !interrompue ? (
          // L14 — la FORME de la réponse à « qu'est-ce qui est à moi ? », pas
          // un sablier. `accessible` + `accessibilityLabel` PORTENT l'annonce
          // que la lecture est en cours : le skeleton, lui, reste décoratif
          // (voir l'en-tête de `Skeleton.tsx`) — sinon un VoiceOver n'apprendrait
          // plus rien pendant tout le chargement, une régression que la version
          // en texte n'avait pas.
          <View accessible accessibilityLabel={t(C.mapLoading)} accessibilityLiveRegion="polite">
            <SkeletonGroup style={styles.heroLigneSkeleton}>
              <SkeletonBlock width={84} height={fontSizes.hero} />
              <SkeletonBlock width={32} height={fontSizes.lg} />
            </SkeletonGroup>
          </View>
        ) : (
          // `accessibilityLiveRegion` : cette phrase CHANGE sans que l'écran
          // change — une lecture qui tourne devient un échec, un vide ou « sans
          // compte ». Sans région vive, le nouvel état s'affichait en silence :
          // seul `loading` était annoncé, donc VoiceOver entendait « lecture en
          // cours… » puis plus rien, à jamais.
          <Text style={[styles.phrase, interligne]} accessibilityLiveRegion="polite">
            {phrase}
          </Text>
        )}

        {/* La course qui attend le réseau s'AJOUTE, elle ne remplace pas : le
            chiffre héros reste au-dessus, parce qu'un envoi en attente n'a rien
            retiré au joueur. Grise et en corps `sm` pour la même raison — c'est
            une réserve sur la grandeur, pas un titre qui la concurrence (L12). */}
        {noteAttente !== null ? (
          <Text style={[styles.note, ligneNote]} accessibilityLiveRegion="polite">
            {noteAttente}
          </Text>
        ) : null}
      </Panel>

      {/* ── Toi : EN HAUT À DROITE, plus dans la zone du pouce ─────────────── */}
      {/* Il était empilé À 12 pt AU-DESSUS de GO, en pleine largeur, dans la
          bande la moins précise de l'écran : deux cibles voisines dont l'une
          quitte le jeu et l'autre le lance. Sur iOS, le compte se range en haut
          à droite — et l'y ranger libère le pouce pour la seule action du jeu.
          Le glyphe ne s'annonce PAS lui-même (voir `Glyph.tsx`) : c'est ce
          Pressable qui porte le libellé, le même mot qu'avant. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.ctaProfil)}
        onPress={() => router.push('/profil')}
        hitSlop={spacing.xs}
        style={({ pressed }) => [
          styles.rond,
          { top: insets.top + spacing.md },
          pressed && styles.rondPresse,
        ]}
      >
        <Glyph name="toi" size={fontSizes.lg} color={colors.blanc} />
      </Pressable>

      {/* ── Recentrer : le SEUL geste qui rend la caméra au code ──────────── */}
      {/* Après le cadrage d'ouverture, `MapCanvas` ne touche plus jamais la
          caméra — c'est ce qui empêche le pilotage automatique de se battre
          avec les doigts. Le prix de cette règle, c'est qu'un joueur parti
          explorer n'a plus de chemin de retour : ce bouton est ce chemin, et il
          ne part que d'un tap.

          Il n'existe QUE s'il y a quelque chose à recadrer — sans territoire ni
          position, il n'aurait rien à viser, et un bouton qui ne fait rien est
          exactement ce que la constitution appelle un bouton mort.

          Rangé SOUS « Toi », dans la colonne que le bandeau réserve déjà : deux
          contrôles ronds du même gabarit, hors de la zone du pouce, hors du
          chemin de GO. */}
      {cadrable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.mapRecenter)}
          onPress={() => carte.current?.recadrer()}
          hitSlop={spacing.xs}
          style={({ pressed }) => [
            styles.rond,
            { top: insets.top + spacing.md + TOUCH_TARGET_PT + spacing.sm },
            pressed && styles.rondPresse,
          ]}
        >
          <Glyph name="signal" size={fontSizes.lg} color={colors.blanc} />
        </Pressable>
      ) : null}

      {/* ── Que dois-je faire (L1 q.3, L2, L4) ─────────────────────────────── */}
      <Panel edge="bottom" radius={0} style={[styles.pied, { paddingBottom: insets.bottom + spacing.lg }]}>
        {/* Aucun bouton quand rien de ce que le joueur peut faire ne débloque
            l'état : un CTA qui ne tient pas sa promesse est pire qu'une absence
            de CTA (constitution). */}
        {libelleAction !== null ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={libelleAction}
            onPress={lancerAction}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <Text style={styles.ctaLabel}>{libelleAction}</Text>
          </Pressable>
        ) : null}

        {/* « Réessayer » est un TEXTE, jamais un bouton plein : il ne doit pas
            peser autant que l'action du jeu (L2). Et il n'existe que sur un
            échec — un lien qui ne rejoue rien serait un bouton mort.
            Il est SOUS le CTA, et pas au-dessus : la main remonte pour l'action
            rare, elle tombe sur l'action fréquente. Au-dessus, il s'interposait
            entre le pouce et GO. Le glyphe dit « ça rejoue » avant la lecture —
            c'est le sens de l'icône, pas sa décoration (L15). */}
        {status === 'failed' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.mapRetry)}
            onPress={() => void charger()}
            hitSlop={spacing.sm}
            style={styles.lien}
          >
            <Glyph name="reessayer" size={fontSizes.md} color={colors.gris} />
            <Text style={styles.lienLabel}>{t(C.mapRetry)}</Text>
          </Pressable>
        ) : null}
      </Panel>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  bandeau: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingLeft: spacing.lg,
    // La colonne de DROITE est réservée au rond « Toi », qui flotte au-dessus
    // de ce bandeau. Sans cette réserve, le chiffre héros passerait SOUS le
    // rond et se ferait rogner par lui — un chevauchement qu'aucune mesure de
    // texte n'aurait rattrapé, puisque les deux couches s'ignorent.
    paddingRight: spacing.lg + sizes.touchTarget + spacing.sm,
    paddingBottom: spacing.md,
    pointerEvents: 'none',
  },
  // Le bloc du chiffre : DEUX lignes, jamais trois textes côte à côte. C'est
  // l'unité d'accessibilité (un seul `accessible` pour toute la grandeur).
  heroBloc: { alignItems: 'flex-start' },
  // `baseline` : le chiffre domine, l'unité s'aligne sur son pied — sinon le
  // « m² » flotte au milieu d'un nombre de 64 pt.
  heroLigne: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, maxWidth: '100%' },
  // `flex-end` et non `baseline` : sans texte à l'intérieur, deux blocs n'ont
  // pas de ligne de base à partager — `baseline` les alignerait sur leur bas,
  // ce qui est déjà ce que `flex-end` fait, mais explicitement.
  heroLigneSkeleton: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  // `flexShrink` : sans lui, `adjustsFontSizeToFit` n'a aucune largeur à
  // respecter — un texte en ligne pousse ses frères hors de l'écran au lieu de
  // se réduire, et la réduction ne se déclenche jamais.
  hero: { color: colors.blanc, fontFamily: fonts.display, fontSize: fontSizes.hero, flexShrink: 1 },
  // L'unité et la légende consomment les rôles `stat*` — l'audit a mesuré que
  // « grand nombre + petite unité GRISE » est un motif, pas un goût d'écran.
  // Grises toutes les deux : le blanc est réservé à la GRANDEUR elle-même,
  // sinon le « m² » se dispute la lecture avec le chiffre.
  unite: { ...typography.statUnit, color: colors.gris, flexShrink: 0 },
  heroLabel: { ...typography.statLabel, color: colors.gris },
  // `lineHeight` VOLONTAIREMENT ABSENT ici : il est dérivé du `fontScale` dans
  // le composant (voir `INTERLIGNE`). Le remettre ici le re-figerait.
  phrase: { color: colors.blanc, fontFamily: fonts.text, fontSize: fontSizes.md },
  // La note « une course attend » : sous le chiffre, jamais à sa place. `gris`
  // et `sm` — le même rang que la légende « à toi », parce que c'est le même
  // objet grammatical : un qualificatif de la grandeur, pas un second titre.
  note: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.sm, marginTop: spacing.xs },
  // LE GABARIT DES DEUX RONDS DE LA CARTE — « Toi » et « Recentrer » : 44 × 44
  // pleins (L4), posés SUR la carte, au-dessus du bandeau. `carbone2` = N2, le
  // niveau des choses qu'on touche ; la bordure `blanc14` est celle des overlays
  // — elle les détache du terrain quand la carte passe clair sous eux.
  // UN SEUL style pour les deux : deux contrôles empilés dans la même colonne
  // qui divergeraient d'un pixel se verraient immédiatement. Le `top` reste à
  // l'usage, c'est la seule chose qui les distingue.
  rond: {
    position: 'absolute',
    right: spacing.lg,
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    borderRadius: radii.pill,
    backgroundColor: elevation.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.blanc14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rondPresse: { backgroundColor: colors.carbone },
  // `box-none` : le pied ne capture RIEN par lui-même, seuls ses contrôles le
  // font. Il était opaque sur toute la largeur — une bande de 44 pt en travers
  // du bas volait chaque pan de la carte qui commençait là. Le bandeau du haut
  // avait eu ce soin (`none`), le pied ne l'avait pas ; ici c'est `box-none` et
  // non `none`, parce que GO doit rester touchable.
  pied: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    pointerEvents: 'box-none',
  },
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
  lien: {
    minHeight: TOUCH_TARGET_PT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    // Le lien reste une cible de 44 pt de HAUT mais plus de LARGE que son
    // contenu : sous le CTA, une bande pleine largeur re-volerait les gestes.
    alignSelf: 'center',
  },
  lienLabel: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.sm },
});
