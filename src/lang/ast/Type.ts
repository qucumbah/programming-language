import { BasicTypes } from '../lexer/BasicTypes.ts';

/**
 * This represents the possible variable or function types.
 * TODO: maybe there should be separate Type and NonVoidType types.
 */
type Type = {
  kind: 'basic',
  value: typeof BasicTypes[number],
} | {
  kind: 'pointer',
  value: Type,
};

export default Type;
