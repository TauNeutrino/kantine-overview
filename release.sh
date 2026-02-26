#!/bin/bash
# release.sh - Deploys a new version of the Kantine Wrapper

# Ensure we're in the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Ensure tests have run and artifacts exist
if [ ! -d "$SCRIPT_DIR/dist" ]; then
    echo "❌ Error: dist folder missing. Please run build-bookmarklet.sh first"
    exit 1
fi

# Get current version
VERSION=$(cat "version.txt" | tr -d '\n\r ')

# Validate that version is set
if [ -z "$VERSION" ]; then
    echo "❌ Error: Could not determine version from version.txt"
    exit 1
fi

echo "=== Kantine Bookmarklet Releaser ($VERSION) ==="

# Check for uncommitted changes (excluding dist/)
if ! git diff-index --quiet HEAD -- ":(exclude)dist"; then
    echo "⚠️ Warning: You have uncommitted changes in the working directory."
    echo "Please commit your code changes before running the release script."
    exit 1
fi

echo "=== Committing build artifacts ==="
git add "dist/"
git commit -m "chore: update build artifacts for $VERSION" --allow-empty

echo ""
echo "=== Tagging $VERSION ==="
if git rev-parse "$VERSION" >/dev/null 2>&1; then
    git tag -f "$VERSION"
    echo "🔄 Tag $VERSION moved to current commit."
else
    git tag "$VERSION"
    echo "✅ Created tag: $VERSION"
fi

echo ""
echo "=== Pushing to remotes ==="
# Determine remote targets: Assume 'origin' for primary, optionally 'github'
git push origin HEAD
git push origin --force tag "$VERSION"

# If a remote named 'github' exists, push branch and tags there too
if git remote | grep -q "^github$"; then
    git push github HEAD
    git push github --force tag "$VERSION"
fi

echo "🎉 Successfully released version $VERSION!"
exit 0
