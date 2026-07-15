# Minimal AWS deployment skeleton for Privacy Presence Manager.
# This is intentionally a starting point, not a hardened production topology.
# It provisions the network, a Postgres (RDS) and Redis (ElastiCache) instance,
# and an ECS Fargate cluster to run the api/web containers.
#
# Review and harden (private subnets only, secrets in SSM/Secrets Manager, WAF,
# least-privilege IAM, deletion protection) before any real deployment.

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "eu-west-1"
}

variable "project" {
  type    = string
  default = "ppm"
}

variable "db_password" {
  type      = string
  sensitive = true
}

# ── Networking ────────────────────────────────────────────────
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags                 = { Name = "${var.project}-vpc" }
}

resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags              = { Name = "${var.project}-public-${count.index}" }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# ── Data stores ───────────────────────────────────────────────
resource "aws_db_instance" "postgres" {
  identifier          = "${var.project}-postgres"
  engine              = "postgres"
  engine_version      = "16"
  instance_class      = "db.t4g.micro"
  allocated_storage   = 20
  db_name             = "ppm"
  username            = "ppm"
  password            = var.db_password
  storage_encrypted   = true # encryption at rest
  skip_final_snapshot = true # set false for production
  tags                = { Name = "${var.project}-postgres" }
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "${var.project}-redis"
  engine               = "redis"
  node_type            = "cache.t4g.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  tags                 = { Name = "${var.project}-redis" }
}

# ── Compute ───────────────────────────────────────────────────
resource "aws_ecs_cluster" "main" {
  name = "${var.project}-cluster"
}

# TODO: task definitions + services for api/web, ALB, ACM cert (TLS in transit),
# security groups, and autoscaling. Left as a clearly-marked next step.

output "postgres_endpoint" {
  value = aws_db_instance.postgres.endpoint
}

output "redis_endpoint" {
  value = aws_elasticache_cluster.redis.cache_nodes[0].address
}
