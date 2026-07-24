/**
 * GRYD — LE SÉLECTEUR DE VILLE. UN SEUL, pour les trois endroits qui en ont un.
 *
 * « Dans la création de crew on doit pouvoir choisir n'importe quelle ville. »
 * Avant ce fichier il y avait TROIS façons de choisir une ville, qui ne disaient
 * pas la même chose : une rangée de pills (création de crew — illisible dès 8
 * villes, requête non bornée), une recherche maison bornée à 3 lignes
 * (onboarding), et un CHAMP DE TEXTE LIBRE (profil) qui acceptait « Pariss ».
 * Il n'y en a plus qu'un, et il est ici.
 *
 * ─── TROIS PRÉSENTATIONS, UN SEUL SÉLECTEUR ────────────────────────────────
 *  · `CitySearch`      — le bloc réutilisable : champ + liste bornée + états.
 *  · `CityPickerModal` — le même bloc en plein écran (§A1 : une décision à la
 *                        fois — on ne fait pas cohabiter une liste de 25 villes
 *                        avec un formulaire de création de crew).
 *  · `CityField`       — la ligne « Ville · Paris (FR) » qui ouvre la modale.
 *
 * ─── CE QUE CET ÉCRAN A LE DROIT D'AFFIRMER ────────────────────────────────
 * Deux faits, tous deux LUS :
 *  1. cette ville est-elle OUVERTE (présente dans `city_zones`) ;
 *  2. combien de crews s'y trouvent (comptage `crews`) — DES CREWS, pas des
 *     coureurs : la capture n'exige aucun crew, une ville peut avoir des solos
 *     et zéro crew. On énonce le chiffre lu, jamais ce qu'on en déduit.
 * Rien d'autre. Pas de classement, pas de territoire, pas de rival, pas de
 * densité, pas de population — le référentiel la connaît, elle ordonne la
 * recherche et ne sort jamais du moteur (`CityEntry` ne la porte même pas).
 *
 * ─── ET UNE VILLE PAS ENCORE OUVERTE ? ELLE S'OUVRE ────────────────────────
 * C'était le cul-de-sac : 7 870 villes proposées, 2 ouvertes, et chercher
 * « Zurich » ne menait qu'à une puce « Pas encore ouverte ». Le sélecteur
 * appelle désormais `open_city` (Edge Function, migration 0066) — la seule
 * fonction qui puisse écrire `city_zones`. Le geste est EXPLICITE et il DIT ce
 * qu'il crée : une aire de jeu APPROXIMATIVE (un disque de CITY_DISC_RADIUS_M
 * autour du point du référentiel), jamais « les limites de la ville ».
 *
 * ─── ET LES ÉTATS ─────────────────────────────────────────────────────────
 * Lecture en cours / pas connecté / lecture échouée / lu et vide sont QUATRE
 * phrases distinctes, jamais un « 0 » nu ni un spinner sans fin. L'ouverture a
 * les siennes, tout aussi distinctes : en cours / échouée (avec réessai) /
 * aboutie. Un échec d'ouverture ne se confond ni avec « pas encore ouverte »
 * (l'état d'avant, qui reste vrai) ni avec un succès. Et là où l'ouverture est
 * impossible — pas de session, donc un 401 garanti — AUCUN bouton n'est peint :
 * un bouton qui échoue toujours est un mensonge, son absence n'en est pas un.
 */
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CITY_DISC_RADIUS_M,
  CITY_OPEN_LIMIT_PER_USER,
  CITY_SEARCH_RESULT_LIMIT,
  colors,
  fontSizes,
  iconSizes,
  radii,
  sizes,
  spacing,
  typography,
} from '@klaim/shared';
import { C } from '../../i18n/catalog/city';
import { useT } from '../../i18n/store';
import { EVENTS, track } from '../../lib/analytics';
import { haptics } from '../../lib/haptics';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { cityEntryLabel, findCityEntry, searchCityEntries, type CityEntry } from './catalog';
import { useCityActivity, useCityCatalog, type CityCatalog } from './useCityCatalog';
import { useOpenCity, type OpenCityController } from './useOpenCity';

/**
 * Rayon de l'aire de jeu, en kilomètres, tel que l'écran l'ÉCRIT. Dérivé de la
 * constante de jeu (`CITY_DISC_RADIUS_M`, game-rules) — écrire « 15 » dans une
 * phrase serait un nombre magique de plus, et la phrase mentirait le jour où le
 * rayon changerait.
 */
const CITY_DISC_RADIUS_KM = Math.round(CITY_DISC_RADIUS_M / 1000);

/**
 * Où vit ce sélecteur, et donc à qui appartient le CTA chartreuse de l'écran.
 *  · `fullscreen` — la modale : choisir une ville est LA décision, l'ouverture
 *    peut donc porter l'unique bouton chartreuse (§A4) ;
 *  · `inline` — encastré dans un écran qui a déjà son CTA (l'étape ville de
 *    l'onboarding et son « Continuer avec … »). Deux boutons chartreuse sur un
 *    écran, c'est deux décisions : l'ouverture prend ici la variante `raised`.
 */
export type CityPickerPlacement = 'inline' | 'fullscreen';

export type { CityEntry } from './catalog';

/**
 * Le bloc de recherche. Contrôlé : il ne persiste rien, il REND un choix.
 *
 * `openOnly` sert la création de crew : le serveur refuse une ville non ouverte
 * (`bad_city`, 0050:466), donc on ne laisse pas le joueur en choisir une pour
 * découvrir l'échec après coup. Les villes non ouvertes restent VISIBLES et
 * expliquées — les cacher ferait croire qu'elles n'existent pas, alors qu'elles
 * existent ; c'est l'aire de jeu qui manque, et la nuance est exactement ce que
 * le joueur a besoin de comprendre.
 */
export function CitySearch({
  catalog,
  selectedId,
  onSelect,
  onSelectStay,
  openOnly = false,
  placement = 'inline',
}: {
  catalog: CityCatalog;
  selectedId: string | null;
  onSelect: (city: CityEntry) => void;
  /**
   * Choisir une ville SANS refermer le sélecteur. Sert au seul cas où la
   * fermeture serait une perte : venir d'OUVRIR une ville. La modale se referme
   * sur un choix — mais si elle se refermait aussi sur une ouverture, la phrase
   * qui dit ce qui vient d'être créé (« aire de jeu approximative de 15 km »)
   * ne serait jamais lue par personne. Défaut : `onSelect`.
   */
  onSelectStay?: (city: CityEntry) => void;
  openOnly?: boolean;
  placement?: CityPickerPlacement;
}) {
  const t = useT();
  const [query, setQuery] = useState('');
  const results = useMemo(
    () => searchCityEntries(catalog.index, query, CITY_SEARCH_RESULT_LIMIT),
    [catalog.index, query],
  );

  /**
   * LA VILLE REGARDÉE — pas forcément la ville CHOISIE.
   *
   * En création de crew, une ville non ouverte n'est pas choisissable (le
   * serveur la refuse, `bad_city`) : la taper ne peut donc pas la « choisir ».
   * Mais il faut bien pouvoir la regarder pour l'OUVRIR — sans ça, l'action qui
   * débloque tout serait inaccessible. Ce `tappedId` porte donc l'attention,
   * `selectedId` porte la décision, et les deux ne sont pas le même fait.
   */
  const [tappedId, setTappedId] = useState<string | null>(null);
  const focusId = tappedId ?? selectedId;
  const focused = findCityEntry(catalog.index, focusId);
  const activity = useCityActivity(focused?.cityId ?? null, focused?.status === 'open');

  /**
   * L'OUVERTURE, tenue à CE niveau et pas dans la note : elle décide aussi si
   * une ligne non ouverte mène quelque part (`canOpen`), et une ligne ne doit
   * jamais se laisser taper pour ne rien produire.
   */
  const opener = useOpenCity();
  // Changer de ville regardée efface le verdict de la précédente : un « ça n'a
  // pas abouti » qui survivrait à un changement de ville parlerait d'une autre.
  useEffect(() => opener.reset(), [focusId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openThisCity = async (city: CityEntry) => {
    haptics.light();
    const outcome = await opener.open(city.cityId);
    if (!outcome.ok) return; // l'état `failed` porte la phrase et le réessai
    // Émis depuis le VERDICT serveur, pas depuis le tap : `created` distingue une
    // zone qu'on vient de provisionner d'une ville déjà ouverte re-sélectionnée.
    track(EVENTS.cityOpened, { created: outcome.value.zoneCreated, source: 'manual' });
    track(EVENTS.citySelected, { was_open: !outcome.value.zoneCreated });
    // La ligne existe : le SERVEUR vient de la relire (`ok: true` ⇒ `city_zones`
    // porte la ville). On relance quand même la lecture du catalogue — la liste
    // affichée doit rester une lecture, pas une déduction — et on rend la ville
    // à l'appelant avec le statut que le serveur vient de confirmer.
    catalog.reload();
    (onSelectStay ?? onSelect)({ ...city, status: 'open' });
  };

  /**
   * SAIT-ON ce qui est ouvert ? Tant que la lecture n'a pas abouti, TOUTES les
   * villes ressortent `referenced` — c'est le comportement voulu de l'index (on
   * n'affirme rien sans avoir lu), mais l'afficher tel quel peindrait « Pas
   * encore ouverte » SUR PARIS, qui l'est. Une puce est une affirmation : sans
   * lecture, il n'y en a aucune, et la ligne d'état dit pourquoi.
   */
  const known = catalog.state === 'ready';

  /**
   * CRÉATION DE CREW SANS SAVOIR CE QUI EST OUVERT : on ne montre pas une liste
   * dans laquelle aucun choix ne peut aboutir. Un seul état, une seule phrase
   * (§A1) — et un bouton « Réessayer » quand c'est la lecture qui a échoué.
   */
  if (openOnly && !known) {
    return (
      <View style={styles.searchBlock}>
        <CatalogStatus catalog={catalog} />
        {/* … MAIS on n'efface pas ce qui vient d'arriver. Ouvrir une ville
            relance la lecture du catalogue, donc repasse par « lecture en
            cours » : sans cette ligne, la confirmation de l'ouverture aurait
            clignoté une fraction de seconde avant de disparaître. */}
        <OpenCityPanel
          opener={opener}
          offer={false}
          placement={placement}
          // Le réessai reste RÉEL même ici : un bouton qui ne fait rien serait
          // un bouton mort, et l'échec s'affiche aussi dans cette branche.
          onOpen={() => {
            if (focused) void openThisCity(focused);
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.searchBlock}>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder={t(C.searchPlaceholder)}
        placeholderTextColor={colors.gris}
        autoCorrect={false}
        autoCapitalize="words"
        returnKeyType="search"
        accessibilityLabel={t(C.searchPlaceholder)}
      />
      <Text style={styles.hint}>{t(C.searchHint)}</Text>

      {/* L'ÉTAT DE LA LECTURE SERVEUR, dit avant la liste : sans lui, une liste
          où rien n'est marqué « Ouverte » se lirait « GRYD est fermé ». */}
      <CatalogStatus catalog={catalog} />

      <ScrollView
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {results.length === 0 ? (
          // ZÉRO RÉSULTAT — et POURQUOI. « Aucune ville de ce nom en Europe »
          // était faux : le référentiel s'arrête à 15 000 habitants (692
          // communes françaises sur ~35 000) et ne porte qu'un nom par ville.
          // Quelqu'un de Vitré en concluait que sa ville n'existe pas.
          <>
            <Text style={styles.note}>{t(C.noMatch)}</Text>
            <Text style={styles.note}>{t(C.noMatchExplain)}</Text>
          </>
        ) : (
          results.map((city) => (
            <CityRow
              key={`${city.status}:${city.cityId}`}
              city={city}
              known={known}
              selected={city.cityId === focusId}
              // Une ligne non ouverte ne mène nulle part SEULEMENT quand elle ne
              // peut pas non plus être ouverte (pas de session ⇒ 401 garanti).
              // Sinon elle mène à l'action qui débloque tout.
              disabled={openOnly && city.status !== 'open' && !opener.canOpen}
              onPress={() => {
                haptics.light();
                setTappedId(city.cityId);
                // En création de crew, une ville non ouverte ne peut pas être
                // CHOISIE (le serveur la refuserait) : elle est seulement
                // regardée, le temps de décider de l'ouvrir.
                if (!openOnly || city.status === 'open') {
                  // Choix RÉEL d'une ville déjà jouable. L'ouverture, elle, passe
                  // par le CTA (`openThisCity`) et logge son propre couple
                  // city_opened + city_selected — pas de double compte ici.
                  track(EVENTS.citySelected, { was_open: city.status === 'open' });
                  onSelect(city);
                }
              }}
            />
          ))
        )}
        {/* La liste est BORNÉE et le dit : sans cette ligne, 25 résultats
            laisseraient croire qu'il n'existe que 25 villes. */}
        {results.length >= CITY_SEARCH_RESULT_LIMIT || catalog.truncated ? (
          <Text style={styles.note}>{t(C.moreResults)}</Text>
        ) : null}
      </ScrollView>

      {/* CE QUE VAUT LA VILLE REGARDÉE — jamais affiché tant qu'il n'y en a pas. */}
      {focused ? <CitySelectionNote city={focused} known={known} activity={activity} /> : null}

      {/* … ET COMMENT L'OUVRIR quand elle ne l'est pas. */}
      {focused ? (
        <OpenCityPanel
          opener={opener}
          // On ne propose d'ouvrir que ce qu'on a LU comme non ouvert : sans
          // lecture aboutie, proposer d'ouvrir Paris serait affirmer qu'elle ne
          // l'est pas.
          offer={known && focused.status !== 'open'}
          placement={placement}
          onOpen={() => void openThisCity(focused)}
        />
      ) : null}
    </View>
  );
}

/** Les quatre états de la connaissance des villes ouvertes, chacun sa phrase. */
function CatalogStatus({ catalog }: { catalog: CityCatalog }) {
  const t = useT();
  if (catalog.state === 'loading') return <Text style={styles.note}>{t(C.statusLoading)}</Text>;
  if (catalog.state === 'signed_out') {
    return <Text style={styles.note}>{t(C.statusSignedOut)}</Text>;
  }
  if (catalog.state === 'failed') {
    return (
      <View style={styles.statusRow}>
        <Text style={styles.notice} accessibilityRole="alert">
          {t(C.statusFailed)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.retry)}
          onPress={catalog.reload}
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
        >
          <Text style={styles.retryLabel}>{t(C.retry)}</Text>
        </Pressable>
      </View>
    );
  }
  // `ready` avec zéro ville : un FAIT lu, pas une panne — et pas un « 0 » nu.
  if (catalog.openCount === 0) return <Text style={styles.note}>{t(C.statusNoneOpen)}</Text>;
  return null;
}

/**
 * Une ligne de résultat : nom + pays, et le statut de l'aire de jeu.
 *
 * `known` = a-t-on RÉELLEMENT lu `city_zones` ? Si non, la ligne ne porte AUCUNE
 * puce : « pas encore ouverte » serait une affirmation qu'on n'a pas vérifiée.
 */
function CityRow({
  city,
  known,
  selected,
  disabled,
  onPress,
}: {
  city: CityEntry;
  known: boolean;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const t = useT();
  const isOpen = city.status === 'open';
  const badge = known ? (isOpen ? t(C.badgeOpen) : t(C.badgeSoon)) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      // Le nom accessible porte le statut : un lecteur d'écran doit entendre la
      // même chose qu'un œil voit, y compris « pas encore ouverte ».
      accessibilityLabel={badge ? `${cityEntryLabel(city)} — ${badge}` : cityEntryLabel(city)}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        selected && styles.rowSelected,
        disabled && styles.rowDisabled,
        pressed && styles.pressed,
      ]}
    >
      {/* Le libellé ne se tronque PAS (§A) : il passe à la ligne. */}
      <Text style={[styles.rowName, selected && styles.rowNameSelected]}>
        {cityEntryLabel(city)}
      </Text>
      {badge ? (
        <View style={[styles.badge, isOpen ? styles.badgeOpen : styles.badgeSoon]}>
          <Text style={[styles.badgeText, isOpen && styles.badgeTextOpen]}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * OUVRIR UNE VILLE — le geste, ses états, et ce qu'il crée VRAIMENT.
 *
 * Trois affichages EXCLUSIFS, parce que trois faits différents :
 *  1. `opened` — le serveur a répondu. On dit ce qu'il a fait, et rien de plus :
 *     une aire de jeu APPROXIMATIVE (ou « elle était déjà ouverte » quand il n'a
 *     rien créé). Cette phrase survit à la relecture du catalogue, qui repasse
 *     par « lecture en cours » — sinon la confirmation aurait clignoté ;
 *  2. `failed` — on a essayé, ça n'a pas abouti. La cause quand le serveur l'a
 *     nommée, « réessaie » sinon. Jamais un faux diagnostic, jamais confondu
 *     avec « pas encore ouverte », qui reste vrai ;
 *  3. l'OFFRE — ce que l'ouverture créerait, puis le bouton.
 *
 * ⚠️ CE QUI N'EST JAMAIS AFFICHÉ : le `status: 'wild'` que la fonction renvoie.
 * C'est une ABSENCE de densité mesurée, pas un niveau ; le peindre en ferait un
 * état de jeu que personne n'a produit.
 *
 * Sans `canOpen` (pas de session ⇒ 401 garanti), AUCUN bouton n'est peint.
 */
function OpenCityPanel({
  opener,
  offer,
  placement,
  onOpen,
}: {
  opener: OpenCityController;
  offer: boolean;
  placement: CityPickerPlacement;
  onOpen: () => void;
}) {
  const t = useT();

  if (opener.state === 'opened') {
    const created = opener.result?.zoneCreated === true;
    // Le rayon AFFICHÉ est celui que le serveur a répondu quand il l'a répondu ;
    // à défaut, la constante de jeu. On n'invente pas une distance.
    const km = opener.result?.radiusM
      ? Math.round(opener.result.radiusM / 1000)
      : CITY_DISC_RADIUS_KM;
    return (
      <View style={styles.openBlock}>
        <Text style={styles.note} accessibilityRole="alert">
          {created ? t(C.openedCreated, { km }) : t(C.openedExisting)}
        </Text>
      </View>
    );
  }

  // L'ÉCHEC PARLE EN PREMIER, avant même le test de capacité : une session qui
  // tombe entre l'affichage et le tap fait basculer `canOpen` à false, et le
  // refus serait alors avalé en silence — le joueur aurait tapé sur un bouton
  // qui disparaît sans rien dire. Le bouton « Réessayer », lui, n'est peint que
  // s'il peut aboutir.
  if (opener.state === 'failed') {
    return (
      <View style={styles.openBlock}>
        <Text style={styles.notice} accessibilityRole="alert">
          {/* `{n}` n'est lu que par la phrase du plafond ; les autres l'ignorent. */}
          {opener.failure
            ? t(opener.failure, { n: CITY_OPEN_LIMIT_PER_USER })
            : t(C.openFailed)}
        </Text>
        {/* Un refus DÉFINITIF (ville inconnue, plafond atteint) ne se réessaie pas :
            peindre « Réessayer » dessus serait un bouton mort. */}
        {opener.canOpen && !opener.failureIsFinal ? (
          <Button label={t(C.retry)} onPress={onOpen} size="md" variant="raised" />
        ) : null}
      </View>
    );
  }

  if (!offer || !opener.canOpen) return null;

  return (
    <View style={styles.openBlock}>
      {/* CE QUE ÇA CRÉE, dit AVANT le tap : un disque approximatif, jamais « les
          limites de la ville ». C'est la phrase qui empêche l'app de mentir. */}
      <Text style={styles.note}>{t(C.openExplain, { km: CITY_DISC_RADIUS_KM })}</Text>
      <Button
        // Le libellé DIT l'attente plutôt que de laisser un spinner muet sur un
        // verbe d'action : « Ouverture en cours… » n'affirme rien du résultat.
        label={opener.state === 'opening' ? t(C.openBusy) : t(C.openCta)}
        onPress={onOpen}
        loading={opener.state === 'opening'}
        size="md"
        analyticsId="city_open" // §26 — ouvrir une ville : décision structurante du funnel

        // §A4 : un seul CTA chartreuse par écran. En plein écran, choisir une
        // ville EST la décision — l'ouverture peut le porter. Encastré, l'écran
        // hôte a déjà le sien (« Continuer avec … »).
        variant={placement === 'fullscreen' ? 'primary' : 'raised'}
      />
    </View>
  );
}

/**
 * La phrase sur la ville REGARDÉE. Elle n'énonce que du lu :
 *  · pas ouverte  → le fait, ce que l'ouverture créerait, et le geste ;
 *  · ouverte      → le comptage de crews, avec ses quatre états. Zéro crew se
 *                   dit « aucun crew ici pour l'instant », jamais un « 0 » nu,
 *                   et JAMAIS pendant le chargement.
 */
function CitySelectionNote({
  city,
  known,
  activity,
}: {
  city: CityEntry;
  known: boolean;
  activity: ReturnType<typeof useCityActivity>;
}) {
  const t = useT();
  // Sans lecture aboutie, on nomme la ville et on s'arrête là : ni « ouverte »,
  // ni « pas encore ouverte » — les deux seraient des affirmations non lues. Et
  // donc aucune proposition d'ouvrir : on ne sait même pas si c'est utile.
  if (!known) {
    return (
      <View style={styles.selectionNote}>
        <Text style={styles.selectionTitle}>{cityEntryLabel(city)}</Text>
      </View>
    );
  }
  if (city.status !== 'open') {
    return (
      <View style={styles.selectionNote}>
        <Text style={styles.selectionTitle}>{cityEntryLabel(city)}</Text>
        <Text style={styles.note}>{t(C.notOpenExplain)}</Text>
      </View>
    );
  }
  const line =
    activity.state === 'loading'
      ? t(C.countLoading)
      : activity.state === 'failed'
        ? t(C.countFailed)
        : activity.state === 'ready'
          ? activity.crewCount === 0
            ? t(C.emptyCity)
            : t(C.crewsHere, { n: activity.crewCount })
          : // `signed_out` / `idle` : on n'a rien lu, on n'affirme rien.
            null;
  return (
    <View style={styles.selectionNote}>
      <Text style={styles.selectionTitle}>{cityEntryLabel(city)}</Text>
      {line ? <Text style={styles.note}>{line}</Text> : null}
    </View>
  );
}

/**
 * Le sélecteur en PLEIN ÉCRAN. Il s'ouvre depuis un champ, il ne cohabite avec
 * aucun autre choix : une liste de villes et un formulaire sur le même écran,
 * c'est deux décisions à la fois (§A1).
 */
export function CityPickerModal({
  visible,
  catalog,
  selectedId,
  onSelect,
  onClose,
  openOnly = false,
}: {
  visible: boolean;
  /**
   * Le catalogue est REÇU, pas relu. La modale appelait `useCityCatalog()` de
   * son côté alors que le champ qui l'ouvre l'appelle déjà : deux lectures de
   * `city_zones` pour un seul champ, et deux états qui pouvaient diverger le
   * temps d'un aller-retour réseau (le champ « ouverte », la liste « on ne sait
   * pas »). Une seule lecture, un seul état.
   */
  catalog: CityCatalog;
  selectedId: string | null;
  onSelect: (city: CityEntry) => void;
  onClose: () => void;
  openOnly?: boolean;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.modal, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.modalHead}>
          <Text style={styles.modalTitle}>{t(C.pickerTitle)}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.close)}
            onPress={onClose}
            hitSlop={spacing.sm}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <Icon name="fermer" size={iconSizes.md} color={colors.blanc} />
          </Pressable>
        </View>
        <CitySearch
          catalog={catalog}
          selectedId={selectedId}
          openOnly={openOnly}
          // Plein écran : le sélecteur EST l'écran, l'ouverture peut porter son
          // unique CTA chartreuse (§A4).
          placement="fullscreen"
          onSelect={(city) => {
            onSelect(city);
            onClose();
          }}
          // Ouvrir une ville la choisit AUSSI — mais sans refermer : la modale
          // doit encore dire ce qui vient d'être créé. Le joueur repart quand il
          // l'a lu (croix, ou la ligne désormais « Ouverte »).
          onSelectStay={onSelect}
        />
      </View>
    </Modal>
  );
}

/**
 * La ligne « Ville » d'un formulaire. Elle montre le choix courant — nom RÉEL et
 * pays — et ouvre le sélecteur. Elle n'accepte aucune saisie libre : c'est
 * précisément ce qui produisait des villes qui n'existent pas.
 */
export function CityField({
  selectedId,
  onSelect,
  onClear,
  openOnly = false,
  note,
}: {
  selectedId: string | null;
  onSelect: (city: CityEntry) => void;
  /** Fourni ⇒ la ville est facultative et peut être retirée (champ de profil). */
  onClear?: () => void;
  openOnly?: boolean;
  /** Phrase de contexte propre à l'écran appelant (ex. « ne décide d'aucune capture »). */
  note?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const catalog = useCityCatalog();
  const selected = findCityEntry(catalog.index, selectedId);

  return (
    <View>
      <Text style={styles.fieldLabel}>{t(C.fieldLabel)}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          selected ? `${t(C.changeCity)} — ${cityEntryLabel(selected)}` : t(C.choosePrompt)
        }
        onPress={() => {
          haptics.light();
          setOpen(true);
        }}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}
      >
        <Text style={selected ? styles.fieldValue : styles.fieldPlaceholder}>
          {selected ? cityEntryLabel(selected) : t(C.choosePrompt)}
        </Text>
        <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
      </Pressable>

      {/*
        UN IDENTIFIANT CHOISI QUI N'EST PLUS DANS L'INDEX. Ça arrive pour de bon :
        avant que le serveur ait répondu, et si la lecture échoue. On ne peut ni
        le nommer ni le taire — l'écran dit alors l'état de la LECTURE, ce qui
        est vrai dans les deux cas.
      */}
      {selectedId && !selected ? <CatalogStatus catalog={catalog} /> : null}
      {note ? <Text style={styles.hint}>{note}</Text> : null}

      {selected && onClear ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.clearCity)}
          onPress={onClear}
          style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
        >
          <Text style={styles.clearLabel}>{t(C.clearCity)}</Text>
        </Pressable>
      ) : null}

      <CityPickerModal
        visible={open}
        catalog={catalog}
        selectedId={selectedId}
        openOnly={openOnly}
        onSelect={onSelect}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchBlock: { flex: 1, gap: spacing.sm },
  input: {
    height: sizes.buttonMd,
    borderRadius: radii.control,
    backgroundColor: colors.carbone2,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: spacing.md,
    color: colors.blanc,
    fontSize: fontSizes.md,
  },
  hint: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 18 },
  note: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 18 },
  notice: { color: colors.blanc, fontSize: fontSizes.xs, lineHeight: 18, flexShrink: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  retry: {
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  retryLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  list: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: sizes.touchTarget,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
    marginBottom: spacing.xs,
  },
  rowSelected: { borderColor: colors.chartreuse, backgroundColor: colors.chartreuse14 },
  rowDisabled: { opacity: 0.55 },
  // `flexShrink` + pas de `numberOfLines` : un nom long passe à la ligne, il
  // n'est JAMAIS coupé par « … » (§A).
  rowName: { color: colors.blanc, fontSize: fontSizes.md, flexShrink: 1 },
  rowNameSelected: { fontWeight: '600' },
  badge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderWidth: 1,
  },
  // Chartreuse sur fond SOMBRE uniquement (jamais sur clair — contraste 1,2:1).
  badgeOpen: { borderColor: colors.chartreuse, backgroundColor: 'transparent' },
  badgeSoon: { borderColor: colors.grisLigne, backgroundColor: 'transparent' },
  badgeText: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  badgeTextOpen: { color: colors.chartreuse },
  selectionNote: {
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
    paddingTop: spacing.sm,
    gap: spacing.xxs,
  },
  // Le bloc d'ouverture n'est PAS une carte dans une carte (§A) : pas de fond,
  // pas de bordure — il prolonge la note de sélection, séparé par l'espace seul.
  openBlock: { gap: spacing.sm },
  selectionTitle: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  modal: {
    flex: 1,
    backgroundColor: colors.noir,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { ...typography.title, color: colors.blanc },
  close: {
    minWidth: sizes.touchTarget,
    minHeight: sizes.touchTarget,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  fieldLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    marginBottom: spacing.xxs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: sizes.buttonMd,
    paddingHorizontal: spacing.md,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone2,
  },
  fieldValue: { color: colors.blanc, fontSize: fontSizes.md, flexShrink: 1 },
  fieldPlaceholder: { color: colors.gris, fontSize: fontSizes.md, flexShrink: 1 },
  clear: { minHeight: sizes.touchTarget, justifyContent: 'center' },
  clearLabel: { color: colors.gris, fontSize: fontSizes.sm },
  pressed: { opacity: 0.85 },
});
