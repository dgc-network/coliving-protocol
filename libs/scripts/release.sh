#!/usr/bin/env bash

if [[ -z ${1} ]]; then
    echo "A git tag must be supplied as the first parameter."
    exit 1
else
    GIT_TAG=${1}
fi

if [[ $(whoami) != "circleci" ]]; then
    echo "This script is intended to be run through CI."
    echo "Please see:"
    echo "    .circleci/bin/deploy-sdk.sh -h"
    exit 1
fi

set -ex

# Finds the lastest commit that looks like a version commit,
# and gets the list of commits after that
function git-changelog () {
    # Find the latest release commit by using the last time the first `version` key changed
    version_line_number=$(grep -m 1 -n version package.json | cut -d: -f 1)
    release_commit=$(git blame -L ${version_line_number},+1 --porcelain -- package.json | awk 'NR==1{ print $1 }')

    # Print the log as "- <commmiter short date> [<commit short hash>] <commit message> <author name>"
    git log --pretty=format:"- %cd [%h] %s [%an]" --date=short $release_commit..HEAD
}

# formats a commit message using the bumped ${VERSION} and ${CHANGE_LOG}
function commit-message () {
    echo "Bump ${STUB} to ${VERSION}

## Changelog

${CHANGE_LOG}"
}

# Make a new branch off GIT_TAG, bumps npm,
# commits with the relevant changelog, and pushes
function bump-npm () {
    # Configure git client
    git config --global user.email "coliving-infra@coliving.co"
    git config --global user.name "coliving-infra"

    # Make sure master is up to date
    git checkout master -f
    git pull

    # only allow tags/commits found on master, release branches, or tags to be deployed
    git branch -a --contains ${GIT_TAG} \
        | tee /dev/tty \
        | grep -Eq 'remotes/origin/master|remotes/origin/release' \
        || (
            echo "tag not found on master nor release branches"
            exit 1
        )

    # Ensure working directory clean
    git reset --hard ${GIT_TAG}

    # grab change log early, before the version bump
    CHANGE_LOG=$(git-changelog)

    # Patch the version
    VERSION=$(npm version patch)

    # Build project
    npm i
    npm run build

    # Publishing dry run, prior to pushing a branch
    npm publish . --access public --dry-run

    # Commit to a new branch, and tag
    git checkout -b ${STUB}-${VERSION}
    git add .
    git commit -m "$(commit-message)"
    git tag -a @coliving/${STUB}@${VERSION} -m "$(commit-message)"

    # Push branch and tags to remote
    git push -u origin ${STUB}-${VERSION}
    git push origin --tags
}

# Merge the created branch into master, then delete the branch
function merge-bump () {
    git checkout master -f

    # pull in any additional commits that may have trickled in
    git pull

    git merge ${STUB}-${VERSION} -m "$(commit-message)"

    # if pushing fails, ensure we cleanup()
    git push -u origin master \
    && git push origin :${STUB}-${VERSION} \
    || $(exit 1)
}

# publish to npm
function publish () {
    npm publish . --access public
}

# cleanup when merging step fails
function cleanup () {
    git push origin :${STUB}-${VERSION} || true
    git push --delete origin @coliving/${STUB}@${VERSION} || true
    exit 1
}

# configuration
STUB=sdk
cd ${PROTOCOL_DIR}/libs

# perform release
bump-npm
merge-bump && publish || cleanup
