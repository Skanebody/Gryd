/**
 * GRYD — adaptateur Apple Health iOS (HealthKit réel, O8 levé).
 * Flux : autorisation HealthKit (lecture workouts/routes) → lecture des runs
 * récents → conversion en points GPS → envoi ingest_run (serveur seul juge).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IngestRunRequest, RunPoint } from '@klaim/shared';
import AppleHealthKit, {
  type HealthInputOptions,
  type HKWorkoutQueriedSampleType,
  type WorkoutRouteQueryResults,
  type HealthKitPermissions,
  HealthObserver,
} from 'react-native-health';
import { supabase } from '../../../lib/supabase';
import type { SourceAdapter, SourceAdapterSnapshot } from './types';

const STORAGE_KEY = 'gryd.sources.apple_health';
const HEALTHKIT_LOOKBACK_DAYS = 30;
const MAX_SYNC_WORKOUTS = 12;

interface AppleHealthLink {
  lastSync: string | null;
}

const DISCONNECTED: SourceAdapterSnapshot = {
  status: 'disconnected',
  lastSync: null,
  detail: 'Importe tes runs Apple Health',
};

const NEEDS_DEV_BUILD: SourceAdapterSnapshot = {
  status: 'needs_dev_build',
  lastSync: null,
  detail: 'Dev build iOS requis (HealthKit)',
};

function readLink(): Promise<AppleHealthLink | null> {
  return AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => (raw ? (JSON.parse(raw) as AppleHealthLink) : null))
    .catch(() => null);
}

function writeLink(link: AppleHealthLink): Promise<void> {
  return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(link));
}

function isRunningWorkout(sample: HKWorkoutQueriedSampleType): boolean {
  return sample.activityName === 'Running';
}

function toRunPoints(route: WorkoutRouteQueryResults): RunPoint[] {
  const locations = route.data?.locations ?? [];
  return locations
    .map((loc) => ({
      lat: Number(loc.latitude),
      lng: Number(loc.longitude),
      t: Date.parse(loc.timestamp),
      acc: Number.isFinite(loc.speedAccuracy) && loc.speedAccuracy > 0 ? loc.speedAccuracy : undefined,
    }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && Number.isFinite(p.t))
    .sort((a, b) => a.t - b.t);
}

function callIsAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    AppleHealthKit.isAvailable((_error, available) => resolve(Boolean(available)));
  });
}

function initHealthKit(): Promise<boolean> {
  const permissions: HealthKitPermissions = {
    permissions: {
      read: [
        AppleHealthKit.Constants.Permissions.Workout,
        AppleHealthKit.Constants.Permissions.WorkoutRoute,
      ],
      write: [],
    },
  };
  return new Promise((resolve) => {
    AppleHealthKit.initHealthKit(permissions, (error) => resolve(!error));
  });
}

function getWorkoutSamples(options: HealthInputOptions): Promise<HKWorkoutQueriedSampleType[]> {
  return new Promise((resolve, reject) => {
    AppleHealthKit.getSamples(
      { ...options, type: HealthObserver.Workout },
      (error, results) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(((results as unknown) as HKWorkoutQueriedSampleType[]) ?? []);
      },
    );
  });
}

function getWorkoutRoute(workoutId: string): Promise<WorkoutRouteQueryResults | null> {
  return new Promise((resolve) => {
    AppleHealthKit.getWorkoutRouteSamples({ id: workoutId }, (error, route) => {
      if (error || !route) {
        resolve(null);
        return;
      }
      resolve(route);
    });
  });
}

async function syncHealthKitRuns(existingLastSync: string | null): Promise<SourceAdapterSnapshot> {
  if (!supabase) return { ...DISCONNECTED, detail: 'Backend non configuré (O1)' };
  const { data } = await supabase.auth.getSession();
  if (!data.session) return { ...DISCONNECTED, detail: 'Connecte ton compte GRYD d’abord' };

  const now = new Date();
  const defaultStart = new Date(now.getTime() - HEALTHKIT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const startDate = existingLastSync ?? defaultStart.toISOString();

  const workouts = await getWorkoutSamples({
    startDate,
    endDate: now.toISOString(),
    ascending: false,
    limit: MAX_SYNC_WORKOUTS,
  }).catch(() => []);

  const running = workouts.filter(isRunningWorkout);
  let imported = 0;
  let skippedNoRoute = 0;

  for (const workout of running) {
    const route = await getWorkoutRoute(workout.id);
    if (!route) {
      skippedNoRoute++;
      continue;
    }
    const points = toRunPoints(route);
    if (points.length < 2) {
      skippedNoRoute++;
      continue;
    }
    const payload: IngestRunRequest = {
      clientRunId: `healthkit:${workout.id}`,
      source: 'healthkit',
      startedAt: new Date(workout.start).toISOString(),
      points,
    };
    const { error } = await supabase.functions.invoke('ingest_run', { body: payload });
    if (!error) imported++;
  }

  const lastSync = now.toISOString();
  await writeLink({ lastSync }).catch(() => undefined);
  const detail =
    imported > 0
      ? `${imported} run(s) importé(s)${skippedNoRoute ? ` · ${skippedNoRoute} sans trace GPS` : ''}`
      : skippedNoRoute > 0
        ? `${skippedNoRoute} run(s) sans trace GPS exploitable`
        : 'Aucun nouveau run HealthKit';
  return { status: 'connected', lastSync, detail };
}

export const appleHealthAdapter: SourceAdapter = {
  id: 'apple_health',
  trustLevel: 'high',

  async status(): Promise<SourceAdapterSnapshot> {
    if (!(await callIsAvailable())) return NEEDS_DEV_BUILD;
    const link = await readLink();
    if (!link) return DISCONNECTED;
    return { status: 'connected', lastSync: link.lastSync, detail: 'Apple Health connecté' };
  },

  async connect(): Promise<SourceAdapterSnapshot> {
    if (!(await callIsAvailable())) return NEEDS_DEV_BUILD;
    if (!(await initHealthKit())) {
      return { ...DISCONNECTED, detail: 'Autorisation HealthKit refusée' };
    }
    const link = await readLink();
    return syncHealthKitRuns(link?.lastSync ?? null);
  },

  async disconnect(): Promise<SourceAdapterSnapshot> {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return DISCONNECTED;
  },

  async sync(): Promise<SourceAdapterSnapshot> {
    if (!(await callIsAvailable())) return NEEDS_DEV_BUILD;
    if (!(await initHealthKit())) {
      return { ...DISCONNECTED, detail: 'Autorisation HealthKit refusée' };
    }
    const link = await readLink();
    return syncHealthKitRuns(link?.lastSync ?? null);
  },
};
