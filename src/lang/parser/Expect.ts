import { Token } from "../lexer/Token.ts";

/**
 * Assertion for token value
 * 
 * @param token provided token
 * @param value expected token value
 */
export function expect(token: Token, value: string): void {
  if (token.value !== value) {
    throw new Error(`Unexpected token: ${token.value}. Expected: ${value}. Position: line ${token.position.line}, col ${token.position.colStart}.`);
  }
}

/**
 * Assertion for token type
 * 
 * @param token provided token
 * @param type expected token tyoe
 * 
 * @returns provided token value (for convenience)
 */
export function expectType(token: Token, type: typeof token.type): string {
  if (token.type !== type) {
    throw new Error(`Unexpected token type: ${token.type}. Expected: ${type}. Position: line ${token.position.line}, col ${token.position.colStart}.`);
  }

  return token.value;
}
