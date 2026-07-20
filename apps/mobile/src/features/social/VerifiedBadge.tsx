/**
 * GRYD — BADGE VÉRIFIÉ (demande fondateur : « créer des profils vérifiés avec le
 * badge vérifié »).
 *
 * ⚠ CE QUE CE MODULE EST, ET CE QU'IL N'EST PAS.
 *
 * Il AFFICHE une décision serveur : `user_profiles.verified` (colonne posée par
 * la migration 0047, non écrivable par le client — ni update ni insert). Il ne
 * la produit pas, ne la demande pas, ne la suggère pas.
 *
 * AUCUN PROCESSUS D'ATTRIBUTION N'EXISTE À CE JOUR : pas de formulaire, pas de
 * critère public, pas de file de revue, personne pour trancher. Conséquence
 * directe et assumée : `verified` vaut false pour 100 % des comptes, donc ce
 * badge ne s'affiche NULLE PART aujourd'hui. C'est voulu.
 *
 * Conséquence pour l'UI (« l'app ne ment jamais ») : on n'affiche NULLE PART un
 * « demander la vérification », un « profil bientôt vérifié » ou un emplacement
 * grisé qui laisserait croire qu'un chemin existe. Une colonne prête n'est pas
 * une promesse faite au joueur. Le jour où les critères et la revue existent, le
 * serveur passera des lignes à true et ce composant s'allumera tout seul.
 *
 * Charte : chartreuse UNIQUEMENT sur fond sombre (jamais sur fond clair).
 */
import { StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';
import { colors, iconSizes } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';

export interface VerifiedBadgeProps {
  /** Décision SERVEUR. false (le cas de tout le monde) → le composant ne rend rien. */
  verified: boolean;
  /** Côté de l'icône (défaut : taille « inline », alignée sur une ligne de texte). */
  size?: number;
  /** Libellé a11y déjà traduit (l'écran le fournit — ce module reste sans i18n). */
  accessibilityLabel: string;
}

/**
 * Pastille « compte vérifié » à poser à côté du pseudo. Ne rend RIEN quand
 * `verified` est false : pas de placeholder, pas d'emplacement réservé, pas
 * d'incitation. L'absence de badge ne doit rien dire de plus que l'absence.
 */
export function VerifiedBadge({ verified, size, accessibilityLabel }: VerifiedBadgeProps) {
  if (!verified) return null;
  const s = size ?? iconSizes.sm;
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={styles.wrap}
    >
      <Icon name="bouclier" size={s} color={colors.chartreuse} active />
    </View>
  );
}

/**
 * Lit MON statut vérifié depuis le serveur. Retourne false dès qu'on ne sait
 * pas (pas de session, pas de backend, lecture ratée) : on n'affiche jamais un
 * badge « au cas où ». Aujourd'hui, retourne false pour tout le monde — aucun
 * processus d'attribution n'existe (cf. commentaire de tête + 0047).
 */
export function useMyVerified(): boolean {
  const { session, configured } = useSession();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!configured || !uid || !supabase) {
      setVerified(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const client = supabase;
        if (!client) return;
        const { data, error } = await client
          .from('user_profiles')
          .select('verified')
          .eq('user_id', uid)
          .maybeSingle();
        if (cancelled) return;
        const row = data as { verified?: unknown } | null;
        setVerified(!error && row?.verified === true);
      } catch {
        if (!cancelled) setVerified(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [configured, session]);

  return verified;
}

const styles = StyleSheet.create({
  wrap: { marginLeft: 4 },
});
