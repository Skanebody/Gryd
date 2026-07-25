/**
 * GRYD — « Calculs & règles du jeu » (/faq). Recalage Night Print, 25/07/2026.
 *
 * L'objet : répondre à « pourquoi cette zone a compté / n'a pas compté » sans
 * qu'on ait à demander à personne. C'est la page la plus atteinte du groupe
 * explicabilité (Réglages, Support, et le pied de `/calcul-zones`).
 *
 * ── ORDRE DE COMPOSITION ────────────────────────────────────────────────────
 *  1. Barre + kicker + sous-titre (`StackScreen`) ;
 *  2. le niveau de lecture — `Segmented` « Simple / Avancé », `tone="surface"`
 *     (l'accent chartreuse ne se dépense pas sur un filtre) ;
 *  3. LE SOMMAIRE : un en-tête par groupe, replié, avec le nombre RÉEL de
 *     questions qu'il ouvrira. Un seul groupe ouvert à la fois ;
 *  4. dans le groupe ouvert : les questions en lignes scannables (icône →
 *     libellé → chevron), réponse + schéma AU TAP, une seule dépliée ;
 *  5. le groupe « Saisons » ouvre sur l'ÉTAT RÉEL de la saison (`SeasonStatus`)
 *     avant d'en expliquer les règles ;
 *  6. la note de pied, en gris : ce qui n'existe pas encore.
 *
 * ── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ────────────────────────────────────────
 *  · LE MUR D'ACCORDÉONS À PLAT (29 en « Simple », 32 en « Avancé »). Sans
 *    sommaire ni recherche, la page ne se comprenait pas en trois secondes (§A).
 *    Les GROUPES se replient maintenant aussi : on arrive sur une table des
 *    matières de sept lignes, chacune annonçant son nombre RÉEL de questions.
 *  · LE SEGMENTED RECODÉ (deux `Pressable` maison). Il annonçait
 *    `accessibilityRole="button"` là où c'est un `tablist`/`tab`, et recodait
 *    surface, rayon, cible tactile et clip. `Segmented` porte tout ça.
 *  · « L'AIDE GRYD REPREND CHAQUE CAS, ET UNE PERSONNE LIT CHAQUE DEMANDE »
 *    (note de pied) : `/support` n'a ni adresse, ni formulaire, ni `mailto:` —
 *    ses cartes ouvrent une alerte qui dit elle-même que rien n'est transmis.
 *    Promettre un lecteur humain derrière un canal fermé est un mensonge de la
 *    même famille qu'une donnée fabriquée. La note dit désormais l'état réel.
 *  · « LES ACHATS SERVENT AU COFFRE CREW » (Q15, catalogue) : les CGU et les CGV
 *    du même build écrivent que les objets qui touchent au jeu ne sont vendus
 *    dans aucune monnaie — et le coffre n'est rendu par aucun écran. Corrigé
 *    dans `catalog/explain.ts` (q15A, q16A), pas ici.
 *  · LE FILET ORPHELIN : chaque ligne portait un `borderBottom`, donc un trait
 *    flottait sous la dernière question, juste au-dessus du groupe suivant. Le
 *    filet ne sépare plus que des lignes VOISINES.
 *  · LES COULEURS ET GRAISSES EN DUR (`colors.carbone`/`carbone2`, `fontFamily`
 *    + `fontWeight` cumulés sur les questions, réponses sans famille) → rôles
 *    typo et `elevation` via les primitives.
 *
 * ── ÉCARTS ASSUMÉS ─────────────────────────────────────────────────────────
 *  · PAS DE CHAMP DE RECHERCHE. Le sommaire répond au même besoin sans clavier
 *    (une recherche exigerait de la faire porter sur cinq langues, donc de
 *    normaliser accents et casse par locale — `toLocaleLowerCase` sans locale
 *    casse en turc, et l'app n'a aucun index de texte). Le repli par groupe est
 *    la moitié utile, livrée maintenant.
 *  · LE GROUPE « SAISONS » EST LE SEUL À LIRE LE RÉSEAU. `SeasonStatus`
 *    (features/season, LECTURE SEULE ici) porte ses quatre états lui-même —
 *    chargement / active / aucune / échec + « Réessayer ». Le reste de l'écran
 *    est du contenu statique : il n'a NI chargement NI échec, et n'en simule
 *    aucun. La lecture ne part qu'à l'ouverture du groupe : tant qu'il est
 *    replié, l'écran ne demande rien au serveur.
 *  · AUCUN EVENT §8 SUR LE FILTRE NI SUR L'OUVERTURE D'UN GROUPE : il n'en
 *    existe pas dans `packages/shared/src/events.ts` et on n'en invente pas.
 *    Seul `screen('faq_calculs')` est émis.
 *  · PAS DE CTA CHARTREUSE : cet écran ne demande aucune décision. Le seul
 *    bouton possible (« Réessayer » de `SeasonStatus`) est un ghost.
 *
 * i18n : contenu et libellés arrivent en `Entry` 5 langues (content.ts +
 * catalogues explain/faq) et sont résolus ICI via t() — bascule instantanée.
 * Les valeurs de règles sont déjà dérivées des CONSTANTES game-rules.ts
 * (labels.ts, SEASON_DURATION_WEEKS, INTERSEASON_DAYS) : AUCUN nombre magique.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import {
  borderState,
  colors,
  iconSizes,
  INTERSEASON_DAYS,
  SEASON_DURATION_WEEKS,
  sizes,
  spacing,
  typography,
  type IconName,
} from '@klaim/shared';
import {
  FAQ_CATEGORY_LABELS,
  FAQ_ITEMS,
  POST_RUN_FAQ,
  type FaqCategory,
  type SchemaId,
} from '../src/features/explain/content';
import { ExplainSchema } from '../src/features/explain/ExplainSchema';
import {
  ACCORDION_ALL_CLOSED,
  buildFaqOutline,
  resolveAccordion,
  toggleGroup,
  toggleItem,
  type ExplainAccordion,
} from '../src/features/explain/faqOutline';
import { SeasonStatus } from '../src/features/season/SeasonStatus';
import { C } from '../src/i18n/catalog/explain';
// Catalogue SAISON (horodateur + règles) : voir src/i18n/catalog/faq.ts.
import { C as S } from '../src/i18n/catalog/faq';
import { useT } from '../src/i18n/store';
import { screen } from '../src/lib/analytics';
import { IconPlate } from '../src/ui/Card';
import { Icon } from '../src/ui/Icon';
import { SectionLabel } from '../src/ui/SectionLabel';
import { Segmented } from '../src/ui/game/Segmented';
import { StackScreen } from '../src/ui/StackScreen';

// Android : activer l'animation de layout douce à l'ouverture d'un accordéon.
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Ordre d'affichage des catégories (les Q/R du §33 sont réparties dedans). */
const CATEGORY_ORDER: readonly FaqCategory[] = [
  'zones',
  'defense',
  'crew',
  'verify',
  'economie',
];

/** Identifiants des deux groupes qui ne viennent pas des catégories §33. */
const SEASON_GROUP = 'season';
const POST_RUN_GROUP = 'postrun';

/** Largeur des schémas dans un accordéon (mesure de composition : ils sont
 *  indentés sous la question, pas pleine largeur). */
const FAQ_SCHEMA_WIDTH = 260;

/** Indentation des réponses : elles s'alignent sous le TEXTE de la question,
 *  pas sous son icône (plaque `sm` 32 + gouttière `sm` 12). */
const ANSWER_INDENT = 32 + spacing.sm;

/** Respiration avant la note de pied — elle doit se lire comme un après-propos,
 *  pas comme une dernière ligne de liste (mesure de composition). */
const FOOTNOTE_GAP = 28;

/** Une question résolue : tout est déjà traduit, la ligne ne fait que rendre. */
interface FaqRow {
  id: string;
  icon: IconName;
  q: string;
  a: string;
  schemaId?: SchemaId;
}

/** Un groupe du sommaire, résolu : libellé traduit + ses questions. */
interface FaqGroupView {
  id: string;
  label: string;
  items: readonly FaqRow[];
  /** Rendu AVANT les questions quand le groupe est ouvert (état réel Saison). */
  lead?: 'season';
}

/** Une question : ligne scannable au repos, réponse + schéma au tap. */
function AccordionRow({
  row,
  open,
  last,
  onToggle,
}: {
  row: FaqRow;
  open: boolean;
  /** Dernière question du groupe : pas de filet (il flotterait sous le groupe). */
  last: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={last ? undefined : styles.rowDivided}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={row.q}
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={({ pressed }) => [styles.rowHead, pressed && styles.pressed]}
      >
        <IconPlate icon={row.icon} size="sm" />
        {/* Aucun `numberOfLines` : une question s'enroule, elle ne se coupe pas. */}
        <Text style={styles.q}>{row.q}</Text>
        <View style={open ? styles.chevronOpen : undefined}>
          <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
        </View>
      </Pressable>
      {open ? (
        <View style={styles.answer}>
          <Text style={styles.a}>{row.a}</Text>
          {row.schemaId ? (
            <View style={styles.schemaWrap}>
              <ExplainSchema id={row.schemaId} width={FAQ_SCHEMA_WIDTH} />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function FaqScreen() {
  const t = useT();
  const [open, setOpen] = useState<ExplainAccordion>(ACCORDION_ALL_CLOSED);
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    screen('faq_calculs');
  }, []);

  // Une seule animation pour les deux niveaux : ouvrir un groupe et déplier une
  // réponse sont le même geste (« détails au tap »).
  const animate = () =>
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

  const onGroup = (id: string) => {
    animate();
    setOpen((cur) => toggleGroup(cur, id));
  };
  const onItem = (id: string) => {
    animate();
    setOpen((cur) => toggleItem(cur, id));
  };

  // Le sommaire : catégories §33 filtrées (fonction PURE testée), puis les deux
  // groupes qui n'en viennent pas — Saisons et « Après une course ».
  const groups = useMemo<readonly FaqGroupView[]>(() => {
    const fromCategories = buildFaqOutline(FAQ_ITEMS, CATEGORY_ORDER, advanced).map(
      (group): FaqGroupView => ({
        id: group.id,
        label: t(FAQ_CATEGORY_LABELS[group.id]),
        items: group.items.map((item) => ({
          id: item.id,
          icon: item.icon,
          q: t(item.q),
          a: t(item.a),
          schemaId: item.schemaId,
        })),
      }),
    );

    // Règles des SAISONS : chiffres depuis game-rules (SEASON_DURATION_WEEKS /
    // INTERSEASON_DAYS), jamais en dur. « Comment marche une saison » se lit
    // ici ; « où on en est » est rendu par SeasonStatus, en tête du groupe.
    const season: FaqGroupView = {
      id: SEASON_GROUP,
      label: t(S.sGroup),
      lead: 'season',
      items: [
        { id: 'season_how', icon: 'sablier', q: t(S.sQHow), a: t(S.sAHow, { weeks: SEASON_DURATION_WEEKS }) },
        { id: 'season_end', icon: 'pass', q: t(S.sQEnd), a: t(S.sAEnd, { days: INTERSEASON_DAYS }) },
        { id: 'season_between', icon: 'sablier', q: t(S.sQBetween), a: t(S.sABetween, { days: INTERSEASON_DAYS }) },
      ],
    };

    // FAQ courte post-run (§34) : questions express après une course.
    const postRun: FaqGroupView = {
      id: POST_RUN_GROUP,
      label: t(C.faqPostRunGroup),
      items: POST_RUN_FAQ.map((item) => ({
        id: `post_${item.id}`,
        icon: item.icon,
        q: t(item.q),
        a: t(item.a),
        schemaId: item.schemaId,
      })),
    };

    return [...fromCategories, season, postRun];
  }, [advanced, t]);

  // L'état mémorisé ne peut pas ressusciter une ligne que le filtre a masquée.
  const shown = resolveAccordion(open, groups);

  return (
    <StackScreen
      title={t(C.faqTitle)}
      icon="aide"
      kicker={t(C.faqKicker)}
      subtitle={t(C.faqSubtitle)}
    >
      {/* Niveau de lecture. `tone="surface"` : un filtre ne dépense pas l'accent. */}
      <Segmented
        style={styles.segmented}
        accessibilityLabel={t(C.faqKicker)}
        options={[
          { id: 'simple', label: t(C.faqSimple) },
          { id: 'advanced', label: t(C.faqAdvanced) },
        ]}
        value={advanced ? 'advanced' : 'simple'}
        onChange={(id) => {
          animate();
          setAdvanced(id === 'advanced');
        }}
        tone="surface"
      />

      {groups.map((group) => {
        const isOpen = shown.group === group.id;
        const count = group.items.length;
        const countLabel =
          count === 1 ? t(C.faqGroupQuestion, { n: count }) : t(C.faqGroupQuestions, { n: count });
        return (
          <View key={group.id} style={styles.group}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${group.label} · ${countLabel}`}
              accessibilityState={{ expanded: isOpen }}
              onPress={() => onGroup(group.id)}
              style={({ pressed }) => [styles.groupHead, pressed && styles.pressed]}
            >
              <SectionLabel style={styles.groupLabel}>{group.label}</SectionLabel>
              {/* Le compte est la seule valeur de cette ligne, et il est RÉEL :
                  c'est le nombre de questions que le tap va ouvrir, filtre
                  Simple/Avancé déjà appliqué. */}
              <Text style={styles.groupCount}>{countLabel}</Text>
              <View style={isOpen ? styles.chevronOpen : undefined}>
                <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
              </View>
            </Pressable>
            {isOpen ? (
              <View>
                {/* Saisons : l'état RÉEL d'abord, les règles ensuite. Une page
                    qui explique une saison de {weeks} semaines sans dire
                    qu'aucune n'est ouverte laisserait croire qu'il y en a une. */}
                {group.lead === 'season' ? (
                  <View style={styles.lead}>
                    <SeasonStatus />
                  </View>
                ) : null}
                {group.items.map((row, i) => (
                  <AccordionRow
                    key={row.id}
                    row={row}
                    open={shown.item === row.id}
                    last={i === group.items.length - 1}
                    onToggle={() => onItem(row.id)}
                  />
                ))}
              </View>
            ) : null}
          </View>
        );
      })}

      <Text style={styles.footnote}>{t(C.faqFootnote)}</Text>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  segmented: { marginTop: spacing.md, marginBottom: spacing.xs },

  group: { marginTop: spacing.xl },
  // En-tête de groupe : kicker + compte + chevron, sur un plancher tactile.
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.touchTarget,
  },
  groupLabel: { flex: 1 },
  groupCount: { ...typography.meta, color: colors.gris, fontVariant: ['tabular-nums'] },

  // Une question = une ligne posée sur le fond. Le filet ne sépare que des
  // lignes VOISINES : la dernière du groupe n'en porte pas (sinon un trait
  // flotterait au-dessus du label du groupe suivant).
  rowDivided: { borderBottomWidth: 1, borderBottomColor: borderState.hairline },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.touchTarget,
    paddingVertical: spacing.md,
  },
  pressed: { opacity: 0.6 },
  q: { ...typography.itemTitle, flex: 1, color: colors.blanc },
  chevronOpen: { transform: [{ rotate: '90deg' }] },

  lead: { marginBottom: spacing.xs },
  answer: { paddingBottom: spacing.md, paddingLeft: ANSWER_INDENT },
  a: { ...typography.body, color: colors.gris },
  schemaWrap: { alignItems: 'center', marginTop: spacing.md },

  // Note de pied : texte de lecture (pas un micro-label), donc rôle `body`.
  footnote: { ...typography.body, color: colors.gris, marginTop: FOOTNOTE_GAP },
});
