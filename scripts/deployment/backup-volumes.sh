#!/bin/bash

# Volume Backup Management Script for Club Reservation Service
# This script helps manage volume snapshots for backup and restore operations

set -e  # Exit on any error

APP_NAME="club-reservation-service"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Volume Backup Management for $APP_NAME${NC}"
echo "=================================================="

# Check if flyctl is installed and authenticated
if ! command -v flyctl &> /dev/null; then
    echo -e "${RED}❌ flyctl is not installed${NC}"
    exit 1
fi

if ! flyctl auth whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to fly.io${NC}"
    exit 1
fi

# Function to get volume ID
get_volume_id() {
    local volume_id=$(flyctl volumes list --json | jq -r '.[0].id // empty')
    if [ -z "$volume_id" ]; then
        echo -e "${RED}❌ No volumes found for app $APP_NAME${NC}"
        exit 1
    fi
    echo "$volume_id"
}

# Function to create snapshot
create_snapshot() {
    local volume_id=$(get_volume_id)
    echo -e "${YELLOW}📸 Creating snapshot for volume $volume_id...${NC}"
    
    flyctl volumes snapshots create "$volume_id"
    
    echo -e "${GREEN}✅ Snapshot created successfully${NC}"
    echo ""
    echo "📋 Recent snapshots:"
    flyctl volumes snapshots list "$volume_id" | head -10
}

# Function to list snapshots
list_snapshots() {
    local volume_id=$(get_volume_id)
    echo -e "${BLUE}📋 Snapshots for volume $volume_id:${NC}"
    flyctl volumes snapshots list "$volume_id"
}

# Function to restore from snapshot
restore_snapshot() {
    local volume_id=$(get_volume_id)
    echo -e "${BLUE}📋 Available snapshots:${NC}"
    flyctl volumes snapshots list "$volume_id"
    echo ""
    
    read -p "Enter snapshot ID to restore from: " snapshot_id
    if [ -z "$snapshot_id" ]; then
        echo -e "${RED}❌ No snapshot ID provided${NC}"
        exit 1
    fi
    
    echo ""
    echo -e "${YELLOW}⚠️  WARNING: This will create a NEW volume from the snapshot.${NC}"
    echo -e "${YELLOW}   You'll need to manually attach it to your app.${NC}"
    echo ""
    read -p "Continue? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Restore cancelled${NC}"
        exit 1
    fi
    
    local restore_name="club_reservation_data_restore_$(date +%Y%m%d_%H%M%S)"
    echo -e "${YELLOW}🔄 Creating new volume '$restore_name' from snapshot...${NC}"
    
    flyctl volumes create "$restore_name" --snapshot-id "$snapshot_id" --region bos --size 3
    
    echo -e "${GREEN}✅ Volume restored successfully${NC}"
    echo ""
    echo -e "${BLUE}📝 Next steps:${NC}"
    echo "1. Stop your current app: flyctl apps restart $APP_NAME"
    echo "2. Update your app to use the new volume"
    echo "3. Or manually copy data from the restored volume"
}

# Function to show volume status
show_status() {
    echo -e "${BLUE}📊 Current volume status:${NC}"
    flyctl volumes list
    echo ""
    
    local volume_id=$(get_volume_id)
    echo -e "${BLUE}💾 Recent snapshots:${NC}"
    flyctl volumes snapshots list "$volume_id" | head -5
}

# Function to pre-deployment backup
pre_deploy_backup() {
    echo -e "${YELLOW}🚀 Pre-deployment backup${NC}"
    echo "Creating snapshot before deployment..."
    
    local volume_id=$(get_volume_id)
    local backup_name="pre_deploy_$(date +%Y%m%d_%H%M%S)"
    
    flyctl volumes snapshots create "$volume_id"
    
    echo -e "${GREEN}✅ Pre-deployment backup completed${NC}"
    echo ""
    echo -e "${BLUE}💡 Tip: If deployment fails, you can restore using:${NC}"
    echo "   ./backup-volumes.sh restore"
}

# Main menu
show_menu() {
    echo ""
    echo -e "${BLUE}Choose an action:${NC}"
    echo "1) Create snapshot"
    echo "2) List snapshots"
    echo "3) Restore from snapshot"
    echo "4) Show volume status"
    echo "5) Pre-deployment backup"
    echo "6) Exit"
    echo ""
}

# Handle command line arguments
case "${1:-}" in
    "create"|"snapshot")
        create_snapshot
        ;;
    "list")
        list_snapshots
        ;;
    "restore")
        restore_snapshot
        ;;
    "status")
        show_status
        ;;
    "pre-deploy")
        pre_deploy_backup
        ;;
    *)
        show_menu
        read -p "Enter your choice (1-6): " choice
        case $choice in
            1) create_snapshot ;;
            2) list_snapshots ;;
            3) restore_snapshot ;;
            4) show_status ;;
            5) pre_deploy_backup ;;
            6) echo -e "${GREEN}👋 Goodbye!${NC}"; exit 0 ;;
            *) echo -e "${RED}❌ Invalid choice${NC}"; exit 1 ;;
        esac
        ;;
esac
