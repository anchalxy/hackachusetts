/** In-memory stand-in for expo-sqlite/kv-store used in tests. */
const store = new Map<string, string>();

export default {
  getItemSync(key: string): string | null {
    return store.has(key) ? (store.get(key) as string) : null;
  },
  setItemSync(key: string, value: string): void {
    store.set(key, value);
  },
  async getItem(key: string): Promise<string | null> {
    return store.has(key) ? (store.get(key) as string) : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    store.set(key, value);
  },
  __clear(): void {
    store.clear();
  },
};
