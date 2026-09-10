/**
 * GRYD — L'AFFICHE D'INVITATION D'UN CREW (route `/crew-invitation`, G19).
 *
 * ═══ CE QUE CE FICHIER REMPLACE ════════════════════════════════════════════
 * `features/refonte/CrewInviteScreen.tsx`, qui n'était pas une route mais un
 * MODE de l'écran Crew (`mode === 'invite'`). Trois conséquences, toutes
 * payées : aucune adresse à ouvrir depuis une notification ou un raccourci,
 * aucun retour système (le bouton « Retour au crew » était un état local), et
 * l'audit de routes ne voyait rien. C'est maintenant un écran, avec sa route,
 * atteint en UN tap depuis la page du crew.
 *
 * ═══ CE QUE LE QR ENCODE : `gryd://c/<CODE>`, ET SÛREMENT PAS UN HTTPS ══════
 * Décision du 10/09/2026, conservée mot pour mot (elle est gardée par
 * `crew/crewInviteLink2026.test.ts`) : `app.json` ne déclare NI
 * `ios.associatedDomains` NI d'`intentFilters` autoVerify, et `apps/web` n'a
 * pas de route `/c/[code]`. Un `https://gryd.run/c/…` ouvrirait donc une 404
 * dans Safari, au moment le plus fragile du produit, celui où on amène
 * quelqu'un. Le scheme `gryd://` NOUS appartient (`expo.scheme`) et fonctionne
 * aujourd'hui, sur un appareil qui a l'app.
 *
 * ⚠️ NE PAS « corriger » en déclarant `applinks:` : c'est une décision d'infra
 * du fondateur (achat du domaine, arbitrage gryd.app / gryd.run, point ouvert
 * O10), pas un oubli. Le jour où elle tombe : le domaine dans `app.json`,
 * l'AASA + `assetlinks.json` servis en https, une route `/c/[code]` dans
 * `apps/web` — après quoi ce fichier repasse à `buildInviteLink`.
 *
 * ═══ LE LIEN ET LE QR PORTENT LE MÊME JETON ════════════════════════════════
 * Une seule expression, `buildInviteDeepLink(code)`, alimente le QR, le lien
 * affiché, « Partager » et « Copier ». Deux constructions divergeraient au
 * premier changement de format, et personne ne s'en apercevrait : un QR
 * imprimé ne se corrige pas.
 *
 * ═══ POURQUOI IL N'Y A PAS DE « RÉVOQUER ET REGÉNÉRER » ════════════════════
 * Parce qu'aucune RPC ne le fait, et qu'un bouton qui ne peut pas aboutir est
 * exactement ce que la constitution interdit. Le code d'un crew
 * (`crews.code`, 0002, rendu par `my_crew_code()` 0042) est PERMANENT : aucune
 * migration du dépôt ne le fait tourner. Un objet d'invitation révocable
 * EXISTE bien en base — le jeton daté de 0090 (`create_crew_invite`,
 * `revoke_crew_invite`) — mais AUCUN écran ne le consomme : il n'y a ni route
 * `/i/[token]`, ni appel à `redeem_crew_invite` dans tout `apps/mobile`.
 * Peindre « Révoquer » ici reviendrait donc soit à ne rien révoquer, soit à
 * émettre un lien que l'app est incapable d'ouvrir. On ne le peint pas, et on
 * DIT à la place ce qui est vrai : ce code est celui de tout le crew, il ne
 * s'annule pas. Quelqu'un qui donne son code a le droit de le savoir avant.
 *
 * ═══ AUCUN BOUTON MORT POUR LE PARTAGE NON PLUS ════════════════════════════
 * `probeInviteShare()` MESURE (presse-papier réellement embarqué,
 * `navigator.share` réellement présent), `resolveInviteCapabilities()` ARBITRE
 * (pur, testé en Deno), et l'écran ne peint que ce qui est démontré.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { EVENTS, fonts, refonteColors as c } from '@klaim/shared';
import { GrydMark } from '../../ui/gryd';
import { CrewCrest } from '../../ui/game/CrewCrest';
import { useSession } from '../../lib/session';
import { AccountDoor2026 } from '../account/AccountDoor2026';
import { screen, track } from '../../lib/analytics';
import { haptics } from '../../lib/haptics';
import {
  ProfileButton,
  ProfilePage,
  lightStyles,
  s as darkStyles,
  useRefonteCopy,
} from '../refonte/ProfilePrimitives';
import { buildInviteDeepLink, copyInviteLink, probeInviteShare, shareInviteLink } from './invite';
import { resolveInviteCapabilities } from './inviteShareCapabilities';
import { crewEmblemSeed, isCrewEmblem } from './crewEmblem';
import { useRealCrew } from './real';

const s = { ...darkStyles, ...lightStyles };

export function CrewInvitationScreen2026() {
  const copy = useRefonteCopy();
  const { width } = useWindowDimensions();
  /** Le QR reste carré et lisible même sur un petit écran ; jamais plus grand
   *  que ce qu'un iPhone SE peut afficher sans faire défiler l'affiche. */
  const qrSize = Math.max(80, Math.min(208, width - 144));
  const { configured, session, loading: sessionLoading } = useSession();
  const crew = useRealCrew();
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    const result = await crew.fetchMyCode();
    setCode(result.ok ? result.code : null);
    setFailed(!result.ok);
    setLoading(false);
  }, [crew]);

  useEffect(() => {
    screen('crew_invite_qr');
  }, []);

  useEffect(() => {
    // Tant que la session ou l'adhésion n'ont pas résolu, `my_crew_code`
    // répondrait `no_crew` sur un compte qui EN A un : on attendrait alors un
    // échec qui n'existe pas. On ne lit qu'une fois le contexte prêt.
    if (!crew.ready) return;
    void load();
    // `load` change avec `crew`, dont l'identité bouge à chaque rendu du hook :
    // la dépendance utile est l'état de préparation, pas la fonction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crew.ready, crew.crew?.id]);

  /** Ce que CET appareil sait faire d'une invitation, mesuré et non supposé. */
  const actions = useMemo(() => {
    const probe = probeInviteShare();
    return resolveInviteCapabilities({
      platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web',
      hasShareable: code !== null,
      clipboardAvailable: probe.clipboardAvailable,
      webShareAvailable: probe.webShareAvailable,
      backendConfigured: configured,
      // Cet écran ne LIT pas le rôle : prétendre le contraire ferait apparaître
      // des gestes d'administration sur une permission jamais vérifiée.
      myRole: null,
    })
      .actions.map((action) => action.id)
      .filter((action): action is 'copy' | 'share' => action === 'copy' || action === 'share')
      .sort((a, b) => (a === b ? 0 : a === 'share' ? -1 : 1));
  }, [code, configured]);

  const act = useCallback(
    async (action: 'copy' | 'share') => {
      if (!code) return;
      const link = buildInviteDeepLink(code);
      const result = action === 'copy' ? await copyInviteLink(link) : await shareInviteLink(link);
      if (result.ok) {
        haptics.success();
        track(EVENTS.inviteSent, { channel: result.via === 'clipboard' ? 'copy' : 'share' });
        // On ne dit « copié » QUE si le presse-papier a vraiment servi :
        // `copyInviteLink` retombe sur la feuille de partage quand
        // expo-clipboard est absent et renvoie quand même `ok:true`.
        setMessage(
          result.via === 'clipboard'
            ? copy('Lien copié.', 'Link copied.')
            : copy('Partage système ouvert.', 'System sharing opened.'),
        );
        return;
      }
      // Fermer une feuille de partage est un DROIT, pas une erreur : on se tait.
      if (result.reason === 'dismissed') return;
      haptics.error();
      setMessage(
        copy(
          'Le partage n’a pas abouti. Tu peux montrer le QR.',
          'Sharing did not complete. You can show the QR code.',
        ),
      );
    },
    [code, copy],
  );

  const shell = (children: React.ReactNode) => (
    <ProfilePage tone="light" title={copy('Invitation', 'Invitation')} back backHref="/crew">
      {children}
    </ProfilePage>
  );

  // ── ① SANS BACKEND : aucun code ne peut exister, et aucun bouton non plus ──
  if (!configured) {
    return shell(
      <View style={s.state}>
        <Text style={s.body}>
          {copy(
            'Les invitations sont indisponibles : cette version de l’app n’est reliée à aucun serveur.',
            'Invitations are unavailable: this build is not connected to any server.',
          )}
        </Text>
      </View>,
    );
  }

  // ── ② PAS DE COMPTE : un crew se rejoint avec un compte, et on le DIT ─────
  //
  //   ÉTAPE 0 (11/09/2026, relevé en preview headless) : sans cette branche,
  //   un visiteur arrivé par lien profond lisait « Aucun crew à faire
  //   rejoindre. Crée le tien, ou rejoins-en un » — vrai sur le fond, et faux
  //   sur la cause : ce n'est pas qu'il n'a pas de crew, c'est qu'il n'a pas
  //   de compte, et les deux gestes proposés l'auraient renvoyé sur la même
  //   porte de connexion, un écran plus loin. Les deux écrans voisins
  //   (`/crew-discovery`, `/crew-gestion`) distinguent déjà cet état.
  if (!session && !sessionLoading) {
    return shell(
      <View style={s.state}>
        <AccountDoor2026
          tone="light"
          reason={copy(
            'Une invitation ouvre la porte d’un crew. Il faut un compte pour la franchir.',
            'An invitation opens a crew’s door. You need an account to walk through it.',
          )}
          analyticsId="crew_invitation_sign_in"
        />
      </View>,
    );
  }

  // ── ③ LECTURE EN COURS : une phrase, jamais un squelette de QR ────────────
  if (sessionLoading || crew.loading || (crew.ready && loading && !failed)) {
    return shell(
      <View style={s.state}>
        <ActivityIndicator color={c.ink} />
        <Text style={s.body}>{copy('Lecture de l’invitation…', 'Loading the invitation…')}</Text>
      </View>,
    );
  }

  // ── ④ PAS DE CREW : l'invitation n'a pas d'objet, et on le dit ────────────
  if (!crew.crew) {
    return shell(
      <View style={s.state}>
        <Text style={s.title}>{copy('Aucun crew à faire rejoindre', 'No crew to invite to')}</Text>
        <Text style={s.body}>
          {copy(
            'Une invitation part d’un crew. Crée le tien, ou rejoins-en un, et son code apparaîtra ici.',
            'An invitation comes from a crew. Create yours, or join one, and its code will appear here.',
          )}
        </Text>
        <ProfileButton
          tone="light"
          label={copy('Voir mon crew', 'Open my crew')}
          onPress={() => router.replace('/crew')}
        />
      </View>,
    );
  }

  // ── ⑤ ÉCHEC DE LECTURE : distinct du vide, avec la seule action utile ─────
  if (failed || !code) {
    return shell(
      <View style={s.state}>
        <Text style={s.title}>{copy('Invitation illisible', 'Invitation unavailable')}</Text>
        <Text style={s.body}>
          {copy(
            'Le code du crew n’a pas pu être lu. Ce n’est pas un crew sans code : c’est la lecture qui manque.',
            'The crew code could not be read. This is not a crew without a code: only the reading is missing.',
          )}
        </Text>
        <ProfileButton
          tone="light"
          label={copy('Réessayer', 'Try again')}
          onPress={() => void load()}
        />
      </View>,
    );
  }

  // ── ⑥ L'AFFICHE ──────────────────────────────────────────────────────────
  const link = buildInviteDeepLink(code);

  return shell(
    <>
      <Text style={s.kicker}>{copy('INVITATION AU CREW', 'CREW INVITATION')}</Text>

      {/* LE BLASON ET LE NOM EXACT (G19). Le nom n'est jamais tronqué : un nom
          de crew coupé est un nom qu'on ne reconnaît pas. */}
      <View style={local.identity}>
        {isCrewEmblem(crew.crew.color) ? (
          <CrewCrest seed={crewEmblemSeed(crew.crew.color)} name={crew.crew.name} size="m" />
        ) : null}
        <View style={s.flex}>
          <Text style={s.title}>{crew.crew.name}</Text>
          <Text style={s.meta}>
            {crew.memberCount} / {crew.maxMembers} {copy('membres', 'members')}
          </Text>
        </View>
      </View>

      <Text style={[s.subtitle, local.spaced]}>
        {copy(
          'Scanne le QR, partage le lien, ou transmets le code.',
          'Scan the QR, share the link, or pass on the code.',
        )}
      </Text>

      {/* L'AFFICHE. Le QR est NOIR SUR CLAIR avec sa quiet zone : c'est un
          impératif OPTIQUE, pas une esthétique. Un QR chartreuse sur noir
          inverse la polarité et beaucoup de décodeurs échouent. */}
      <View style={local.poster}>
        <GrydMark variant="wordmark" size={18} color={c.surface} />
        <View
          style={local.qr}
          accessible
          accessibilityRole="image"
          accessibilityLabel={copy(
            `QR code d’invitation du crew ${crew.crew.name}`,
            `Invitation QR code for crew ${crew.crew.name}`,
          )}
        >
          <QRCode value={link} size={qrSize} color={c.ink} backgroundColor={c.surface} quietZone={16} />
        </View>
        {/* Sélectionnable : sur un écran partagé, on doit pouvoir l'extraire. */}
        <Text selectable style={local.code}>
          {code}
        </Text>
        <Text style={local.hint}>{copy('CODE D’INVITATION', 'INVITATION CODE')}</Text>
      </View>

      <View style={local.linkPanel}>
        <Text style={local.linkLabel}>{copy('Lien du crew', 'Crew link')}</Text>
        <Text selectable style={local.linkText}>
          {link}
        </Text>
        <Text style={local.linkHint}>
          {copy(
            'Ce lien ouvre GRYD si l’app est installée sur l’appareil. Sinon, transmets le code : il se saisit à la main.',
            'This link opens GRYD if the app is installed on the device. Otherwise share the code: it can be typed in by hand.',
          )}
        </Text>
      </View>

      <View style={s.gap}>
        {actions.map((action, i) => (
          <ProfileButton
            tone="light"
            key={action}
            label={
              action === 'copy'
                ? copy('Copier le lien', 'Copy link')
                : copy('Partager le lien', 'Share link')
            }
            secondary={i > 0}
            onPress={() => void act(action)}
          />
        ))}
      </View>

      {message ? (
        <Text accessibilityRole="alert" style={[s.meta, local.spaced]}>
          {message}
        </Text>
      ) : null}

      {/* CE QUE CE CODE EST, dit une fois, avant qu'on le donne. Il remplace le
          « Révoquer » que la base ne sait pas faire (voir l'en-tête). */}
      <Text style={[s.meta, local.spaced]}>
        {copy(
          'Ce code est celui de tout le crew. Il ne change pas et ne s’annule pas : ne le colle que là où tu veux vraiment recruter.',
          'This code belongs to the whole crew. It never changes and cannot be revoked: only post it where you really want to recruit.',
        )}
      </Text>
    </>,
  );
}

const local = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 16 },
  spaced: { marginTop: 16 },
  linkPanel: {
    backgroundColor: c.surface,
    padding: 18,
    borderRadius: 24,
    gap: 8,
    marginBottom: 16,
  },
  linkLabel: { fontFamily: fonts.textMedium, fontSize: 14, color: c.ink },
  linkText: { fontFamily: fonts.text, fontSize: 13, lineHeight: 20, color: c.ink },
  linkHint: { fontFamily: fonts.text, fontSize: 13, lineHeight: 19, color: c.muted },
  poster: {
    marginVertical: 24,
    padding: 20,
    gap: 18,
    alignItems: 'center',
    backgroundColor: c.carbon,
    borderRadius: 24,
  },
  qr: { backgroundColor: c.darkSurface, borderRadius: 16, padding: 6 },
  code: { fontFamily: fonts.mono, fontSize: 22, letterSpacing: 4, color: c.surface },
  hint: { fontFamily: fonts.textMedium, color: c.darkMuted, fontSize: 10, letterSpacing: 1.3 },
});
