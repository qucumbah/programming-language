import { TokenSequencePosition } from "../lexer/Token.ts";
import ParameterDeclaration from "./ParameterDeclaration.ts";
import Statement from "./Statement.ts";
import Type from "./Type.ts";

/**
 * Function consists of the function name, return type, argument descriptors and the body statements
 */
export default interface Func {
  name: string;
  type: Type;
  parameters: ParameterDeclaration[];
  statements: Statement[];
  position: TokenSequencePosition;
}
