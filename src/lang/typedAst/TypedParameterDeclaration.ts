import ParameterDeclaration from "../ast/ParameterDeclaration.ts";
import { NonVoidType } from "../ast/Type.ts";

export default interface TypedParameterDeclaration
  extends ParameterDeclaration {
  type: NonVoidType;
}
