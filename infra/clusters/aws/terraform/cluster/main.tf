data "aws_availability_zones" "available" {
  state = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

locals {
  azs     = slice(data.aws_availability_zones.available.names, 0, 3)
  windows = length(regexall("^[A-Za-z]:", abspath(path.root))) > 0
}

resource "terraform_data" "orphan_cleanup" {
  input = {
    region   = var.region
    cluster  = var.cluster_name
    windows  = local.windows
    loggroup = "/aws/eks/${var.cluster_name}/cluster"
  }

  provisioner "local-exec" {
    when        = destroy
    interpreter = self.input.windows ? ["powershell", "-NoProfile", "-Command"] : ["bash", "-c"]
    command = self.input.windows ? join("; ", [
      "$ids = aws ec2 describe-volumes --region ${self.input.region} --filters Name=tag:Cluster,Values=${self.input.cluster} --query 'Volumes[].VolumeId' --output text",
      "foreach ($id in ($ids -split '\\s+' | Where-Object { $_ })) { aws ec2 wait volume-available --region ${self.input.region} --volume-ids $id; aws ec2 delete-volume --region ${self.input.region} --volume-id $id; Write-Output \"deleted $id\" }",
      "aws logs delete-log-group --region ${self.input.region} --log-group-name ${self.input.loggroup} 2>$null; exit 0",
      ]) : join("\n", [
      "for id in $(aws ec2 describe-volumes --region ${self.input.region} --filters Name=tag:Cluster,Values=${self.input.cluster} --query 'Volumes[].VolumeId' --output text); do",
      "  aws ec2 wait volume-available --region ${self.input.region} --volume-ids $id && aws ec2 delete-volume --region ${self.input.region} --volume-id $id && echo \"deleted $id\"",
      "done",
      "aws logs delete-log-group --region ${self.input.region} --log-group-name ${self.input.loggroup} 2>/dev/null || true",
    ])
  }
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "6.7.3"

  name = var.cluster_name
  cidr = var.vpc_cidr
  azs  = local.azs

  private_subnets = [for i, _ in local.azs : cidrsubnet(var.vpc_cidr, 4, i)]
  public_subnets  = [for i, _ in local.azs : cidrsubnet(var.vpc_cidr, 8, 48 + i)]

  enable_nat_gateway     = true
  one_nat_gateway_per_az = true
  single_nat_gateway     = false

  enable_dns_hostnames = true
  enable_dns_support   = true

  enable_flow_log                                 = true
  create_flow_log_cloudwatch_log_group            = true
  create_flow_log_cloudwatch_iam_role             = true
  flow_log_cloudwatch_log_group_retention_in_days = 14

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
  }
  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }
}

module "ebs_csi_pod_identity" {
  source  = "terraform-aws-modules/eks-pod-identity/aws"
  version = "2.9.0"

  name                      = "${var.cluster_name}-ebs-csi"
  attach_aws_ebs_csi_policy = true
}

module "cluster_autoscaler_pod_identity" {
  source  = "terraform-aws-modules/eks-pod-identity/aws"
  version = "2.9.0"

  name                             = "${var.cluster_name}-cluster-autoscaler"
  attach_cluster_autoscaler_policy = true
  cluster_autoscaler_cluster_names = [module.eks.cluster_name]

  associations = {
    cluster_autoscaler = {
      cluster_name    = module.eks.cluster_name
      namespace       = "kube-system"
      service_account = "cluster-autoscaler"
    }
  }
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "21.29.0"

  name               = terraform_data.orphan_cleanup.input.cluster
  kubernetes_version = var.kubernetes_version

  endpoint_public_access       = true
  endpoint_private_access      = true
  endpoint_public_access_cidrs = var.endpoint_public_access_cidrs

  node_security_group_additional_rules = {
    ingress_self_all = {
      description = "Node to node all ports, so pods reach ingress-nginx on 80/443 across nodes"
      protocol    = "-1"
      from_port   = 0
      to_port     = 0
      type        = "ingress"
      self        = true
    }
  }

  enable_cluster_creator_admin_permissions = false
  access_entries = {
    for arn in var.cluster_admin_arns : arn => {
      principal_arn = arn
      policy_associations = {
        admin = {
          policy_arn   = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = { type = "cluster" }
        }
      }
    }
  }
  enabled_log_types = ["api", "audit", "authenticator"]

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  addons = {
    vpc-cni = {
      before_compute = true
      configuration_values = jsonencode({
        enableNetworkPolicy = "true"
      })
    }
    eks-pod-identity-agent = {
      before_compute = true
    }
    kube-proxy = {}
    coredns    = {}
    aws-ebs-csi-driver = {
      configuration_values = jsonencode({
        controller = {
          extraVolumeTags = { Project = "trellify", Cluster = var.cluster_name }
        }
      })
      pod_identity_association = [{
        role_arn        = module.ebs_csi_pod_identity.iam_role_arn
        service_account = "ebs-csi-controller-sa"
      }]
    }
    metrics-server = {}
  }

  eks_managed_node_groups = merge(var.loadgen_node_count > 0 ? {
    loadgen = {
      ami_type       = "AL2023_x86_64_STANDARD"
      instance_types = var.loadgen_instance_types

      min_size     = var.loadgen_node_count
      max_size     = var.loadgen_node_count
      desired_size = var.loadgen_node_count

      labels = { "trellify/role" = "loadgen" }
      taints = {
        loadgen = { key = "loadgen", value = "true", effect = "NO_SCHEDULE" }
      }

      block_device_mappings = {
        xvda = {
          device_name = "/dev/xvda"
          ebs = {
            volume_size           = 20
            volume_type           = "gp3"
            encrypted             = true
            delete_on_termination = true
          }
        }
      }

      metadata_options = {
        http_endpoint               = "enabled"
        http_tokens                 = "required"
        http_put_response_hop_limit = 1
      }
    }
    } : {}, {
    default = {
      ami_type       = "AL2023_x86_64_STANDARD"
      instance_types = var.node_instance_types

      min_size     = var.node_count
      max_size     = var.node_count * 2
      desired_size = var.node_count

      block_device_mappings = {
        xvda = {
          device_name = "/dev/xvda"
          ebs = {
            volume_size           = 50
            volume_type           = "gp3"
            encrypted             = true
            delete_on_termination = true
          }
        }
      }

      metadata_options = {
        http_endpoint               = "enabled"
        http_tokens                 = "required"
        http_put_response_hop_limit = 1
      }
    }
  })
}
