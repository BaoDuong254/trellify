# Trellify Infrastructure

Everything Trellify needs to run in production lives in this directory as declarative YAML. Nothing here is applied by hand because [ArgoCD](https://argo-cd.readthedocs.io/) watches the `main` branch and reconciles the cluster to match it. Changing production means committing a change here.

The cluster is a single-node [k3s](https://docs.k3s.io/) install on an Ubuntu VM, serving `https://trellify.duonggiabao.com`.

## 📋 Table of Contents

- [Trellify Infrastructure](#trellify-infrastructure)
  - [📋 Table of Contents](#-table-of-contents)
  - [Architecture](#architecture)
  - [Directory Map](#directory-map)
  - [How ArgoCD Manages This](#how-argocd-manages-this)
  - [Bootstrapping a Fresh Cluster](#bootstrapping-a-fresh-cluster)
  - [Application Layout](#application-layout)
  - [Configuration and Secrets](#configuration-and-secrets)
  - [Deployment Flow](#deployment-flow)
  - [Common Operations](#common-operations)

## Architecture

```text
                          Internet
                             │
                             ▼
                     Cloudflare edge ──── TLS termination, WAF, Access
                             │
                             │  QUIC, outbound only — no inbound port is
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
                             │  Tailscale subnet router — SSH, kubectl
                        Developer machine
```

The load-bearing idea: **the platform layer knows nothing about Trellify**. Adding a second project means one namespace and one ArgoCD `Application` — no change to cloudflared, ingress-nginx, or DNS.

Traffic path for a browser request: Cloudflare edge → `cloudflared` tunnel pod → `ingress-nginx-controller` Service → the Ingress rule that matches the path → `trellify-client` (`/`) or `trellify-server` (`/api`, `/socket.io`).

## Directory Map

| Path              | Managed by                                | Contents                                                                                  |
| ----------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| `argocd/`         | applied once by hand, self-managing after | App-of-apps: `bootstrap/root-app.yaml` → `projects/` + `apps/`, plus ArgoCD's own Ingress |
| `cloudflared/`    | `platform-cloudflared`                    | Tunnel Deployment + config routing `*.duonggiabao.com` into ingress-nginx                 |
| `ingress-nginx/`  | `platform-ingress-nginx`                  | Helm values for the `ingress-nginx` chart, pinned at `4.15.1`                             |
| `sealed-secrets/` | `platform-sealed-secrets`                 | Helm values for the `sealed-secrets` controller, pinned at `2.19.2`                       |
| `observability/`  | `platform-observability` (+ `-extras`)    | `kube-prometheus-stack` `88.5.2` values, plus the Grafana Ingress and its SealedSecret    |
| `storage/`        | `platform-storage`                        | The `local-path-retain` StorageClass (`reclaimPolicy: Retain`)                            |
| `trellify/`       | `trellify-prod`                           | The application itself — Kustomize `base/` + `overlays/prod/`                             |

## How ArgoCD Manages This

Two `AppProject`s draw the boundary between platform and application, and they are what stops a mistake in one from reaching the other:

| Project                                     | Source repos                                                                       | May deploy to             | Cluster-scoped resources |
| ------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------- | ------------------------ |
| [`platform`](argocd/projects/platform.yaml) | this repo + the ingress-nginx, sealed-secrets, and prometheus-community Helm repos | any namespace             | anything                 |
| [`trellify`](argocd/projects/trellify.yaml) | this repo only                                                                     | `trellify` namespace only | only `Namespace`         |

Both projects carry `argocd.argoproj.io/sync-wave: "-1"` so they exist before any `Application` that references them.

Applications that consume an upstream Helm chart use ArgoCD's **multi-source** form: the chart comes from its own repo, and the values file is pulled from this repo through a `ref: values` source, referenced as `$values/infra/<component>/values.yaml`. The chart stays untouched upstream while our overrides stay in Git.

## Bootstrapping a Fresh Cluster

Order matters here — each step depends on the one above it.

**1. Install k3s and ArgoCD.**

```bash
curl -sfL https://get.k3s.io | sh -
kubectl create namespace argocd
kubectl -n argocd apply -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

**2. Restore the sealed-secrets master key — before anything else syncs.**

The `SealedSecret` resources in this repo are encrypted against one specific controller key. A fresh controller generates a _new_ key and cannot decrypt them, so the app pods come up as `CreateContainerConfigError` with no obvious cause. Restore the backed-up key first, then restart the controller so it picks the key up:

```bash
kubectl apply -f sealed-secrets-master.key       # kept OUTSIDE this repo — see below
kubectl -n sealed-secrets delete pod -l name=sealed-secrets-controller
```

**3. Apply the root application.**

```bash
kubectl apply -f infra/argocd/bootstrap/root-app.yaml
```

[`root-app.yaml`](argocd/bootstrap/root-app.yaml) points at `infra/argocd` with `directory.recurse: true` and `exclude: "bootstrap/*"` — so it picks up every project and every application in this directory, but not itself. From that point ArgoCD manages its own configuration, and the only bootstrap artifact is that single `kubectl apply`.

**4. Watch it converge.**

```bash
kubectl -n argocd get applications -w
```

Expect the `platform-*` applications to go healthy first, then `trellify-prod`.

## Application Layout

[`trellify/base/`](trellify/base/kustomization.yaml) holds environment-agnostic manifests; [`trellify/overlays/prod/`](trellify/overlays/prod/kustomization.yaml) adds the production SealedSecrets, patches the ingress host and the MongoDB URI, and pins the image tags.

| Workload           | Replicas        | Image                                 | Notes                                                                 |
| ------------------ | --------------- | ------------------------------------- | --------------------------------------------------------------------- |
| `trellify-server`  | 3, HPA up to 6  | `ghcr.io/baoduong254/trellify-server` | PodDisruptionBudget keeps `minAvailable: 2`; HPA targets 70% CPU      |
| `trellify-worker`  | 1               | same image as the server              | Runs `dist/worker.js` — the BullMQ consumer                           |
| `trellify-client`  | 2               | `ghcr.io/baoduong254/trellify-client` | nginx serving the built Vite bundle                                   |
| `trellify-mongodb` | 1 (StatefulSet) | `mongo:8.0`                           | 20Gi PVC on `local-path-retain`, standalone (`directConnection=true`) |
| `trellify-redis`   | 1 (StatefulSet) | `redis:8-alpine`                      | 8Gi PVC on `local-path-retain`                                        |

**The HPA and ArgoCD would otherwise fight.** The HPA writes `spec.replicas` on `trellify-server`; ArgoCD's `selfHeal` reads that as drift from Git and writes it back — scaling would oscillate forever. [`trellify-prod.yaml`](argocd/apps/trellify-prod.yaml) resolves it with `ignoreDifferences` on `/spec/replicas` for that one Deployment.

**Three Ingresses share one host**, because each path needs different nginx behaviour ([`base/ingress.yaml`](trellify/base/ingress.yaml)):

| Ingress        | Path         | Why it is separate                                                                 |
| -------------- | ------------ | ---------------------------------------------------------------------------------- |
| `trellify-web` | `/`          | Plain static serving                                                               |
| `trellify-api` | `/api`       | Rate limited — 20 rps with a burst multiplier of 2, rejecting with `429`           |
| `trellify-ws`  | `/socket.io` | 1-hour read/send timeouts and cookie affinity, so a WebSocket is not cut every 60s |

[`base/networkpolicy.yaml`](trellify/base/networkpolicy.yaml) starts from `default-deny-ingress` across the whole namespace and opens exactly three paths: ingress-nginx → server/client, server/worker → Redis, and server/worker (plus any Job pod, for the backup CronJob) → MongoDB.

## Configuration and Secrets

Non-sensitive configuration is plain text in [`base/configmap-server.yaml`](trellify/base/configmap-server.yaml) — ports, `CLIENT_URL`, token lifetimes, the Cloudinary cloud name. Read it to see what the server expects at runtime.

Everything sensitive is a **SealedSecret**: encrypted with the cluster's public key, safe to commit to a public repo, decryptable only by the controller running in this cluster.

| SealedSecret                                                                    | Produces Secret           |
| ------------------------------------------------------------------------------- | ------------------------- |
| [`sealedsecret-server.yaml`](trellify/overlays/prod/sealedsecret-server.yaml)   | `trellify-server-secrets` |
| [`sealedsecret-mongodb.yaml`](trellify/overlays/prod/sealedsecret-mongodb.yaml) | `trellify-mongodb-auth`   |
| [`sealedsecret-redis.yaml`](trellify/overlays/prod/sealedsecret-redis.yaml)     | `trellify-redis-auth`     |

To add or rotate a value, generate the Secret locally, seal it, and commit the sealed output:

```bash
kubectl create secret generic trellify-server-secrets \
  --namespace trellify \
  --from-literal=BREVO_API_KEY=... \
  --dry-run=client -o yaml \
| kubeseal --format yaml \
    --controller-namespace sealed-secrets \
    --controller-name sealed-secrets \
> infra/trellify/overlays/prod/sealedsecret-server.yaml
```

ArgoCD applies the committed file and the controller decrypts it in-cluster. The plaintext Secret never touches Git.

> **Important**
> The controller's private key is the only thing that can decrypt these files. `.gitignore` excludes `*.key` and `sealed-secrets-master*.yaml` precisely so it never lands in Git — which means **it must be backed up somewhere else**. Lose it and every SealedSecret here becomes unreadable and has to be regenerated from the original values.

The MongoDB connection string is assembled in the overlay rather than stored as a secret: [`patch-mongodb-uri-server.yaml`](trellify/overlays/prod/patch-mongodb-uri-server.yaml) injects `MONGO_USERNAME` and `MONGO_PASSWORD` from the Secret, then builds `MONGODB_URI` from them using `$(VAR)` interpolation. The worker gets the same patch.

## Deployment Flow

Application code and infrastructure state meet in one commit loop:

```
git push origin main
        │
        ▼
.github/workflows/build-k8s-images.yml
        │  job: build-and-push
        ├─ tag = sha-$(git rev-parse --short HEAD)      ← immutable, never reused
        ├─ build apps/server/Dockerfile  → ghcr.io/baoduong254/trellify-server:<tag>
        └─ build apps/client/Dockerfile  → ghcr.io/baoduong254/trellify-client:<tag>
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
- **`latest` exists but is never what gets deployed.** The overlay always pins the `sha-<short>` tag, so whatever is running traces back to exactly one commit — and a rollback is a Git operation, not a registry operation.
- **The client is built with an empty `VITE_API_ENDPOINT`.** The client and API share one host, so the browser calls `/api/v1/...` on its own origin and the Ingress routes it. Nothing in the bundle hardcodes a backend URL.

## Common Operations

**Check what is running:**

```bash
kubectl -n argocd get applications
kubectl -n trellify get pods,ingress
kubectl -n trellify get deploy trellify-server \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```

**Roll back the application.** Do it through Git — `kubectl rollout undo` is reverted within seconds by ArgoCD's `selfHeal`:

```bash
git log --oneline -- infra/trellify/overlays/prod/kustomization.yaml
git revert <bump-commit>
git push
```

**Force a sync** instead of waiting for the poll interval:

```bash
argocd app sync trellify-prod
```

**MongoDB backups** run as a CronJob at `0 20 * * *` into a dedicated 20Gi PVC on `local-path-retain`, keeping the last 3 successful and 3 failed jobs ([`backup-cronjob.yaml`](trellify/base/mongodb/backup-cronjob.yaml)):

```bash
kubectl -n trellify get cronjob trellify-mongodb-backup
kubectl -n trellify create job --from=cronjob/trellify-mongodb-backup manual-backup-1
```

**Dashboards and consoles:**

| URL                                | What                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| `https://trellify.duonggiabao.com` | The application                                                                             |
| `https://argocd.duonggiabao.com`   | ArgoCD — sync state, diffs, manual sync                                                     |
| `https://grafana.duonggiabao.com`  | Grafana on kube-prometheus-stack (7d / 15GB Prometheus retention; Alertmanager is disabled) |
