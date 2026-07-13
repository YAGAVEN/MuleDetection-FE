#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

BACKEND_PID=""
FRONTEND_PID=""

kill_port_listeners() {
  local port="$1"
  local pids

  pids="$(lsof -t -iTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "${pids}" ]]; then
    echo "Stopping existing listener(s) on port ${port}..."
    kill ${pids} 2>/dev/null || true
  fi
}

cleanup() {
  echo ""
  echo "Stopping services..."
  if [[ -n "${FRONTEND_PID}" ]] && kill -0 "${FRONTEND_PID}" 2>/dev/null; then
    kill "${FRONTEND_PID}"
  fi
  if [[ -n "${BACKEND_PID}" ]] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
    kill "${BACKEND_PID}"
  fi
}

trap cleanup EXIT INT TERM

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required but not found."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but not found."
  exit 1
fi

kill_port_listeners "${BACKEND_PORT}"
kill_port_listeners "${FRONTEND_PORT}"

echo "Starting backend (port ${BACKEND_PORT})..."
cd "$BACKEND_DIR"

if [[ ! -d ".venv" ]]; then
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -r ../docs/backend_docs/requirements.txt >/dev/null
uvicorn app.main:app --reload --host 0.0.0.0 --port "${BACKEND_PORT}" &
BACKEND_PID=$!
deactivate

echo "Starting frontend (port ${FRONTEND_PORT})..."
cd "$FRONTEND_DIR"

if [[ ! -d "node_modules" ]]; then
  npm install
fi

npm run dev -- --host 0.0.0.0 --port "${FRONTEND_PORT}" &
FRONTEND_PID=$!

echo "Backend:  http://localhost:${BACKEND_PORT}"
echo "Frontend: http://localhost:${FRONTEND_PORT}"
echo "Press Ctrl+C to stop both."

wait -n "${BACKEND_PID}" "${FRONTEND_PID}"
