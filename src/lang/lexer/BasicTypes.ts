export const IntegerTypes = [
  "i32",
  "u32",
  "i64",
  "u64",
] as const;

export const FloatingPointTypes = [
  "f32",
  "f64",
] as const;

export const NonVoidBasicTypes = [
  ...IntegerTypes,
  ...FloatingPointTypes,
] as const;

export const Void = "void";

export const BasicTypes = [
  ...NonVoidBasicTypes,
  Void,
] as const;
