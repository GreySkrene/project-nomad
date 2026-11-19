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

    needed_tables = {"content_contentnode", "content_file", "content_localfile"}
    if needed_tables.issubset(tables):
        file_columns = table_columns(connection, "content_file")
        local_columns = table_columns(connection, "content_localfile")
        if {"contentnode_id", "local_file_id"}.issubset(file_columns) and {"id", "file_size", "available"}.issubset(local_columns):
            query = """
                SELECT n.channel_id, COUNT(DISTINCT f.id), COALESCE(SUM(l.file_size), 0)
                FROM content_file AS f
                JOIN content_contentnode AS n ON n.id = f.contentnode_id
                JOIN content_localfile AS l ON l.id = f.local_file_id
                WHERE l.available = 1
                GROUP BY n.channel_id
            """
            for channel_id, file_count, available_bytes in connection.execute(query):
                if str(channel_id) in channels_by_id:
                    channels_by_id[str(channel_id)]["available_file_count"] = file_count
                    channels_by_id[str(channel_id)]["available_file_bytes"] = available_bytes

    print(json.dumps(report, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
