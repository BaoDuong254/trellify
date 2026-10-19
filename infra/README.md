# Trellify Infrastructure

Everything Trellify needs to run in production lives in this directory as declarative YAML. Nothing here is applied by hand because [ArgoCD](https://argo-cd.readthedocs.io/) watches the `main` branch and reconciles the cluster to match it. Changing production means committing a change here.

Production is a single-node [k3s](https://docs.k3s.io/) install on an Ubuntu VM in the homelab, serving `https://trellify.duonggiabao.com`. An EKS cluster on AWS can be created from the same manifests when the homelab is down (see [AWS Failover](#aws-failover)).

## 📋 Table of Contents

- [Trellify Infrastructure](#trellify-infrastructure)
  - [📋 Table of Contents](#-table-of-contents)
  - [Architecture](#architecture)
  - [Directory Map](#directory-map)
  - [How ArgoCD Manages This](#how-argocd-manages-this)
  - [Bootstrap Order](#bootstrap-order)
  - [Application Layout](#application-layout)
  - [Configuration and Secrets](#configuration-and-secrets)
  - [Deployment Flow](#deployment-flow)
  - [Alerting](#alerting)
  - [Backups](#backups)
  - [Endpoints](#endpoints)
  - [AWS Failover](#aws-failover)

## Architecture

```text
                          Internet
                             │
                             ▼
                     Cloudflare edge ──── TLS termination, WAF, Access
                             │
                             │  QUIC, outbound only - no inbound port is
                             │  opened on the router or the VM
                             ▼
┌─────────────────── Ubuntu 24.04 VM · k3s · 192.168.0.240 ───────────────────┐
│                                                                             │
│  ns cloudflared      cloudflared ×2          ─┐                             │
│  ns ingress-nginx    controller               │                             │
│  ns sealed-secrets   controller               ├── PLATFORM                  │
│  ns argocd           ArgoCD (app-of-apps)     │   shared by every project   │
│  ns observability    Prometheus + Grafana    ─┘                             │
│                                                                             │
│  ns trellify         server ×3-6, worker ×1, client ×2   ─┐                 │
│                      MongoDB + Redis (StatefulSet)       ─┘  APPLICATION    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                             ▲
                             │  Tailscale subnet router - SSH, kubectl
                        Developer machine
```

The load-bearing idea: **the platform layer knows nothing about Trellify**. Adding a second project means one namespace and one ArgoCD `Application` - no change to cloudflared, ingress-nginx, or DNS.

Traffic path for a browser request: Cloudflare edge → `cloudflared` tunnel pod → `ingress-nginx-controller` Service → the Ingress rule that matches the path → `trellify-client` (`/`) or `trellify-server` (`/api`, `/socket.io`).

## Directory Map

There are three top-level folders, and every file belongs to exactly one of them:

```text
infra/
├── platform/              WHAT the shared layer is. Cluster-agnostic, used by every cluster
│   ├── argocd/            values.yaml (ArgoCD Helm values) + manifests/ (the two AppProjects + ArgoCD Ingress)
│   ├── cloudflared/       Deployment base, with no credentials (each cluster adds its own)
│   ├── ingress-nginx/     common Helm values
│   ├── sealed-secrets/    Helm values
│   └── observability/     kube-prometheus-stack values + manifests/ (dashboards, Grafana Ingress, secrets)
├── apps/                  WHAT the workloads are. Cluster-agnostic
│   └── trellify/          base/ + overlays/prod/ (secrets, image tags) + overlays/dev/ (kind + Tilt) + jobs/ (one-off, applied by hand)
└── clusters/              WHERE things run. Only what differs per cluster
    ├── homelab/           k3s on Proxmox - production
    │   ├── bootstrap/     root-app.yaml, applied once by hand
    │   ├── argocd/        kustomization.yaml = platform/argocd/manifests + apps/*.yaml
    │   ├── cloudflared/   locally managed tunnel: config file + credentials SealedSecret
    │   ├── ingress-nginx/ LoadBalancer (klipper) + k3s pod CIDR
    │   └── storage/       local-path-retain → rancher.io/local-path
    ├── dev/               local kind cluster driven by the root Tiltfile - not managed by ArgoCD
    │   ├── kind.yaml      single node, host ports 80/443, ingress-ready label
    │   └── ingress-nginx/ hostPort + NodePort, no ServiceMonitor
    └── aws/               EKS failover - see AWS Failover
        ├── terraform/     bootstrap/ (state bucket), cloudflare/ (tunnel + DNS switch), cluster/ (EKS)
        ├── argocd/        kustomization.yaml = platform/argocd/manifests + apps/*.yaml (root created by Terraform)
        ├── cloudflared/   remotely managed tunnel: token from a Secret created by Terraform
        ├── ingress-nginx/ ClusterIP + VPC CIDR
        ├── storage/       local-path-retain → EBS gp3
        └── trellify/      apps/trellify/overlays/prod + hourly backup
```

Every Application name is the same on both clusters (`platform-cloudflared`, `trellify-prod`, ...). Only the folder it points at differs. To find out what a cluster runs, read `clusters/<name>/argocd/kustomization.yaml` and nothing else. A new Application must be listed there, or ArgoCD never sees it.

| Component             | Version    | Notes                                                                                             |
| --------------------- | ---------- | ------------------------------------------------------------------------------------------------- |
| ingress-nginx         | `4.15.1`   | Helm, values = `platform/ingress-nginx/values.yaml` + `clusters/<name>/ingress-nginx/values.yaml` |
| sealed-secrets        | `2.19.2`   | Helm                                                                                              |
| kube-prometheus-stack | `88.5.2`   | Helm. `enableRemoteWriteReceiver` is on so local k6 runs can push results in                      |
| cloudflared           | `2026.8.2` | Image tag in `platform/cloudflared/deployment.yaml`, shared by both clusters                      |

## How ArgoCD Manages This

Two `AppProject`s draw the boundary between platform and application, and they are what stops a mistake in one from reaching the other:

| Project                                               | Source repos                                                                       | May deploy to             | Cluster-scoped resources |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------- | ------------------------ |
| [`platform`](platform/argocd/manifests/platform.yaml) | this repo + the ingress-nginx, sealed-secrets, and prometheus-community Helm repos | any namespace             | anything                 |
| [`trellify`](platform/argocd/manifests/trellify.yaml) | this repo only                                                                     | `trellify` namespace only | only `Namespace`         |

Both projects carry `argocd.argoproj.io/sync-wave: "-1"` so they exist before any `Application` that references them.

Applications that consume an upstream Helm chart use ArgoCD's **multi-source** form: the chart comes from its own repo, and the values file is pulled from this repo through a `ref: values` source, referenced as `$values/infra/platform/<component>/values.yaml`, with a per-cluster file layered on top where the clusters differ. The chart stays untouched upstream while our overrides stay in Git.

## Bootstrap Order

A fresh cluster comes up in three steps, and the order is load-bearing:

1. **k3s and ArgoCD.**
2. **The sealed-secrets master key, before anything syncs.** Every `SealedSecret` here is encrypted against one specific controller key. A fresh controller generates a _new_ key that cannot decrypt them, and the app pods sit in `CreateContainerConfigError` with no obvious cause.
3. **The root Application.** [`root-app.yaml`](clusters/homelab/bootstrap/root-app.yaml) points at `infra/clusters/homelab/argocd`, a Kustomization pulling in the shared projects, every Application in `apps/` and ArgoCD's own Ingress. From then on ArgoCD manages its own configuration; that single `kubectl apply` is the only bootstrap artifact.

A homelab bootstrapped before the `platform/apps/clusters` split still runs a `root` pointing at the old `infra/argocd`. ArgoCD errors on the missing path and prunes nothing, so it keeps serving until the root is re-applied once.

## Application Layout

[`trellify/base/`](apps/trellify/base/kustomization.yaml) holds environment-agnostic manifests; [`trellify/overlays/prod/`](apps/trellify/overlays/prod/kustomization.yaml) adds the production SealedSecrets, patches the ingress host and the MongoDB URI, and pins the image tags.

| Workload           | Replicas        | Image                                 | Notes                                                                                                                                         |
| ------------------ | --------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `trellify-server`  | 3, HPA up to 6  | `ghcr.io/baoduong254/trellify-server` | PodDisruptionBudget keeps `minAvailable: 2`; HPA targets 70% CPU. Prometheus metrics on port 9464, scraped through `base/servicemonitor.yaml` |
| `trellify-worker`  | 1               | same image as the server              | Runs `dist/worker.js` - the BullMQ consumer. Metrics on port 9464 via the headless `trellify-worker-metrics` Service                          |
| `trellify-client`  | 2               | `ghcr.io/baoduong254/trellify-client` | nginx serving the built Vite bundle                                                                                                           |
| `trellify-mongodb` | 1 (StatefulSet) | `mongo:8.0`                           | 20Gi PVC on `local-path-retain`, standalone (`directConnection=true`)                                                                         |
| `trellify-redis`   | 1 (StatefulSet) | `redis:8-alpine`                      | 8Gi PVC on `local-path-retain`                                                                                                                |

**The HPA and ArgoCD would otherwise fight.** The HPA writes `spec.replicas` on `trellify-server`; ArgoCD's `selfHeal` reads that as drift from Git and writes it back - scaling would oscillate forever. [`trellify-prod.yaml`](clusters/homelab/argocd/apps/trellify-prod.yaml) resolves it with `ignoreDifferences` on `/spec/replicas` for that one Deployment.

**Three Ingresses share one host**, because each path needs different nginx behaviour ([`base/ingress.yaml`](apps/trellify/base/ingress.yaml)):

| Ingress        | Path         | Why it is separate                                                                                                                                                                                             |
| -------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trellify-web` | `/`          | Plain static serving                                                                                                                                                                                           |
| `trellify-api` | `/api`       | Rate limited - 20 rps **per client IP** with a burst multiplier of 2, rejecting with `429`. Per-IP because ingress-nginx resolves the real client from `CF-Connecting-IP`; it is not a cap on total throughput |
| `trellify-ws`  | `/socket.io` | 1-hour read/send timeouts and cookie affinity, so a WebSocket is not cut every 60s                                                                                                                             |

[`base/networkpolicy.yaml`](apps/trellify/base/networkpolicy.yaml) starts from `default-deny-ingress` across the whole namespace and opens exactly four paths: ingress-nginx → server/client, server/worker → Redis, server/worker (plus any Job pod, for the backup CronJob) → MongoDB, and observability → the metrics port on server/worker. That last one is easy to forget and fails silently - without it the Prometheus target simply never appears.

## Configuration and Secrets

Non-sensitive configuration lives in [`base/config-server.env`](apps/trellify/base/config-server.env) - ports, `CLIENT_URL`, token lifetimes, cache TTLs, rate limit ceilings, the Cloudinary cloud name. Redis server config lives in [`base/redis/redis.conf`](apps/trellify/base/redis/redis.conf).

Both are turned into ConfigMaps by **`configMapGenerator`** in [`base/kustomization.yaml`](apps/trellify/base/kustomization.yaml), which appends a hash of the content to the ConfigMap name and rewrites every reference to it. **Never move them back to plain ConfigMap manifests.** A plain ConfigMap changes content without changing the pod template, so nothing rolls out: the mounted file or env var keeps its old value until something unrelated happens to restart the pod. That is not theoretical - the `loadmodule redisbloom.so` line sat correctly in `/etc/redis/redis.conf` inside a running pod for days while `redis-server`, started before the change, had never read it. Bloom filter protection was silently absent the whole time and nothing reported it.

The same trap applies to env vars, which are only read when a container starts. Adding a key rides along fine when the deploy also bumps the image tag, but a config-only change would never take effect. The hash suffix is what makes both cases roll out.

MongoDB deliberately does **not** read `DATABASE_NAME` from that ConfigMap - it carries a literal `MONGO_APP_DB` instead, so tuning an unrelated server env var does not restart the database. Keep the two values in sync.

Everything sensitive is a **SealedSecret**: encrypted with the cluster's public key, safe to commit to a public repo, decryptable only by the controller running in this cluster.

| SealedSecret                                                                         | Produces Secret           |
| ------------------------------------------------------------------------------------ | ------------------------- |
| [`sealedsecret-server.yaml`](apps/trellify/overlays/prod/sealedsecret-server.yaml)   | `trellify-server-secrets` |
| [`sealedsecret-mongodb.yaml`](apps/trellify/overlays/prod/sealedsecret-mongodb.yaml) | `trellify-mongodb-auth`   |
| [`sealedsecret-redis.yaml`](apps/trellify/overlays/prod/sealedsecret-redis.yaml)     | `trellify-redis-auth`     |
| [`sealedsecret-r2.yaml`](apps/trellify/overlays/prod/sealedsecret-r2.yaml)           | `trellify-r2-backup`      |
| `platform/observability/manifests/sealedsecret-alertmanager-telegram.yaml`           | `alertmanager-telegram`   |

A value is added or rotated by sealing a locally generated Secret and committing the sealed output. ArgoCD applies the committed file and the controller decrypts it in-cluster, so the plaintext never touches Git.

> **Important**
> The controller's private key is the only thing that can decrypt these files. `.gitignore` excludes `*.key` and `sealed-secrets-master*.yaml` precisely so it never lands in Git - which means **it must be backed up somewhere else**. Lose it and every SealedSecret here becomes unreadable and has to be regenerated from the original values.

`trellify-r2-backup` is the one Secret with a setup step outside this repo: an R2 bucket `trellify-k3s-backups` with a 30-day lifecycle rule, and an API token scoped to **Object Read & Write on that bucket alone**. It also carries the rclone crypt passphrases in obscured form. Their plaintext originals belong in a password manager; a lost cluster plus a lost passphrase means the off-site archives are gone too.

The MongoDB connection string is assembled in the overlay rather than stored as a secret: [`patch-mongodb-uri-server.yaml`](apps/trellify/overlays/prod/patch-mongodb-uri-server.yaml) injects `MONGO_USERNAME` and `MONGO_PASSWORD` from the Secret, then builds `MONGODB_URI` from them using `$(VAR)` interpolation. The worker gets the same patch.

## Deployment Flow

Application code and infrastructure state meet in one commit loop:

```
git push origin main
        │
        ▼
.github/workflows/ci.yml                       ← lint, types, tests, Playwright
        │  workflow_run, only on success (failure → Telegram, nothing deployed)
        ▼
.github/workflows/build-k8s-images.yml
        │  job: build-and-push
        ├─ skip if only infra/** or *.md changed since the pinned tag
        ├─ tag = sha-$(git rev-parse --short HEAD)      ← immutable, never reused
        ├─ build apps/server/Dockerfile  → ghcr.io/baoduong254/trellify-server:<tag>
        ├─ build apps/client/Dockerfile  → ghcr.io/baoduong254/trellify-client:<tag>
        ├─ SBOM + provenance attestations attached by BuildKit
        ├─ Trivy: a fixable CRITICAL CVE fails the job → no bump, nothing deployed
        └─ cosign keyless signature on both digests
        │
        ▼
        │  job: bump-manifest
        ├─ kustomize edit set image ... in overlays/prod
        └─ commit "chore(deploy): trellify -> <tag> [skip ci]" and push to main
        │
        ▼
ArgoCD detects the new commit → syncs → rolling update
```

Three details worth knowing:

- **`[skip ci]` is what stops the loop.** The bump commit lands on `main`, the same branch the build workflow watches. That marker keeps GitHub from starting a second run, which would build a new tag, which would commit again, forever.
- **`latest` exists but is never what gets deployed.** The overlay always pins the `sha-<short>` tag, so whatever is running traces back to exactly one commit - and a rollback is a Git operation, not a registry operation.
- **Manifests are validated before ArgoCD sees them.** `.github/workflows/infra.yml` runs on every change under `infra/**`: every directory holding a `kustomization.yaml` is built and piped through `kubeconform -strict`, with CRD schemas (SealedSecret, ServiceMonitor, PrometheusRule, Application) from the datreeio CRDs catalog, along with `root-app.yaml` and the one-off Jobs. A new manifest folder therefore needs a `kustomization.yaml`, or it is never checked. Helm `values.yaml` files are skipped because they are not Kubernetes objects. The Terraform stacks get `fmt -check` and `validate`.
- **Images are signed and scanned, not verified in-cluster.** Admission-time verification (Kyverno, policy-controller) would cost the node RAM for little gain on a single-owner cluster. Check a deployed digest by hand: `cosign verify ghcr.io/baoduong254/trellify-server@<digest> --certificate-oidc-issuer https://token.actions.githubusercontent.com --certificate-identity-regexp 'github.com/BaoDuong254/trellify'`. HIGH and CRITICAL findings, fixable or not, land in the repository's Security tab.
- **The client is built with an empty `VITE_API_ENDPOINT`.** The client and API share one host, so the browser calls `/api/v1/...` on its own origin and the Ingress routes it. Nothing in the bundle hardcodes a backend URL.

## Alerting

Prometheus evaluates [`base/prometheusrule.yaml`](apps/trellify/base/prometheusrule.yaml), five rules that all detect the same class of problem: a guard that has failed **open**. The cache, the bloom filters and the rate limiter are all built to keep serving when Redis misbehaves, so a failure never shows up as an error to a user - it shows up as protection quietly not being there.

`TrellifyBloomProbeErrors` is the fastest signal, because `isPossiblyPresent` counts an error on every probe. `TrellifyBloomFilterMissing` deliberately uses `absent()`: `bloom_filter_items` is a labelled gauge and `prom-client` only creates the series after the first `set()`, so when the build throws before that point there is no series at all and a plain `== 0` would never match.

Alertmanager routes on the `service: trellify` label to a Telegram receiver. The root route deliberately points at the `null` receiver: `defaultRules` from kube-prometheus-stack is on, and on a single node cluster those Kubernetes alerts are loud enough to make the channel useless if they are forwarded.

The bot token, chat id and healthchecks.io ping URL are three keys of the `alertmanager-telegram` SealedSecret, mounted by the operator at `/etc/alertmanager/secrets/alertmanager-telegram/` and read through `*_file` settings, so none of them appears in `values.yaml`. That secret must sync **before** the values that reference it, or Alertmanager crashloops on a missing volume.

> **Note**
> On the homelab every `platform-*` Application is synced by hand: none of them has `syncPolicy.automated`, and only `trellify-prod` reconciles on its own. The AWS cluster automates all of them, because nobody is at the UI during an unattended apply.

**Deadman switch.** Every alert above travels through the cluster, so a dead node, a crashed Alertmanager or a cut uplink means silence rather than a page. kube-prometheus-stack's `Watchdog` alert is always firing; a dedicated route sends it every 5 minutes to a [healthchecks.io](https://healthchecks.io) check (period 5m, grace 10m, Telegram integration on the healthchecks side), which raises the alarm when the pings **stop**. A missing ping URL still lets the config load, and healthchecks.io then reports the cluster as down - the safe direction to fail in.

The four "this should never happen" rules use `increase(...[10m]) > 0` with a short `for`, not `rate(...[5m])` with `for: 5m`. That combination cannot fire from a brief incident at all: `rate` over a 5m window stops being positive about 5 minutes after the last sample, so the condition holds for roughly 4m10s and never survives a 5 minute `for`. A 10 minute lookback with a 1-2 minute confirmation catches a single occurrence, which is what these signals need - any occurrence at all is already a real fault.

A wrong-type filter key is the one Redis fault that used to fail **closed**: `BF.EXISTS` returns 0 on a key of the wrong type instead of raising, which read as "definitely absent" and 404'd every real board. The Lua guard now compares `TYPE` against `MBbloom--`, so the case fails open and reports `result="unavailable"`, and the integration suite (`apps/server/test/integration/providers/bloom.provider.spec.ts`) pins it.

## Backups

MongoDB is dumped by a CronJob at `0 20 * * *` ([`backup-cronjob.yaml`](apps/trellify/base/mongodb/backup-cronjob.yaml)), keeping the last 3 successful and 3 failed jobs. One job, two steps:

1. An **initContainer** runs `mongodump --gzip` into a dedicated 20Gi PVC on `local-path-retain` and prunes local archives older than 7 days. Running it as an initContainer rather than a second container is what guarantees the upload sees a finished archive - containers in the same pod start in parallel.
2. The **`upload` container** pushes that archive to Cloudflare R2 through `rclone`, then deletes anything older than 14 days off-site.

**Off-site copies live in R2 encrypted.** `rclone` stacks a `crypt` remote on top of the S3 remote, so the archive is encrypted inside the cluster and Cloudflare only ever stores ciphertext - a leaked R2 token yields nothing readable. Filenames are left in the clear (`filename_encryption = off`) so age-based pruning and the Cloudflare dashboard stay usable; objects appear as `mongodb/trellify-<stamp>.gz.bin`.

Everything is configured through `RCLONE_CONFIG_*` environment variables, so no `rclone.conf` is ever written. The credentials, endpoint and crypt passphrases come from the `trellify-r2-backup` Secret. Credentials belong to the **underlying** `R2` remote, not the `OFFSITE` crypt remote - an env-var override only reaches the backend it names.

> **Important**
> The crypt passphrases are the only thing that can decrypt these archives, and they live nowhere but the SealedSecret. Keep the plaintext originals in a password manager, alongside the sealed-secrets private key. Losing them makes every off-site backup unreadable.

**Staying inside the R2 free tier** (10 GB storage, 1M Class A ops, 10M Class B ops per month). One run costs roughly 4 Class A operations, so a daily schedule spends about 150 per month and the hourly AWS schedule about 3,000 - both well under 1%. Storage is the only figure that can realistically move, and two independent guards cover it:

| Guard                      | Where                  | Behaviour                                                                                                                                  |
| -------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `MAX_BUCKET_BYTES` (8 GiB) | the `upload` container | Measures the bucket before uploading; over the line the job **fails without uploading** and says why. Visible immediately as a failed Job. |
| Lifecycle rule (30 days)   | the R2 bucket itself   | Server-side expiry that keeps working even if the CronJob is broken or deleted. Lifecycle deletions are not billed as operations.          |

**Restore** is [`apps/trellify/jobs/restore-from-r2.yaml`](apps/trellify/jobs/restore-from-r2.yaml): an rclone initContainer decrypts the newest archive (or the one named in `ARCHIVE`) into an `emptyDir`, and `mongorestore --drop` loads it, failing unless `users`, `boards`, `columns` and `cards` all come back non-empty. It is a one-off Job applied by hand, never by ArgoCD. A restore writes ids outside `createNew`, so the bloom filters must be deleted and the server restarted afterwards.

**Restore drill.** `trellify-mongodb-restore-drill` rehearses that every Sunday at 22:00 UTC. It picks the newest archive in R2 that is under 36h old (no such archive fails the drill, so it also catches a backup job that silently stopped), decrypts it into an `emptyDir`, restores it into a throwaway `mongod` on `127.0.0.1` inside the same pod, and fails if a core collection comes back empty. Production MongoDB is never touched, and the decrypted copy never leaves the pod. That is why the drill runs in the cluster rather than on a GitHub runner, which would need the crypt passphrase as a repository secret. It holds about 512Mi for a few minutes a week.

Two rules in the `trellify-backups` group watch both CronJobs by the time of their last **success**, not by failed Jobs, which stay listed under `failedJobsHistoryLimit` and would keep an alert firing after a later run recovered: `TrellifyBackupStale` (nothing since 26h) and `TrellifyRestoreDrillStale` (nothing since 8 days). Before a first success both rules fall back to the CronJob's creation time, so a drill that has never passed starts alerting 8 days after it was deployed.

The sealed-secrets private key is **not** covered by this CronJob. It is backed up by hand, and never into the same R2 bucket under the same token - a single leaked credential should not hand over both the data and the key to everything else.

## Endpoints

| URL                                | What                                                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `https://trellify.duonggiabao.com` | The application                                                                                                               |
| `https://argocd.duonggiabao.com`   | ArgoCD - sync state, diffs, manual sync                                                                                       |
| `https://grafana.duonggiabao.com`  | Grafana on kube-prometheus-stack (7d / 15GB Prometheus retention; Alertmanager routes `service: trellify` alerts to Telegram) |

All three follow `active_origin`: they are served by whichever cluster the Cloudflare stack points at.

## AWS Failover

A cold standby on EKS in `ap-southeast-1`. It does not exist while the homelab is healthy. `terraform apply` builds it when the homelab is down, and `terraform destroy` removes it once the homelab is back.

```text
        trellify. / argocd. / grafana.duonggiabao.com  (proxied CNAMEs)
                                   │
              var.active_origin ───┤   infra/clusters/aws/terraform/cloudflare
                     ┌─────────────┴─────────────┐
                     ▼                           ▼
     b14acf31-….cfargotunnel.com      <aws tunnel>.cfargotunnel.com
       tunnel trellify-k3s              tunnel trellify-aws (remotely managed)
       homelab k3s                      EKS · 3 AZ · private subnets · NAT per AZ
```

**Two tunnels, not one.** If both clusters ran connectors for the same tunnel, Cloudflare would spread requests across them. A homelab that came back on its own would then serve its stale database next to AWS, a split-brain. With two tunnels the DNS record alone decides which cluster is live, and a homelab that recovers in the middle of a failover takes no traffic until the record is switched back. The switch is deliberately manual for the same reason. Each side has its own MongoDB, so an automatic health-check failover would send users to an empty or day-old database.

**Three stacks, three lifetimes:**

| Stack                  | State | Lifetime                                                                                                                                               |
| ---------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `terraform/bootstrap`  | local | Applied once. S3 state bucket (versioned, SSE-KMS with the free `aws/s3` key, TLS-only), which also holds the sealed-secrets keys. Costs cents a month |
| `terraform/cloudflare` | S3    | Permanent. The AWS tunnel and every DNS record that goes through a tunnel. A tunnel with no connectors costs nothing                                   |
| `terraform/cluster`    | S3    | Disposable. VPC, EKS, addons, ArgoCD and the bootstrap secrets. **`destroy` leaves nothing billable behind**                                           |

All paths are relative to `infra/clusters/aws/`. `terraform/cluster` holds every resource that costs money, and a single `destroy` removes all of it. EBS volumes are the one thing Kubernetes creates outside Terraform: PVCs are provisioned by the EBS CSI driver, and deleting the cluster never deletes them. So the `orphan_cleanup` resource runs **last** on destroy. The EKS module depends on it, so it outlives the nodes. It deletes every volume tagged `Cluster=trellify-dr` (the CSI driver's `extraVolumeTags`) plus the EKS log group that the control plane sometimes recreates while it shuts down. It runs PowerShell on Windows and bash elsewhere, and needs the `aws` CLI on PATH. Because the data is deleted with the cluster, finish the failback dump to R2 **before** destroying.

**The AWS cluster is a 1:1 copy of the homelab, never a subset.** It runs the same AppProjects and the same seven Applications under the same names, plus ArgoCD's own Ingress. Its tunnel routes the same `*.duonggiabao.com` and apex rules as `clusters/homelab/cloudflared/configmap.yaml`. `active_origin` moves **every** tunnel record together, `trellify.`, `argocd.` and `grafana.`, so after a failover all three are served by AWS. Cloudflare Access and WAF rules are attached to the hostname, not the origin, so they keep applying unchanged. Parity can be checked at any time by diffing the two `argocd/` builds.

Every difference is listed below. Each one is either forced by the platform or adds capacity; none removes a component. Keep it that way: a new Application, Ingress or hostname on the homelab goes into `clusters/aws` (and `tunnel_records`) in the same commit.

| Where                 | Homelab                               | AWS                                          | Why                                                                                                                                                                                                                   |
| --------------------- | ------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage/`            | `rancher.io/local-path`               | EBS gp3, encrypted                           | Same StorageClass name `local-path-retain`, so every PVC binds unchanged. `Retain` guards against an ArgoCD prune while the cluster is alive; `orphan_cleanup` deletes the volumes on destroy                         |
| `ingress-nginx/`      | `LoadBalancer`, `10.42.0.0/16`        | `ClusterIP`, VPC CIDR, 2 replicas            | A `LoadBalancer` on EKS would create a public ELB. The CIDR is where cloudflared pods live; with the wrong one `CF-Connecting-IP` is ignored and every user shares one 20 rps `/api` limit. Change it with `vpc_cidr` |
| `cloudflared/`        | config file + credentials, 2          | remote config + token, 3, one per AZ         | Remotely managed tunnel owned by Terraform                                                                                                                                                                            |
| `trellify/`           | daily backup                          | hourly backup                                | Writes made during a failover are the ones nobody else has                                                                                                                                                            |
| `argocd/apps/`        | every `platform-*` app synced by hand | `automated`; `trellify-prod` retries forever | Nobody is at the UI during an unattended apply. `trellify-prod` fails until kube-prometheus-stack has installed the `ServiceMonitor`/`PrometheusRule` CRDs                                                            |
| ArgoCD install        | upstream manifest                     | `argo-cd` Helm chart, same values            | Installed by Terraform; `platform/argocd/values.yaml` is shared                                                                                                                                                       |
| ArgoCD admin password | homelab's                             | new, generated at install                    | Read from `argocd-initial-admin-secret` on the AWS cluster. Grafana keeps its password: its SealedSecret is shared                                                                                                    |

Image tags need no attention. `trellify/` builds on `apps/trellify/overlays/prod`, so it inherits the tags `build-k8s-images.yml` bumps, and every deploy reaches both clusters.

`vpc-cni` runs with `enableNetworkPolicy`. Without it EKS accepts `networkpolicy.yaml` and silently enforces nothing.

The `terraform/cluster` state holds the sealed-secrets private keys and the `terraform/cloudflare` state holds the tunnel token. The bucket also stores the keys themselves under `bootstrap/`. That is why it is encrypted and closed to the public. Treat read access to it as access to the keys.

Alertmanager on AWS pings the same healthchecks.io check as the homelab, so the deadman switch stays green during a failover.

RPO is the newest archive in R2: the homelab backs up daily at 20:00 UTC, so up to 24h of writes can be lost. RTO is roughly 30 to 40 minutes, most of it EKS creation.
