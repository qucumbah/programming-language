import Expression from "../ast/Expression.ts";

export function throwValidationError(message: string, expression: Expression): never {
  throw new Error(`${message} Position: line ${expression.position.start.line}, col ${expression.position.start.colStart}`);
}
