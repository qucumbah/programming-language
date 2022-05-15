import { Types } from '../lexer/Types.ts';

/**
 * This represents the possible built-in variable types.
 * TODO: maybe there should be separate Type and NonVoidType types.
 */
type Type = typeof Types[number];

export default Type;
