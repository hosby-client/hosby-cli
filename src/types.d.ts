declare module "lru-cache" {
  export interface LRUCache<K, V> extends Map<K, V> {
    entries(): IterableIterator<[K, V]>;
    keys(): IterableIterator<K>;
    values(): IterableIterator<V>;
    [Symbol.iterator](): IterableIterator<[K, V]>;
    forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: unknown): void;
  }
}
