export const SignedIntegerTypes = [
  "i32",
  "i64",
] as const;

export const UnsignedIntegerTypes = [
  "u32",
  "u64",
] as const;

export const IntegerTypes = [
  ...SignedIntegerTypes,
  ...UnsignedIntegerTypes,
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
