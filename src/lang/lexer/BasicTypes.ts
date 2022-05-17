export const NonVoidBasicTypes = [
  'i32',
  'f32',
] as const;

export const Void = 'void';

export const BasicTypes = [
  ...NonVoidBasicTypes,
  Void,
] as const;
