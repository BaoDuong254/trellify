variable "region" {
  type    = string
  default = "ap-southeast-1"
}

variable "state_bucket" {
  description = "Output state_bucket of infra/clusters/aws/terraform/bootstrap; the Cloudflare stack's state is read from it"
  type        = string
}

variable "cluster_name" {
  type    = string
  default = "trellify-dr"
}

variable "kubernetes_version" {
  type    = string
  default = "1.36"
}

variable "vpc_cidr" {
  description = "Must match proxy-real-ip-cidr in infra/clusters/aws/ingress-nginx/values.yaml"
  type        = string
  default     = "10.60.0.0/16"
}

variable "node_instance_types" {
  type    = list(string)
  default = ["m7i.large"]
}

variable "node_count" {
  type    = number
  default = 3
}

variable "cluster_admin_arns" {
  description = "IAM principals with cluster-admin on EKS, independent of who runs terraform. Use the IAM role ARN of the SSO permission set (arn:aws:iam::<account>:role/aws-reserved/sso.amazonaws.com/<region>/AWSReservedSSO_...), not the assumed-role session ARN. The identity running terraform must be in this list."
  type        = list(string)

  validation {
    condition     = length(var.cluster_admin_arns) > 0 && alltrue([for arn in var.cluster_admin_arns : can(regex("^arn:aws:iam::[0-9]{12}:(role|user)/", arn))])
    error_message = "cluster_admin_arns needs at least one IAM role or user ARN (arn:aws:iam::...:role/... or :user/...), not an sts assumed-role ARN."
  }
}

variable "endpoint_public_access_cidrs" {
  description = "Who may reach the EKS API. IAM still gates every call; narrow this to your own IP when it is stable."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "git_repo_url" {
  type    = string
  default = "https://github.com/BaoDuong254/trellify.git"
}

variable "git_revision" {
  type    = string
  default = "main"
}
