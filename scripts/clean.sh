#!/bin/bash
# Script to clean .turbo and node_modules directories recursively
# How to use:
# chmod +x scripts/clean.sh
# ./scripts/clean.sh

set -e

echo "🧹 Cleaning .turbo and node_modules directories..."

# Get the root directory (parent of scripts folder)
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Function to remove directory if exists
remove_if_exists() {
    local path=$1
    if [ -d "$path" ]; then
        echo "  Removing: $path"
        rm -rf "$path"
        echo "  ✓ Deleted: $path"
    fi
}

# Clean root level
echo ""
echo "📁 Cleaning root directory..."
remove_if_exists "$ROOT_DIR/.turbo"
remove_if_exists "$ROOT_DIR/node_modules"

# Clean apps directories
echo ""
echo "📁 Cleaning apps..."
if [ -d "$ROOT_DIR/apps" ]; then
    for dir in "$ROOT_DIR/apps"/*; do
        if [ -d "$dir" ]; then
            echo "  Processing: apps/$(basename "$dir")"
            remove_if_exists "$dir/.turbo"
            remove_if_exists "$dir/node_modules"
        fi
    done
fi

# Clean packages directories
echo ""
echo "📁 Cleaning packages..."
if [ -d "$ROOT_DIR/packages" ]; then
    for dir in "$ROOT_DIR/packages"/*; do
        if [ -d "$dir" ]; then
            echo "  Processing: packages/$(basename "$dir")"
            remove_if_exists "$dir/.turbo"
            remove_if_exists "$dir/node_modules"
        fi
    done
fi

echo ""
echo "✨ Cleanup completed!"
