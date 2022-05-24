import ArrayIterator from "../ArrayIterator.ts";
import Type, { NonVoidType } from "../ast/Type.ts";
import { Token } from "../lexer/Token.ts";

export function parseType(tokens: ArrayIterator<Token>): Type {
  // Void type consists of a single token - 'void'
  if (tokens.peekNext().value === "void") {
    // Consume the 'void' token
    tokens.next();

    return {
      kind: "void",
    };
  }

  // All other types have to be non-void, so just parse for them
  return parseNonVoidType(tokens);
}

export function parseNonVoidType(tokens: ArrayIterator<Token>): NonVoidType {
  const nextToken: Token = tokens.next();

  // Pointer types start with the '&' token
  if (nextToken.value === "&") {
    return {
      kind: "pointer",
      // We don't have pointer to void in this language
      value: parseNonVoidType(tokens),
    };
  }

  // The only option left is basic type
  if (nextToken.type !== "basicType") {
    throw new Error(
      `Could not parse type descriptor: expected type, received ${nextToken.value}`,
    );
  }

  // We don't expect to see any 'void' tokens here
  if (nextToken.value === "void") {
    throw new Error(
      `Could not parse type descriptor: expected non-void type, received void`,
    );
  }

  return {
    kind: "basic",
    value: nextToken.value,
  };
}
