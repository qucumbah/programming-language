import { TokenPosition } from "./Token.ts";

export default class LexerError extends Error {
  constructor(message: string, public failingPosition: TokenPosition) {
    super(
      `${message} Position: line ${failingPosition.line}, col ${failingPosition.colStart}`,
    );
  }
}
