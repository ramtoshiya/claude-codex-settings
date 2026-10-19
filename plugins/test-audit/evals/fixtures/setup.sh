#!/bin/bash
set -euo pipefail

# The native eval runner starts this script in an empty run workspace.
fixture_dir="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/project"
if [ -n "$(find . -mindepth 1 -maxdepth 1 -print -quit)" ]; then
  printf '%s\n' 'Refusing to scaffold a nonempty workspace.' >&2
  exit 1
fi
cp -R "$fixture_dir/." .
