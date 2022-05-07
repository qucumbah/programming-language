import Argument from './Argument.ts';
import Statement from './Statement.ts';
import Type from './Type.ts';

/**
 * Function consists of the function name, return type, argument descriptors and the body statements
 */
export default interface Func {
  name: string,
  type: Type,
  args: Argument[],
  statements: Statement[],
}
