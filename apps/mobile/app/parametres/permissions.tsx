/**
 * GRYD — RÉGLAGES › AUTORISATIONS DE L'APPAREIL.
 *
 * ═══ LE TROU QUE CETTE PAGE BOUCHE ═════════════════════════════════════════
 * GRYD dépend de quatre autorisations système : la position (sans elle, « GO »
 * ne peut rien enregistrer), la photothèque et l'appareil photo (photo de
 * profil, import du studio), le mouvement (podomètre, signal anti-triche).
 * Jusqu'ici, AUCUN écran ne disait leur état. Chacune se découvrait au moment
 * où elle bloquait quelque chose — au milieu d'un départ de course, ou devant
 * un sélecteur de photo qui ne s'ouvre pas. Le cahier G27 demande l'inverse :
 * « ouvrir les réglages du système lorsque le changement s'effectue là-bas ».
 *
 * ═══ CE QUE CETTE PAGE NE FAIT PAS, ET C'EST VOULU ═════════════════════════
 * ELLE NE DEMANDE AUCUNE PERMISSION. Pas de bouton « Autoriser ». La règle du
 * dépôt (`features/setup/permissionSensors.ts`, en tête) : « chaque permission
 * est demandée au moment de son bénéfice ». Une page de Réglages n'est le
 * bénéfice d'aucune : personne n'y prend une photo ni n'y démarre une course,
 * et iOS ne présente sa boîte qu'UNE fois — la brûler ici condamnerait la
 * fonction là-bas. La demande reste où elle sert (la carte pour la position,
 * l'éditeur de profil pour la photo, l'écran d'accueil E10 pour le mouvement).
 *
 * ELLE NE PARLE PAS DES NOTIFICATIONS. Leur récit complet — capacité du build,
 * permission système, préférences serveur §14.1 — vit dans Réglages ›
 * Notifications, et un deuxième récit a déjà produit dans ce dépôt deux écrans
 * qui se contredisaient sur le même fait. La dernière ligne y renvoie.
 *
 * ELLE NE PROMET PAS DE RÉGLER UN CONSENTEMENT. G27, encore : « une permission
 * système et un consentement à un usage ne sont pas confondus ». Autoriser
 * l'accès à la position ne dit RIEN de qui voit ton tracé — ça, c'est
 * Confidentialité et données, et la page le dit au lieu de le laisser deviner.
 *
 * ═══ LES CINQ ÉTATS, JAMAIS CONFONDUS (L8/L14/L19) ═════════════════════════
 *   · lecture en cours — on n'affirme rien tant qu'on ne sait pas ;
 *   · accordée · refusée — ce que l'OS a répondu, mot pour mot ;
 *   · pas encore demandée — ni oui ni non : GRYD n'a jamais posé la question.
 *     La confondre avec un refus accuserait l'utilisateur d'un geste qu'il n'a
 *     pas fait, et le bouton « Ouvrir les Réglages » l'enverrait devant une
 *     page iOS où l'entrée de GRYD n'existe pas encore ;
 *   · impossible à lire — capteur absent, plateforme sans API, sonde qui lève.
 * Le tri est fait par `features/settings/devicePermissionRows.ts` (pur, testé),
 * jamais par une condition écrite à la main dans le JSX.
 *
 * ═══ RELECTURE AU RETOUR DES RÉGLAGES iOS ══════════════════════════════════
 * Changer une permission dans Réglages iOS ne notifie pas l'app. Sans relecture
 * au retour, l'écran afficherait « refusée » sur une permission qu'on vient
 * d'accorder — le mensonge le plus certain de toute la page, puisqu'il suit
 * exactement le geste qu'on a demandé. On réinterroge donc l'OS à chaque
 * passage au premier plan (`AppState`).
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Platform, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { fonts, refonteColors as c } from '@klaim/shared';
import { screen } from '../../src/lib/analytics';
import {
  ProfileButton,
  ProfileLink,
  ProfilePage,
  ProfileSection,
  useRefonteCopy,
} from '../../src/features/refonte/ProfilePrimitives';
import { GrydIcon } from '../../src/ui/gryd';
import { SETTINGS_GLYPHS } from '../../src/ui/gryd/glyphs';
import { cardState, type PermissionCardState } from '../../src/features/setup/permissionCards';
import {
  devicePermissionTone,
  showsOpenSettings,
  type DevicePermissionProbe,
} from '../../src/features/settings/devicePermissionRows';
import {
  CAMERA_PERMISSION,
  LOCATION_PERMISSION,
  MOTION_SENSOR,
  OPEN_APP_SETTINGS,
  PHOTOS_PERMISSION,
} from '../../src/features/settings/devicePermissionSensors';

type RowId = 'location' | 'photos' | 'camera' | 'motion';

/**
 * Le podomètre a DEUX faits indépendants (le capteur existe-t-il, et qu'a
 * répondu l'OS) alors que les trois autres n'en ont qu'un : `supported` est
 * donc optionnel, et son absence vaut « la capacité existe si la sonde
 * existe ». C'est le piège documenté dans `permissionCards.ts` : sur les
 * plateformes sans implémentation native, la permission de podomètre répond
 * « accordée » par défaut — un « Autorisé » sur un appareil incapable de
 * compter un seul pas.
 */
interface RowSource {
  id: RowId;
  probe: DevicePermissionProbe | null;
  supported?: () => Promise<boolean>;
}

/** Capturé une fois : TypeScript ne peut pas savoir qu'un module ne change pas. */
const MOTION = MOTION_SENSOR;
/** Idem pour l'ouverture des réglages système (null sur le web). */
const OPEN_SETTINGS = OPEN_APP_SETTINGS;

const SOURCES: readonly RowSource[] = [
  { id: 'location', probe: LOCATION_PERMISSION },
  { id: 'photos', probe: PHOTOS_PERMISSION },
  { id: 'camera', probe: CAMERA_PERMISSION },
  {
    id: 'motion',
    probe: MOTION ? () => MOTION.check() : null,
    supported: MOTION ? () => MOTION.supported() : undefined,
  },
];

export default function DevicePermissionsScreen() {
  const copy = useRefonteCopy();
  const [states, setStates] = useState<Partial<Record<RowId, PermissionCardState>>>({});
  useEffect(() => {
    screen('parametres_permissions');
  }, []);

  const read = useCallback(async (alive: () => boolean) => {
    for (const source of SOURCES) {
      if (source.probe === null) {
        if (alive()) setStates((prev) => ({ ...prev, [source.id]: 'unavailable' }));
        continue;
      }
      const supported = source.supported ? await source.supported().catch(() => false) : true;
      const probe = await source.probe().catch(() => null);
      if (!alive()) return;
      setStates((prev) => ({ ...prev, [source.id]: cardState(supported, probe) }));
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const alive = () => mounted;
    void read(alive);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void read(alive);
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, [read]);

  /** Une plateforme sans réglages atteignables ne peint aucun bouton. */
  const canOpenSettings = OPEN_SETTINGS !== null;

  const labels: Readonly<Record<RowId, { title: string; why: string }>> = {
    location: {
      title: copy('Position', 'Location'),
      why: copy(
        'Sans elle, GRYD ne peut enregistrer aucune sortie ni dessiner aucun tracé.',
        'Without it, GRYD cannot record an activity or draw a trace.',
      ),
    },
    photos: {
      title: copy('Photos', 'Photos'),
      why: copy(
        'Choisir une photo de profil, ou importer une image dans le studio de partage.',
        'Pick a profile photo, or import an image into the sharing studio.',
      ),
    },
    camera: {
      title: copy('Appareil photo', 'Camera'),
      why: copy(
        'Prendre une photo de profil sur le moment, au lieu d’en choisir une.',
        'Take a profile photo on the spot instead of picking one.',
      ),
    },
    motion: {
      title: copy('Mouvement', 'Motion'),
      why: copy(
        'Le compteur de pas distingue une foulée d’un trajet motorisé. Refuser ne pénalise rien.',
        'The step counter tells a stride from a motorised trip. Declining costs you nothing.',
      ),
    },
  };

  return <ProfilePage tone="light" title={copy('Autorisations de l’appareil', 'Device permissions')} back backHref="/parametres">
    <Text style={local.intro}>{copy(
      'Ce que ton téléphone autorise GRYD à utiliser. Ces réglages appartiennent à l’appareil : ils se changent dans les Réglages du système, pas ici.',
      'What your phone lets GRYD use. These belong to the device: they change in the system Settings, not here.',
    )}</Text>

    <ProfileSection tone="light" title={copy('Sur cet appareil', 'On this device')} />
    <View style={local.group}>
      {SOURCES.map((source) => {
        const state = states[source.id];
        const tone = state ? devicePermissionTone(state) : 'reading';
        const label = labels[source.id];
        return <View key={source.id} style={local.row}>
          <View style={local.rowHead}>
            <GrydIcon name={SETTINGS_GLYPHS.devicePermissions} size={20} color={c.ink} />
            <Text style={local.rowTitle}>{label.title}</Text>
            <StateBadge tone={tone} copy={copy} />
          </View>
          <Text style={local.meta}>{label.why}</Text>
          {/* La PHRASE d'état, en clair : une pastille seule se lit mal, et
              « refusée » sans sa conséquence n'apprend rien. */}
          <Text style={local.meta}>{
            tone === 'reading' ? copy('Lecture de l’autorisation…', 'Reading permission…')
              : tone === 'granted' ? copy('Autorisée. Tu peux la retirer à tout moment.', 'Allowed. You can withdraw it at any time.')
                : tone === 'refused' ? copy('Refusée. La fonction reste indisponible tant qu’elle l’est.', 'Denied. The feature stays unavailable while it is.')
                  : tone === 'pending' ? copy('Pas encore demandée. Elle te sera proposée au moment où elle sert.', 'Not requested yet. You will be asked when it is needed.')
                    : copy('Impossible à lire sur cet appareil.', 'Cannot be read on this device.')
          }</Text>
          {state && OPEN_SETTINGS !== null && showsOpenSettings(state, canOpenSettings)
            ? <View style={local.action}><ProfileButton tone="light" secondary
              label={Platform.OS === 'ios'
                ? copy('Ouvrir les Réglages iOS', 'Open iOS Settings')
                : copy('Ouvrir les réglages du système', 'Open system settings')}
              onPress={() => { void OPEN_SETTINGS(); }} /></View>
            : null}
        </View>;
      })}
    </View>

    {/* Les deux voisines, nommées plutôt que devinées. Chacune existe déjà et
        tient un récit que cette page n'a pas le droit de raconter à sa place. */}
    <ProfileSection tone="light" title={copy('Ailleurs dans GRYD', 'Elsewhere in GRYD')} />
    <View style={local.group}>
      <ProfileLink tone="light" title={copy('Notifications', 'Notifications')}
        subtitle={copy('Ce que GRYD a le droit de t’envoyer, catégorie par catégorie', 'What GRYD may send you, category by category')}
        grydIcon={SETTINGS_GLYPHS.notifications} onPress={() => router.push('/parametres/notifications')} />
      <ProfileLink tone="light" title={copy('Confidentialité et données', 'Privacy and data')}
        subtitle={copy('Qui voit tes sorties, tes zones protégées, ton export', 'Who sees your activities, your protected zones, your export')}
        grydIcon={SETTINGS_GLYPHS.privacyData} onPress={() => router.push('/confidentialite')} />
    </View>
    <Text style={local.note}>{copy(
      'Autoriser l’accès à ta position ne dit rien de qui voit ton tracé : ce choix-là t’appartient, dans Confidentialité et données.',
      'Allowing location access says nothing about who sees your trace: that choice is yours, under Privacy and data.',
    )}</Text>
  </ProfilePage>;
}

/**
 * La pastille d'état. MOTIF + MOT, jamais la couleur seule (L15) : un point
 * vert et un point orange sont le même point pour une part non négligeable des
 * joueurs, et cette page ne parle que d'états.
 */
function StateBadge({ tone, copy }: { tone: ReturnType<typeof devicePermissionTone>; copy: (fr: string, en: string) => string }) {
  if (tone === 'reading') return <ActivityIndicator color={c.muted} />;
  const map = {
    granted: { icon: 'check', label: copy('Autorisée', 'Allowed'), style: local.badgeOn },
    refused: { icon: 'close', label: copy('Refusée', 'Denied'), style: local.badgeOff },
    pending: { icon: 'minus', label: copy('Pas demandée', 'Not requested'), style: local.badgeIdle },
    unknown: { icon: 'info', label: copy('Inconnue', 'Unknown'), style: local.badgeIdle },
  } as const;
  const item = map[tone];
  return <View style={[local.badge, item.style]}>
    <GrydIcon name={item.icon} size={13} color={tone === 'granted' ? c.ink : c.muted} />
    <Text style={[local.badgeText, tone === 'granted' && local.badgeTextOn]}>{item.label}</Text>
  </View>;
}

const local = StyleSheet.create({
  intro: { fontFamily: fonts.text, fontSize: 14, lineHeight: 20, color: c.muted, paddingTop: 8, paddingBottom: 2 },
  group: { borderRadius: 24, backgroundColor: c.surface, paddingHorizontal: 18, paddingVertical: 4 },
  row: { paddingVertical: 14, gap: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  rowHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, minHeight: 28 },
  rowTitle: { flex: 1, minWidth: 90, fontFamily: fonts.textMedium, fontSize: 14, lineHeight: 20, color: c.ink },
  meta: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.muted },
  note: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.muted, paddingTop: 12 },
  action: { alignSelf: 'flex-start', paddingTop: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  badgeOn: { backgroundColor: c.accent, borderColor: c.accent },
  badgeOff: { backgroundColor: 'transparent', borderColor: c.border },
  badgeIdle: { backgroundColor: 'transparent', borderColor: c.border },
  badgeText: { fontFamily: fonts.textMedium, fontSize: 11, lineHeight: 16, color: c.muted },
  badgeTextOn: { color: c.ink },
});
