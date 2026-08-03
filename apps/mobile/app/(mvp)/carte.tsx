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
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { colors, fonts, fontSizes, radii, spacing, EVENTS } from '@klaim/shared';
import { MapCanvas } from '../../src/mvp/map/MapCanvas';
import {
  canCenterOnPlayer,
  heroAreaM2,
  homeAction,
  homeStatus,
  type HomeInput,
  type LocationAccess,
  type TerritoryRead,
} from '../../src/mvp/map/homeState';
import { readMyTerritories } from '../../src/mvp/map/readTerritories';
import type { TerritoryFeatureCollection } from '../../src/mvp/map/territoryGeo';
import { heroArea } from '../../src/mvp/ui/area';
import { recoveryOffer, toSnapshot } from '../../src/mvp/run/persist';
import { loadActiveRun, loadCurrentRun } from '../../src/lib/runStore';
import { isSupabaseConfigured } from '../../src/lib/supabase';
import { useSession } from '../../src/lib/session';
import { C } from '../../src/i18n/catalog/mvp';
import { useT } from '../../src/i18n/store';
import { screen, track } from '../../src/lib/analytics';

/** Cible tactile minimale (L4) — la même que `Stage`. */
const TOUCH_TARGET_PT = 44;

/** Zoom d'ouverture sur ma position : le quartier, pas la ville ni la rue. */
const ZOOM_EGO = 15;

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
  const { session, loading: sessionLoading } = useSession();
  const [permission, setPermission] = useState<Location.PermissionResponse | null>(null);
  const [read, setRead] = useState<TerritoryRead>({ kind: 'idle' });
  const [formes, setFormes] = useState<TerritoryFeatureCollection | null>(null);
  const [position, setPosition] = useState<{ lng: number; lat: number } | null>(null);
  const [interrompue, setInterrompue] = useState(false);

  const userId = session?.user?.id ?? null;
  const acces = accesDepuisOS(permission);

  const etat: HomeInput = {
    backend: isSupabaseConfigured ? 'configured' : 'absent',
    session: sessionLoading ? 'restoring' : userId === null ? 'signedOut' : 'signedIn',
    read,
    location: acces,
    interrupted: interrompue,
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
      setRead({ kind: 'failed' });
      return;
    }
    setFormes(r.collection);
    setRead({ kind: 'ok', ownedCount: r.ownedCount, areaM2: r.areaM2 });
  }, [userId]);

  useEffect(() => {
    void charger();
  }, [charger]);

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
            : status === 'empty'
              ? t(C.emptyMap)
              : null;

  const libelleAction =
    action === 'resume'
      ? t(C.ctaResumeRun)
      : action === 'go'
        ? t(C.ctaGo)
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
    if (action === 'askLocation') {
      void demanderPosition();
      return;
    }
    if (action === 'openSettings') void Linking.openSettings();
  }, [action, demanderPosition]);

  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <MapCanvas
        center={position}
        zoom={ZOOM_EGO}
        // `formes` n'est jamais une liste vide « par défaut » : il vaut `null`
        // tant qu'aucune lecture n'a abouti. La carte ne peint donc rien, et
        // c'est le bandeau qui dit pourquoi.
        territories={formes}
        showUser={canCenterOnPlayer(etat)}
      />

      {/* ── Ce qui est à moi (L1 q.2, L12) ─────────────────────────────────── */}
      {/* `pointerEvents` en STYLE et non en prop : la prop est dépréciée sur
          RN-web et fait crier la console à chaque rendu. Le bandeau laisse
          passer les gestes — sinon il volerait le pan de la carte sur tout le
          haut de l'écran. */}
      <View style={[styles.bandeau, { paddingTop: insets.top + spacing.md }]}>
        {chiffre !== null && !interrompue ? (
          <View style={styles.heroLigne}>
            <Text style={styles.hero}>{chiffre}</Text>
            <Text style={styles.unite}>{t(C.unitM2)}</Text>
            <Text style={styles.heroLabel}>{t(C.mapOwnedLabel)}</Text>
          </View>
        ) : (
          <Text style={styles.phrase}>{phrase}</Text>
        )}
      </View>

      {/* ── Que dois-je faire (L1 q.3, L2, L4) ─────────────────────────────── */}
      <View style={[styles.pied, { paddingBottom: insets.bottom + spacing.lg }]}>
        {/* « Réessayer » est un TEXTE, jamais un bouton plein : il ne doit pas
            peser autant que l'action du jeu (L2). Et il n'existe que sur un
            échec — un lien qui ne rejoue rien serait un bouton mort. */}
        {status === 'failed' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.mapRetry)}
            onPress={() => void charger()}
            hitSlop={spacing.sm}
            style={styles.lien}
          >
            <Text style={styles.lienLabel}>{t(C.mapRetry)}</Text>
          </Pressable>
        ) : null}

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
      </View>
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    pointerEvents: 'none',
  },
  // `baseline` : le chiffre domine, l'unité et la légende s'alignent sur son
  // pied — sinon le « m² » flotte au milieu d'un nombre de 64 pt.
  heroLigne: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  hero: { color: colors.blanc, fontFamily: fonts.display, fontSize: fontSizes.hero },
  unite: { color: colors.blanc, fontFamily: fonts.text, fontSize: fontSizes.lg },
  heroLabel: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.md },
  phrase: { color: colors.blanc, fontFamily: fonts.text, fontSize: fontSizes.md, lineHeight: 24 },
  pied: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, gap: spacing.sm },
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
  lien: { minHeight: TOUCH_TARGET_PT, alignItems: 'center', justifyContent: 'center' },
  lienLabel: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.sm },
});
