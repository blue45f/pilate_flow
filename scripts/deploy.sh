#!/usr/bin/env bash
# Zero-friction universal deploy launcher for Terminal, WebStorm, CI, and Gemini Agent Sandbox.
# Automatically locates Node across .deploy-runtime, ~/.local, ~/.nvm, /opt/homebrew, and /usr/local.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

find_node_bin() {
  local candidates=(
    "$ROOT_DIR/.deploy-runtime/node/bin/node"
    "$HOME/.local/node/bin/node"
    "/opt/homebrew/bin/node"
    "/usr/local/bin/node"
  )

  local real_user="${USER:-hjunkim}"
  local nvm_dir="/Users/$real_user/.nvm/versions/node"
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
  NODE_DIR="$(dirname "$NODE_BIN")"
  export PATH="$ROOT_DIR/.deploy-runtime/node_modules/.bin:$NODE_DIR:$PATH"
  exec "$NODE_BIN" "$ROOT_DIR/scripts/deploy-universal.mjs" "$@"
fi

cat >&2 <<'EOF'
[deploy.sh] Sandboxed shell detected: Node/Firebase binaries in ~/.nvm are outside Connected Folders.
Run this ONE-TIME command in your macOS/WebStorm terminal to permanently enable 1-click & AI-agent deploys:

  cd /Users/hjunkim/WebstormProjects/pilates-flow && pnpm deploy:bootstrap && pnpm deploy

After running `pnpm deploy:bootstrap` once, `./scripts/deploy.sh` works directly inside sandboxed sessions too!
EOF
exit 126
