import Type from './Type.ts';

/**
 * Function parameter declaration descriptor. Only appears in function definitions.
 * Example:
 * 
 * ```
 * // Parameter descriptor consists of name (`argName`) and type (`i32`)
 * func funcName(argName: i32) {
 *   // Some code
 * }
 * ```
 */
export default interface ParameterDeclaration {
  name: string,
  type: Type,
}
