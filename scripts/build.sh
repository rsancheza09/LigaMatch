#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.."; pwd)"
cd "$PROJECT_ROOT"

if [ "$BUILD_ENV" = "web" ]; then
  npm --prefix=web run build
elif [ "$BUILD_ENV" = "api" ]; then
  echo "NOOP"
else
  echo "Error: set BUILD_ENV to 'api' or 'web'"
  exit 1
fi
