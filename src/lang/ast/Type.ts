import { NonVoidBasicTypes } from '../lexer/BasicTypes.ts';

export type NonVoidBasicType = {
  kind: 'basic',
  value: typeof NonVoidBasicTypes[number],
}

export type VoidType = {
  kind: 'void',
}

export type PointerType = {
  kind: 'pointer',
  value: NonVoidType,
}

export type NonVoidType = NonVoidBasicType | PointerType;
export type Type = NonVoidType | VoidType;

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

  // Compiler does not understand that a.kind === b.kind here, have to double-check
  if (a.kind === 'void' && b.kind === 'void') {
    return true;
  }

  if (a.kind === 'basic' && b.kind === 'basic') {
    return a.value === b.value;
  }

  // Both a and b are pointers; compare what they point to
  return isSameType((a as PointerType).value, (b as PointerType).value);
}

export function stringifyType(type: Type): string {
  if (type.kind === 'void') {
    return 'void';
  }

  if (type.kind === 'basic') {
    return type.value;
  }

  return `&${stringifyType(type.value)}`;
}

export default Type;
