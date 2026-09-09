/** Source integration guards complement pure owner-switch/export tests; native hooks are checked by tsc. */
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
const source = (path: string) => Deno.readTextFileSync(new URL(path, import.meta.url)).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

Deno.test('owner wiring : la révocation de session précède la publication React, sans attendre un effet d’écran', () => {
  for (const path of ['../../lib/session.tsx', '../../lib/session.web.tsx']) {
  const session = source(path);
  const callback = session.slice(session.indexOf('onAuthStateChange('));
  assert(callback.indexOf('setResultOwner2026(next?.user.id ?? null)') >= 0);
  assert(callback.indexOf('setResultOwner2026(next?.user.id ?? null)') < callback.indexOf('setSession(next)'));
  assert(session.includes('if (!alive || revision !== 0) return;'), 'un ancien getSession ne doit pas remplacer la session nouvelle');
  assert(session.includes('if (!supabase) { setResultOwner2026(null); return; }'), 'le mode invité sans backend doit avoir une autorité résolue');
  }
});

Deno.test('owner wiring : aucun buffer ancien sans propriétaire ne devient une archive invitée ou un upload connecté', () => {
  const core = source('./gps/useRealRunCore.ts');
  const archive = core.slice(core.indexOf('function archiveFor'), core.indexOf('export function useRealRunCore'));
  assert(archive.includes('if (tracker.recordingOwnerId === undefined) return null;'));
  assert(!archive.includes('recordingOwnerId ?? null'));
  const upload = core.slice(core.indexOf('const uploadOrQueue'), core.indexOf('const startSensors'));
  const guard = upload.indexOf("if (payload.recordingOwnerId === undefined) return (await queuePendingUpload(payload)) ? 'queued' : 'lost'");
  assert(guard >= 0 && guard < upload.indexOf("supabase.functions.invoke('ingest_run'"));
  assert(core.includes('const recordingOwnerId = currentResultOwner2026();'), 'le départ doit figer la même autorité que les résultats');
});

Deno.test('owner wiring : les résultats et l’ancienne analyse exigent une vraie preuve propriétaire', () => {
  const result = source('../refonte/RunResult.tsx');
  assert(result.includes('resolveResultActivity2026(') && result.includes('useResultOwner2026()'));
  assert(!/params\.(dist|dur|queued|activity)\b/.test(result), 'les paramètres de navigation ne sont pas des faits enregistrés');
  const analysis = source('../../../app/course/analyse.tsx');
  assert(analysis.includes('resolveResultActivity2026(') && analysis.includes('useResultOwner2026()'));
  assert(analysis.includes('evidence.activity.clientRunId !== syncFactRunId()'), 'l’ancienne analyse ne doit pas adopter le journal d’une autre sortie');
  assert(analysis.includes('getFinishedTrace(ownerId, runId)'));
});

Deno.test('owner wiring : RSVP et édition crew vérifient le propriétaire avant envoi et figent son jeton',()=>{
  const outing=source('../refonte/CrewOutings2026Screen.tsx');
  const mutation=outing.slice(outing.indexOf('async function mutate('),outing.indexOf('function save()'));
  assert(mutation.indexOf('if (!isResultOwnerCurrent2026(owner,epoch)) return;')>=0);
  assert(mutation.indexOf('if (!isResultOwnerCurrent2026(owner,epoch)) return;')<mutation.indexOf('supabase.rpc(name,params)'));
  assert(mutation.includes(".setHeader('Authorization',`Bearer ${session.access_token}`)"),'le client ne peut pas choisir silencieusement le jeton du compte suivant');
  assert(mutation.lastIndexOf('isResultOwnerCurrent2026(owner,epoch)')>mutation.indexOf('supabase.rpc(name,params)'),'les effets tardifs restent liés au même compte');
});
