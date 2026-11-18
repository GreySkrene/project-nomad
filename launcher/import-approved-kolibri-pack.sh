#!/bin/sh
set -eu

LOG=/kolibri/approved-pack-import.log
exec >>"$LOG" 2>&1

echo "=== Approved Kolibri pack import started: $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

import_full() {
  channel_id="$1"
  title="$2"
  echo "--- Importing full channel: $title ($channel_id) ---"
  # Kolibri's public catalog occasionally references a missing thumbnail.
  # Allow the importer to record and skip that individual file instead of
  # aborting every later channel in the approved pack.
  kolibri manage importcontent -v 1 network "$channel_id"
}

import_selected() {
  channel_id="$1"
  node_ids="$2"
  title="$3"
  exclude_node_ids="${4:-}"
  echo "--- Importing selected topics: $title ($channel_id) ---"
  if [ -n "$exclude_node_ids" ]; then
    kolibri manage importcontent -v 1 --node_ids "$node_ids" \
      --exclude_node_ids "$exclude_node_ids" network "$channel_id"
  else
    kolibri manage importcontent -v 1 --node_ids "$node_ids" network "$channel_id"
  fi
}

import_full 197934f144305350b5820c7c4dd8e194 "PhET Interactive Simulations"
import_full e409b964366a59219c148f2aaa741f43 "Blockly Games"
import_full 305b12ea5ea84fa18f933705c23f5ee0 "School of Thought"

import_selected c9d7f950ab6b5a1199e3d6c10d7f0103 \
  "4a5293c2249a53fdb491be18b21d8e53,9e006e37eb2a5a2da998d5201ba69680,17d86ace01375570b5e782594d6af4f4,a3a1943163185d69926ead2f4077b42e,0d3a93272e8c5d52bcd75881cb94ff57,6a70a243dc035209b39edc93482c351f,75f46f6c47aa56f18f8853b0a12839dd,4342fcba7fb3545b84bf2484da454fff,1177a18a6d9654cda915b0ee84527fd3,b81df5adc18f542a8207357a5c47628e,8d3fae4ddde35a95a139277dea5591c3,7d61b8428ed25951844ca0752998e5c0,18aedd7337f15154874e7a9e44e59cc3" \
  "Khan Academy math, science, biology, and electrical engineering" \
  "344d47edcba45a709fe18fa6d43b3931"

import_selected 3e464ee12f6a50a781cddf59147b48b1 \
  "a43651aa54d1531da7bcbe4fb2749813,c97af682bc2552e49ddf7fc2bdc8f98e,00e190c65f6458c5aff8711b27a99b88,4f42a7e5fa6850f682687b9fb9371bb4,85e3c1ebe1f95db99734a07b44f8c700,219ca27664e35868ba295134d8af7899,5478f4d3f0ea52d29c5e908f13c4c738,15e4c1c0cf135198979b49421c1663bf,5e964d4ddbf8561fa5a975cb0c1d0535,a580399c4aad597db55a50830ccf18df" \
  "Sikana cooking, nature, DIY, electricity, shelters, and navigation"

echo "=== Approved Kolibri pack import completed: $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
