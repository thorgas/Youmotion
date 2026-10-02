#!/usr/bin/env bash

set -euo pipefail

if [[ "${1:-}" == "--" ]]; then
  shift
fi

archive_path="${1:-}"

if [[ -z "$archive_path" || ! -f "$archive_path" ]]; then
  echo "Usage: pnpm verify:ios:archive -- /absolute/path/to/Youmotion.ipa" >&2
  exit 2
fi

verification_dir="$(mktemp -d /private/tmp/youmotion-ios-archive.XXXXXX)"
trap 'rm -rf "$verification_dir"' EXIT

unzip -q "$archive_path" -d "$verification_dir"

for app_path in "$verification_dir"/Payload/*.app; do
  executable_name="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$app_path/Info.plist")"
  if [[ ! -f "$app_path/$executable_name" ]]; then
    echo "Store archive is missing its declared app executable." >&2
    exit 1
  fi
  if rg -a -F -q 'ReactNativeOttreliteBackendTracy' "$app_path/$executable_name"; then
    echo "Store archive contains the Tracy native profiler, which can trigger Local Network permission at startup." >&2
    exit 1
  fi
done

forbidden_selectors=(
  '_addTouch:forDelayedDelivery:'
  '_clearTouches'
  '_setHIDEvent:'
  '_setIsFirstTouchForView:'
  '_setLocationInWindow:resetPrevious:'
  '_touchesEvent'
)

found_selectors=()

for selector in "${forbidden_selectors[@]}"; do
  if rg -a -F -l -- "$selector" "$verification_dir/Payload" >/dev/null; then
    found_selectors+=("$selector")
  fi
done

if (( ${#found_selectors[@]} > 0 )); then
  echo "Apple 90338 risk: private touch-injection selectors found:" >&2
  printf '  %s\n' "${found_selectors[@]}" >&2
  exit 1
fi

echo "iOS archive is free of the Tracy native profiler and known HarnessUI private selectors."
