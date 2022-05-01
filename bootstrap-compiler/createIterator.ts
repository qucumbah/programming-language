export interface Iter<T> {
  next(): T,
  peekNext(): T,
  hasNext(): boolean,
}

export default function createIterator<T>(items: Iterable<T>): Iter<T> {
  const iterator: Iterator<T> = items[Symbol.iterator]();
  let next = iterator.next();

  return {
    next(): T {
      const result: T = this.peekNext();
      next = iterator.next();
      return result;
    },

    peekNext(): T {
      if (next.done) {
        throw new Error(`Unexpected end of input`);
      }

      return next.value;
    },

    hasNext(): boolean {
      return !next.done;
    },
  };
}
