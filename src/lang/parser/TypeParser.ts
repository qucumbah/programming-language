import ArrayIterator from "../ArrayIterator.ts";
import Type from "../ast/Type.ts";
import { Token } from "../lexer/Token.ts";

export function parseType(tokens: ArrayIterator<Token>): Type {
  const nextToken: Token = tokens.next();

  // Only support basic types for now
  if (nextToken.type !== 'basicType') {
    throw new Error(`Could not parse type descriptor: expected type, received ${nextToken.value}`);
  }

  return {
    kind: 'basic',
    value: nextToken.value,
  };
}