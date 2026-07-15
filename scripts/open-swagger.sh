#!/usr/bin/env bash
cd "$(dirname "$0")/.."
# Temporary: API on 3001 (override with API_PORT)
API_PORT="${API_PORT:-3001}"
npx wait-on "http://localhost:${API_PORT}/health" -t 15000 && npx open "http://localhost:${API_PORT}/documentation"
