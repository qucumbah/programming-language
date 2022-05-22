export const NonVoidBasicTypes = [
  'i32',
  'u32',
  'f32',
  'i64',
  'u64',
  'f64',
] as const;

export const Void = 'void';

export const BasicTypes = [
  ...NonVoidBasicTypes,
  Void,
] as const;
