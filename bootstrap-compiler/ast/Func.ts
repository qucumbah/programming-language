import Argument from './Argument.ts';
import Statement from './Statement.ts';
import Type from './Type.ts';

export default interface Func {
  name: string,
  type: Type,
  args: Argument[],
  statements: Statement[],
}
