#!/usr/bin/env bash

# Script to clean project directories recursively
# How to use:
# chmod +x scripts/clean.sh
# ./scripts/clean.sh [option]
#
# Options:
#   1 or node_modules - Clean node_modules and pnpm-lock.yaml
#   2 or build        - Clean build artifacts (.turbo, dist, *.tsbuildinfo)
#   all               - Clean everything (both options)

set -e

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

# Function to remove file if exists
remove_file_if_exists() {
    local path=$1
    if [ -f "$path" ]; then
        echo "  Removing: $path"
        rm -f "$path"
        echo "  ✓ Deleted: $path"
    fi
}

# Function to clean node_modules
clean_node_modules() {
    echo "🧹 Cleaning node_modules and pnpm-lock.yaml..."
    echo ""

    # Remove pnpm-lock.yaml if exists
    if [ -f "$ROOT_DIR/pnpm-lock.yaml" ]; then
        echo "📁 Cleaning root directory..."
        remove_file_if_exists "$ROOT_DIR/pnpm-lock.yaml"
    fi

    # Clean root level
    echo ""
    echo "📁 Cleaning root directory..."
    remove_if_exists "$ROOT_DIR/node_modules"

    # Clean apps directories
    echo ""
    echo "📁 Cleaning apps..."
    if [ -d "$ROOT_DIR/apps" ]; then
        for dir in "$ROOT_DIR/apps"/*; do
            if [ -d "$dir" ]; then
                echo "  Processing: apps/$(basename "$dir")"
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
                remove_if_exists "$dir/node_modules"
            fi
        done
    fi
}

# Function to clean build artifacts
clean_build_artifacts() {
    echo "🧹 Cleaning build artifacts (.turbo, dist, *.tsbuildinfo)..."
    echo ""

    # Clean root level
    echo "📁 Cleaning root directory..."
    remove_if_exists "$ROOT_DIR/.turbo"
    remove_file_if_exists "$ROOT_DIR/tsconfig.tsbuildinfo"
    remove_file_if_exists "$ROOT_DIR/tsconfig.build.tsbuildinfo"

    # Clean apps directories
    echo ""
    echo "📁 Cleaning apps..."
    if [ -d "$ROOT_DIR/apps" ]; then
        for dir in "$ROOT_DIR/apps"/*; do
            if [ -d "$dir" ]; then
                echo "  Processing: apps/$(basename "$dir")"
                remove_if_exists "$dir/.turbo"
                remove_if_exists "$dir/dist"
                remove_file_if_exists "$dir/tsconfig.tsbuildinfo"
                remove_file_if_exists "$dir/tsconfig.build.tsbuildinfo"
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
                remove_if_exists "$dir/dist"
                remove_file_if_exists "$dir/tsconfig.tsbuildinfo"
                remove_file_if_exists "$dir/tsconfig.build.tsbuildinfo"
            fi
        done
    fi
}

# Show menu if no argument provided
if [ -z "$1" ]; then
    echo "🧹 Cleanup Script"
    echo "=================="
    echo ""
    echo "Select cleaning option:"
    echo "  1) Clean node_modules and pnpm-lock.yaml"
    echo "  2) Clean build artifacts (.turbo, dist, *.tsbuildinfo)"
    echo "  3) Clean everything (both options)"
    echo "  q) Quit"
    echo ""
    read -p "Enter your choice [1-3, q]: " choice
else
    choice=$1
fi

# Process the choice
case $choice in
    1|node_modules)
        clean_node_modules
        ;;
    2|build)
        clean_build_artifacts
        ;;
    3|all)
        clean_node_modules
        echo ""
        clean_build_artifacts
        ;;
    q|Q)
        echo "Cancelled."
        exit 0
        ;;
    *)
        echo "❌ Invalid option: $choice"
        echo "Usage: $0 [1|node_modules|2|build|all]"
        exit 1
        ;;
esac

echo ""
echo "✨ Cleanup completed!"
