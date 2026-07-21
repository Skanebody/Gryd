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
import { resolveLocation, type MapLocationProvider } from './locationState.ts';
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
