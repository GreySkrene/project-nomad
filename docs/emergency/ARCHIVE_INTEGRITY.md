# Installed archive integrity baseline

Verified: 2026-11-23 (America/Denver)

`INSTALLED_ARCHIVE_HASHES.csv` records the exact byte size and a full-file SHA-256
for every installed ZIM and PMTiles archive: 18 ZIMs and three PMTiles files. The
hashes cover 76,063,663,006 stored bytes (70.84 GiB). They were calculated directly
from `/opt/project-nomad/storage` with `sha256sum` at low CPU and I/O priority.

This is a local corruption-detection baseline, not a claim that every publisher
provides a signed checksum. The published Kiwix SHA-256 values available for
`wikipedia_en_top_maxi_2026-06.zim` and `wikibooks_en_all_maxi_2026-10.zim` match the
installed bytes. Other archives are paired with the structural, reader, search, and
content evidence in `CONTENT_AUDIT.md`; PMTiles files are paired with header/range and
representative tile-read evidence recorded there. A matching local hash proves that a
file has not changed since this baseline, while the prior audits establish whether it
is usable.

To recheck after storage trouble or an update, calculate SHA-256 for the installed
files and compare by filename with `INSTALLED_ARCHIVE_HASHES.csv`. A planned archive
update should change its filename/version and hash; an unexplained mismatch should be
treated as possible corruption and the affected archive should not be relied on until
it has been replaced and re-audited.
