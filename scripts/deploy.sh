#!/usr/bin/env bash
# Cross-environment deploy launcher for macOS, Linux, CI, IDEs, and sandboxed shells.
# Automatically locates Node.js (>=22.12) across standard & version-manager paths
# and delegates to scripts/deploy-universal.mjs (or scripts/setup-deploy-auth.mjs).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

node_meets_minimum() {
  local bin="$1"
  [[ -x "$bin" ]] || return 1
  "$bin" -e '
    const [maj, min] = process.versions.node.split(".").map(Number);
    process.exit(maj > 22 || (maj === 22 && min >= 12) ? 0 : 1);
  ' >/dev/null 2>&1
}

find_node_bin() {
  local candidates=()

  if command -v node >/dev/null 2>&1; then
    candidates+=("$(command -v node)")
  fi

  candidates+=(
    "$HOME/.volta/bin/node"
    "$HOME/.asdf/shims/node"
    "$HOME/.local/share/mise/shims/node"
    "$HOME/.local/node/bin/node"
    "/opt/homebrew/bin/node"
    "/usr/local/bin/node"
    "/opt/local/bin/node"
  )

  local nvm_dir="${NVM_DIR:-$HOME/.nvm}/versions/node"
  if [[ -d "$nvm_dir" ]]; then
    while IFS= read -r nvm_node; do
      candidates+=("$nvm_node")
    done < <(ls -1d "$nvm_dir"/*/bin/node 2>/dev/null | sort -rV)
  fi

  for fnm_base in "$HOME/.local/share/fnm/node-versions" "$HOME/Library/Application Support/fnm/node-versions"; do
    if [[ -d "$fnm_base" ]]; then
      while IFS= read -r fnm_node; do
        candidates+=("$fnm_node")
      done < <(ls -1d "$fnm_base"/*/installation/bin/node 2>/dev/null | sort -rV)
    fi
  done

  for tmp_base in /private/tmp/node* /tmp/node*; do
    if [[ -x "$tmp_base/bin/node" ]]; then
      candidates+=("$tmp_base/bin/node")
    fi
  done

  for candidate in "${candidates[@]}"; do
    if node_meets_minimum "$candidate"; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

if NODE_BIN="$(find_node_bin)"; then
  export PATH="$(dirname "$NODE_BIN"):$ROOT_DIR/node_modules/.bin:$PATH"
  if [[ "${1:-}" == "--setup-auth" ]]; then
    shift
    exec "$NODE_BIN" "$ROOT_DIR/scripts/setup-deploy-auth.mjs" "$@"
  fi
  if [[ "${1:-}" == "--firebase" ]]; then
    shift
    exec "$NODE_BIN" "$ROOT_DIR/scripts/firebase-local.mjs" "$@"
  fi
  exec "$NODE_BIN" "$ROOT_DIR/scripts/deploy-universal.mjs" "$@"
fi

echo "[deploy.sh] Node.js (>=22.12.0)를 찾을 수 없습니다. Volta, nvm, fnm 또는 Homebrew로 Node 22 LTS를 설치해 주세요." >&2
exit 126
