#!/usr/bin/env sh
set -eu

REPO_URL="${REPO_URL:-https://github.com/stevenmcsorley/vue-flightboard}"
DIST_DIR="$(pwd)/dist"

npm run build

cleanup() {
  rm -rf "$DIST_DIR/.git"
}

trap cleanup EXIT

cd "$DIST_DIR"

touch .nojekyll
cp index.html 404.html

rm -rf .git
git init
git add -A
git commit -m 'deploy'
git push -f "$REPO_URL" HEAD:gh-pages

cd -
