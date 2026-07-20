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
import { StackScreen } from '../src/ui/StackScreen';

/** Bloc de section : kicker chartreuse + corps. Même grammaire que Confidentialité. */
function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.kicker}>{heading}</Text>
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
  section: { marginTop: spacing.xl },
  /** Kicker chartreuse — même famille visuelle que la page Confidentialité. */
  kicker: {
    color: colors.chartreuse,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
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
