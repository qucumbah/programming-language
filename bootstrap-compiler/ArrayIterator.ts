export interface Iter<T> {
  next(add?: number): T,
  peekNext(add?: number): T,
  hasNext(): boolean,
  remainingCount(): number,
}

export function createIterator<T>(items: T[]): Iter<T> {
  let nextItemIndex = 0;

  return {
    next(after = 0): T {
      const result: T = this.peekNext(after);
      nextItemIndex += 1;
      return result;
    },

    peekNext(after = 0): T {
      if (nextItemIndex + after >= items.length) {
        throw new Error(`Unexpected end of input`);
      }

      return items[nextItemIndex + after];
    },

    hasNext(): boolean {
      return nextItemIndex < items.length;
    },

    remainingCount(): number {
      return items.length - nextItemIndex;
    }
  };
}
