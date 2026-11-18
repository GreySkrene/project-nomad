#!/bin/sh
set -u

LOG=/kolibri/approved-pack-import.log
exec >>"$LOG" 2>&1

KHAN_NODES="4a5293c2249a53fdb491be18b21d8e53,9e006e37eb2a5a2da998d5201ba69680,17d86ace01375570b5e782594d6af4f4,a3a1943163185d69926ead2f4077b42e,0d3a93272e8c5d52bcd75881cb94ff57,6a70a243dc035209b39edc93482c351f,75f46f6c47aa56f18f8853b0a12839dd,4342fcba7fb3545b84bf2484da454fff,1177a18a6d9654cda915b0ee84527fd3,b81df5adc18f542a8207357a5c47628e,8d3fae4ddde35a95a139277dea5591c3,7d61b8428ed25951844ca0752998e5c0,18aedd7337f15154874e7a9e44e59cc3"
KHAN_EXCLUDE="344d47edcba45a709fe18fa6d43b3931"
SIKANA_NODES="a43651aa54d1531da7bcbe4fb2749813,c97af682bc2552e49ddf7fc2bdc8f98e,00e190c65f6458c5aff8711b27a99b88,4f42a7e5fa6850f682687b9fb9371bb4,85e3c1ebe1f95db99734a07b44f8c700,219ca27664e35868ba295134d8af7899,5478f4d3f0ea52d29c5e908f13c4c738,15e4c1c0cf135198979b49421c1663bf,5e964d4ddbf8561fa5a975cb0c1d0535,a580399c4aad597db55a50830ccf18df"

echo "=== Approved Kolibri pack resume started: $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

echo "--- Resuming selected Khan Academy topics; missing catalog files will be skipped ---"
kolibri manage importcontent -v 1 --node_ids "$KHAN_NODES" \
  --exclude_node_ids "$KHAN_EXCLUDE" network c9d7f950ab6b5a1199e3d6c10d7f0103
KHAN_STATUS=$?
echo "--- Khan Academy import exit status: $KHAN_STATUS ---"

echo "--- Importing selected Sikana practical topics; missing catalog files will be skipped ---"
kolibri manage importcontent -v 1 --node_ids "$SIKANA_NODES" network 3e464ee12f6a50a781cddf59147b48b1
SIKANA_STATUS=$?
echo "--- Sikana import exit status: $SIKANA_STATUS ---"

echo "=== Approved Kolibri pack resume finished: $(date -u +%Y-%m-%dT%H:%M:%SZ); Khan=$KHAN_STATUS Sikana=$SIKANA_STATUS ==="
exit "$SIKANA_STATUS"
