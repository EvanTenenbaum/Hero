#!/bin/bash
# ════════════════════════════════════════════════════════════════════════════
# HERO IDE Cloud Sandbox Setup Script
# ════════════════════════════════════════════════════════════════════════════
# This script helps configure the cloud sandbox environment variables
# Run this script to generate secure keys and display the required env vars

set -e

echo "════════════════════════════════════════════════════════════════════════════"
echo "HERO IDE Cloud Sandbox Setup"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

# Generate secure keys
ENCRYPTION_KEY=$(openssl rand -hex 32)
KDF_SALT=$(openssl rand -hex 16)

echo "Generated secure keys for your environment."
echo ""
echo "Add the following environment variables to your deployment platform:"
echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo "REQUIRED ENVIRONMENT VARIABLES"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""
echo "# E2B Cloud Sandbox (get from https://e2b.dev)"
echo "E2B_API_KEY=<your-e2b-api-key>"
echo ""
echo "# Security Keys (generated for you)"
echo "SECRETS_ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo "SECRETS_KDF_SALT=$KDF_SALT"
echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo "OPTIONAL ENVIRONMENT VARIABLES"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""
echo "# GitHub App (for installation-based access)"
echo "GITHUB_APP_ID=<your-github-app-id>"
echo "GITHUB_APP_PRIVATE_KEY=<your-github-app-private-key>"
echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo "DATABASE MIGRATION"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""
echo "Run the following SQL migration on your database:"
echo ""
echo "  mysql -u <user> -p <database> < drizzle/0013_cloud_sandbox.sql"
echo ""
echo "Or use drizzle-kit:"
echo ""
echo "  npx drizzle-kit push"
echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo "Setup complete! Copy the environment variables above to your deployment."
echo "════════════════════════════════════════════════════════════════════════════"
