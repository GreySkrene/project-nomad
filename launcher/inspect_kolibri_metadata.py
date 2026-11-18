"""Read-only diagnostics for planning selective Kolibri content imports."""

import sqlite3
import sys


DB_PATH = "/kolibri/db.sqlite3"


def subtree_stats(cursor: sqlite3.Cursor, node: sqlite3.Row) -> tuple[int, int]:
    resource_count = cursor.execute(
        "SELECT COUNT(*) FROM content_contentnode "
        "WHERE tree_id = ? AND lft >= ? AND rght <= ? "
        "AND kind <> 'topic'",
        (node["tree_id"], node["lft"], node["rght"]),
    ).fetchone()[0]
    byte_count = cursor.execute(
        "SELECT COALESCE(SUM(file_size), 0) FROM ("
        "  SELECT DISTINCT local_file.id, local_file.file_size "
        "  FROM content_contentnode AS child "
        "  JOIN content_file AS file ON file.contentnode_id = child.id "
        "  JOIN content_localfile AS local_file ON local_file.id = file.local_file_id "
        "  WHERE child.tree_id = ? AND child.lft >= ? AND child.rght <= ?"
        ")",
        (node["tree_id"], node["lft"], node["rght"]),
    ).fetchone()[0]
    return resource_count, byte_count


def main() -> None:
    connection = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    cursor = connection.cursor()

    channel_ids = sys.argv[1:] or [
        "c9d7f950ab6b5a1199e3d6c10d7f0103",
        "3e464ee12f6a50a781cddf59147b48b1",
    ]
    for channel_id in channel_ids:
        root = cursor.execute(
            "SELECT * FROM content_contentnode WHERE id = ?", (channel_id,)
        ).fetchone()
        if root is None:
            print(f"MISSING CHANNEL {channel_id}")
            continue
        print(f"CHANNEL\t{channel_id}\t{root['title']}")
        nodes = cursor.execute(
            "SELECT * FROM content_contentnode "
            "WHERE tree_id = ? AND lft > ? AND rght < ? "
            "AND level > ? AND level <= ? "
            "ORDER BY lft",
            (
                root["tree_id"],
                root["lft"],
                root["rght"],
                root["level"],
                root["level"] + 2,
            ),
        ).fetchall()
        for node in nodes:
            resources, byte_count = subtree_stats(cursor, node)
            indent = "  " * (node["level"] - root["level"] - 1)
            print(
                f"TOPIC\t{node['id']}\t{byte_count / (1024 ** 3):.3f} GB\t"
                f"{resources} resources\t{indent}{node['title']}"
            )


if __name__ == "__main__":
    main()
