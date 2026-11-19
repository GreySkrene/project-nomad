#!/usr/bin/env python3
"""Build a physical, resumable inventory of NOMAD's downloaded content."""

from __future__ import annotations

import argparse
import csv
import sqlite3
from pathlib import Path


def audit_status(kind: str, name: str) -> tuple[str, str]:
    if kind == "offline_map" and name == "custom-ea2908b0_20261106_z15.pmtiles":
        return "coverage_defect_confirmed", "Valid zoom-15 continental map, but Vancouver/Burnaby detailed tiles are missing; extraction geometry bug fixed for future extracts"
    if kind == "offline_map" and name == "world.pmtiles":
        return "verified_low_detail_fallback", "Valid world overview through zoom 5; all sampled locations returned tiles"
    zim_statuses = {
        "cooking.stackexchange.com_en_all_2026-10.zim": ("supplemental_only", "Working food Q&A; not authoritative food-safety or canning guidance"),
        "diy.stackexchange.com_en_all_2026-10.zim": ("supplemental_only", "Working repair Q&A; safety-critical advice requires primary-source cross-checking"),
        "foss.cooking_en_all_2026-11.zim": ("verified", "Coherent recipe collection; not a food-safety authority"),
        "ifixit_en_all_2025-12.zim": ("verified_with_gaps", "Broad illustrated repair library; does not replace equipment-specific manuals"),
        "mechanics.stackexchange.com_en_all_2026-10.zim": ("supplemental_only", "Working vehicle Q&A; not model-specific service data"),
        "wikibooks_en_all_maxi_2026-10.zim": ("verified_with_variable_quality", "First aid and survival books work; community-book quality varies"),
        "wikipedia_en_all_mini_2026-06.zim": ("verified", "Complete compact text encyclopedia; intentionally almost image-free"),
        "wikipedia_en_top_maxi_2026-06.zim": ("verified", "Illustrated curated encyclopedia; complements complete mini"),
        "woodworking.stackexchange.com_en_all_2026-10.zim": ("low_priority_supplement", "Functional specialist Q&A with limited emergency relevance"),
        "www.ready.gov_en_2024-12.zim": ("verified_static_core", "Official actionable preparedness pages; static snapshot without live alerts"),
    }
    if kind == "kiwix_zim" and name in zim_statuses:
        return zim_statuses[name]
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
        return "verified_core", "Healthy medical reference with working sampled emergency topics"
    if name == "gardening.stackexchange.com_en_all_2026-10.zim":
        return "supplemental_only", "Healthy Q&A archive; not a coherent guide or plant encyclopedia"
    if name == "gardenology.org_en_all_2026-09.zim":
        return "verified_with_gaps", "Healthy plant encyclopedia; still needs current regional extension guidance"
    if name == "librepathology_en_all_maxi_2026-09.zim":
        return "low_priority_educational", "Healthy pathology education, not practical first aid"
    if name.startswith("verification-rag.txt-"):
        return "test_artifact_inactive", "239-byte test upload; disabled from retrieval, deletion awaits approval"
    if kind == "knowledge_document" and name.lower().endswith(".md"):
        if name.startswith("AHA-2025-CPR-CHOKING"):
            return "verified_authored_summary", "Useful sourced 2025 AHA memory aid; not an original AHA manual"
        if name.startswith("Legion-Go-OFFLINE-POWER"):
            return "verified_authored_summary", "Offline/power card corrected to disclose incomplete Lenovo guide capture and disabled AI"
        return "verified_authored_summary", "Readable locally authored quick reference; source role checked in the content audit"
    if kind == "knowledge_document" and name.lower().endswith(".pdf"):
        if name.startswith("Legion-Go-8APU1-Official-User-Guide"):
            return "defect_confirmed", "Six-page interactive landing-page capture; only 1,232 text characters, not a full manual"
        if name.startswith("CDC-Make-Water-Safe-During-Emergency-2025"):
            return "verified_mislabeled_date", "Complete CDC sheet; embedded source date is 2022-10-04, not 2025"
        if name.startswith("CDC-Radiation-Response-Briefing-Manual-2024"):
            return "supplemental_mislabeled_date", "Complete decision-maker manual; document identifies July/December 2020, not 2024"
        if name.startswith("FEMA-Family-Communication-Plan-2025"):
            return "verified_mislabeled_date", "Complete fillable plan; embedded metadata date is 2017-06-26"
        if name.startswith("CPSC-Butane-Tabletop-Cooking-Appliances"):
            return "supplemental_only", "Complete 2003 safety research report, not an exact stove operating manual"
        if name.startswith("WHO-Managing-Complications-Pregnancy-Childbirth"):
            return "professional_reference_only", "Complete 2017 clinical manual for trained providers, not lay first aid"
        if name.startswith("NWS-Weather-Preparedness-Schools"):
            return "low_priority_educational", "Complete official school-planning guide with limited household relevance"
        if any(token in name for token in ("PDM", "Hazard-Mitigation-Plan", "State-Hazard-Mitigation", "MJHMP")):
            return "verified_regional_reference", "Readable planning/risk reference; not live alerts or a quick-action guide"
        return "verified", "Readable and page-scanned; see PDF_CONTENT_AUDIT.md for role, dates, and limitations"
    if kind == "kolibri_channel" and name.startswith("Khan Academy"):
        return "usable_partial", "1,455 nodes available; 26/11,612 selected-node files missing, all sampled as subtitle/thumbnail; prior import skipped 370 files"
    if kind == "kolibri_channel" and name.startswith("Sikana"):
        return "verified_practical_subset", "505 practical nodes; all selected-node files available; navigation, cooking, energy, DIY, agriculture and gardening"
    if kind == "kolibri_channel" and name.startswith("PhET"):
        return "verified_low_priority_education", "All nodes/files available; substantial simulations but low immediate emergency priority"
    if kind == "kolibri_channel" and name.startswith("Blockly"):
        return "verified_low_priority_education", "All nodes/files available; programming education with low emergency priority"
    if kind == "kolibri_channel" and name.startswith("School of Thought"):
        return "verified_low_priority_education", "All nodes/files available; critical-thinking education with low emergency priority"
    if kind == "auxiliary" and name == "kiwix-smart-search.html":
        return "verified", "Live title-first search and offline spelling correction tested"
    if kind == "derived_index" and name == "Qdrant knowledge-base index":
        return "verified_derived_index", "44 physical sources, 3,922 chunks, no indexed orphans; only the disabled verification artifact has no chunks"
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
                "audit_status": audit_status("derived_index", "Qdrant knowledge-base index")[0],
                "notes": audit_status("derived_index", "Qdrant knowledge-base index")[1],
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
