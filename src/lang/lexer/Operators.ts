export const UnaryOperators = [
  "-",
  "@",
  "!",
] as const;

export const ShiftOperators = [
  "<<",
  ">>",
] as const;

export const LogicalOperators = [
  "|",
  "&",
  "^",
] as const;

export const BinaryOperators = [
  ...ShiftOperators,
  ...LogicalOperators,
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
