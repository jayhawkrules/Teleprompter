# Reality Casting Scout — Scheduling Reference

> How to run the scout on a recurring schedule.

Default cadence: **every 3 days at 08:00 UTC**. Cron expression: `0 8 */3 * *`.

Peak casting seasons — **May upfronts** (mid-May, networks announce slate) and **November sweeps** (Nov 1-30) — warrant a **daily** manual run during the peak window.

---

## Option 1 — Firebase Scheduled Function (recommended)

Lowest friction; lives in the same project (`casthub-1d833`) as the data.

```typescript
// functions/src/scheduled/castingScout.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { spawn } from 'node:child_process';
import path from 'node:path';

const SCOUT_DIR = path.resolve(__dirname, '../../.claude/skills/reality-casting-scout');

export const reality_casting_scout_cron = onSchedule(
  {
    schedule: '0 8 */3 * *',
    timeZone: 'UTC',
    memory: '1GiB',
    timeoutSeconds: 540,
    region: 'us-central1',
  },
  async () => {
    logger.info('[scout] starting');

    await run('python3', ['scripts/scrape_sources.py']);
    await run('python3', ['scripts/normalise.py']);

    const { uploadAll } = require(`${SCOUT_DIR}/scripts/upload_to_firestore`);
    const summary = await uploadAll();

    logger.info('[scout] complete', summary.counts);
  },
);

function run(cmd: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd: SCOUT_DIR, stdio: 'inherit' });
    proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}
```

**Note:** Cloud Functions for Firebase doesn't ship Python out of the box. If you keep the Python pipeline, deploy it as a Cloud Run job (Option 2) and have the scheduled function trigger it via HTTP. If you'd rather keep this single-function, port `scrape_sources.py` + `normalise.py` to TypeScript first.

---

## Option 2 — Google Cloud Scheduler + Cloud Run

Cleanest separation of concerns. Recommended if you want Python to stay Python.

1. Build a Docker image for the scout (Dockerfile lives at `reality-casting-scout/Dockerfile` — not yet written).
2. Push to Artifact Registry.
3. Deploy as a Cloud Run **job** (not service):
   ```bash
   gcloud run jobs create reality-casting-scout \
     --image us-central1-docker.pkg.dev/casthub-1d833/scout/reality-casting-scout:latest \
     --region us-central1 \
     --task-timeout 1800 \
     --memory 1Gi \
     --set-env-vars FIREBASE_PROJECT_ID=casthub-1d833
   ```
4. Create a Cloud Scheduler job that POSTs to the Run job:
   ```bash
   gcloud scheduler jobs create http reality-casting-scout-cron \
     --schedule "0 8 */3 * *" \
     --time-zone UTC \
     --uri "https://<region>-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/casthub-1d833/jobs/reality-casting-scout:run" \
     --http-method POST \
     --oauth-service-account-email scout-runner@casthub-1d833.iam.gserviceaccount.com
   ```

Grant the service account `roles/run.developer` + `roles/datastore.user` only — do not give it owner.

---

## Option 3 — Manual via Claude Code

From inside the CastHub1 terminal, any of these trigger phrases launches the scout:

- "run the casting scout"
- "find new casting calls"
- "update casting listings"
- "scout casting calls for Mythie"
- "refresh reality TV auditions"

Claude Code will execute the three pipeline scripts in order, surface any quarantined or social-flagged records, and stop short of `upload_to_firestore.js` until Andrew confirms. The upload step is gated by `safe-edit-policy` because it writes to a live Firestore project.

---

## Cost guardrails

- **Cloud Run job**: ~1.5 min × every 3 days = ~15 min/month → effectively free on the Cloud Run free tier
- **Cloud Scheduler**: 3 free jobs/month, then $0.10/job/month — well below threshold
- **Firestore writes**: ~50 listings/run × 2 writes (castingCalls + castingModerationLog) × 10 runs/month = ~1,000 writes/month → effectively free on Firestore Spark tier
- **Egress**: ~30 HTTP GETs/run × 10 runs/month = trivial

If listing volume grows past 500/run, revisit batching strategy in `upload_to_firestore.js` (use `db.batch()` in chunks of 500).
