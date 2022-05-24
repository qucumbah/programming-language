import { TokenSequencePosition } from "../lexer/Token.ts";

export default class ValidationError extends Error {
  constructor(message: string, public failReason: { position: TokenSequencePosition }) {
    super(
      `${message} Position: line ${failReason.position.start.line}, col ${failReason.position.start.colStart}`,
    );
  }
}
