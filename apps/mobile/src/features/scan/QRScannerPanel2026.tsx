/**
 * GRYD — L'ONGLET « SCANNER » DE `/qr` (LOT Q4, 11/09/2026).
 *
 * ═══ CE QU'IL DÉBLOQUE ═════════════════════════════════════════════════════
 * Le QR de crew existe depuis juillet et personne ne pouvait le LIRE : iOS
 * n'ouvre pas un `gryd://` depuis l'app Appareil photo, et le domaine des
 * universal links n'est pas acheté (O10). Le carton était imprimable, pas
 * scannable. Ce panneau est la moitié manquante.
 *
 * ═══ CINQ ÉTATS, ET AUCUN NE MENT ══════════════════════════════════════════
 *   ① `needs_build` — ce binaire n'embarque pas le module natif. On le DIT,
 *      sans bouton : rien à réessayer, c'est un fait sur l'app, pas sur le
 *      joueur, et surtout pas « vérifie ta connexion ».
 *   ② permission jamais demandée — un bouton, et RIEN d'autre. La permission
 *      part AU MOMENT DU GESTE (§ Apple 5.1.1 : on demande quand on s'en sert),
 *      jamais au montage de l'écran.
 *   ③ refusée, redemandable — le même bouton : iOS montrera sa feuille.
 *   ④ refusée définitivement — `Linking.openSettings()`, le SEUL chemin qui
 *      reste. Redemander ici ne ferait rien du tout : un bouton mort.
 *   ⑤ accordée — le viseur, et ce qu'il trouve.
 *
 * ═══ CE QUE LA CAMÉRA FAIT, ET CE QU'ELLE NE FAIT PAS ══════════════════════
 * `barcodeTypes: ['qr']` et rien d'autre : aucun code-barres de produit,
 * aucune reconnaissance de texte, aucune photo prise, aucun fichier écrit,
 * aucun octet envoyé. L'aperçu décode et disparaît. C'est pour ça que le
 * manifeste de confidentialité n'a pas une ligne de plus (app.json,
 * `_ajout_expo_camera_2026_09_11`), et c'est écrit à l'écran avant la demande.
 *
 * ═══ LE MODULE EST REQUIS PARESSEUSEMENT ═══════════════════════════════════
 * Même patron que `lib/haptics.ts` et `features/social/avatarPhoto.ts` : un
 * `import` statique ferait entrer `expo-camera` dans le bundle web et
 * casserait un build qui ne l'embarque pas. `loadCameraModule2026()` mesure,
 * `scanCapability2026` arbitre (pur, testé), ce fichier ne fait que peindre.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, elevation, radii, spacing, typography } from '@klaim/shared';
import { Button } from '../../ui/Button';
import { useT } from '../../i18n/store';
import { C } from '../../i18n/catalog/qr';
import type { Entry } from '../../i18n/types';
import { haptics } from '../../lib/haptics';
import { screen } from '../../lib/analytics';
import { loadCameraModule2026, scanAvailable2026 } from './scanCapability2026';
import { parseScannedCode2026 } from './scanTarget2026';

/** Ce que `expo-camera` rend quand il a décodé quelque chose. */
interface BarcodeHit {
  readonly data?: string;
}

/** La forme MINIMALE dont ce panneau a besoin. On ne type pas ce qu'on n'utilise pas. */
interface CameraModule {
  CameraView?: ComponentType<{
    style?: unknown;
    facing?: 'back' | 'front';
    barcodeScannerSettings?: { barcodeTypes: string[] };
    onBarcodeScanned?: (hit: BarcodeHit) => void;
  }>;
  requestCameraPermissionsAsync?: () => Promise<{ granted: boolean; canAskAgain: boolean }>;
  getCameraPermissionsAsync?: () => Promise<{ granted: boolean; canAskAgain: boolean }>;
}

/** L'état de la permission, tel que l'écran a le droit de le rendre. */
type PermState = 'idle' | 'asking' | 'granted' | 'denied' | 'blocked';

export function QRScannerPanel2026() {
  const t = useT();
  /** Mesuré UNE fois : ni le binaire ni sa config ne changent en cours d'écran. */
  const capability = useMemo(() => scanAvailable2026(), []);
  const camera = useMemo(() => loadCameraModule2026() as CameraModule | null, []);
  const [perm, setPerm] = useState<PermState>('idle');
  /** Le dernier verdict de lecture, quand il n'a PAS produit de navigation. */
  const [notice, setNotice] = useState<Entry | null>(null);
  /**
   * `onBarcodeScanned` est appelé à chaque IMAGE tant que le code est dans le
   * champ : sans verrou, un QR reconnu déclencherait vingt navigations par
   * seconde. Une ref, pas un state : elle doit valoir déjà `true` au prochain
   * appel, avant tout rendu.
   */
  const settled = useRef(false);

  useEffect(() => {
    // Une permission DÉJÀ accordée lors d'une visite précédente ne se redemande
    // pas : on la LIT (aucune feuille système n'apparaît), sinon l'onglet
    // afficherait un bouton « Ouvrir l'appareil photo » à quelqu'un qui l'a
    // ouvert hier.
    if (capability !== 'capable' || !camera?.getCameraPermissionsAsync) return;
    let alive = true;
    void camera.getCameraPermissionsAsync().then((res) => {
      if (alive && res.granted) setPerm('granted');
    });
    return () => {
      alive = false;
    };
  }, [capability, camera]);

  useEffect(() => {
    // L'onglet est ATTEINT : c'est le seul fait mesurable de ce panneau, et il
    // ne dit rien de ce qui a été scanné.
    screen('qr_scanner', { capability });
  }, [capability]);

  const ask = useCallback(async () => {
    if (!camera?.requestCameraPermissionsAsync) return;
    setPerm('asking');
    setNotice(null);
    const res = await camera.requestCameraPermissionsAsync();
    if (res.granted) {
      haptics.light();
      settled.current = false;
      setPerm('granted');
      return;
    }
    haptics.error();
    // « Refusé pour cette fois » et « refusé pour toujours » ne se disent pas
    // pareil : le second n'a plus de bouton qui puisse aboutir dans l'app.
    setPerm(res.canAskAgain ? 'denied' : 'blocked');
  }, [camera]);

  const onHit = useCallback(
    (hit: BarcodeHit) => {
      if (settled.current) return;
      const target = parseScannedCode2026(hit.data);
      if (target.kind === 'crew-code' || target.kind === 'profile') {
        settled.current = true;
        haptics.success();
        setNotice(target.kind === 'crew-code' ? C.scanFoundCrew : C.scanFoundProfile);
        /* AUCUN EVENT §8 ICI, et c'est délibéré. `inviteAccepted` dirait faux :
           scanner n'est pas rejoindre, l'adhésion est décidée serveur sur
           l'écran d'atterrissage, qui l'émet déjà. Et `events.ts` n'a pas de
           nom pour « un code a été lu » : la doctrine de `lib/analytics.ts` est
           de n'inventer AUCUN nom d'event hors de ce catalogue. La mesure
           passe donc par le `$screen` ci-dessus. */
        router.push(target.path);
        return;
      }
      // Un code non exploitable ne verrouille PAS le viseur : la personne
      // continue de viser, et le message se remplace de lui-même.
      haptics.error();
      setNotice(target.kind === 'crew-token' ? C.scanTokenUnsupported : C.scanUnknown);
    },
    [],
  );

  // ── ① CE BINAIRE NE SAIT PAS SCANNER ────────────────────────────────────
  if (capability !== 'capable') {
    return (
      <View style={styles.block}>
        <Text style={styles.title}>{t(C.scanNeedsBuildTitle)}</Text>
        <Text style={styles.body}>{t(C.scanNeedsBuildBody)}</Text>
      </View>
    );
  }

  // ── ⑤ LE VISEUR ─────────────────────────────────────────────────────────
  const CameraView = camera?.CameraView;
  if (perm === 'granted' && CameraView) {
    return (
      <View style={styles.block}>
        <View
          style={styles.viewfinder}
          accessible
          accessibilityRole="image"
          accessibilityLabel={t(C.scanViewfinderA11y)}
        >
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            /* QR ET RIEN D'AUTRE : ni EAN, ni Code128, ni PDF417. Ce que la
               caméra ne cherche pas ne peut pas être lu par erreur. */
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={onHit}
          />
        </View>
        <Text style={styles.body}>{t(C.scanHint)}</Text>
        {notice ? (
          <Text style={styles.notice} accessibilityRole="alert">
            {t(notice)}
          </Text>
        ) : null}
      </View>
    );
  }

  // ── ④ REFUS DÉFINITIF : un seul chemin, et il sort de l'app ─────────────
  if (perm === 'blocked') {
    return (
      <View style={styles.block}>
        <Text style={styles.title}>{t(C.scanDeniedTitle)}</Text>
        <Text style={styles.body}>{t(C.scanDeniedBody)}</Text>
        <View style={styles.cta}>
          <Button
            label={t(C.scanDeniedCta)}
            analyticsId="qr_scan_settings"
            onPress={() => {
              haptics.light();
              void Linking.openSettings();
            }}
          />
        </View>
      </View>
    );
  }

  // ── ② et ③ : LA DEMANDE, portée par le geste ────────────────────────────
  return (
    <View style={styles.block}>
      <Text style={styles.title}>{t(C.scanAskTitle)}</Text>
      <Text style={styles.body}>{t(C.scanAskBody)}</Text>
      {perm === 'denied' ? (
        <Text style={styles.notice} accessibilityRole="alert">
          {t(C.scanDeniedBody)}
        </Text>
      ) : null}
      <View style={styles.cta}>
        <Button
          label={t(C.scanAskCta)}
          icon="qr"
          loading={perm === 'asking'}
          analyticsId="qr_scan_permission"
          onPress={() => void ask()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.lg, gap: spacing.md },
  title: { ...typography.title, color: colors.blanc },
  body: { ...typography.body, color: colors.gris },
  /** Un retour de lecture est un FAIT, pas une alarme : blanc, jamais rouge. */
  notice: { ...typography.body, color: colors.blanc },
  cta: { marginTop: spacing.xs },

  /**
   * Le viseur est CARRÉ : un QR l'est, et un cadre 16:9 laisserait croire qu'il
   * faut cadrer large. Surface N2 dessous, pour qu'un aperçu qui met une demi
   * seconde à démarrer ne soit pas un trou noir dans la page.
   */
  viewfinder: {
    aspectRatio: 1,
    width: '100%',
    borderRadius: radii.control,
    overflow: 'hidden',
    backgroundColor: elevation.raised,
  },
});
