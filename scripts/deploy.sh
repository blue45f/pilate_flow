#!/usr/bin/env bash
# Thin local deploy launcher for interactive developer terminals.
# Respects current $HOME boundaries and delegates to scripts/deploy-universal.mjs.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

find_node_bin() {
  local candidates=(
    "$HOME/.local/node/bin/node"
    "/opt/homebrew/bin/node"
    "/usr/local/bin/node"
  )

  local nvm_dir="$HOME/.nvm/versions/node"
  if [[ -d "$nvm_dir" ]]; then
    while IFS= read -r nvm_node; do
      candidates+=("$nvm_node")
    done < <(ls -1d "$nvm_dir"/*/bin/node 2>/dev/null | sort -rV)
  fi

  for candidate in "${candidates[@]}"; do
    if [[ -x "$candidate" ]] && "$candidate" -v >/dev/null 2>&1; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

if NODE_BIN="$(find_node_bin)"; then
  export PATH="$(dirname "$NODE_BIN"):$PATH"
  exec "$NODE_BIN" "$ROOT_DIR/scripts/deploy-universal.mjs" "$@"
fi

echo "[deploy.sh] Node.js (>=22.12.0) was not found in current \$HOME or standard system paths." >&2
exit 126
