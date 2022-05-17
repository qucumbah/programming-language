import { NonVoidBasicTypes, BasicTypes } from '../lexer/BasicTypes.ts';

export type PointerType = {
  kind: 'pointer',
  value: Type,
}

export type BasicType = {
  kind: 'basic',
  value: typeof BasicTypes[number],
}

/**
 * This represents the possible variable or function types.
 */
type Type = PointerType | BasicType;

export type NonVoidBasicType = {
  kind: 'basic',
  value: typeof NonVoidBasicTypes[number],
}

// Helper types that assert that explicitly state whether it can be void

export type PossiblyVoidType = (PointerType | BasicType) & { canBeVoid: true };
export type NonVoidType = (PointerType | NonVoidBasicType) & { canBeVoid: false };

/**
 * Convinience function for comparing two types
 * @param a first type
 * @param b second type
 * @returns whether the types are the same
 */
export function isSameType(a: Type, b: Type): boolean {
  if (a.kind !== b.kind) {
    return false;
  }

  if (a.kind === 'basic') {
    return a.value === b.value;
  }

  // Both a and b are pointers; compare what they point to
  return isSameType(a.value, b.value as Type);
}

export default Type;
