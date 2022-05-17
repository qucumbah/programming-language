import { Token } from "../lexer/Token.ts";

/**
 * Assertion for token value
 * 
 * @param token provided token
 * @param value expected token value
 */
export function expect(token: Token, value: string): void {
  if (token.value !== value) {
    throwTokenError(token, `Unexpected token: ${token.value}. Expected: ${value}.`);
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
    throwTokenError(token, `Unexpected token type: ${token.type}. Expected: ${type}.`);
  }

  return token.value;
}

/**
 * Throw error for token and log its position
 * @param token erroneous token
 * @param message error message
 */
export function throwTokenError(token: Token, message: string): never {
  throw new Error(`${message} Position: line ${token.position.line}, col ${token.position.colStart}.`);
}
