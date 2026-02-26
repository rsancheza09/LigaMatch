#!/usr/bin/env bash
cd "$(dirname "$0")/.."
npx wait-on http://localhost:3000/health -t 15000 && npx open http://localhost:3000/documentation
