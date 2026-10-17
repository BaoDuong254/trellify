output "cluster_name" {
  value = module.eks.cluster_name
}

output "kubeconfig_command" {
  value = "aws eks update-kubeconfig --region ${var.region} --name ${module.eks.cluster_name} --alias trellify-aws --profile trellify"
}

output "vpc_cidr" {
  value = module.vpc.vpc_cidr_block
}
