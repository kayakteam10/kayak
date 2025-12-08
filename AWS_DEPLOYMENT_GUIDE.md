# AWS Deployment Guide - Kayak Simulation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         AWS Cloud                           │
│                                                             │
│  ┌──────────────┐         ┌─────────────────────┐         │
│  │   Route 53   │────────▶│  CloudFront/ALB     │         │
│  │   (DNS)      │         │  (Load Balancer)    │         │
│  └──────────────┘         └──────────┬──────────┘         │
│                                      │                      │
│  ┌───────────────────────────────────▼──────────────────┐  │
│  │                  VPC (10.0.0.0/16)                   │  │
│  │                                                       │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │         Public Subnet (10.0.1.0/24)          │   │  │
│  │  │                                               │   │  │
│  │  │  ┌──────────┐  ┌──────────┐  ┌───────────┐  │   │  │
│  │  │  │ Frontend │  │ Platform │  │   API     │  │   │  │
│  │  │  │   EC2    │  │ Gateway  │  │ Gateway   │  │   │  │
│  │  │  │  :3000   │  │   :8080  │  │           │  │   │  │
│  │  │  └──────────┘  └──────────┘  └───────────┘  │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  │                                                       │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │        Private Subnet (10.0.2.0/24)          │   │  │
│  │  │                                               │   │  │
│  │  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌───────┐ │   │  │
│  │  │  │Flight  │ │Hotel   │ │Car     │ │Booking││ │   │  │
│  │  │  │Service │ │Service │ │Service │ │Service││ │   │  │
│  │  │  │  :8001 │ │  :8002 │ │  :8003 │ │  :8004││ │   │  │
│  │  │  └────────┘ └────────┘ └────────┘ └───────┘ │   │  │
│  │  │                                               │   │  │
│  │  │  ┌────────┐ ┌────────┐ ┌────────┐           │   │  │
│  │  │  │Payment │ │Review  │ │   AI   │           │   │  │
│  │  │  │Service │ │Service │ │Service │           │   │  │
│  │  │  │  :8005 │ │  :8006 │ │  :8007 │           │   │  │
│  │  │  └────────┘ └────────┘ └────────┘           │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  │                                                       │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │       Database Subnet (10.0.3.0/24)          │   │  │
│  │  │                                               │   │  │
│  │  │  ┌────────┐  ┌──────────┐  ┌──────────────┐ │   │  │
│  │  │  │  RDS   │  │DocumentDB│  │ ElastiCache  │ │   │  │
│  │  │  │ MySQL  │  │ (MongoDB)│  │   (Redis)    │ │   │  │
│  │  │  │  :3306 │  │  :27017  │  │    :6379     │ │   │  │
│  │  │  └────────┘  └──────────┘  └──────────────┘ │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │             Amazon MSK (Kafka)              │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────┐  ┌──────────┐  ┌─────────────┐          │
│  │     S3      │  │CloudWatch│  │ Secrets     │          │
│  │  (Assets)   │  │  (Logs)  │  │  Manager    │          │
│  └─────────────┘  └──────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **SSH Key Pair** created in your AWS region
4. **Domain Name** (optional, for production)

## Step-by-Step Deployment

### 1. Infrastructure Setup

#### 1.1 Create VPC and Subnets

```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=kayak-vpc}]'

# Create Public Subnet (for frontend, gateway)
aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.0.1.0/24 --availability-zone us-east-1a

# Create Private Subnet (for microservices)
aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.0.2.0/24 --availability-zone us-east-1a

# Create Database Subnet (for RDS, ElastiCache)
aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.0.3.0/24 --availability-zone us-east-1a

# Create Internet Gateway
aws ec2 create-internet-gateway --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=kayak-igw}]'
aws ec2 attach-internet-gateway --vpc-id <VPC_ID> --internet-gateway-id <IGW_ID>
```

#### 1.2 Set Up Security Groups

```bash
# Frontend Security Group (Allow HTTP/HTTPS)
aws ec2 create-security-group --group-name kayak-frontend-sg --description "Security group for frontend" --vpc-id <VPC_ID>
aws ec2 authorize-security-group-ingress --group-id <SG_ID> --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id <SG_ID> --protocol tcp --port 443 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id <SG_ID> --protocol tcp --port 3000 --cidr 10.0.0.0/16

# Gateway Security Group (Allow from Frontend and ALB)
aws ec2 create-security-group --group-name kayak-gateway-sg --description "Security group for platform gateway" --vpc-id <VPC_ID>
aws ec2 authorize-security-group-ingress --group-id <SG_ID> --protocol tcp --port 8080 --cidr 10.0.0.0/16

# Microservices Security Group (Allow from Gateway only)
aws ec2 create-security-group --group-name kayak-services-sg --description "Security group for microservices" --vpc-id <VPC_ID>
aws ec2 authorize-security-group-ingress --group-id <SG_ID> --protocol tcp --port 8001-8007 --source-group <GATEWAY_SG_ID>

# Database Security Group
aws ec2 create-security-group --group-name kayak-db-sg --description "Security group for databases" --vpc-id <VPC_ID>
aws ec2 authorize-security-group-ingress --group-id <SG_ID> --protocol tcp --port 3306 --source-group <SERVICES_SG_ID>
aws ec2 authorize-security-group-ingress --group-id <SG_ID> --protocol tcp --port 27017 --source-group <SERVICES_SG_ID>
aws ec2 authorize-security-group-ingress --group-id <SG_ID> --protocol tcp --port 6379 --source-group <SERVICES_SG_ID>
```

### 2. Database Setup

#### 2.1 RDS MySQL

```bash
# Create RDS MySQL instance
aws rds create-db-instance \
    --db-instance-identifier kayak-mysql \
    --db-instance-class db.t3.medium \
    --engine mysql \
    --engine-version 8.0.35 \
    --master-username admin \
    --master-user-password <PASSWORD> \
    --allocated-storage 100 \
    --vpc-security-group-ids <DB_SG_ID> \
    --db-subnet-group-name kayak-db-subnet-group \
    --backup-retention-period 7 \
    --multi-az \
    --storage-encrypted

# Get endpoint after creation
aws rds describe-db-instances --db-instance-identifier kayak-mysql --query 'DBInstances[0].Endpoint.Address'
```

#### 2.2 DocumentDB (MongoDB Compatible)

```bash
# Create DocumentDB cluster
aws docdb create-db-cluster \
    --db-cluster-identifier kayak-docdb \
    --engine docdb \
    --master-username admin \
    --master-user-password <PASSWORD> \
    --vpc-security-group-ids <DB_SG_ID> \
    --db-subnet-group-name kayak-db-subnet-group

# Create instance in cluster
aws docdb create-db-instance \
    --db-instance-identifier kayak-docdb-instance \
    --db-instance-class db.t3.medium \
    --engine docdb \
    --db-cluster-identifier kayak-docdb
```

#### 2.3 ElastiCache Redis

```bash
# Create ElastiCache Redis cluster
aws elasticache create-cache-cluster \
    --cache-cluster-id kayak-redis \
    --cache-node-type cache.t3.medium \
    --engine redis \
    --num-cache-nodes 1 \
    --security-group-ids <DB_SG_ID> \
    --cache-subnet-group-name kayak-cache-subnet-group
```

### 3. Message Queue Setup

#### 3.1 Amazon MSK (Kafka)

```bash
# Create MSK cluster
aws kafka create-cluster \
    --cluster-name kayak-kafka \
    --broker-node-group-info file://broker-info.json \
    --kafka-version 3.5.1 \
    --number-of-broker-nodes 2

# broker-info.json
{
  "InstanceType": "kafka.m5.large",
  "ClientSubnets": ["<SUBNET_1>", "<SUBNET_2>"],
  "SecurityGroups": ["<SG_ID>"]
}
```

### 4. EC2 Instances Setup

#### 4.1 Launch Template Configuration

Create a `user-data.sh` script for each service:

```bash
#!/bin/bash
# User Data Script for Service EC2 Instance

# Update system
yum update -y

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Install git
yum install -y git

# Clone repository
cd /home/ec2-user
git clone https://github.com/<your-repo>/KayakSimulation.git
cd KayakSimulation

# Set environment variables
export NODE_ENV=production
export PORT=8001
export DB_HOST=<RDS_ENDPOINT>
export DB_USER=admin
export DB_PASSWORD=<PASSWORD>
export DB_NAME=kayak_db
export REDIS_URL=redis://<REDIS_ENDPOINT>:6379
export KAFKA_BROKER=<MSK_BROKER>:9092

# Install dependencies and start service
cd services/flight-service
npm install --production
npm start
```

#### 4.2 Launch EC2 Instances

```bash
# Launch Flight Service
aws ec2 run-instances \
    --image-id ami-0c55b159cbfafe1f0 \
    --instance-type t3.medium \
    --key-name <YOUR_KEY_PAIR> \
    --security-group-ids <SERVICES_SG_ID> \
    --subnet-id <PRIVATE_SUBNET_ID> \
    --user-data file://user-data-flight.sh \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=kayak-flight-service}]'

# Repeat for each service (hotel, car, booking, payment, review, AI)
```

### 5. Environment Configuration

#### 5.1 Create Environment Files on Each EC2 Instance

SSH into each instance and create `/etc/kayak/.env`:

```bash
# SSH to instance
ssh -i <KEY_FILE> ec2-user@<INSTANCE_IP>

# Create environment file
sudo mkdir -p /etc/kayak
sudo vi /etc/kayak/.env
```

Add service-specific environment variables:

```bash
# Flight Service Environment
NODE_ENV=production
PORT=8001

# Database
DB_HOST=kayak-mysql.xxxxxxxx.us-east-1.rds.amazonaws.com
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=<PASSWORD>
DB_NAME=kayak_db

# Redis
REDIS_URL=redis://kayak-redis.xxxxxx.cache.amazonaws.com:6379

# Kafka
KAFKA_BROKER=b-1.kayak-kafka.xxxxx.kafka.us-east-1.amazonaws.com:9092

# Gateway URL (for internal communication)
GATEWAY_URL=http://<PLATFORM_PRIVATE_IP>:8080

# Logging
LOG_LEVEL=info

# Security
JWT_SECRET=<GENERATED_SECRET>
```

#### 5.2 Use AWS Systems Manager Parameter Store

```bash
# Store secrets in Parameter Store
aws ssm put-parameter --name "/kayak/db/password" --value "<PASSWORD>" --type "SecureString"
aws ssm put-parameter --name "/kayak/stripe/secret" --value "<STRIPE_KEY>" --type "SecureString"
aws ssm put-parameter --name "/kayak/gemini/apikey" --value "<GEMINI_KEY>" --type "SecureString"

# Retrieve in application
const dbPassword = await ssm.getParameter({ Name: '/kayak/db/password', WithDecryption: true });
```

### 6. Load Balancer Setup

#### 6.1 Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
    --name kayak-alb \
    --subnets <PUBLIC_SUBNET_1> <PUBLIC_SUBNET_2> \
    --security-groups <ALB_SG_ID>

# Create Target Groups for each service
aws elbv2 create-target-group \
    --name kayak-platform-tg \
    --protocol HTTP \
    --port 8080 \
    --vpc-id <VPC_ID> \
    --health-check-path /health

# Register targets
aws elbv2 register-targets \
    --target-group-arn <TG_ARN> \
    --targets Id=<INSTANCE_ID>

# Create Listener Rules
aws elbv2 create-listener \
    --load-balancer-arn <ALB_ARN> \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=<TG_ARN>
```

### 7. Frontend Deployment

#### 7.1 Build Frontend

```bash
# On your local machine
cd frontend

# Set production environment variables
export REACT_APP_API_URL=https://api.yourdomain.com
export REACT_APP_STRIPE_PUBLISHABLE_KEY=<YOUR_KEY>

# Build
npm run build

# Upload to S3
aws s3 sync build/ s3://kayak-frontend-bucket/ --delete
```

#### 7.2 CloudFront Distribution

```bash
# Create CloudFront distribution
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

### 8. Monitoring and Logging

#### 8.1 CloudWatch Setup

```bash
# Install CloudWatch agent on each EC2
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U ./amazon-cloudwatch-agent.rpm

# Configure agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

#### 8.2 Application Logs

Configure each service to send logs to CloudWatch:

```javascript
// In your service code
const winston = require('winston');
const CloudWatchTransport = require('winston-cloudwatch');

winston.add(new CloudWatchTransport({
  logGroupName: '/kayak/flight-service',
  logStreamName: process.env.INSTANCE_ID,
  awsRegion: 'us-east-1'
}));
```

## Environment Variables Reference

### All Services Common Variables

```bash
NODE_ENV=production
LOG_LEVEL=info
PORT=<SERVICE_PORT>

# Database
DB_HOST=<RDS_ENDPOINT>
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=<FROM_SECRETS_MANAGER>
DB_NAME=kayak_db

# Redis
REDIS_URL=redis://<ELASTICACHE_ENDPOINT>:6379

# Kafka
KAFKA_BROKER=<MSK_BROKER>:9092

# Security
JWT_SECRET=<FROM_SECRETS_MANAGER>
SESSION_SECRET=<FROM_SECRETS_MANAGER>
```

### Platform Gateway Specific

```bash
PORT=8080
FLIGHT_SERVICE_URL=http://<FLIGHT_EC2_PRIVATE_IP>:8001
HOTEL_SERVICE_URL=http://<HOTEL_EC2_PRIVATE_IP>:8002
CAR_SERVICE_URL=http://<CAR_EC2_PRIVATE_IP>:8003
BOOKING_SERVICE_URL=http://<BOOKING_EC2_PRIVATE_IP>:8004
PAYMENT_SERVICE_URL=http://<PAYMENT_EC2_PRIVATE_IP>:8005
REVIEW_SERVICE_URL=http://<REVIEW_EC2_PRIVATE_IP>:8006
AI_SERVICE_URL=http://<AI_EC2_PRIVATE_IP>:8007

STRIPE_SECRET_KEY=<FROM_SECRETS_MANAGER>
CORS_ORIGIN=https://yourdomain.com
```

### Frontend

```bash
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_STRIPE_PUBLISHABLE_KEY=<YOUR_KEY>
REACT_APP_ENV=production
```

## Deployment Checklist

- [ ] VPC and Subnets created
- [ ] Security Groups configured
- [ ] RDS MySQL provisioned and initialized
- [ ] DocumentDB/MongoDB provisioned
- [ ] ElastiCache Redis provisioned
- [ ] MSK Kafka cluster created
- [ ] All EC2 instances launched
- [ ] Environment variables set on each instance
- [ ] Services running and healthy
- [ ] Load Balancer configured
- [ ] Frontend built and deployed
- [ ] CloudFront distribution created
- [ ] Route 53 DNS configured
- [ ] SSL certificates installed
- [ ] CloudWatch monitoring enabled
- [ ] Backup strategy implemented

## Cost Optimization

1. **Use Reserved Instances** for predictable workloads
2. **Auto Scaling Groups** for microservices
3. **RDS Read Replicas** for read-heavy operations
4. **ElastiCache** to reduce database load
5. **S3 Lifecycle Policies** for old logs
6. **CloudWatch Alarms** for unused resources

## Security Best Practices

1. **Never hardcode** credentials
2. **Use IAM Roles** for EC2 instances
3. **Enable encryption** at rest and in transit
4. **Regular security patches**
5. **Network ACLs** for additional security
6. **VPC Flow Logs** for network monitoring
7. **AWS WAF** for CloudFront protection

## Disaster Recovery

1. **Regular RDS snapshots**
2. **Multi-AZ deployments**
3. **Cross-region replication** for critical data
4. **Documented recovery procedures**
5. **Regular disaster recovery drills**

## Troubleshooting

### Service Not Reachable
```bash
# Check security group rules
aws ec2 describe-security-groups --group-ids <SG_ID>

# Check if service is running
ssh ec2-user@<IP> "ps aux | grep node"

# Check logs
ssh ec2-user@<IP> "tail -f /var/log/kayak-service.log"
```

### Database Connection Issues
```bash
# Test connection from EC2
mysql -h <RDS_ENDPOINT> -u admin -p

# Check security group allows traffic
aws ec2 describe-security-groups --group-ids <DB_SG_ID>
```

## Support

For issues or questions:
- Create an issue in the repository
- Contact: support@yourdomain.com
