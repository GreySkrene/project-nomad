/**
 * pmtiles preallocates a sparse output at approximately its final logical size.
 * `stat.size` therefore jumps to the estimate almost immediately and cannot
 * represent extraction progress. On Unix, `blocks` reports storage actually
 * allocated in 512-byte units; retain size as a portable fallback.
 */
export function pmtilesProgressBytes(fileStat: { size: number; blocks?: number }): number {
  if (typeof fileStat.blocks === 'number' && fileStat.blocks >= 0) {
    return Math.min(fileStat.size, fileStat.blocks * 512)
  }
  return fileStat.size
}
