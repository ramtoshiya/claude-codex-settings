#!/bin/bash
set -euo pipefail
case_dir="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec /bin/bash "$case_dir/../fixtures/setup.sh"
