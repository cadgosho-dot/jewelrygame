#!/usr/bin/env python3
from __future__ import annotations

import base64
import gzip
import hashlib
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = "0.10.768"
TARGET = "0.10.769"
PARTS = [ROOT / "scripts" / f".v769-patch-{i}.txt" for i in range(5)]
EXPECTED_B64_LEN = 14344
EXPECTED_B64_SHA256 = "9f4c5b2d0a61af4c9627a4676af0ead9d778546fa5a23de5cda14cf0ac2e062f"
EXPECTED_PATCH_SHA256 = "62e447410f6fc7b98bfe4bb529bc87f95b9552fd760286a0e3250e9a3e2fa45d"


def run(*args: str) -> None:
    subprocess.run(args, cwd=ROOT, check=True)


def main() -> int:
    version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
    if version == TARGET:
        print(f"already applied: {TARGET}")
        return 0
    if version != EXPECTED:
        print(f"refusing to apply: VERSION={version}, expected {EXPECTED}", file=sys.stderr)
        return 2

    missing = [str(path) for path in PARTS if not path.exists()]
    if missing:
        print("missing patch parts: " + ", ".join(missing), file=sys.stderr)
        return 3

    encoded = "".join(path.read_text(encoding="utf-8").strip() for path in PARTS)
    encoded_sha = hashlib.sha256(encoded.encode("ascii")).hexdigest()
    if len(encoded) != EXPECTED_B64_LEN or encoded_sha != EXPECTED_B64_SHA256:
        print(
            f"patch transfer verification failed: len={len(encoded)} sha256={encoded_sha}",
            file=sys.stderr,
        )
        return 4

    patch = gzip.decompress(base64.b64decode(encoded))
    patch_sha = hashlib.sha256(patch).hexdigest()
    if patch_sha != EXPECTED_PATCH_SHA256:
        print(f"patch content verification failed: sha256={patch_sha}", file=sys.stderr)
        return 5

    patch_path = ROOT / ".v769.patch.tmp"
    patch_path.write_bytes(patch)
    try:
        run("git", "apply", "--check", str(patch_path))
        run("git", "apply", str(patch_path))
    finally:
        patch_path.unlink(missing_ok=True)

    print(f"applied {EXPECTED} -> {TARGET}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
