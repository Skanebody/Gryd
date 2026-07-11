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
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fontSizes, gameColors, radii, spacing } from '@klaim/shared';
import {
  NOTIF_CHANNEL_LABELS,
  PLAY_STYLE_LABELS,
} from '../../src/features/motivation/labels';
import {
  toggleNotifChannel,
  useMotivationPrefs,
  type NotifChannel,
} from '../../src/features/motivation/store';
import { Section, SwitchRow, TogglePill } from '../../src/features/motivation/ui';
import { useMyProfile } from '../../src/features/social/profileStore';
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
  Alert.alert(title, body, [{ text: 'Compris' }]);
}

function isSection(x: string | undefined): x is SettingsSectionId {
  return x !== undefined && (SECTION_IDS as readonly string[]).includes(x);
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
      <Icon name={icon} size={20} color={danger === true ? gameColors.danger : colors.blanc} />
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
    <StackScreen title={meta?.label ?? 'Paramètres'} icon={meta?.icon ?? 'reglages'}>
      {id === 'compte' ? (
        <>
          <Section label="IDENTIFIANTS">
            <ValueRow label="Connecté en tant que" value={profile.displayName} />
            <ActionRow
              icon="lien"
              label="Adresse e-mail"
              detail="Modifier l'e-mail du compte"
              onPress={() =>
                soonAlert(
                  'Adresse e-mail',
                  'La modification de l’e-mail arrive très bientôt. En attendant, écris-nous depuis Aide & support.',
                )
              }
            />
            <ActionRow
              icon="verrou"
              label="Sécurité & connexion"
              detail="Apple / Google, appareils connectés"
              onPress={() =>
                soonAlert(
                  'Sécurité & connexion',
                  'La gestion des connexions Apple / Google et des appareils arrive très bientôt.',
                )
              }
            />
            <Soon>Édition du compte bientôt disponible.</Soon>
          </Section>
          <Section label="COMPTE">
            <ActionRow
              icon="partage"
              label="Exporter mes données"
              detail="Copie RGPD de tes courses et zones"
              onPress={() => router.push('/confidentialite')}
            />
            <ActionRow
              icon="fermer"
              label="Supprimer mon compte"
              detail="Depuis l'app — irréversible, c'est ton droit"
              danger
              onPress={() => router.push('/confidentialite')}
            />
          </Section>
        </>
      ) : null}

      {id === 'profil' ? (
        <Section label="APPARENCE PUBLIQUE">
          <ValueRow label="Nom affiché" value={profile.displayName} />
          <ValueRow label="Titre" value={profile.title} />
          <ActionRow
            icon="ami"
            label="Modifier le profil"
            detail="Nom, titre, avatar, cadre"
            onPress={() => router.push('/profil-edit')}
          />
          <ActionRow
            icon="verrou"
            label="Qui voit mon profil"
            detail="Visibilité, mode privé"
            onPress={() => router.push('/confidentialite')}
          />
        </Section>
      ) : null}

      {id === 'crew' ? (
        <Section label="MON CREW">
          <ValueRow label="Crew" value={profile.crewName} />
          <ActionRow
            icon="guerre"
            label="Missions du crew"
            detail="Frontières ouvertes, défenses"
            onPress={() => router.push('/warroom')}
          />
          <ActionRow
            icon="cloche"
            label="Notifications crew"
            detail="Défenses, frontières à fermer"
            onPress={() => router.push('/parametres/notifications')}
          />
          <ActionRow
            icon="fermer"
            label="Quitter le crew"
            detail="Tu perds ta contribution au coffre"
            danger
            onPress={() =>
              soonAlert(
                'Quitter le crew',
                'Quitter un crew depuis l’app arrive très bientôt. Ta contribution au coffre reste comptée jusque-là.',
              )
            }
          />
          <Soon>Quitter le crew sera possible depuis l'app bientôt.</Soon>
        </Section>
      ) : null}

      {id === 'course' ? (
        <>
          <Section label="STYLE DE JEU">
            <Text style={styles.note}>{PLAY_STYLE_LABELS[prefs.playStyle].subtitle}</Text>
            <ActionRow
              icon="cible"
              label="Régler mon style"
              detail="Focus solo · Mixte · Guerre de crew"
              onPress={() => router.push('/settings-motivation')}
            />
          </Section>
          <Section label="PENDANT LA COURSE">
            <SwitchRow
              title="Retours haptiques"
              subtitle="Vibrations légères sur les captures, badges et victoires."
              value={hapticsOn}
              onValueChange={(v) => {
                setHapticsOn(v);
                setHapticsEnabled(v);
              }}
            />
            <ValueRow label="Unités" value="Kilomètres" />
            <ValueRow label="Annonces audio" value="Bientôt" />
          </Section>
        </>
      ) : null}

      {id === 'notifications' ? (
        <Section label="CE QUE TU REÇOIS">
          <View style={styles.pills}>
            {NOTIF_ORDER.map((ch) => (
              <TogglePill
                key={ch}
                label={NOTIF_CHANNEL_LABELS[ch].title}
                on={prefs.notifChannels.includes(ch)}
                onPress={() =>
                  void update({ notifChannels: toggleNotifChannel(prefs.notifChannels, ch) })
                }
              />
            ))}
          </View>
          <Text style={styles.note}>
            {prefs.notifChannels.includes('off')
              ? NOTIF_CHANNEL_LABELS.off.subtitle
              : 'Frontières ouvertes, défenses, rivaux : seulement ce qui compte pour toi. Jamais de rappel culpabilisant.'}
          </Text>
        </Section>
      ) : null}

      {id === 'carte' ? (
        <Section label="AFFICHAGE DE LA CARTE">
          <ValueRow label="Couche par défaut" value="Auto" />
          <Text style={styles.note}>
            La carte choisit seule la bonne couche selon le contexte (défense, route, rival). Tu
            peux forcer une couche via le bouton Couches sur la carte.
          </Text>
          <ActionRow
            icon="verrou"
            label="Ma trace sur la carte"
            detail="Précise, simplifiée ou masquée"
            onPress={() => router.push('/confidentialite')}
          />
        </Section>
      ) : null}

      {id === 'apropos' ? (
        <>
          <Section label="GRYD">
            <ValueRow label="Version" value={APP_VERSION} />
            <ValueRow label="Saison" value="Saison 0 · Paris + Lille" />
          </Section>
          <Section label="LÉGAL">
            <ActionRow
              icon="pass"
              label="Conditions d'utilisation"
              onPress={() =>
                openLegal(
                  'conditions',
                  'Conditions d’utilisation',
                  'Retrouve les conditions d’utilisation sur gryd.run/conditions.',
                )
              }
            />
            <ActionRow icon="verrou" label="Politique de confidentialité" onPress={() => router.push('/confidentialite')} />
            <ActionRow
              icon="pass"
              label="Conditions de vente (CGV)"
              detail="Abonnement, paiement, rétractation"
              onPress={() =>
                openLegal(
                  'cgv',
                  'Conditions Générales de Vente',
                  'Retrouve les CGV sur gryd.run/cgv.',
                )
              }
            />
            <ActionRow
              icon="pass"
              label="Mentions légales"
              detail="Éditeur, hébergement"
              onPress={() =>
                openLegal(
                  'mentions-legales',
                  'Mentions légales',
                  'Retrouve les mentions légales sur gryd.run/mentions-legales.',
                )
              }
            />
            <ActionRow
              icon="crest"
              label="Licences open source"
              onPress={() =>
                Alert.alert(
                  'Licences open source',
                  'GRYD s’appuie sur des logiciels libres — React Native, Expo, MapLibre, H3, Supabase et d’autres. La liste complète des licences est publiée sur gryd.run/licences.',
                  [{ text: 'Fermer' }],
                )
              }
            />
            <Soon>Cours. Capture. Défends.</Soon>
          </Section>
        </>
      ) : null}

      {id === 'avance' ? (
        <>
          <Section label="RÈGLES DE JEU">
            <Text style={styles.note}>
              Ces valeurs sont décidées côté serveur (moteur GRYD) et affichées ici pour
              transparence. On ne les règle jamais depuis le téléphone.
            </Text>
            <ValueRow label="Fermeture de frontière crew" value="24 h" />
            <ValueRow label="Tolérance de jonction (ville)" value="80 m" />
            <ValueRow label="Contribution min. du finisher" value="400 m ou 15 %" />
          </Section>
          <Section label="DIAGNOSTICS">
            <ActionRow
              icon="radar"
              label="Fiabilité GRYD Verify"
              detail="GPS, mouvement, sources connectées"
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
    marginTop: 10,
    fontStyle: 'italic',
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 13,
    paddingHorizontal: spacing.cardPadding,
    marginBottom: 10,
  },
  rowInfo: { flex: 1 },
  rowLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  rowLabelDanger: { color: gameColors.danger },
  rowDetail: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 3 },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 14,
    paddingHorizontal: spacing.cardPadding,
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
