import Func from "../ast/Func.ts";
import { PossiblyVoidType } from "../ast/Type.ts";
import TypedParameterDeclaration from "./TypedParameterDeclaration.ts";
import TypedStatement from "./TypedStatement.ts";

export default interface TypedFunc extends Func {
  type: PossiblyVoidType;
  parameters: TypedParameterDeclaration[];
  statements: TypedStatement[];
}
