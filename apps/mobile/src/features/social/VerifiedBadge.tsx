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
 * ─── 10/09/2026 (LOT H) : LE BADGE SAIT DÉSORMAIS DIRE « QUI » ─────────────
 * La migration 0176 ajoute `verified_kind` : none | athlete | brand. Un badge
 * unique disait « ce compte est authentique » sans dire de QUOI, alors que les
 * deux usurpations que GRYD peut subir n'ont ni la même preuve, ni la même
 * personne pour trancher : reprendre le nom d'un coureur connu localement, ou
 * prendre le @ d'un équipementier pour paraître officiel. Le composant lit donc
 * le GENRE, et son libellé a11y le nomme.
 *
 * CE QUI N'A PAS CHANGÉ, ET NE DOIT PAS : personne n'a de badge. `verified_kind`
 * vaut « none » pour 100 % des comptes, aucune RPC ne l'écrit, aucun produit
 * commercial ne le référence, et aucun écran de l'app n'appelle ce composant.
 * C'est délibéré et c'est écrit dans `docs/product/
 * GRYD_PSEUDO_ET_VERIFICATION_2026_09.md` : tant qu'aucun circuit humain de
 * revue n'existe (critères, preuve exigée, file, quelqu'un qui tranche), un
 * badge affiché quelque part serait une promesse que rien ne tient.
 *
 * Charte : chartreuse UNIQUEMENT sur fond sombre (jamais sur fond clair).
 */
import { StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';
import { colors, iconSizes } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';

/** Miroir de `user_profiles.verified_kind` (migration 0176). */
export type VerifiedKind2026 = 'none' | 'athlete' | 'brand';

/** PURE. Une valeur serveur inconnue n'est JAMAIS traitée comme un badge. */
export function parseVerifiedKind2026(value: unknown): VerifiedKind2026 {
  return value === 'athlete' || value === 'brand' ? value : 'none';
}

export interface VerifiedBadgeProps {
  /**
   * Décision SERVEUR. `'none'` (le cas de tout le monde) → le composant ne rend
   * rien. Un booléen ne suffisait plus : un badge de marque et un badge de
   * personne ne promettent pas la même chose à celui qui le lit.
   */
  kind: VerifiedKind2026;
  /** Côté de l'icône (défaut : taille « inline », alignée sur une ligne de texte). */
  size?: number;
  /**
   * Libellé a11y déjà traduit, PAR GENRE (l'écran le fournit — ce module reste
   * sans i18n). « Compte vérifié » sans plus de précision ferait lire la même
   * chose à un lecteur d'écran devant une personne et devant une marque.
   */
  accessibilityLabel: string;
}

/**
 * Pastille « compte vérifié » à poser à côté du @pseudo. Ne rend RIEN quand
 * `kind` vaut « none » : pas de placeholder, pas d'emplacement réservé, pas
 * d'incitation. L'absence de badge ne doit rien dire de plus que l'absence.
 */
export function VerifiedBadge({ kind, size, accessibilityLabel }: VerifiedBadgeProps) {
  if (kind === 'none') return null;
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
 * Lit MON genre de vérification depuis le serveur. Retourne « none » dès qu'on
 * ne sait pas (pas de session, pas de backend, lecture ratée, serveur plus
 * vieux que l'app) : on n'affiche jamais un badge « au cas où ». Aujourd'hui,
 * retourne « none » pour tout le monde, aucun processus d'attribution n'existe
 * (cf. commentaire de tête, migrations 0047 et 0176).
 */
export function useMyVerifiedKind2026(): VerifiedKind2026 {
  const { session, configured } = useSession();
  const [kind, setKind] = useState<VerifiedKind2026>('none');

  useEffect(() => {
    const uid = session?.user?.id;
    if (!configured || !uid || !supabase) {
      setKind('none');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const client = supabase;
        if (!client) return;
        const { data, error } = await client
          .from('user_profiles')
          .select('verified, verified_kind')
          .eq('user_id', uid)
          .maybeSingle();
        if (cancelled) return;
        const row = data as { verified?: unknown; verified_kind?: unknown } | null;
        // LES DEUX doivent être d'accord. La contrainte de 0176 l'impose déjà en
        // base ; le client ne s'y fie pas pour autant, parce qu'un badge affiché
        // par erreur est exactement le genre de mensonge qui ne se rattrape pas.
        const verified = !error && row?.verified === true;
        setKind(verified ? parseVerifiedKind2026(row?.verified_kind) : 'none');
      } catch {
        if (!cancelled) setKind('none');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [configured, session]);

  return kind;
}

const styles = StyleSheet.create({
  wrap: { marginLeft: 4 },
});
