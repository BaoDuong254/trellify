#!/usr/bin/env bash

# Get list of staged JS/TS files
staged_files="$@"

if [ -z "$staged_files" ]; then
  exit 0
fi

# Group files by their closest directory containing eslint.config.mjs
declare -A dir_files

for file in $staged_files; do
  # Skip eslint.config.mjs files themselves
  if [[ "$file" == *"eslint.config.mjs" ]]; then
    continue
  fi

  # Find the closest directory with eslint.config.mjs
  current_dir=$(dirname "$file")
  found_config=""

  # Search upwards from file location to monorepo root
  while [ "$current_dir" != "." ] && [ "$current_dir" != "/" ]; do
    if [ -f "$current_dir/eslint.config.mjs" ]; then
      found_config="$current_dir"
      break
    fi
    current_dir=$(dirname "$current_dir")
  done

  # Group files by their config directory with relative paths
  if [ -n "$found_config" ]; then
    # Get relative path from config dir to file
    relative_file="${file#$found_config/}"

    if [ -z "${dir_files[$found_config]}" ]; then
      dir_files[$found_config]="$relative_file"
    else
      dir_files[$found_config]="${dir_files[$found_config]} $relative_file"
    fi
  fi
done

# Run eslint for each directory
for dir in "${!dir_files[@]}"; do
  if [ -n "${dir_files[$dir]}" ]; then
    echo "🔍 Running ESLint in $dir"
    (cd "$dir" && pnpm exec eslint ${dir_files[$dir]} --fix --cache)
  fi
done
