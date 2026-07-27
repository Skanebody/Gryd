/**
 * GRYD — ÉCRAN « INVITER » : le QR de recrutement (demande fondateur 21/07).
 *
 * Point d'entrée : le CTA chartreuse déjà présent dans l'état « mon crew » de
 * RealCrewScreen (`rlShareCode`). On n'ajoute PAS un 2e CTA chartreuse à cet
 * écran — §A : 1 écran = 1 décision, 1 seul CTA chartreuse. Ici le CTA unique
 * est « Partager l'invitation » (ou « Réessayer » dans l'état d'échec, où c'est
 * la seule décision possible).
 *
 * ORDRE DE LECTURE (ce qu'on rejoint → comment rejoindre → actions) :
 *   1. nom du crew (titre) + X/50 membres — le contexte avant l'artefact ;
 *   2. le QR RÉEL, généré depuis le vrai code crew ;
 *   3. le CODE en gros, lisible et copiable — qui ne peut pas scanner tape ;
 *   4. les actions (partager, copier), chacune avec un retour visible.
 *
 * ── CE QUE LE QR ENCODE : LE LIEN HTTPS, PAS LE `gryd://` ────────────────────
 * `buildInviteLink(code)` → `https://gryd.run/c/<code>`. Choix assumé :
 *  - un QR est fait pour être IMPRIMÉ (affiche de club, dossard, vitrine) et
 *    scanné par n'importe quel appareil, y compris un qui n'a pas l'app. Un
 *    `gryd://…` scanné sans l'app installée ne mène nulle part — un cul-de-sac ;
 *  - un lien https, lui, fonctionne partout : aujourd'hui il ouvre le web, et
 *    le jour où le domaine (gryd.app vs gryd.run — décision fondateur en
 *    attente) sert la page + les universal links, le MÊME QR ouvre l'app ou
 *    l'installation, sans retoucher une ligne de code applicatif ni réimprimer
 *    les affiches déjà distribuées.
 * `buildInviteDeepLink` reste réservé au routage in-app (partage entre gens qui
 * ont déjà l'app), pas au QR.
 *
 * ── POURQUOI CE RECTANGLE BLANC ─────────────────────────────────────────────
 * Le QR est NOIR SUR BLANC, avec sa quiet zone. C'est un impératif OPTIQUE, pas
 * une esthétique : les décodeurs cherchent un fort contraste luminance et une
 * marge claire autour des motifs de repérage. Un QR chartreuse sur noir (charte)
 * inverse la polarité et écrase le contraste — beaucoup de scanners échouent ou
 * traînent. On assume donc le seul rectangle blanc de l'app. Corollaire de la
 * charte : AUCUN texte/icône chartreuse n'est posé sur ce fond clair (contraste
 * 1,2:1) — le blanc ne porte que le QR.
 *
 * « L'app ne ment jamais » : le QR n'est rendu que si `my_crew_code()` a répondu.
 * Échec ⇒ on le DIT et on propose de réessayer — jamais un QR vide, jamais un
 * QR décoratif (le faux QR d'amis.tsx a été retiré pour cette raison).
 *
 * ── AUCUN BOUTON MORT (E52, 28/07/2026) ─────────────────────────────────────
 * « Partager » et « Copier le code » étaient peints SANS CONDITION, puis
 * découvraient à l'appel qu'ils ne pouvaient pas marcher — l'écran affichait
 * alors « Partage indisponible sur cet appareil ». C'est la définition même du
 * bouton mort (constitution §2 : l'affichage se dérive de la capacité RÉELLE).
 * Désormais : `probeInviteShare()` MESURE (presse-papier réellement embarqué,
 * `navigator.share` réellement présent), `resolveInviteCapabilities()` ARBITRE
 * (pur, testé en Deno), et l'écran ne peint que ce qui est démontré. Une
 * capacité NON SONDÉE vaut non : on ne peint pas ce qu'on n'a pas mesuré.
 *
 * Corollaire §A.4 (1 seul CTA chartreuse) : le CTA est le PREMIER geste
 * réellement disponible — « Partager » quand il existe, sinon « Copier ». Le
 * second, s'il existe, reste en ghost. Si aucun des deux n'est possible, il ne
 * reste que le QR et le code en gros — qui suffisent, et qui ne mentent pas.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, fontSizes, radii, sizes, spacing } from '@klaim/shared';
import { EVENTS, screen, track } from '../../lib/analytics';
import { Button } from '../../ui/Button';
import { TabScreen } from '../../ui/TabScreen';
import { useT } from '../../i18n/store';
import type { Entry } from '../../i18n/types';
import { C } from '../../i18n/catalog/crew';
import { useSession } from '../../lib/session';
import { buildInviteLink, copyInviteLink, probeInviteShare, shareInviteLink } from './invite';
import { resolveInviteCapabilities } from './inviteShareCapabilities';
import type { CodeResult } from './real';

/** Côté du QR en points. ≥ 200 : scannable depuis un écran de téléphone à ~30 cm. */
const QR_SIZE = 220;

/** Marge claire autour des motifs (norme QR : ≥ 4 modules). Sans elle, ça ne scanne pas. */
const QR_QUIET_ZONE = 16;

export interface CrewInviteQRScreenProps {
  /** Nom du crew — le contexte de ce qu'on rejoint (titre d'écran). */
  crewName: string;
  memberCount: number;
  maxMembers: number;
  /** RPC `my_crew_code()` (le code n'est JAMAIS lu depuis la table — 0036). */
  fetchMyCode: () => Promise<CodeResult>;
  /** Retour vers l'état « mon crew ». */
  onBack: () => void;
}

type Status = 'loading' | 'ready' | 'error';

export function CrewInviteQRScreen({
  crewName,
  memberCount,
  maxMembers,
  fetchMyCode,
  onBack,
}: CrewInviteQRScreenProps) {
  const t = useT();
  const { configured } = useSession();
  const [status, setStatus] = useState<Status>('loading');
  const [code, setCode] = useState<string | null>(null);
  const [flash, setFlash] = useState<Entry | null>(null);

  useEffect(() => {
    screen('crew_invite_qr');
  }, []);

  const load = useCallback(async () => {
    setStatus('loading');
    setFlash(null);
    const res = await fetchMyCode();
    if (res.ok) {
      setCode(res.code);
      setStatus('ready');
      // `inviteSent` canal `qr` : le QR est AFFICHÉ, donc montrable/scannable —
      // c'est l'acte d'invitation pour ce canal (il n'y a pas d'« envoi » à
      // observer, personne ne clique pour montrer son écran).
      track(EVENTS.inviteSent, { channel: 'qr' });
    } else {
      setCode(null);
      setStatus('error');
    }
  }, [fetchMyCode]);

  useEffect(() => {
    void load();
  }, [load]);

  const onShare = useCallback(async () => {
    if (!code) return;
    const res = await shareInviteLink(buildInviteLink(code));
    if (res.ok) {
      track(EVENTS.inviteSent, { channel: 'share' });
      setFlash(C.qrShared);
      return;
    }
    // Fermer la feuille de partage est un DROIT, pas une erreur : on ne crie pas.
    setFlash(res.reason === 'dismissed' ? null : C.qrShareUnavailable);
  }, [code]);

  const onCopy = useCallback(async () => {
    if (!code) return;
    // On copie le CODE (pas le lien) : c'est ce que l'invité tape dans
    // « J'ai un code ». Le lien, lui, part par « Partager ».
    const res = await copyInviteLink(code);
    if (res.ok) {
      track(EVENTS.inviteSent, { channel: res.via === 'clipboard' ? 'copy' : 'share' });
      // On ne dit « Code copié » QUE si le presse-papier a vraiment servi.
      // copyInviteLink retombe sur la feuille de partage quand expo-clipboard est
      // absent et renvoie quand même ok:true — annoncer « copié » alors qu'une
      // feuille de partage vient de s'ouvrir serait un mensonge d'écran (correctif
      // adversarial). Le discriminant `via` porte déjà l'information.
      setFlash(res.via === 'clipboard' ? C.qrCopied : C.qrShared);
      return;
    }
    setFlash(res.reason === 'dismissed' ? null : C.qrShareUnavailable);
  }, [code]);

  /**
   * CE QUE CET APPAREIL SAIT FAIRE, mesuré une fois par montage (le presse-papier
   * ne s'installe pas en cours d'écran, et `navigator.share` n'apparaît pas).
   * `configured` vient de la session : sans backend, aucune action serveur.
   * `myRole` reste `null` — cet écran ne lit PAS le rôle, et prétendre le
   * contraire ferait apparaître des gestes d'administration sur une permission
   * qu'on n'a jamais vérifiée.
   */
  const capabilities = useMemo(() => {
    const probe = probeInviteShare();
    return resolveInviteCapabilities({
      platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web',
      hasShareable: code !== null,
      clipboardAvailable: probe.clipboardAvailable,
      webShareAvailable: probe.webShareAvailable,
      backendConfigured: configured,
      myRole: null,
    });
  }, [code, configured]);

  /** Ordre de préférence : partager d'abord (c'est le geste de l'écran), copier
   *  ensuite. Le premier disponible devient le CTA, le suivant le secondaire. */
  const available = capabilities.actions
    .map((a) => a.id)
    .filter((id): id is 'share' | 'copy' => id === 'share' || id === 'copy');
  const primaryAction = available[0] ?? null;
  const secondaryAction = available[1] ?? null;

  const header = (
    <Text style={styles.count}>{t(C.rlMembersOf, { count: memberCount, max: maxMembers })}</Text>
  );

  // ── ÉCHEC : on le dit, on propose de réessayer. Aucun QR (vrai ou faux). ────
  if (status === 'error') {
    return (
      <TabScreen title={crewName} kicker={t(C.qrKicker)}>
        {header}
        <View style={styles.block}>
          <Text style={styles.errTitle}>{t(C.qrErrTitle)}</Text>
          <Text style={styles.body}>{t(C.qrErrBody)}</Text>
          <View style={styles.cta}>
            <Button label={t(C.qrRetry)} onPress={() => void load()} />
          </View>
          <View style={styles.backRow}>
            <Button variant="ghost" size="md" label={t(C.rlBack)} onPress={onBack} />
          </View>
        </View>
      </TabScreen>
    );
  }

  // ── CHARGEMENT : une phrase honnête, aucun squelette de QR. ────────────────
  if (status === 'loading' || !code) {
    return (
      <TabScreen title={crewName} kicker={t(C.qrKicker)}>
        {header}
        <View style={styles.block}>
          <Text style={styles.body}>{t(C.qrLoading)}</Text>
          <View style={styles.backRow}>
            <Button variant="ghost" size="md" label={t(C.rlBack)} onPress={onBack} />
          </View>
        </View>
      </TabScreen>
    );
  }

  // ── PRÊT : QR réel + code en gros + actions RÉELLEMENT disponibles. ───────
  const link = buildInviteLink(code);

  return (
    <TabScreen title={crewName} kicker={t(C.qrKicker)}>
      {header}
      <Text style={styles.howTo}>{t(C.qrHowTo)}</Text>

      {/*
        Le seul fond clair de l'app — voir l'en-tête de fichier : contrainte de
        décodage, pas un choix graphique. Rien d'autre que le QR ne s'y pose.
      */}
      <View
        style={styles.qrPlate}
        accessible
        accessibilityRole="image"
        accessibilityLabel={t(C.qrA11yImage, { name: crewName })}
      >
        <QRCode
          value={link}
          size={QR_SIZE}
          quietZone={QR_QUIET_ZONE}
          color={colors.noir}
          backgroundColor={colors.blanc}
          // ECL M : ~15 % de redondance. Marge confortable pour un QR imprimé
          // (affiche froissée, photo de travers) sans densifier les modules.
          ecl="M"
        />
      </View>

      <Text style={styles.codeLabel}>{t(C.qrCodeLabel)}</Text>
      {/* Sélectionnable : sur un écran partagé, on doit pouvoir l'extraire à la main. */}
      <Text style={styles.code} selectable accessibilityLabel={code}>
        {code.toUpperCase()}
      </Text>

      {flash ? <Text style={styles.flash}>{t(flash)}</Text> : null}

      {/* Un seul CTA chartreuse (§A.4) : le premier geste RÉELLEMENT possible.
          Le second, s'il existe, reste secondaire. Aucun des deux n'est peint
          « au cas où » — voir le docblock de tête. */}
      {primaryAction ? (
        <View style={styles.cta}>
          <Button
            label={t(primaryAction === 'share' ? C.qrShare : C.qrCopyCode)}
            icon={primaryAction === 'share' ? 'partage' : undefined}
            onPress={() => void (primaryAction === 'share' ? onShare() : onCopy())}
          />
        </View>
      ) : null}
      {secondaryAction ? (
        <View style={styles.secondaryRow}>
          <Button
            variant="ghost"
            size="md"
            label={t(secondaryAction === 'share' ? C.qrShare : C.qrCopyCode)}
            onPress={() => void (secondaryAction === 'share' ? onShare() : onCopy())}
          />
        </View>
      ) : null}
      <View style={styles.backRow}>
        <Button variant="ghost" size="md" label={t(C.rlBack)} onPress={onBack} />
      </View>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.lg, gap: spacing.md },
  body: { color: colors.gris, fontSize: fontSizes.md, lineHeight: 22 },
  errTitle: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '600' },

  count: { color: colors.gris, fontSize: fontSizes.sm, marginTop: spacing.lg, letterSpacing: 1 },
  howTo: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: 21, marginTop: spacing.sm },

  // Plaque blanche : `alignSelf: center` + padding = la quiet zone reste blanche
  // jusqu'au bord du rectangle (le noir de l'app ne mord jamais dedans).
  qrPlate: {
    alignSelf: 'center',
    marginTop: spacing.lg,
    padding: spacing.sm,
    borderRadius: radii.control,
    backgroundColor: colors.blanc,
  },

  codeLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 1.5,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  // Gros, tabulaire, espacé : lisible à 2 m et recopiable sans confusion.
  code: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
    marginTop: spacing.xs,
    minHeight: sizes.touchTarget,
    fontVariant: ['tabular-nums'],
  },

  flash: { color: colors.chartreuse, fontSize: fontSizes.sm, marginTop: spacing.md, textAlign: 'center' },

  cta: { marginTop: spacing.md },
  secondaryRow: { marginTop: spacing.sm },
  backRow: { marginTop: spacing.xs, alignItems: 'center' },
});
