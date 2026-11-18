#!/usr/bin/env python3
"""Queue the public emergency-family Kiwix profile through Project NOMAD.

This script intentionally downloads nothing into the Git checkout. It asks a
running NOMAD instance to fetch each official Kiwix archive into its managed
storage, which preserves NOMAD's progress tracking and library registration.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


DEFAULT_PROFILE = (
    Path(__file__).resolve().parent.parent
    / "collections"
    / "emergency-family-library.json"
)


def api_json(base_url: str, path: str, payload: dict[str, Any] | None = None) -> Any:
    url = f"{base_url.rstrip('/')}{path}"
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="GET" if payload is None else "POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def load_profile(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        profile = json.load(handle)
    if profile.get("schema_version") != 1 or not isinstance(profile.get("resources"), list):
        raise ValueError(f"Unsupported or invalid profile: {path}")
    return profile


def active_jobs(base_url: str) -> list[dict[str, Any]]:
    jobs = api_json(base_url, "/api/downloads/jobs/zim")
    return jobs if isinstance(jobs, list) else []


def wait_for_downloads(base_url: str, expected_filenames: set[str]) -> int:
    while True:
        jobs = active_jobs(base_url)
        if not jobs:
            installed_response = api_json(base_url, "/api/zim/list")
            installed = {entry["name"] for entry in installed_response.get("files", [])}
            missing = sorted(expected_filenames - installed)
            if missing:
                print(
                    "The queue is empty, but these archives were not registered:",
                    *[f"  - {name}" for name in missing],
                    sep="\n",
                    file=sys.stderr,
                )
                return 1
            print("All expected ZIM downloads are installed and registered.")
            return 0
        print("\nActive downloads:")
        for job in jobs:
            title = job.get("title") or Path(str(job.get("filepath", "unknown"))).name
            print(f"  {job.get('progress', 0):>3}%  {job.get('status', 'unknown'):<10} {title}")
        failed = [job for job in jobs if job.get("status") == "failed"]
        if failed:
            print("At least one download failed; inspect NOMAD's Downloads page.", file=sys.stderr)
            return 1
        time.sleep(10)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--nomad-url", default="http://localhost:8080")
    parser.add_argument("--profile", type=Path, default=DEFAULT_PROFILE)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--wait", action="store_true", help="Monitor jobs until the active queue is empty")
    parser.add_argument(
        "--max-gib",
        type=float,
        default=40.0,
        help="Refuse to queue missing ZIMs above this total (default: 40 GiB)",
    )
    args = parser.parse_args()

    try:
        profile = load_profile(args.profile)
        health = api_json(args.nomad_url, "/api/health")
        if health.get("status") != "ok":
            raise RuntimeError(f"NOMAD health check returned: {health!r}")
        installed_response = api_json(args.nomad_url, "/api/zim/list")
    except (OSError, ValueError, RuntimeError, urllib.error.URLError) as error:
        print(f"Preflight failed: {error}", file=sys.stderr)
        return 2

    installed = {entry["name"] for entry in installed_response.get("files", [])}
    active = {Path(str(job.get("filepath", ""))).name for job in active_jobs(args.nomad_url)}
    missing = [
        resource
        for resource in profile["resources"]
        if resource["filename"] not in installed and resource["filename"] not in active
    ]
    missing_bytes = sum(int(resource.get("size_bytes", 0)) for resource in missing)
    missing_gib = missing_bytes / (1024**3)

    print(f"Profile: {profile['title']} ({profile['snapshot_date']})")
    print(
        f"Installed or actively downloading: "
        f"{len(profile['resources']) - len(missing)} of {len(profile['resources'])}"
    )
    print(f"Missing download size: approximately {missing_gib:.2f} GiB")

    for resource in missing:
        print(f"  - {resource['title']}: {resource['filename']}")

    if missing_gib > args.max_gib:
        print(
            f"Refusing to queue {missing_gib:.2f} GiB; rerun with an intentional "
            f"--max-gib value above that amount.",
            file=sys.stderr,
        )
        return 3

    if args.dry_run or not missing:
        return 0

    for resource in missing:
        payload = {
            "url": resource["url"],
            "metadata": {
                "title": resource["title"],
                "summary": resource["why"],
                "size_bytes": resource["size_bytes"],
            },
        }
        try:
            result = api_json(args.nomad_url, "/api/zim/download-remote", payload)
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            print(f"Could not queue {resource['filename']}: HTTP {error.code}: {detail}", file=sys.stderr)
            return 4
        print(f"Queued {result.get('filename')} as job {result.get('jobId', 'unknown')}")

    expected = {resource["filename"] for resource in profile["resources"]}
    return wait_for_downloads(args.nomad_url, expected) if args.wait else 0


if __name__ == "__main__":
    raise SystemExit(main())
