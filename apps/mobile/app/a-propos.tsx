/**
 * GRYD — À PROPOS / MENTIONS LÉGALES, embarquées dans l'app.
 *
 * POURQUOI CET ÉCRAN EXISTE (demande fondateur 21/07 : « dans à propos il faut
 * tout mettre à jour, se couvrir au maximum d'un point de vue légal ») :
 * l'écran Réglages renvoyait vers « gryd.run/mentions-legales », un domaine qui
 * N'EXISTE PAS — l'arbitrage gryd.app vs gryd.run est toujours ouvert (O10).
 * Les mentions légales étaient donc un CUL-DE-SAC, alors que la LCEN impose
 * qu'elles soient accessibles. Ici elles ne dépendent d'aucun domaine, d'aucun
 * hébergement, d'aucune connexion réseau : elles s'affichent toujours.
 *
 * Le texte et l'identité vivent dans i18n/catalog/legal.ts (source unique,
 * valeurs RÉELLES du RCS) — cet écran ne fait que les mettre en page.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, radii, spacing } from '@klaim/shared';
import { C, LEGAL_ENTITY } from '../src/i18n/catalog/legal';
import { useT } from '../src/i18n/store';
import { screen } from '../src/lib/analytics';
import { SectionLabel } from '../src/features/privacy/ui';
import { StackScreen } from '../src/ui/StackScreen';

/**
 * Bloc de section : sur-titre + corps. On réutilise le `SectionLabel` PARTAGÉ
 * (features/privacy/ui) — le MÊME sur-titre que Confidentialité et Réglages,
 * pour que les trois écrans aient exactement la même grammaire d'en-tête (le
 * kicker chartreuse local d'ici en divergeait). La card reste une surface N1
 * carbone sans contour (règle 80/20).
 */
function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <View>
      <SectionLabel>{heading}</SectionLabel>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export default function AProposScreen() {
  const t = useT();
  useEffect(() => {
    screen('a_propos');
  }, []);

  // Les variables d'identité viennent de LEGAL_ENTITY : une seule vérité, et
  // aucune mention obligatoire ne peut diverger d'un écran à l'autre.
  const vars = {
    name: LEGAL_ENTITY.name,
    form: LEGAL_ENTITY.form,
    capital: LEGAL_ENTITY.capital,
    address: LEGAL_ENTITY.address,
    rcs: LEGAL_ENTITY.rcsCity,
    siren: LEGAL_ENTITY.siren,
    vat: LEGAL_ENTITY.vat,
    president: LEGAL_ENTITY.president,
  };

  return (
    <StackScreen title={t(C.aboutTitle)} icon="info" kicker={t(C.aboutKicker)}>
      <Section heading={t(C.publisherHeading)}>
        <Text style={styles.body}>{t(C.publisherBody, vars)}</Text>
        <Text style={styles.body}>{t(C.publisherDirector, vars)}</Text>
        <Text style={styles.meta}>{t(C.publisherVat, vars)}</Text>
      </Section>

      <Section heading={t(C.hostingHeading)}>
        <Text style={styles.body}>{t(C.hostingBody)}</Text>
      </Section>

      <Section heading={t(C.dataHeading)}>
        <Text style={styles.body}>{t(C.dataBody)}</Text>
      </Section>

      <Section heading={t(C.contactHeading)}>
        <Text style={styles.body}>{t(C.contactBody)}</Text>
      </Section>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: spacing.sm,
  },
  /** Texte légal : lisible, jamais tronqué (aucun numberOfLines ici). */
  body: { color: colors.blanc, fontSize: fontSizes.sm, lineHeight: 21 },
  meta: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 18 },
});
