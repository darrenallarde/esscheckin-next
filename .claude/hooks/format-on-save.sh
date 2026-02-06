#!/usr/bin/env bash
# PostToolUse hook: runs prettier on files after Edit/Write
# Reads tool output JSON from stdin, formats supported file types
# Skips .sql files (prettier mangles SQL)

set -euo pipefail

INPUT=$(cat)

# Extract file_path using node
FILE_PATH=$(echo "$INPUT" | node -e "
  const chunks = [];
  process.stdin.on('data', c => chunks.push(c));
  process.stdin.on('end', () => {
    try {
      const data = JSON.parse(chunks.join(''));
      console.log(data.tool_input?.file_path || '');
    } catch { console.log(''); }
  });
")

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only format supported extensions (skip .sql, .sh, etc)
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.css|*.md|*.yaml|*.yml)
    npx prettier --write "$FILE_PATH" 2>/dev/null || true
    ;;
esac

exit 0
