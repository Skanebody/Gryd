/**
 * GRYD — Edge Function open_city : OUVRIR UNE VILLE (la voie serveur).
 *
 * ═══ CE QU'ELLE DÉBLOQUE ════════════════════════════════════════════════════
 * Demande fondateur : « dans la création de crew on doit pouvoir choisir
 * n'importe quelle ville […] et ne pas en inventer une ». Le référentiel réel
 * (GeoNames, 7 870 villes d'Europe, CC BY 4.0) est embarqué. `create_crew`
 * exige que `city_zones` porte la ligne de la ville (0042 l.72, `bad_city`), et
 * l'écriture de `city_zones` est révoquée à tous les rôles clients
 * (0003_rls.sql l.128). Sans cette fonction, choisir Zurich était refusé — le
 * plafond ne venait pas du référentiel, il venait de la base.
 *
 * ═══ CE QU'ELLE N'EST PAS ═══════════════════════════════════════════════════
 * Ce n'est PAS un import en masse. UNE ville par appel, et seulement quand
 * quelqu'un la choisit vraiment. Provisionner les 7 870 villes serait la faute
 * qu'AMENDEMENT-35 §6 a fait rétracter : un monde plein de lieux où personne ne
 * court, présenté comme un monde de jeu.
 *
 * ═══ TOUT EST DÉCIDÉ SERVEUR ════════════════════════════════════════════════
 * Le corps de la requête contient UN champ : `cityId`. Ni nom, ni coordonnées,
 * ni géométrie, ni statut. Le nom et le centre viennent du référentiel EMBARQUÉ
 * (`_shared/cities-eu.ts`), l'aire de jeu est le disque `CITY_DISC_RADIUS_M`
 * (game-rules), le statut est posé à 'wild' par la RPC et n'est pas
 * paramétrable. Un client ne peut donc ni renommer une ville, ni la déplacer,
 * ni lui décréter une densité.
 *
 * ═══ L'APP NE MENT JAMAIS ═══════════════════════════════════════════════════
 * · La réponse décrit la ligne RELUE en base (nom, statut, saison), pas ce
 *   qu'on croit avoir écrit — une ville déjà ouverte garde son nom et son
 *   contour d'origine, et la réponse le dit (`zoneCreated: false`).
 * · L'aire de jeu créée est ANNONCÉE comme approximative (`area:
 *   'approximate_disc'` + `radiusM`) pour que l'écran puisse écrire « aire de
 *   jeu approximative de 15 km » et jamais « limites de la ville ».
 * · Une ville ouverte est VIDE, et c'est une information, pas un échec. Le
 *   `status: 'wild'` que la RPC pose est une ABSENCE de densité mesurée — pas un
 *   palier, pas une promesse. Le client le lit et le JETTE volontairement
 *   (`openCity.ts`) : le seul chiffre d'activité qu'un écran affiche honnêtement
 *   reste le comptage de crews réels (`useCityActivity`), jamais une phrase
 *   déduite d'un statut « vierge ». Aucun compte, aucun classement, aucun rival
 *   n'est fabriqué ici — ni par le serveur, ni par l'écran qui le relit.
 *
 * ═══ IDEMPOTENCE ════════════════════════════════════════════════════════════
 * Rejouable sans effet de bord : la zone est écrite en `on conflict do nothing`
 * et la saison n'est créée que s'il n'y en a pas d'active. Deux appels
 * successifs rendent le même état, le second avec `zoneCreated: false`.
 *
 * ═══ PLAFOND D'OUVERTURE (posé le 23/07/2026) ══════════════════════════════
 * Un compte ne peut plus ouvrir un nombre illimité de villes :
 * `CITY_OPEN_LIMIT_PER_USER` ouvertures RÉELLES par `CITY_OPEN_LIMIT_WINDOW_H`
 * heures glissantes (game-rules — passées à la RPC, jamais écrites en SQL). Ce
 * que ce plafond protège n'est PAS la vérité de la donnée : une ville ouverte
 * naît vide, se dit vide, et le référentiel borne le monde à des villes réelles.
 * Il protège du BRUIT — des centaines de zones où personne ne courra jamais.
 * Il ne compte que ce qui est vraiment écrit (rouvrir une ville déjà ouverte ne
 * consomme rien) et il REFUSE en le nommant (`open_quota_reached`, HTTP 429),
 * jamais par un faux succès ni par un silence.
 *
 * ═══ EN SUSPENS (à ne pas effacer d'une relecture) ══════════════════════════
 * 1. `city_zones.status` n'est jamais RECALCULÉ. Une ville ouverte reste 'wild'
 *    même quand des coureurs y arrivent (les paliers `emerging`/`pioneer` de
 *    ZONE_DENSITY_THRESHOLDS sont DÉCLARÉS, pas encore évalués — cf. le
 *    commentaire de game-rules). Le statut reste donc honnête par défaut mais
 *    ne progresse pas tout seul.
 */
import { createClient } from 'npm:@supabase/supabase-js@^2';
import {
  CITY_OPEN_LIMIT_PER_USER,
  CITY_OPEN_LIMIT_WINDOW_H,
  SEASON_DURATION_WEEKS,
} from '../_shared/game-rules.ts';
import { EU_CITIES_PACKED } from '../_shared/cities-eu.ts';
import { parsePackedCitiesCached } from '../_shared/cities.ts';
import { type OpenCityReject, parseOpenCityRequest, planCityOpening, statusForReject } from './logic.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const refuse = (error: OpenCityReject | string, status: number) => json({ ok: false, error }, status);

/** Réponse de `provision_city` (migration 0066), telle qu'elle est construite en SQL. */
interface ProvisionResult {
  ok: boolean;
  reason?: string;
  cityId?: string;
  name?: string;
  status?: string;
  zoneCreated?: boolean;
  seasonCreated?: boolean;
  seasonId?: string | null;
  /** Plafond qui a produit un `open_quota_reached` — relayé tel quel. */
  limit?: number;
  windowHours?: number;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return refuse('method_not_allowed', 405);

  // Sans clés serveur, on ne prétend pas travailler (précédent create_offensive).
  if (!Deno.env.get('SUPABASE_URL') || !Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
    return refuse('configuration_required', 503);
  }

  // ── 1. Identité : dérivée du JWT, jamais du corps ───────────────────────────
  // Ouvrir une ville est une écriture : elle exige un compte. Aucun rôle client
  // n'a EXECUTE sur `provision_city` — c'est cette fonction, en service-role,
  // qui est la seule porte.
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return refuse('missing_authorization', 401);
  const { data: userData, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !userData?.user) return refuse('invalid_token', 401);

  // ── 2. Forme de la demande (PUR) ───────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return refuse('invalid_body', 400);
  }
  const parsed = parseOpenCityRequest(raw);
  if (!parsed.ok) return refuse(parsed.error, statusForReject(parsed.error));

  // ── 3. La ville doit EXISTER dans le référentiel réel ──────────────────────
  // C'est la frontière de la demande fondateur : n'importe quelle ville RÉELLE
  // est choisissable, aucune ville inventée ne l'est.
  const plan = planCityOpening(parsed.value, parsePackedCitiesCached(EU_CITIES_PACKED));
  if (!plan.ok) return refuse(plan.error, statusForReject(plan.error));

  try {
    // ── 4. Provision : zone + saison, indissociables (migration 0066) ────────
    // La durée de saison vient de sa SOURCE UNIQUE et est PASSÉE à la RPC —
    // aucune durée n'est écrite en dur dans le SQL.
    const { data, error } = await supabase.rpc('provision_city', {
      p_city_id: plan.value.cityId,
      p_name: plan.value.name,
      p_geojson: plan.value.geojson,
      p_season_weeks: SEASON_DURATION_WEEKS,
      // Le porteur du plafond : le compte du JWT, jamais un champ du corps.
      p_opened_by: userData.user.id,
      p_open_limit: CITY_OPEN_LIMIT_PER_USER,
      p_window_hours: CITY_OPEN_LIMIT_WINDOW_H,
    });
    if (error) {
      console.error('provision_city failed', error.message);
      return refuse('provisioning_failed', 500);
    }

    const result = (data ?? {}) as ProvisionResult;
    if (!result.ok) {
      // Plafond atteint : ce n'est pas une demande malformée, c'est un refus de
      // débit. 429, et on rend le plafond qui l'a produit pour que l'écran
      // puisse le dire sans le retaper (ni l'inventer).
      if (result.reason === 'open_quota_reached') {
        return json(
          {
            ok: false,
            error: 'open_quota_reached',
            limit: result.limit ?? CITY_OPEN_LIMIT_PER_USER,
            windowHours: result.windowHours ?? CITY_OPEN_LIMIT_WINDOW_H,
          },
          429,
        );
      }
      // La RPC a refusé pour une raison NOMMÉE (géométrie dégénérée, id hors
      // forme…). On la relaie plutôt que de la maquiller en succès.
      console.error('provision_city rejected', result.reason ?? 'unknown');
      return refuse(result.reason ?? 'provisioning_rejected', 422);
    }

    return json({
      ok: true,
      cityId: result.cityId ?? plan.value.cityId,
      // Le nom RELU en base, pas celui qu'on a proposé : une ville déjà ouverte
      // garde le sien (Paris reste « Paris », pas le libellé du référentiel).
      name: result.name ?? plan.value.name,
      ...(plan.value.country !== undefined ? { country: plan.value.country } : {}),
      status: result.status ?? null,
      zoneCreated: result.zoneCreated === true,
      seasonCreated: result.seasonCreated === true,
      seasonId: result.seasonId ?? null,
      // Ce que vaut vraiment la géométrie, dit sans détour. `existing` : la zone
      // était déjà là, on ne sait pas (et on n'affirme pas) ce qu'elle contient.
      area: result.zoneCreated === true ? 'approximate_disc' : 'existing',
      ...(result.zoneCreated === true ? { radiusM: plan.value.radiusM } : {}),
    });
  } catch (e) {
    console.error('open_city failed', e instanceof Error ? e.message : e);
    return refuse('provisioning_failed', 500);
  }
});
