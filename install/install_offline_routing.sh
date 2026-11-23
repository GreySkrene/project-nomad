#!/usr/bin/env bash
# Install the bounded Utah + Idaho routing graph used by the emergency-family profile.
# This intentionally does not install a geocoder or expand beyond the two-state graph.
set -euo pipefail

NOMAD_DIR="${NOMAD_DIR:-/opt/project-nomad}"
STORAGE_DIR="${NOMAD_STORAGE_PATH:-${NOMAD_DIR}/storage}"
ROUTING_DIR="${STORAGE_DIR}/routing"
SOURCE_DIR="${ROUTING_DIR}/source"
COMPOSE_FILE="${NOMAD_DIR}/compose.yml"
OVERLAY_FILE="${NOMAD_DIR}/compose.routing.yml"
LIMIT_BYTES=8589934592
UTAH_URL="https://download.geofabrik.de/north-america/us/utah-latest.osm.pbf"
IDAHO_URL="https://download.geofabrik.de/north-america/us/idaho-latest.osm.pbf"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

for command in curl docker md5sum sha256sum du df sed; do
  command -v "${command}" >/dev/null || {
    echo "Required command is missing: ${command}" >&2
    exit 1
  }
done

test -f "${COMPOSE_FILE}" || {
  echo "NOMAD Compose file not found: ${COMPOSE_FILE}" >&2
  exit 1
}
test -f "${SCRIPT_DIR}/routing_compose.yaml" || {
  echo "Routing overlay template not found beside this script." >&2
  exit 1
}

mkdir -p "${SOURCE_DIR}" "${ROUTING_DIR}/transit_tiles"
current_bytes="$(du -sb "${ROUTING_DIR}" | cut -f1)"
free_bytes="$(df --output=avail -B1 "${STORAGE_DIR}" | tail -n 1 | tr -d ' ')"
if (( current_bytes > LIMIT_BYTES )); then
  echo "Routing directory already exceeds the 8 GiB proof-of-concept limit." >&2
  exit 1
fi
if (( free_bytes < LIMIT_BYTES )); then
  echo "Less than 8 GiB is free; refusing to start the graph build." >&2
  exit 1
fi

download() {
  local url="$1"
  local target="$2"
  curl --fail --location --retry 8 --retry-delay 5 --continue-at - \
    --output "${target}" "${url}"
  curl --fail --location --retry 8 --retry-delay 5 \
    --output "${target}.md5" "${url}.md5"
}

download "${UTAH_URL}" "${SOURCE_DIR}/utah-latest.osm.pbf"
download "${IDAHO_URL}" "${SOURCE_DIR}/idaho-latest.osm.pbf"
(
  cd "${SOURCE_DIR}"
  md5sum --check utah-latest.osm.pbf.md5
  md5sum --check idaho-latest.osm.pbf.md5
  sha256sum utah-latest.osm.pbf idaho-latest.osm.pbf > SHA256SUMS
)

# Hard links expose the verified inputs where the official entry script searches
# without consuming a second copy of either PBF.
ln -f "${SOURCE_DIR}/utah-latest.osm.pbf" "${ROUTING_DIR}/utah-latest.osm.pbf"
ln -f "${SOURCE_DIR}/idaho-latest.osm.pbf" "${ROUTING_DIR}/idaho-latest.osm.pbf"

snapshot_date="$(date -u +%F)"
cp "${SCRIPT_DIR}/routing_compose.yaml" "${OVERLAY_FILE}"
sed -i "s/ROUTING_SNAPSHOT_DATE=.*/ROUTING_SNAPSHOT_DATE=${snapshot_date}/" "${OVERLAY_FILE}"

cd "${NOMAD_DIR}"
docker compose -p project-nomad -f "${COMPOSE_FILE}" -f "${OVERLAY_FILE}" config --quiet
docker compose -p project-nomad -f "${COMPOSE_FILE}" -f "${OVERLAY_FILE}" pull routing
docker compose -p project-nomad -f "${COMPOSE_FILE}" -f "${OVERLAY_FILE}" up -d routing

deadline=$((SECONDS + 1200))
while (( SECONDS < deadline )); do
  current_bytes="$(du -sb "${ROUTING_DIR}" | cut -f1)"
  if (( current_bytes > LIMIT_BYTES )); then
    docker stop nomad_routing >/dev/null || true
    echo "Routing build exceeded 8 GiB and was stopped." >&2
    exit 1
  fi

  health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' nomad_routing 2>/dev/null || true)"
  if [[ "${health}" == "healthy" ]]; then
    docker compose -p project-nomad -f "${COMPOSE_FILE}" -f "${OVERLAY_FILE}" up -d --no-deps admin
    echo "Utah/Idaho offline routing is healthy. Retained bytes: ${current_bytes}"
    echo "Test NOMAD at /api/maps/routing/health and then perform a disconnected route test."
    exit 0
  fi
  if [[ "${health}" == "exited" || "${health}" == "dead" ]]; then
    docker logs --tail 100 nomad_routing >&2 || true
    exit 1
  fi
  sleep 5
done

docker logs --tail 100 nomad_routing >&2 || true
echo "Routing did not become healthy within 20 minutes." >&2
exit 1
