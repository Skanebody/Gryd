/**
 * GRYD — sous-page Paramètres (AMENDEMENT-17 §CHANTIER 3). Une route dynamique
 * = une sous-page COURTE et actionnable. Un écran = un sujet, action/essentiel
 * sans scroll. Les sous-pages MVP branchées : Compte, Profil, Crew, Course,
 * Notifications, Carte, À propos, Avancé. Course & Notifications pilotent le
 * store motivation (filtrage d'affichage/notifs, JAMAIS le gameplay §1). Les
 * réglages purement techniques (tolérance boucle…) vivent sous « Avancé » et
 * restent en lecture (moteur serveur, jamais un curseur client). L'identité
 * affichée (nom, titre, crew) vient du profil ÉDITABLE persisté (useMyProfile)
 * — MÊME source que l'onglet Profil, jamais la constante démo. Style dark GRYD,
 * texte court, honnête sur ce qui est « bientôt ».
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fontSizes, gameColors, iconSizes, radii, sizes, spacing } from '@klaim/shared';
import {
  NOTIF_CHANNEL_LABELS,
  PLAY_STYLE_LABELS,
} from '../../src/features/motivation/labels';
import {
  toggleNotifChannel,
  useMotivationPrefs,
  type NotifChannel,
} from '../../src/features/motivation/store';
import { SwitchRow, TogglePill } from '../../src/features/motivation/ui';
import { SectionLabel } from '../../src/features/privacy/ui';
import { useMyProfile } from '../../src/features/social/profileStore';
import { C } from '../../src/i18n/catalog/reglages';
import { t as tStatic, useT } from '../../src/i18n/store';
import { flags } from '../../src/lib/flags';
import { screen } from '../../src/lib/analytics';
import { getHapticsEnabled, setHapticsEnabled } from '../../src/lib/haptics';
import {
  settingsRowBySection,
  type SettingsSectionId,
} from '../../src/features/settings/sections';
import { Icon } from '../../src/ui/Icon';
import { StackScreen } from '../../src/ui/StackScreen';

const SECTION_IDS: readonly SettingsSectionId[] = [
  'compte',
  'profil',
  'crew',
  'course',
  'notifications',
  'carte',
  'apropos',
  'avance',
];

const APP_VERSION = '0.1.0';
const NOTIF_ORDER: NotifChannel[] = ['solo', 'crew', 'competition', 'off'];

/** Domaine public GRYD (invites, pages légales). Aligné sur invite.ts / demo.ts. */
const GRYD_SITE = 'https://gryd.run';

/** Ouvre une page légale publique (Conditions) dans le navigateur — comportement
 *  attendu par l'App Store pour les CGU. Fallback honnête si l'URL est injoignable. */
function openLegal(path: string, fallbackTitle: string, fallbackBody: string): void {
  const url = `${GRYD_SITE}/${path}`;
  void Linking.openURL(url).catch(() => Alert.alert(fallbackTitle, fallbackBody));
}

/** Accusé de réception honnête pour un flux pas encore câblé (O1) — le bouton
 *  répond au tap au lieu de rester muet, en cohérence avec la note « bientôt ». */
function soonAlert(title: string, body: string): void {
  Alert.alert(title, body, [{ text: tStatic(C.compris) }]);
}

function isSection(x: string | undefined): x is SettingsSectionId {
  return x !== undefined && (SECTION_IDS as readonly string[]).includes(x);
}

/**
 * Section titrée — sur-titre COMMUN aux écrans de réglages (features/privacy/ui,
 * la même source que Confidentialité et Support). Remplace le `Section` du
 * module motivation, dont l'espacement différait de quelques pixels : trois
 * rythmes verticaux pour un même type d'écran, c'est ce qui donnait
 * l'impression de trois maquettes distinctes.
 */
function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View>
      <SectionLabel>{label}</SectionLabel>
      {children}
    </View>
  );
}

/** Ligne d'action neutre (ouvre un flux à venir / une route). Icône + label + chevron. */
function ActionRow({
  icon,
  label,
  detail,
  danger,
  onPress,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  detail?: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {/* Même règle que la liste Paramètres (21/07) : l'icône de tête porte le
          RÔLE de la ligne. Chartreuse par défaut sur fond `carbone` (sombre) ;
          une action DESTRUCTIVE garde le rouge sémantique — l'accent ne doit
          jamais banaliser « supprimer mon compte » / « quitter le crew ». */}
      <View style={styles.iconWrap}>
        <Icon
          name={icon}
          size={iconSizes.md}
          color={danger === true ? gameColors.danger : colors.chartreuse}
        />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowLabel, danger === true && styles.rowLabelDanger]}>{label}</Text>
        {detail !== undefined ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      <Icon name="chevron" size={16} color={colors.gris} />
    </Pressable>
  );
}

/** Ligne « valeur en lecture » (info figée, ex. version, tolérance moteur). */
function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.valueRow}>
      <Text style={styles.valueLabel}>{label}</Text>
      <Text style={styles.valueVal}>{value}</Text>
    </View>
  );
}

/** Petite note honnête « bientôt » quand un flux n'est pas encore câblé. */
function Soon({ children }: { children: string }) {
  return <Text style={styles.soon}>{children}</Text>;
}

export default function SettingsSectionScreen() {
  const params = useLocalSearchParams<{ section?: string }>();
  const raw = Array.isArray(params.section) ? params.section[0] : params.section;
  const id: SettingsSectionId = isSection(raw) ? raw : 'compte';
  const meta = settingsRowBySection(id);
  const t = useT();

  const { prefs, update } = useMotivationPrefs();
  // Identité ÉDITABLE persistée (même source que Profil / profil-edit) : une
  // édition du nom/titre se reflète ici immédiatement — une seule vérité.
  const { profile } = useMyProfile();
  const [hapticsOn, setHapticsOn] = useState(true);

  useEffect(() => {
    screen('parametres_section', { section: id });
  }, [id]);

  useEffect(() => {
    let alive = true;
    void getHapticsEnabled().then((v) => {
      if (alive) setHapticsOn(v);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <StackScreen title={meta?.label ?? t(C.paramsTitle)} icon={meta?.icon ?? 'reglages'}>
      {id === 'compte' ? (
        <>
          <Section label={t(C.secIdentifiants)}>
            <ValueRow label={t(C.connectedAs)} value={profile.displayName} />
            <ActionRow
              icon="lien"
              label={t(C.emailLabel)}
              detail={t(C.emailDetail)}
              onPress={() => soonAlert(t(C.emailLabel), t(C.emailSoonBody))}
            />
            <ActionRow
              icon="verrou"
              label={t(C.securityLabel)}
              detail={t(C.securityDetail)}
              onPress={() => soonAlert(t(C.securityLabel), t(C.securitySoonBody))}
            />
            <Soon>{t(C.accountSoonNote)}</Soon>
          </Section>
          <Section label={t(C.secCompte)}>
            <ActionRow
              icon="partage"
              label={t(C.exporterMesDonnees)}
              detail={t(C.exportDataDetail)}
              onPress={() => router.push('/confidentialite')}
            />
            <ActionRow
              icon="fermer"
              label={t(C.supprimerMonCompte)}
              detail={t(C.deleteAccountDetail)}
              danger
              onPress={() => router.push('/confidentialite')}
            />
          </Section>
        </>
      ) : null}

      {id === 'profil' ? (
        <Section label={t(C.secApparence)}>
          <ValueRow label={t(C.displayName)} value={profile.displayName} />
          <ValueRow label={t(C.titleLabel)} value={profile.title} />
          <ActionRow
            icon="ami"
            label={t(C.editProfile)}
            detail={t(C.editProfileDetail)}
            onPress={() => router.push('/profil-edit')}
          />
          <ActionRow
            icon="verrou"
            label={t(C.whoSeesProfile)}
            detail={t(C.whoSeesProfileDetail)}
            onPress={() => router.push('/confidentialite')}
          />
        </Section>
      ) : null}

      {id === 'crew' ? (
        <Section label={t(C.secMonCrew)}>
          <ValueRow label="Crew" value={profile.crewName} />
          {/* D8 : War Room masquée hors MVP. */}
          {flags.warRoom ? (
            <ActionRow
              icon="guerre"
              label={t(C.crewMissions)}
              detail={t(C.crewMissionsDetail)}
              onPress={() => router.push('/warroom')}
            />
          ) : null}
          <ActionRow
            icon="cloche"
            label={t(C.crewNotifs)}
            detail={t(C.crewNotifsDetail)}
            onPress={() => router.push('/parametres/notifications')}
          />
          <ActionRow
            icon="fermer"
            label={t(C.leaveCrew)}
            detail={t(C.leaveCrewDetail)}
            danger
            onPress={() => soonAlert(t(C.leaveCrew), t(C.leaveCrewSoonBody))}
          />
          <Soon>{t(C.leaveCrewSoonNote)}</Soon>
        </Section>
      ) : null}

      {id === 'course' ? (
        <>
          <Section label={t(C.secStyleJeu)}>
            <Text style={styles.note}>{t(PLAY_STYLE_LABELS[prefs.playStyle].subtitle)}</Text>
            <ActionRow
              icon="cible"
              label={t(C.setStyle)}
              detail={t(C.setStyleDetail)}
              onPress={() => router.push('/settings-motivation')}
            />
          </Section>
          <Section label={t(C.secPendantCourse)}>
            <SwitchRow
              title={t(C.hapticsTitle)}
              subtitle={t(C.hapticsSubtitle)}
              value={hapticsOn}
              onValueChange={(v) => {
                setHapticsOn(v);
                setHapticsEnabled(v);
              }}
            />
            <ValueRow label={t(C.unites)} value={t(C.kilometres)} />
            <ValueRow label={t(C.annoncesAudio)} value={t(C.bientot)} />
          </Section>
        </>
      ) : null}

      {id === 'notifications' ? (
        <Section label={t(C.secCeQueTuRecois)}>
          <View style={styles.pills}>
            {NOTIF_ORDER.map((ch) => (
              <TogglePill
                key={ch}
                label={t(NOTIF_CHANNEL_LABELS[ch].title)}
                on={prefs.notifChannels.includes(ch)}
                onPress={() =>
                  void update({ notifChannels: toggleNotifChannel(prefs.notifChannels, ch) })
                }
              />
            ))}
          </View>
          <Text style={styles.note}>
            {prefs.notifChannels.includes('off')
              ? t(NOTIF_CHANNEL_LABELS.off.subtitle)
              : t(C.notifsNote)}
          </Text>
        </Section>
      ) : null}

      {id === 'carte' ? (
        <Section label={t(C.secAffichageCarte)}>
          <ValueRow label={t(C.coucheDefaut)} value={t(C.coucheAuto)} />
          <Text style={styles.note}>{t(C.carteNote)}</Text>
          <ActionRow
            icon="verrou"
            label={t(C.maTrace)}
            detail={t(C.maTraceDetail)}
            onPress={() => router.push('/confidentialite')}
          />
        </Section>
      ) : null}

      {id === 'apropos' ? (
        <>
          <Section label="GRYD">
            <ValueRow label={t(C.version)} value={APP_VERSION} />
            <ValueRow label={t(C.saison)} value={t(C.saisonValue)} />
          </Section>
          <Section label={t(C.secLegal)}>
            <ActionRow
              icon="pass"
              label={t(C.cgu)}
              onPress={() => openLegal('conditions', t(C.cgu), t(C.cguFallbackBody))}
            />
            <ActionRow icon="verrou" label={t(C.privacyPolicy)} onPress={() => router.push('/confidentialite')} />
            <ActionRow
              icon="pass"
              label={t(C.cgv)}
              detail={t(C.cgvDetail)}
              onPress={() => openLegal('cgv', t(C.cgvFallbackTitle), t(C.cgvFallbackBody))}
            />
            {/* Les mentions légales ouvraient « gryd.run/mentions-legales » — un
                domaine INEXISTANT (arbitrage O10 non tranché) vers des pages web
                non déployées : un cul-de-sac, alors que la LCEN exige qu'elles
                soient accessibles. Elles vivent désormais DANS l'app
                (app/a-propos.tsx) : aucun domaine, aucun réseau, toujours
                affichables. */}
            <ActionRow
              icon="pass"
              label={t(C.mentions)}
              detail={t(C.mentionsDetail)}
              onPress={() => router.push('/a-propos')}
            />
            <ActionRow
              icon="crest"
              label={t(C.licences)}
              onPress={() =>
                Alert.alert(t(C.licences), t(C.licencesBody), [{ text: t(C.fermer) }])
              }
            />
            <Soon>{t(C.tagline)}</Soon>
          </Section>
        </>
      ) : null}

      {id === 'avance' ? (
        <>
          <Section label={t(C.secReglesJeu)}>
            <Text style={styles.note}>{t(C.reglesNote)}</Text>
            <ValueRow label={t(C.fermetureFrontiere)} value="24 h" />
            <ValueRow label={t(C.toleranceJonction)} value="80 m" />
            <ValueRow label={t(C.contributionMin)} value={t(C.contributionMinValue)} />
          </Section>
          <Section label={t(C.secDiagnostics)}>
            <ActionRow
              icon="radar"
              label={t(C.fiabiliteVerify)}
              detail={t(C.fiabiliteVerifyDetail)}
              onPress={() => router.push('/sources')}
            />
            <ValueRow label="Build" value={APP_VERSION} />
          </Section>
        </>
      ) : null}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  note: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginBottom: 4,
  },
  soon: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.xxs },
  // Géométrie de card ALIGNÉE sur Confidentialité (21/07) — voir parametres.tsx.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 14,
    paddingHorizontal: spacing.cardPadding - 2,
    marginBottom: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: { flex: 1 },
  rowLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  rowLabelDanger: { color: gameColors.danger },
  rowDetail: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: spacing.xxs,
  },
  // Ligne « valeur en lecture » : même card que ActionRow, sans carré d'icône —
  // l'écho du couple titre/valeur des cards repliées de Confidentialité.
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: sizes.touchTarget,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 14,
    paddingHorizontal: spacing.cardPadding - 2,
    marginBottom: 10,
  },
  valueLabel: { color: colors.gris, fontSize: fontSizes.sm },
  valueVal: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
