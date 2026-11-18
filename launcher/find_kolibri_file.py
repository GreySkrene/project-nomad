"""Locate Kolibri content nodes that reference a file checksum (read-only)."""

import sqlite3
import sys


DB_PATH = "/kolibri/db.sqlite3"


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: find_kolibri_file.py CHECKSUM")

    checksum = sys.argv[1].lower()
    connection = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    cursor = connection.cursor()

    rows = cursor.execute(
        "SELECT n.id, n.title, n.kind, n.tree_id, n.lft, n.rght, n.level, "
        "       f.id AS file_id, f.supplementary, lf.file_size, lf.available "
        "FROM content_localfile AS lf "
        "JOIN content_file AS f ON f.local_file_id = lf.id "
        "JOIN content_contentnode AS n ON n.id = f.contentnode_id "
        "WHERE lower(lf.id) = ?",
        (checksum,),
    ).fetchall()

    if not rows:
        print(f"No content node references checksum {checksum}")
        return

    for row in rows:
        ancestors = cursor.execute(
            "SELECT id, title, level FROM content_contentnode "
            "WHERE tree_id = ? AND lft <= ? AND rght >= ? "
            "ORDER BY level",
            (row["tree_id"], row["lft"], row["rght"]),
        ).fetchall()
        path = " / ".join(ancestor["title"] for ancestor in ancestors)
        print(
            f"NODE\t{row['id']}\t{row['kind']}\tsupplementary={row['supplementary']}\t"
            f"size={row['file_size']}\tavailable={row['available']}\nPATH\t{path}"
        )


if __name__ == "__main__":
    main()
