#!/usr/bin/env bash

set -e

cd "$(dirname "$0")/.."

case $BUILD_ENV in
  api)
    echo "Installing api"
    npm --prefix=api install
    ;;
  web)
    echo "Installing web"
    npm --prefix=web install
    ;;
  *)
    echo "Installing api and web"
    npm --prefix=api install
    npm --prefix=web install
esac
