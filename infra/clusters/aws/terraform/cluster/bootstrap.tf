data "terraform_remote_state" "cloudflare" {
  backend = "s3"

  config = {
    bucket = var.state_bucket
    key    = "cloudflare/terraform.tfstate"
    region = var.region
  }
}

data "aws_s3_object" "sealed_secrets_keys" {
  bucket = var.state_bucket
  key    = "bootstrap/sealed-secrets-keys.yaml"
}

locals {
  sealed_keys_doc = yamldecode(data.aws_s3_object.sealed_secrets_keys.body)
  sealed_keys = {
    for item in try(local.sealed_keys_doc.items, [local.sealed_keys_doc]) :
    item.metadata.name => item.data
  }
}

resource "kubernetes_namespace_v1" "sealed_secrets" {
  metadata {
    name = "sealed-secrets"
  }

  lifecycle {
    ignore_changes = [metadata[0].labels, metadata[0].annotations]
  }

  depends_on = [module.eks]
}

resource "kubernetes_secret_v1" "sealed_secrets_keys" {
  for_each = nonsensitive(toset(keys(local.sealed_keys)))

  metadata {
    name      = each.key
    namespace = kubernetes_namespace_v1.sealed_secrets.metadata[0].name
    labels = {
      "sealedsecrets.bitnami.com/sealed-secrets-key" = "active"
    }
  }

  type        = "kubernetes.io/tls"
  binary_data = local.sealed_keys[each.key]
}

resource "kubernetes_namespace_v1" "cloudflared" {
  metadata {
    name = "cloudflared"
  }

  lifecycle {
    ignore_changes = [metadata[0].labels, metadata[0].annotations]
  }

  depends_on = [module.eks]
}

resource "kubernetes_secret_v1" "cloudflared_token" {
  metadata {
    name      = "cloudflared-token"
    namespace = kubernetes_namespace_v1.cloudflared.metadata[0].name
  }

  data = {
    token = data.terraform_remote_state.cloudflare.outputs.aws_tunnel_token
  }
}

resource "helm_release" "argocd" {
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = "10.10.5"
  namespace        = "argocd"
  create_namespace = true
  wait             = true
  timeout          = 900

  values = [file("${path.module}/../../../../platform/argocd/values.yaml")]

  depends_on = [module.eks]
}

resource "helm_release" "argocd_roots" {
  name       = "argocd-roots"
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argocd-apps"
  version    = "2.0.6"
  namespace  = helm_release.argocd.namespace

  values = [yamlencode({
    applications = {
      root = {
        namespace = "argocd"
        project   = "default"
        source = {
          repoURL        = var.git_repo_url
          targetRevision = var.git_revision
          path           = "infra/clusters/aws/argocd"
        }
        destination = {
          server    = "https://kubernetes.default.svc"
          namespace = "argocd"
        }
        syncPolicy = {
          automated   = { prune = true, selfHeal = true }
          syncOptions = ["CreateNamespace=true"]
        }
      }
    }
  })]

  depends_on = [
    kubernetes_secret_v1.sealed_secrets_keys,
    kubernetes_secret_v1.cloudflared_token,
  ]
}
