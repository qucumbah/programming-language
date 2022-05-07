import Type from './Type.ts';

/**
 * Function argument descriptor. Only appears in function definitions.
 * Example:
 * 
 * ```
 * // Argument descriptor consists of name (`argName`) and type (`i32`)
 * func funcName(argName: i32) {
 *   // Some code
 * }
 * ```
 */
export default interface Argument {
  name: string,
  type: Type,
}
