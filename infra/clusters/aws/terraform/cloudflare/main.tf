terraform {
  required_version = ">= 1.10"

  backend "s3" {
    key          = "cloudflare/terraform.tfstate"
    region       = "ap-southeast-1"
    encrypt      = true
    use_lockfile = true
  }

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "5.28.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

variable "cloudflare_api_token" {
  description = "Tunnel:Edit + DNS:Edit token. Falls back to the CLOUDFLARE_API_TOKEN environment variable when null."
  type        = string
  sensitive   = true
  default     = null
}

variable "account_id" {
  type = string
}

variable "zone_id" {
  type = string
}

variable "zone_name" {
  type    = string
  default = "duonggiabao.com"
}

variable "tunnel_records" {
  description = "Every DNS record that routes through the homelab tunnel, hostname => existing record id. All of them follow active_origin, so the AWS cluster serves exactly what the homelab serves."
  type        = map(string)
}

variable "homelab_tunnel_id" {
  description = "The locally managed trellify-k3s tunnel, see infra/clusters/homelab/cloudflared/configmap.yaml"
  type        = string
  default     = "b14acf31-55ab-4582-99cc-6a4b28e32d1c"
}

variable "active_origin" {
  description = "Which cluster serves the hostname. Flip only after the target has the current data. No default, so an apply that forgets it fails instead of silently flipping back."
  type        = string

  validation {
    condition     = contains(["homelab", "aws"], var.active_origin)
    error_message = "active_origin must be \"homelab\" or \"aws\"."
  }
}

resource "cloudflare_zero_trust_tunnel_cloudflared" "aws" {
  account_id = var.account_id
  name       = "trellify-aws"
  config_src = "cloudflare"
}

resource "cloudflare_zero_trust_tunnel_cloudflared_config" "aws" {
  account_id = var.account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.aws.id

  config = {
    ingress = concat(
      [
        for hostname in ["*.${var.zone_name}", var.zone_name] : {
          hostname = hostname
          service  = "http://ingress-nginx-controller.ingress-nginx.svc.cluster.local:80"
          origin_request = {
            connect_timeout = 10
          }
        }
      ],
      [{ service = "http_status:404" }],
    )
  }
}

data "cloudflare_zero_trust_tunnel_cloudflared_token" "aws" {
  account_id = var.account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.aws.id
}

import {
  for_each = var.tunnel_records
  to       = cloudflare_dns_record.tunnel[each.key]
  id       = "${var.zone_id}/${each.value}"
}

resource "cloudflare_dns_record" "tunnel" {
  for_each = var.tunnel_records

  zone_id = var.zone_id
  name    = each.key
  type    = "CNAME"
  ttl     = 1
  proxied = true
  content = "${var.active_origin == "aws" ? cloudflare_zero_trust_tunnel_cloudflared.aws.id : var.homelab_tunnel_id}.cfargotunnel.com"
}

output "active_origin" {
  value = var.active_origin
}

output "aws_tunnel_id" {
  value = cloudflare_zero_trust_tunnel_cloudflared.aws.id
}

output "aws_tunnel_token" {
  value     = data.cloudflare_zero_trust_tunnel_cloudflared_token.aws.token
  sensitive = true
}
