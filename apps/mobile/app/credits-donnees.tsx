/**
 * GRYD — CRÉDITS DE DONNÉES. Une obligation de licence, pas une page « à propos ».
 *
 * ─── POURQUOI CET ÉCRAN EXISTE ─────────────────────────────────────────────
 * GRYD embarque des villes réelles d'Europe issues de GeoNames, publiées sous
 * **CC BY 4.0** : la licence AUTORISE l'usage et EXIGE la citation. Jusqu'ici
 * `EU_CITIES_SOURCE.attribution` existait dans le code et n'était affichée nulle
 * part — donc la condition d'usage de la donnée n'était pas tenue. Même trou
 * pour le découpage administratif français (geo.api.gouv.fr / Etalab), qui
 * décide pourtant si une course capture, et qui n'était cité nulle part.
 *
 * `/sources` ne pouvait pas accueillir ça : c'est le hub GRYD Verify (Strava,
 * import GPX…), il parle des sources de COURSES, pas des sources de DONNÉES.
 *
 * ─── ORDRE DE COMPOSITION ──────────────────────────────────────────────────
 *  1. barre StackScreen + kicker « SOURCES · LICENCES » ; 2. une phrase qui dit
 *  pourquoi la page existe ; 3. VILLES (ce que couvre le référentiel →
 *  ATTRIBUTION → licence → date de figeage) ; 4. CONTOURS ; 5. FONDS DE CARTE.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ──────────────────────────────────────
 * · LES TROIS CARDS. Des attributions ne sont pas des cards : ce sont des
 *   phrases qu'on lit. Les sections se séparent par l'ESPACE (une seule couche
 *   de surface par zone), et le kicker gris fait le repère.
 * · LES POLICES HORS TOKENS, dont un `fontWeight: '600'` posé sans famille sur
 *   la ligne d'attribution — il n'agit sur AUCUNE des familles à graisse nommée
 *   de Night Print. La hiérarchie passe désormais par la COULEUR (rôle) :
 *   l'explication en gris, la MENTION OBLIGATOIRE en blanc.
 * · LA DATE BRUTE « 2026-07-23 », affichée telle qu'elle sort du fichier généré,
 *   alors que les quatre documents légaux affichent « 23/07/2026 ». Elle passe
 *   par `formatLegalDay` (pur, testé, sans `Intl`) — et si elle cessait d'être
 *   une date, la ligne DISPARAÎT au lieu d'afficher un « NaN ».
 * · LES SÉPARATEURS « · » ASSEMBLÉS EN DUR. Une valeur absente laissait un « · »
 *   orphelin en bout de ligne. Les lignes de contexte se construisent par
 *   FILTRAGE puis `join(' · ')` : zéro segment ⇒ zéro ligne.
 * · LE DOCBLOC PÉRIMÉ. Il parlait encore de « Paris et Lille (migration 0033) »
 *   alors que le texte affiché couvre les 34 969 communes de France : un
 *   commentaire faux envoie le prochain lecteur corriger le mauvais endroit.
 *
 * ─── ÉCARTS ASSUMÉS ────────────────────────────────────────────────────────
 * · `MAP_ATTRIBUTIONS` RESTE UNE RECOPIE MANUELLE des chaînes que la carte rend
 *   déjà (MapScreen / MapScreen.web) : deux sources pour la même obligation de
 *   licence, qui peuvent diverger en silence. La bonne correction est de les
 *   EXPORTER depuis le module carte — `src/features/map/**` est gelé pour ce
 *   lot, la dérive est donc inscrite en suspens plutôt que corrigée de travers.
 * · PAS DE 4 ÉTATS, et c'est déclaré : cet écran ne lit RIEN au réseau. Ses
 *   chiffres viennent du fichier généré `EU_CITIES_SOURCE`, embarqué dans le
 *   bundle — il s'affiche en avion, sans compte et sans backend.
 * · AUCUNE PLANCHE VAGUE 1 ne couvre les crédits de données.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@klaim/shared';
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
import { formatLegalDay } from '../src/features/legal/dates';
import { formatInt } from '../src/ui/format';
import { SectionLabel } from '../src/ui/SectionLabel';
import { StackScreen } from '../src/ui/StackScreen';

/**
 * Attribution des fonds de carte — RECOPIE de ce que la carte affiche déjà
 * (MapScreen.tsx / MapScreen.web.tsx, AMENDEMENT-28). Ces chaînes sont des
 * mentions de marque imposées par les fournisseurs : elles ne se traduisent pas.
 * Voir « ÉCARTS ASSUMÉS » : cette recopie est une source de dérive connue.
 */
const MAP_ATTRIBUTIONS: readonly string[] = [
  '© OpenStreetMap contributors © CARTO',
  '© Esri, Maxar, Earthstar Geographics',
];

/** Une section : kicker gris + contenu posé sur l'espace (aucune card). */
function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <SectionLabel style={styles.heading}>{heading}</SectionLabel>
      {children}
    </View>
  );
}

/**
 * Ligne de contexte : FILTRAGE puis `join(' · ')`. Un segment sans valeur
 * disparaît — jamais un « · » orphelin, jamais un tiret de remplacement.
 */
function dots(segments: readonly (string | null)[]): string | null {
  const kept = segments.filter((s): s is string => s !== null && s.length > 0);
  return kept.length > 0 ? kept.join(' · ') : null;
}

export default function CreditsDonneesScreen() {
  const t = useT();
  useEffect(() => {
    screen('credits_donnees');
  }, []);

  const licenseLine = dots([
    t(C.creditsLicenseLabel),
    EU_CITIES_SOURCE.license,
    EU_CITIES_SOURCE.licenseUrl,
  ]);
  // La date de figeage est LUE dans le fichier généré. Si elle cessait d'être un
  // jour ISO, `formatLegalDay` rend `null` et la ligne entière disparaît.
  const frozenOn = formatLegalDay(EU_CITIES_SOURCE.generatedAt);
  const datasetLine = dots([
    frozenOn === null ? null : `${t(C.creditsUpdatedLabel)} ${frozenOn}`,
    EU_CITIES_SOURCE.dataset,
  ]);

  return (
    <StackScreen title={t(C.creditsTitle)} icon="info" kicker={t(C.creditsKicker)}>
      <Text style={styles.intro}>{t(C.creditsIntro)}</Text>

      <Section heading={t(C.creditsCitiesHeading)}>
        <Text style={styles.body}>
          {t(C.creditsCitiesBody, {
            // LUS dans le fichier généré, pas saisis à la main — et groupés par
            // milliers dans la langue courante (`formatInt`, sans `Intl`) : la
            // page affichait « 7870 », que personne ne lit comme un nombre.
            count: formatInt(EU_CITIES_SOURCE.cityCount),
            countries: EU_CITIES_SOURCE.countryCount,
          })}
        </Text>
        {/* LA MENTION OBLIGATOIRE. Elle vient du fichier généré : si le
            référentiel change de source, la page change avec lui.
            `selectable` : une attribution qu'on ne peut pas copier ne peut pas
            être reprise dans un crédit tiers. */}
        <Text style={styles.attribution} selectable>
          {EU_CITIES_SOURCE.attribution}
        </Text>
        {licenseLine === null ? null : (
          <Text style={styles.meta} selectable>
            {licenseLine}
          </Text>
        )}
        {datasetLine === null ? null : <Text style={styles.meta}>{datasetLine}</Text>}
      </Section>

      <Section heading={t(C.creditsZonesHeading)}>
        <Text style={styles.body}>{t(C.creditsZonesBody)}</Text>
        <Text style={styles.attribution} selectable>
          {t(C.creditsZonesAttribution)}
        </Text>
      </Section>

      <Section heading={t(C.creditsMapHeading)}>
        {MAP_ATTRIBUTIONS.map((line) => (
          <Text key={line} style={styles.attribution} selectable>
            {line}
          </Text>
        ))}
      </Section>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xl },
  heading: { marginBottom: spacing.sm },
  /** Jamais de `numberOfLines` ici : une mention légale tronquée n'est plus une mention. */
  intro: { ...typography.body, color: colors.gris },
  /** L'explication est GRISE : elle contextualise, elle n'est pas la mention. */
  body: { ...typography.body, color: colors.gris },
  /** LA mention exigée par la licence : blanche, c'est elle qu'on vient lire. */
  attribution: { ...typography.body, color: colors.blanc, marginTop: spacing.xs },
  meta: { ...typography.meta, color: colors.gris, marginTop: spacing.xxs },
});
