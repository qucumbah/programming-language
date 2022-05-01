export interface Iter<T> {
  next(): T,
  hasNext(): boolean,
}

export default function createIterator<T>(items: Iterable<T>): Iter<T> {
  const iterator: Iterator<T> = items[Symbol.iterator]();
  let next = iterator.next();

  return {
    next(): T {
      if (next.done) {
        throw new Error(`No more items in iterator`);
      }

      const result: T = next.value;
      next = iterator.next();

      return result;
    },

    hasNext(): boolean {
      return !next.done;
    },
  };
}
