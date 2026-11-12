#!/usr/bin/env bash
set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}"
state="$(git rev-parse --git-dir)/ocr-reviewed"
input="$(cat)"
report_start='"(```[a-z]*\\n)?## OCR review - '

json_field() {
  printf '%s' "$input" |
    sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" |
    head -n 1
}

pending="$state.pending.$(json_field agent_id | tr -cd 'A-Za-z0-9_-')"

diff_hash() {
  {
    git diff HEAD --binary -- . ':(exclude)*.md'
    git ls-files --others --exclude-standard -- . ':(exclude)*.md'
    git ls-files --others --exclude-standard -z -- . ':(exclude)*.md' | xargs -0 -r git hash-object --
  } | git hash-object --stdin
}

has_changes() {
  ! git diff HEAD --quiet -- . ':(exclude)*.md' ||
    [ -n "$(git ls-files --others --exclude-standard -- . ':(exclude)*.md')" ]
}

review_completed() {
  printf '%s' "$input" | grep -Eq "\"last_assistant_message\"[[:space:]]*:[[:space:]]*$report_start" && return
  local transcript
  transcript="$(json_field agent_transcript_path | sed 's/\\\\/\\/g')"
  [ -n "$transcript" ] && [ -f "$transcript" ] &&
    tail -c 262144 "$transcript" | grep '"type":"assistant"' | tail -n 1 | grep -Eq "\"(text|message)\":$report_start"
}

case "${1:-}" in
  start)
    diff_hash > "$pending"
    ;;
  record)
    if [ -f "$pending" ] && review_completed; then
      mv -f "$pending" "$state"
    else
      rm -f "$pending"
    fi
    ;;
  check)
    if printf '%s' "$input" | grep -Eq '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
      exit 0
    fi
    has_changes || exit 0
    if [ "$(diff_hash)" = "$(cat "$state" 2>/dev/null || true)" ]; then
      exit 0
    fi
    printf '%s\n' '{"decision":"block","reason":"Code changes have not been reviewed. Spawn the ocr-reviewer subagent (Agent tool, subagent_type \"ocr-reviewer\"), verify each High/Medium finding against the code, fix the real ones, then finish."}'
    ;;
  *)
    echo "usage: ocr-review-gate.sh start|record|check" >&2
    exit 1
    ;;
esac
