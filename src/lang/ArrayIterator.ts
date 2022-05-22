export default class Iter<T> {
  private nextItemIndex = 0;

  constructor(private items: T[]) { }

  next(after = 0): T {
    const result: T = this.peekNext(after);
    this.nextItemIndex += 1;
    return result;
  }

  peekNext(after = 0): T {
    if (this.nextItemIndex + after >= this.items.length) {
      throw new Error(`Unexpected end of input`);
    }

    return this.items[this.nextItemIndex + after];
  }

  peekPrev(): T {
    if (this.nextItemIndex === 0) {
      throw new Error(`Unable to find previous token`);
    }

    return this.items[this.nextItemIndex - 1];
  }

  hasNext(): boolean {
    return this.nextItemIndex < this.items.length;
  }

  remainingCount(): number {
    return this.items.length - this.nextItemIndex;
  }

  clone(): Iter<T> {
    const result: Iter<T> = new Iter(this.items);
    result.nextItemIndex = this.nextItemIndex;
    return result;
  }
}
