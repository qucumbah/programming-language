export const UnaryOperators = [
  "-",
  "@",
  "!",
] as const;

export const BinaryOperators = [
  "+",
  "-",
  "*",
  "/",
  "==",
  "!=",
  ">=",
  "<=",
  ">",
  "<",
  "=",
  "||",
  "&&",
] as const;

export const Operators = [...BinaryOperators, ...UnaryOperators] as const;
