#!/usr/bin/env sh
set -eu

REPO_URL="${REPO_URL:-https://github.com/stevenmcsorley/vue-flightboard}"

npm run build

cd dist

touch .nojekyll
cp index.html 404.html

git init
git add -A
git commit -m 'deploy'
git push -f "$REPO_URL" HEAD:gh-pages

cd -
