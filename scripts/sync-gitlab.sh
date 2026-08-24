#!/usr/bin/env bash
# Sync GitHub dev → GitLab dev (GitHub on allikas, GitLab saab force-push)
# Kasuta VPN kaudu. Käivitus: bash scripts/sync-gitlab.sh

set -euo pipefail

GITLAB_REMOTE="git@gitlab-ssh.kemitaws.ee:services/ljvis2/ljvis2.git"
BRANCH="dev"

echo "Fetching latest $BRANCH from GitHub..."
git fetch origin

echo "Resetting local $BRANCH to origin/$BRANCH..."
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

if ! git remote | grep -q "^gitlab$"; then
  echo "Adding gitlab remote..."
  git remote add gitlab "$GITLAB_REMOTE"
else
  git remote set-url gitlab "$GITLAB_REMOTE"
fi

echo "Force-pushing $BRANCH to GitLab..."
git push gitlab "$BRANCH" --force

echo "Done. GitLab $BRANCH is now in sync with GitHub."
