export function loadVisibleColumnKeys<K extends string>(storageKey: string, allKeys: readonly K[]): K[] {
  const fallback = [...allKeys];

  if (typeof localStorage === 'undefined') return fallback;

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;

    const allowed = new Set(allKeys);
    const selected = new Set<K>();

    for (const value of parsed) {
      if (typeof value !== 'string') continue;
      if (!allowed.has(value as K)) continue;
      selected.add(value as K);
    }

    const ordered = fallback.filter(key => selected.has(key));
    return ordered.length > 0 ? ordered : fallback;
  } catch {
    return fallback;
  }
}

export function persistVisibleColumnKeys<K extends string>(storageKey: string, visibleKeys: readonly K[]): void {
  if (typeof localStorage === 'undefined') return;

  localStorage.setItem(storageKey, JSON.stringify(visibleKeys));
}

export function toggleVisibleColumnKey<K extends string>(
  visibleKeys: readonly K[],
  key: K,
  allKeys: readonly K[],
): K[] {
  const next = new Set(visibleKeys);

  if (next.has(key)) {
    if (next.size === 1) return [...visibleKeys];
    next.delete(key);
  } else {
    next.add(key);
  }

  return allKeys.filter(columnKey => next.has(columnKey));
}

export function usesDefaultVisibleColumns<K extends string>(visibleKeys: readonly K[], allKeys: readonly K[]): boolean {
  return visibleKeys.length === allKeys.length && allKeys.every((key, index) => visibleKeys[index] === key);
}
