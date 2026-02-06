#!/usr/bin/env bash
# PreToolUse hook: blocks edits to .env* files and .git/ directory
# Reads tool input JSON from stdin, checks file_path field

set -euo pipefail

INPUT=$(cat)

# Extract file_path using node (jq may not be installed)
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

# Block .env files
case "$FILE_PATH" in
  *.env*|*/.env*)
    echo '{"decision":"block","reason":"Blocked: cannot edit .env files via Claude Code. Edit manually."}'
    exit 0
    ;;
esac

# Block .git/ internals
case "$FILE_PATH" in
  */.git/*|.git/*)
    echo '{"decision":"block","reason":"Blocked: cannot edit .git/ internals."}'
    exit 0
    ;;
esac

exit 0
