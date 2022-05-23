import Func from "../ast/Func.ts";
import { Type } from "../ast/Type.ts";
import TypedParameterDeclaration from "./TypedParameterDeclaration.ts";
import TypedStatement from "./TypedStatement.ts";

export default interface TypedFunc extends Func {
  type: Type;
  parameters: TypedParameterDeclaration[];
  statements: TypedStatement[];
}
