#!/usr/bin/env python3
"""Build a physical, resumable inventory of NOMAD's downloaded content."""

from __future__ import annotations

import argparse
import csv
import sqlite3
from pathlib import Path


def audit_status(kind: str, name: str) -> tuple[str, str]:
    if name == "libretexts.org_en_med_2025-01.zim":
        return "defect_confirmed", "Inconsistent/missing book sections in rendered JavaScript reader"
    if name == "irp.fas.org_en_military-medicine_2026-10.zim":
        return "historical_supplement_only", "Mostly 1957-2007 military manuals; not current civilian clinical guidance"
    if name == "zimgit-medicine_en_2024-08.zim":
        return "defect_confirmed", "Reader remains blank; bundle includes outdated and unverified medical works"
    if name == "wwwnc.cdc.gov_en_all_2024-11.zim":
        return "supplemental_only", "Official CDC Travelers' Health snapshot; useful but narrower than general emergency medicine"
    if name == "librepathology_en_all_maxi_2026-09.zim":
        return "low_priority_educational", "Pathology education, not an emergency first-aid guide"
    if name in {
        "medlineplus.gov_en_all_2025-01.zim",
        "nhs.uk_en_medicines_2025-12.zim",
        "wikipedia_en_medicine_maxi_2026-10.zim",
    }:
        return "in_progress", "Core medical candidate; structural and emergency-topic review underway"
    if name == "gardening.stackexchange.com_en_all_2026-10.zim":
        return "supplemental_only", "Healthy Q&A archive; not a coherent guide or plant encyclopedia"
    if name == "gardenology.org_en_all_2026-09.zim":
        return "in_progress", "Structurally validated plant encyclopedia; human usefulness review ongoing"
    if name.startswith("verification-rag.txt-"):
        return "test_artifact_inactive", "239-byte test upload; disabled from retrieval, deletion awaits approval"
    if kind == "kolibri_channel" and name.startswith("Khan Academy"):
        return "defect_confirmed", "Import log records 370 skipped files and exit status 1"
    if kind == "auxiliary" and name == "kiwix-smart-search.html":
        return "verified", "Live title-first search and offline spelling correction tested"
    return "pending", "Awaiting content-level usefulness and completeness audit"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--storage", type=Path, default=Path("/app/storage"))
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    rows: list[dict[str, object]] = []

    groups = [
        ("kiwix_zim", args.storage / "zim", "*.zim"),
        ("offline_map", args.storage / "maps" / "pmtiles", "*.pmtiles"),
        ("knowledge_document", args.storage / "kb_uploads", "*"),
    ]
    for kind, directory, pattern in groups:
        if not directory.exists():
            continue
        for path in sorted(item for item in directory.glob(pattern) if item.is_file()):
            status, notes = audit_status(kind, path.name)
            rows.append(
                {
                    "kind": kind,
                    "name": path.name,
                    "bytes": path.stat().st_size,
                    "version_or_id": "",
                    "audit_status": status,
                    "notes": notes,
                }
            )

    search_page = args.storage / "zim" / "kiwix-smart-search.html"
    if search_page.exists():
        status, notes = audit_status("auxiliary", search_page.name)
        rows.append(
            {
                "kind": "auxiliary",
                "name": search_page.name,
                "bytes": search_page.stat().st_size,
                "version_or_id": "generated offline UI",
                "audit_status": status,
                "notes": notes,
            }
        )

    kolibri_database = args.storage / "kolibri-gen2" / "db.sqlite3"
    if kolibri_database.exists():
        connection = sqlite3.connect(f"file:{kolibri_database}?mode=ro", uri=True)
        query = """
            SELECT c.id, c.name, c.version, COUNT(n.id)
            FROM content_channelmetadata AS c
            LEFT JOIN content_contentnode AS n ON n.channel_id = c.id
            GROUP BY c.id, c.name, c.version
            ORDER BY c.name
        """
        for channel_id, name, version, node_count in connection.execute(query):
            status, notes = audit_status("kolibri_channel", name)
            rows.append(
                {
                    "kind": "kolibri_channel",
                    "name": name,
                    "bytes": "",
                    "version_or_id": f"version {version}; {channel_id}; {node_count} nodes",
                    "audit_status": status,
                    "notes": notes,
                }
            )

    qdrant = args.storage / "qdrant"
    if qdrant.exists():
        size = sum(path.stat().st_size for path in qdrant.rglob("*") if path.is_file())
        rows.append(
            {
                "kind": "derived_index",
                "name": "Qdrant knowledge-base index",
                "bytes": size,
                "version_or_id": "derived from knowledge_document files",
                "audit_status": "pending",
                "notes": "Audit source mapping, duplicates, orphans, and retrieval; not an independent source",
            }
        )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["kind", "name", "bytes", "version_or_id", "audit_status", "notes"],
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} inventory rows to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
