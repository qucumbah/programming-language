import { Token } from './types.ts';
import { Iter } from './createIterator.ts';

export default function parse(tokens: Iter<Token>) {
  return parseModule(tokens);
}

function parseModule(tokens: Iter<Token>) {
  if (tokens.hasNext()) {

  }
}
