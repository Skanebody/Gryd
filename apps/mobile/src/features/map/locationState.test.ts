/**
 * GRYD — tests du CUL-DE-SAC MUET de la carte (défaut « majeur » du 21/07/2026).
 *
 * Ce que ces tests verrouillent, dans l'ordre où le bug se produisait :
 *   1. permission ACCORDÉE + fix absent ⇒ `unavailable` (et JAMAIS une sortie
 *      silencieuse) — c'est le cas où l'écran ne posait rien : ni point « moi »,
 *      ni message, ni retour visible au tap sur Recentrer ;
 *   2. un échec SANS RAPPORT avec la permission n'est jamais requalifié en
 *      `denied` — c'est le mislabel Safari (pas de Permissions API pour la
 *      géoloc ⇒ statut `undetermined`, que l'ancien code lisait « refusé ») ;
 *   3. `undetermined` n'est pas un refus : on TENTE la position.
 *
 * Module PUR (le provider est injecté) : testable sans navigateur ni device —
 * ce qui compte, les builds EAS étant bloqués par le quota Expo jusqu'au 1er août.
 */
import { assertEquals } from 'jsr:@std/assert@1';
import {
  MAP_ACCESS_STATES,
  MAP_DATA_STATES,
  mapPlan,
  resolveLocation,
  type MapAccessState,
  type MapDataState,
  type MapLens,
  type MapLocationProvider,
  type MapPlan,
} from './locationState.ts';
import { C } from '../../i18n/catalog/map.ts';
import { LOCALES, resolve } from '../../i18n/types.ts';

const FIX = { lat: 49.87, lng: 1.02 };

type Perm = Awaited<ReturnType<MapLocationProvider['checkForegroundPermission']>>;

/** Provider factice : on décrit l'état de permission et ce que rend le capteur. */
function provider(opts: {
  check: Perm;
  request?: Perm;
  fix?: { lat: number; lng: number } | null;
  onRequest?: () => void;
  onPosition?: () => void;
}): MapLocationProvider {
  return {
    checkForegroundPermission: () => Promise.resolve(opts.check),
    requestForegroundPermission: () => {
      opts.onRequest?.();
      return Promise.resolve(opts.request ?? opts.check);
    },
    getCurrentPositionOnce: () => {
      opts.onPosition?.();
      return Promise.resolve(opts.fix ?? null);
    },
  };
}

Deno.test('permission accordée + fix : état ok et point posé', async () => {
  const out = await resolveLocation(
    provider({ check: { status: 'granted', canAskAgain: false }, fix: FIX }),
  );
  assertEquals(out.state, 'ok');
  assertEquals(out.point, FIX);
});

Deno.test('CUL-DE-SAC MUET : permission accordée mais AUCUN fix ⇒ unavailable, jamais un silence', async () => {
  // Reproduction du défaut : iOS avec la localisation coupée au niveau système,
  // ou GPS froid en intérieur au-delà du délai. L'ancien code faisait
  // `if (!fix) return;` — aucun état posé, donc aucune phrase à l'écran et un
  // bouton Recentrer sans effet visible.
  const out = await resolveLocation(
    provider({ check: { status: 'granted', canAskAgain: false }, fix: null }),
  );
  assertEquals(out.state, 'unavailable');
  assertEquals(out.point, null);
  // Surtout PAS 'denied' : on n'impute pas à l'utilisateur un refus qu'il n'a
  // pas prononcé (la copie affichée en dépend : « Position introuvable » vs
  // « Active la localisation »).
  assertEquals(out.state === 'denied', false);
});

Deno.test('MISLABEL SAFARI : statut undetermined + échec capteur ⇒ unavailable, pas denied', async () => {
  // Safari n'implémente pas navigator.permissions.query({name:'geolocation'}) :
  // après une invite ACCEPTÉE, checkForegroundPermission répond `undetermined`.
  // L'ancien appelant réduisait tout ça à un booléen `granted` et affichait
  // « Active la localisation » à quelqu'un qui venait de l'autoriser.
  let requested = 0;
  let positioned = 0;
  const out = await resolveLocation(
    provider({
      check: { status: 'undetermined', canAskAgain: true },
      request: { status: 'undetermined', canAskAgain: true },
      fix: null,
      onRequest: () => (requested += 1),
      onPosition: () => (positioned += 1),
    }),
  );
  assertEquals(requested, 1, 'la permission doit être DEMANDÉE quand on peut encore le faire');
  assertEquals(positioned, 1, 'undetermined n’est pas un refus : on TENTE la position');
  assertEquals(out.state, 'unavailable');
});

Deno.test('undetermined + invite acceptée ⇒ ok (la porte ne se ferme pas sur un statut illisible)', async () => {
  const out = await resolveLocation(
    provider({
      check: { status: 'undetermined', canAskAgain: true },
      request: { status: 'granted', canAskAgain: false },
      fix: FIX,
    }),
  );
  assertEquals(out.state, 'ok');
  assertEquals(out.point, FIX);
});

Deno.test('refus EXPLICITE ⇒ denied, et on ne sollicite pas le capteur pour rien', async () => {
  let positioned = 0;
  const out = await resolveLocation(
    provider({
      check: { status: 'denied', canAskAgain: false },
      fix: FIX,
      onPosition: () => (positioned += 1),
    }),
  );
  assertEquals(out.state, 'denied');
  assertEquals(out.point, null);
  assertEquals(positioned, 0);
});

Deno.test('refus prononcé À L’INVITE ⇒ denied (et pas une tentative de position derrière)', async () => {
  let positioned = 0;
  const out = await resolveLocation(
    provider({
      check: { status: 'undetermined', canAskAgain: true },
      request: { status: 'denied', canAskAgain: false },
      fix: FIX,
      onPosition: () => (positioned += 1),
    }),
  );
  assertEquals(out.state, 'denied');
  assertEquals(positioned, 0);
});

Deno.test('déjà accordée : on ne redemande JAMAIS la permission', async () => {
  let requested = 0;
  await resolveLocation(
    provider({
      check: { status: 'granted', canAskAgain: true },
      fix: FIX,
      onRequest: () => (requested += 1),
    }),
  );
  assertEquals(requested, 0);
});

Deno.test('refusée et non redemandable : aucune invite, mais un état affirmable quand même', async () => {
  let requested = 0;
  const out = await resolveLocation(
    provider({
      check: { status: 'denied', canAskAgain: false },
      fix: null,
      onRequest: () => (requested += 1),
    }),
  );
  assertEquals(requested, 0);
  assertEquals(out.state, 'denied');
});

Deno.test('resolveLocation ne renvoie JAMAIS « rien » : chaque issue a son état', async () => {
  // Le contrat structurel : trois états affirmables, 'locating' n'en fait pas
  // partie (c'est l'état AVANT l'appel, posé par l'écran). Aucun chemin ne peut
  // rendre undefined — c'est ce qui interdit le retour du cul-de-sac muet.
  const cases: MapLocationProvider[] = [
    provider({ check: { status: 'granted', canAskAgain: false }, fix: FIX }),
    provider({ check: { status: 'granted', canAskAgain: false }, fix: null }),
    provider({ check: { status: 'denied', canAskAgain: false } }),
    provider({ check: { status: 'undetermined', canAskAgain: true }, fix: null }),
    provider({ check: { status: 'undetermined', canAskAgain: false }, fix: FIX }),
  ];
  for (const p of cases) {
    const out = await resolveLocation(p);
    assertEquals(
      ['ok', 'denied', 'unavailable'].includes(out.state),
      true,
      `état non affirmable : ${out.state}`,
    );
    // Un point n'est posé QUE dans l'état ok : jamais de position sans fix réel.
    assertEquals(out.point !== null, out.state === 'ok');
  }
});

Deno.test('les 4 phrases de localisation : distinctes, traduites, et COMPACTES (§A)', () => {
  // La pill fait ~86 % d'un écran de 375 px : au-delà de 38 caractères elle
  // rétrécit sa police sous le plancher a11y ou repasse sur deux lignes. Même
  // plafond que `dataNote` — les nouvelles phrases n'y échappent pas.
  const MAX = 38;
  const entries = [
    C.dataNoteLocating,
    C.dataNoteLocationDenied,
    C.dataNoteLocationUnavailable,
    C.dataNoteLocationStale,
  ];
  for (const locale of LOCALES) {
    const notes = entries.map((e) => resolve(e, locale));
    assertEquals(new Set(notes).size, entries.length, `${locale} : phrases confondues`);
    for (const note of notes) {
      assertEquals(note.length > 0, true, `${locale} : phrase vide`);
      assertEquals(
        note.length <= MAX,
        true,
        `${locale} : « ${note} » = ${note.length} > ${MAX} caractères`,
      );
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// LA MATRICE « UN SEUL RÉCIT DOMINANT » (retour fondateur 25/07/2026)
//
// Ce bloc est le filet du livrable durable du lot : il balaie les 120
// combinaisons (accès × lentille × données × capacité réglages) et verrouille
// les invariants qui, s'ils cèdent, ramènent EXACTEMENT le défaut signalé —
// plusieurs récits concurrents, ou une alerte qui n'est qu'une phrase de plus.
// ═══════════════════════════════════════════════════════════════════════════

const LENSES: readonly MapLens[] = ['run', 'bike'];

/** Les trois récits qui parlent de POSITION — ceux que la barre ne doit jamais doubler. */
const LOCATION_NARRATIVES = ['grant-location', 'denied-location', 'retry-location'];

/** Balaie toutes les combinaisons et appelle `check` sur chacune. */
function forEveryCombination(
  check: (plan: MapPlan, input: {
    access: MapAccessState;
    lens: MapLens;
    data: MapDataState;
    canOpenSettings: boolean;
  }) => void,
): void {
  for (const access of MAP_ACCESS_STATES) {
    for (const lens of LENSES) {
      for (const data of MAP_DATA_STATES) {
        for (const canOpenSettings of [true, false]) {
          const input = { access, lens, data, canOpenSettings };
          check(mapPlan(input), input);
        }
      }
    }
  }
}

Deno.test('matrice : chaque combinaison rend UN récit, jamais deux ni zéro', () => {
  const known = new Set([
    'skeleton',
    'bike',
    'grant-location',
    'denied-location',
    'retry-location',
    'sign-in',
    'retry-data',
    'first-capture',
    'territory',
  ]);
  let seen = 0;
  forEveryCombination((plan, input) => {
    seen += 1;
    assertEquals(
      known.has(plan.narrative),
      true,
      `récit inconnu « ${plan.narrative} » pour ${JSON.stringify(input)}`,
    );
  });
  // 6 accès × 2 lentilles × 5 états de données × 2 capacités = 120.
  assertEquals(seen, 120);
});

Deno.test('matrice : la barre haute ne DOUBLE jamais le récit de la sheet', () => {
  // Deux fois le même message pour une seule situation, c'est la définition du
  // récit concurrent — et c'est ce que §A interdit.
  forEveryCombination((plan, input) => {
    if (plan.banner !== 'location') return;
    assertEquals(
      LOCATION_NARRATIVES.includes(plan.narrative),
      false,
      `barre ET récit parlent de position pour ${JSON.stringify(input)}`,
    );
  });
});

Deno.test('matrice : une barre d’alerte porte TOUJOURS une action réelle', () => {
  // « L'utilisateur n'a pas besoin d'une phrase, il a besoin d'une action
  // dirigée » : une barre ambre sans issue serait le défaut d'origine, en ambre.
  forEveryCombination((plan, input) => {
    if (plan.banner === 'none') {
      assertEquals(plan.bannerAction, 'none', `action orpheline sur ${JSON.stringify(input)}`);
      return;
    }
    assertEquals(
      plan.bannerAction !== 'none',
      true,
      `barre sans action sur ${JSON.stringify(input)}`,
    );
  });
});

Deno.test('matrice : jamais « ouvrir les réglages » là où la plateforme n’en a pas', () => {
  // Aucun bouton mort : sur web, aucune API ne mène aux réglages du navigateur.
  forEveryCombination((plan, input) => {
    if (input.canOpenSettings) return;
    for (const action of [plan.action, plan.secondary, plan.bannerAction]) {
      assertEquals(
        action === 'open-settings',
        false,
        `réglages proposés sans capacité sur ${JSON.stringify(input)}`,
      );
    }
  });
});

Deno.test('matrice : la lentille BIKE prime sur tout, et n’ouvre aucun CTA chartreuse', () => {
  forEveryCombination((plan, input) => {
    if (input.lens !== 'bike') return;
    assertEquals(plan.narrative, 'bike');
    // GO enregistrerait une sortie vélo comme une course à pied : il se retire.
    assertEquals(plan.go, false);
    // Aucune barre de position : la lentille ne fait rien de la position.
    assertEquals(plan.banner, 'none');
    // L'action existe et elle est VRAIE (bascule de préférence, pas un moteur vélo).
    assertEquals(plan.action, 'switch-to-run');
  });
});

Deno.test('matrice : en Run, GO reste légitime dans TOUS les états', () => {
  // Un refus de localisation ne rend pas GO mort : le préflight de course
  // redemande la permission et explique le refus. Le peindre indisponible serait
  // un mensonge dans l'autre sens.
  forEveryCombination((plan, input) => {
    if (input.lens === 'bike') return;
    assertEquals(plan.go, true, `GO retiré à tort sur ${JSON.stringify(input)}`);
  });
});

Deno.test('les trois états de position DEMANDENT trois choses différentes', () => {
  const base = { lens: 'run' as const, data: 'empty' as const, canOpenSettings: true };
  const unasked = mapPlan({ ...base, access: 'unasked' });
  const denied = mapPlan({ ...base, access: 'denied' });
  const unavailable = mapPlan({ ...base, access: 'unavailable' });

  // Jamais demandé : un geste dans l'app suffit.
  assertEquals(unasked.narrative, 'grant-location');
  assertEquals(unasked.action, 'locate');
  // Refusé : la porte se rouvre par les réglages système, pas par un tap ici.
  assertEquals(denied.narrative, 'denied-location');
  assertEquals(denied.action, 'open-settings');
  // Introuvable : le capteur peut répondre à la tentative suivante.
  assertEquals(unavailable.narrative, 'retry-location');
  assertEquals(unavailable.action, 'locate');
  // …et « réessayer » garde l'autre issue réelle en LIEN (localisation OS coupée).
  assertEquals(unavailable.secondary, 'open-settings');

  assertEquals(new Set([unasked.narrative, denied.narrative, unavailable.narrative]).size, 3);
});

Deno.test('REFUS SUR WEB : pédagogie sans bouton, jamais un bouton mort', () => {
  const plan = mapPlan({ access: 'denied', lens: 'run', data: 'empty', canOpenSettings: false });
  assertEquals(plan.narrative, 'denied-location');
  assertEquals(plan.action, 'none');
  assertEquals(plan.secondary, 'none');
});

Deno.test('CHARGEMENT ≠ VIDE : la sheet n’affirme rien pendant la lecture', () => {
  const plan = mapPlan({ access: 'ok', lens: 'run', data: 'loading', canOpenSettings: true });
  assertEquals(plan.narrative, 'skeleton');
  assertEquals(plan.action, 'none');
});

Deno.test('« on ne sait pas encore » et « on cherche » ne déclenchent AUCUNE alerte', () => {
  for (const access of ['unknown', 'locating'] as const) {
    for (const data of MAP_DATA_STATES) {
      const plan = mapPlan({ access, lens: 'run', data, canOpenSettings: true });
      assertEquals(plan.banner, 'none', `alerte prématurée : ${access} / ${data}`);
      assertEquals(
        LOCATION_NARRATIVES.includes(plan.narrative),
        false,
        `récit de position prématuré : ${access} / ${data}`,
      );
    }
  }
});

Deno.test('ce qui EMPÊCHE DE LIRE garde la sheet ; la position descend dans la barre', () => {
  // Pas de session : aucune position ne rendra la carte utile tant que ça dure.
  const signedOut = mapPlan({
    access: 'unasked',
    lens: 'run',
    data: 'signed-out',
    canOpenSettings: true,
  });
  assertEquals(signedOut.narrative, 'sign-in');
  assertEquals(signedOut.action, 'sign-in');
  assertEquals(signedOut.banner, 'location');
  assertEquals(signedOut.bannerAction, 'locate');

  // Échec de lecture : on le dit et on le rejoue — jamais « tu n'as rien capturé ».
  const failed = mapPlan({
    access: 'denied',
    lens: 'run',
    data: 'failed',
    canOpenSettings: true,
  });
  assertEquals(failed.narrative, 'retry-data');
  assertEquals(failed.action, 'retry-data');
  assertEquals(failed.bannerAction, 'open-settings');
});

Deno.test('position connue : le territoire reprend la parole (et le widget son action)', () => {
  const empty = mapPlan({ access: 'ok', lens: 'run', data: 'empty', canOpenSettings: true });
  // Courir EST l'action, et le bouton GO la porte déjà (§A.4) : pas de 2ᵉ CTA.
  assertEquals(empty.narrative, 'first-capture');
  assertEquals(empty.action, 'none');
  assertEquals(empty.banner, 'none');

  const held = mapPlan({ access: 'ok', lens: 'run', data: 'territory', canOpenSettings: true });
  assertEquals(held.narrative, 'territory');
  assertEquals(held.action, 'widget');
});

Deno.test('la position passe devant le territoire quand celui-ci n’a rien d’urgent', () => {
  // Un joueur qui ne se voit pas sur sa carte n'a aucune décision à prendre :
  // « où suis-je » précède « que faire ». La sheet est libre, elle porte l'action.
  for (const data of ['empty', 'territory'] as const) {
    const plan = mapPlan({ access: 'unasked', lens: 'run', data, canOpenSettings: true });
    assertEquals(plan.narrative, 'grant-location');
    assertEquals(plan.banner, 'none', 'la sheet porte déjà la position : pas de barre');
  }
});
