export const UnaryOperators = [
  "-",
  "@",
  "!",
] as const;

export const BitwiseBinaryOperators = [
  "|",
  "&",
  "^",
  "<<",
  ">>",
] as const;

export const BinaryOperators = [
  ...BitwiseBinaryOperators,
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
] as const;

export const Operators = [...BinaryOperators, ...UnaryOperators] as const;
