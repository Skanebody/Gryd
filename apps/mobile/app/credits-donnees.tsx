/**
 * GRYD — CRÉDITS DE DONNÉES. Une obligation de licence, pas une page « à propos ».
 *
 * ─── POURQUOI CET ÉCRAN EXISTE ─────────────────────────────────────────────
 * GRYD embarque 7 870 villes réelles d'Europe issues de GeoNames, publiées sous
 * **CC BY 4.0** : la licence AUTORISE l'usage et EXIGE la citation. Jusqu'ici
 * `EU_CITIES_SOURCE.attribution` existait dans le code et n'était affichée nulle
 * part — donc la condition d'usage de la donnée n'était pas tenue. Même trou
 * pour les contours administratifs de Paris et Lille (geo.api.gouv.fr / Etalab,
 * migration 0033), qui décident pourtant si une course capture, et qui
 * n'étaient cités nulle part non plus.
 *
 * `/sources` ne pouvait pas accueillir ça : c'est le hub GRYD Verify (Strava,
 * import GPX…), il parle des sources de COURSES, pas des sources de DONNÉES.
 *
 * ─── CE QUE L'ÉCRAN AFFICHE ────────────────────────────────────────────────
 * Les chiffres (nombre de villes, de pays, date de figeage) sont LUS dans
 * `EU_CITIES_SOURCE`, jamais retapés : une page de crédits qui se désynchronise
 * du fichier qu'elle crédite ne crédite plus rien. Les fonds de carte reprennent
 * mot pour mot l'attribution déjà rendue sur la carte (MapScreen) — deux
 * formulations différentes pour la même obligation, c'est une de trop.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, radii, spacing } from '@klaim/shared';
// ⚠️ CHEMIN PROFOND VOLONTAIRE (`/src/`), et non le sous-chemin d'exports
// `@klaim/shared/cities-eu` : Metro laisse `unstable_enablePackageExports` à
// FALSE (metro-config/src/defaults, Expo SDK 52) et le TS du mobile est en
// `moduleResolution: node` — aucun des deux ne lit le champ `exports`. Le
// sous-chemin compile côté web/Deno et CASSE le bundle mobile à l'exécution.
// Ce qui compte reste tenu : la donnée n'est PAS ré-exportée par l'index, donc
// un `import … from '@klaim/shared'` ne tire toujours pas 346 Ko.
import { EU_CITIES_SOURCE } from '@klaim/shared/src/cities-eu';
import { C } from '../src/i18n/catalog/city';
import { useT } from '../src/i18n/store';
import { screen } from '../src/lib/analytics';
import { SectionLabel } from '../src/features/privacy/ui';
import { StackScreen } from '../src/ui/StackScreen';

/**
 * Attribution des fonds de carte — RECOPIE de ce que la carte affiche déjà
 * (MapScreen.tsx / MapScreen.web.tsx, AMENDEMENT-28). Ces chaînes sont des
 * mentions de marque imposées par les fournisseurs : elles ne se traduisent pas.
 */
const MAP_ATTRIBUTIONS: readonly string[] = [
  '© OpenStreetMap contributors © CARTO',
  '© Esri, Maxar, Earthstar Geographics',
];

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <View>
      <SectionLabel>{heading}</SectionLabel>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export default function CreditsDonneesScreen() {
  const t = useT();
  useEffect(() => {
    screen('credits_donnees');
  }, []);

  return (
    <StackScreen title={t(C.creditsTitle)} icon="info" kicker={t(C.creditsRowHint)}>
      <Text style={styles.intro}>{t(C.creditsIntro)}</Text>

      <Section heading={t(C.creditsCitiesHeading)}>
        <Text style={styles.body}>
          {t(C.creditsCitiesBody, {
            // LUS dans le fichier généré, pas saisis à la main.
            count: EU_CITIES_SOURCE.cityCount,
            countries: EU_CITIES_SOURCE.countryCount,
          })}
        </Text>
        {/* LA MENTION OBLIGATOIRE. Elle vient du fichier généré : si le
            référentiel change de source, la page change avec lui. */}
        <Text style={styles.attribution}>{EU_CITIES_SOURCE.attribution}</Text>
        <Text style={styles.meta}>
          {t(C.creditsLicenseLabel)} · {EU_CITIES_SOURCE.license} · {EU_CITIES_SOURCE.licenseUrl}
        </Text>
        <Text style={styles.meta}>
          {t(C.creditsUpdatedLabel)} {EU_CITIES_SOURCE.generatedAt} · {EU_CITIES_SOURCE.dataset}
        </Text>
      </Section>

      <Section heading={t(C.creditsZonesHeading)}>
        <Text style={styles.body}>{t(C.creditsZonesBody)}</Text>
        <Text style={styles.attribution}>{t(C.creditsZonesAttribution)}</Text>
      </Section>

      <Section heading={t(C.creditsMapHeading)}>
        {MAP_ATTRIBUTIONS.map((line) => (
          <Text key={line} style={styles.attribution}>
            {line}
          </Text>
        ))}
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
  intro: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: 21 },
  /** Jamais de `numberOfLines` ici : une mention légale tronquée n'est plus une mention. */
  body: { color: colors.blanc, fontSize: fontSizes.sm, lineHeight: 21 },
  attribution: { color: colors.blanc, fontSize: fontSizes.sm, lineHeight: 21, fontWeight: '600' },
  meta: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 18 },
});
