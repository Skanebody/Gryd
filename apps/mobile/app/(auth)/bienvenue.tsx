/**
 * GRYD — L'ACCUEIL DES FOURNISSEURS NATIFS (`/bienvenue`).
 *
 * ═══ POURQUOI CETTE ROUTE EXISTE ════════════════════════════════════════════
 * « Continuer avec Apple » ne passe par AUCUNE URL de retour : `signInAsync`
 * rend un token, `signInWithIdToken` ouvre la session, et c'est fini — il n'y a
 * pas de `/callback` à traverser. La porte de compte renvoyait donc directement
 * sur la carte (`<Redirect href="/" />` dès qu'une session existe), et le
 * joueur venu par Apple ne lisait JAMAIS « Félicitations, ton compte GRYD est
 * créé » — ni la proposition de choisir son pseudo qui la suit. Deux chemins
 * d'inscription, deux expériences différentes, sans aucune raison.
 *
 * Cette route donne à Apple le MÊME accueil que le lien e-mail : même
 * composant, même verdict, même destination. La seule différence tient en un
 * `callbackUrl: null` — et ce n'est pas une donnée manquante, c'est un fait :
 * ce flux n'a pas d'URL. `welcomeKind2026` retombe alors sur
 * `handle_chosen_2026` (migration 0175), puis sur la date de création du
 * compte : un compte Apple tout neuf porte l'étiquette dérivée de 0154, donc il
 * est reconnu NEUF sans qu'aucune supposition soit faite.
 *
 * ═══ SANS SESSION, RIEN À ACCUEILLIR ════════════════════════════════════════
 * Atteinte par erreur (lien profond, pile restaurée, connexion échouée), cette
 * route n'a personne à féliciter : elle rend la carte plutôt que de peindre un
 * accueil vide. On n'affirme jamais un compte qu'on n'a pas.
 */
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';
import { colors } from '@klaim/shared';
import { AccountWelcome2026 } from '../../src/features/account/AccountWelcome2026';
import { useWelcomeRead2026 } from '../../src/features/account/useWelcomeRead2026';
import { useSession } from '../../src/lib/session';

export default function AccountWelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { session, loading } = useSession();
  const welcomeRead = useWelcomeRead2026(session !== null);

  // Restauration en cours : un chargement n'affirme rien, ni « compte créé »,
  // ni « pas de compte ». Le fond de la charte, jamais un écran vide blanc.
  if (loading) return <View style={styles.root} />;
  if (session === null) return <Redirect href="/" />;

  return <AccountWelcome2026
    insets={insets}
    callbackUrl={null}
    accountCreatedAt={typeof session.user.created_at === 'string' ? session.user.created_at : null}
    read={welcomeRead}
  />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
});
