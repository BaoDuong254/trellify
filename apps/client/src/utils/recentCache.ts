interface RecentCache<T> {
  get: (key: string) => T | undefined;
  set: (key: string, value: T) => void;
}

export const createRecentCache = <T>(maxEntries = 50): RecentCache<T> => {
  const entries = new Map<string, T>();

  return {
    get: (key: string): T | undefined => entries.get(key),
    set: (key: string, value: T): void => {
      entries.delete(key);
      entries.set(key, value);
      if (entries.size > maxEntries) {
        const oldest = entries.keys().next().value;
        if (oldest !== undefined) entries.delete(oldest);
      }
    },
  };
};
