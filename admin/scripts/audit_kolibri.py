#!/usr/bin/env python3
"""Read-only inventory of installed Kolibri channels and content counts."""

from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path


def table_columns(connection: sqlite3.Connection, table: str) -> set[str]:
    return {row[1] for row in connection.execute(f'PRAGMA table_info("{table}")')}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("database", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--content-root", type=Path)
    args = parser.parse_args()

    connection = sqlite3.connect(f"file:{args.database}?mode=ro", uri=True)
    tables = [
        row[0]
        for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
    ]
    channel_tables = [name for name in tables if "channel" in name.lower()]
    report: dict[str, object] = {
        "database": str(args.database),
        "channel_tables": channel_tables,
        "channels": [],
        "schemas": {
            table: sorted(table_columns(connection, table))
            for table in ["content_contentnode", "content_file", "content_localfile"]
            if table in tables
        },
    }

    channels_by_id: dict[str, dict[str, object]] = {}

    for table in channel_tables:
        columns = table_columns(connection, table)
        if {"id", "name"}.issubset(columns):
            selected = [name for name in ["id", "name", "version", "last_updated"] if name in columns]
            rows = connection.execute(
                f'SELECT {", ".join(selected)} FROM "{table}" ORDER BY name'
            ).fetchall()
            channels = [dict(zip(selected, row)) for row in rows]
            report["channels"] = channels
            channels_by_id = {str(channel["id"]): channel for channel in channels}
            report["channel_table"] = table
            break

    if "content_contentnode" in tables and "channel_id" in table_columns(connection, "content_contentnode"):
        for channel_id, node_count in connection.execute(
            "SELECT channel_id, COUNT(*) FROM content_contentnode GROUP BY channel_id"
        ):
            if str(channel_id) in channels_by_id:
                channels_by_id[str(channel_id)]["node_count"] = node_count

        node_columns = table_columns(connection, "content_contentnode")
        if "available" in node_columns:
            for channel_id, available_nodes in connection.execute(
                "SELECT channel_id, COUNT(*) FROM content_contentnode WHERE available = 1 GROUP BY channel_id"
            ):
                if str(channel_id) in channels_by_id:
                    channels_by_id[str(channel_id)]["available_node_count"] = available_nodes
        if "kind" in node_columns:
            kind_query = """
                SELECT channel_id, kind, COUNT(*)
                FROM content_contentnode
                WHERE available = 1
                GROUP BY channel_id, kind
                ORDER BY channel_id, kind
            """
            for channel_id, kind, count in connection.execute(kind_query):
                if str(channel_id) in channels_by_id:
                    channels_by_id[str(channel_id)].setdefault("available_node_kinds", {})[kind] = count

            topic_query = """
                SELECT channel_id, level, title
                FROM content_contentnode
                WHERE available = 1 AND kind = 'topic' AND level <= 4
                ORDER BY channel_id, level, lft
            """
            for channel_id, level, title in connection.execute(topic_query):
                channel = channels_by_id.get(str(channel_id))
                if channel:
                    topics = channel.setdefault("available_topic_samples", [])
                    if len(topics) < 150:
                        topics.append({"level": level, "title": title})

    needed_tables = {"content_contentnode", "content_file", "content_localfile"}
    if needed_tables.issubset(tables):
        file_columns = table_columns(connection, "content_file")
        local_columns = table_columns(connection, "content_localfile")
        if {"contentnode_id", "local_file_id"}.issubset(file_columns) and {"id", "file_size", "available"}.issubset(local_columns):
            query = """
                SELECT n.channel_id,
                       COUNT(DISTINCT f.id),
                       COUNT(DISTINCT CASE WHEN l.available = 1 THEN f.id END),
                       COUNT(DISTINCT CASE WHEN l.available = 0 OR l.available IS NULL THEN f.id END),
                       COALESCE(SUM(CASE WHEN l.available = 1 THEN l.file_size ELSE 0 END), 0)
                FROM content_file AS f
                JOIN content_contentnode AS n ON n.id = f.contentnode_id
                LEFT JOIN content_localfile AS l ON l.id = f.local_file_id
                GROUP BY n.channel_id
            """
            for channel_id, total_files, available_files, unavailable_files, available_bytes in connection.execute(query):
                if str(channel_id) in channels_by_id:
                    channels_by_id[str(channel_id)]["total_file_records"] = total_files
                    channels_by_id[str(channel_id)]["available_file_count"] = available_files
                    channels_by_id[str(channel_id)]["unavailable_file_count"] = unavailable_files
                    channels_by_id[str(channel_id)]["available_file_bytes"] = available_bytes

            selected_query = """
                SELECT n.channel_id,
                       COUNT(DISTINCT f.id),
                       COUNT(DISTINCT CASE WHEN l.available = 1 THEN f.id END),
                       COUNT(DISTINCT CASE WHEN l.available = 0 OR l.available IS NULL THEN f.id END)
                FROM content_file AS f
                JOIN content_contentnode AS n ON n.id = f.contentnode_id
                LEFT JOIN content_localfile AS l ON l.id = f.local_file_id
                WHERE n.available = 1
                GROUP BY n.channel_id
            """
            for channel_id, total_files, available_files, unavailable_files in connection.execute(selected_query):
                if str(channel_id) in channels_by_id:
                    channels_by_id[str(channel_id)]["selected_node_file_records"] = total_files
                    channels_by_id[str(channel_id)]["selected_node_available_file_count"] = available_files
                    channels_by_id[str(channel_id)]["selected_node_unavailable_file_count"] = unavailable_files

            missing_selected_query = """
                SELECT n.channel_id, n.title, n.kind, f.preset, f.local_file_id
                FROM content_file AS f
                JOIN content_contentnode AS n ON n.id = f.contentnode_id
                LEFT JOIN content_localfile AS l ON l.id = f.local_file_id
                WHERE n.available = 1 AND (l.available = 0 OR l.available IS NULL)
                ORDER BY n.channel_id, n.title
            """
            for channel_id, title, kind, preset, local_file_id in connection.execute(missing_selected_query):
                channel = channels_by_id.get(str(channel_id))
                if channel:
                    samples = channel.setdefault("selected_unavailable_file_samples", [])
                    if len(samples) < 50:
                        samples.append({
                            "title": title,
                            "kind": kind,
                            "preset": preset,
                            "local_file_id": local_file_id,
                        })

            if args.content_root:
                physical_query = """
                    SELECT DISTINCT n.channel_id, l.id, l.extension
                    FROM content_file AS f
                    JOIN content_contentnode AS n ON n.id = f.contentnode_id
                    JOIN content_localfile AS l ON l.id = f.local_file_id
                    WHERE n.available = 1 AND l.available = 1
                """
                for channel_id, file_id, extension in connection.execute(physical_query):
                    channel = channels_by_id.get(str(channel_id))
                    if not channel:
                        continue
                    expected = args.content_root / file_id[0] / file_id[1] / f"{file_id}.{extension}"
                    if expected.is_file():
                        channel["physical_file_count"] = channel.get("physical_file_count", 0) + 1
                    else:
                        channel["missing_physical_file_count"] = channel.get("missing_physical_file_count", 0) + 1
                        samples = channel.setdefault("missing_physical_file_samples", [])
                        if len(samples) < 20:
                            samples.append(str(expected))

    rendered = json.dumps(report, indent=2, default=str) + "\n"
    if args.output:
        args.output.write_text(rendered, encoding="utf-8")
    else:
        print(rendered, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
