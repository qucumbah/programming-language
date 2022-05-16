import ParameterDeclaration from "../ast/ParameterDeclaration.ts";
import { VariableDeclarationStatement } from "../ast/Statement.ts";
import Type from "../ast/Type.ts";

/**
 * This is used to track the kind (param/var/const) and the return type of the variable / parameter
 */
export type VariableOrParameterInfo = ({
  kind: 'parameter',
  declarationStatement: ParameterDeclaration,
} | {
  kind: 'variable',
  declarationStatement: VariableDeclarationStatement,
}) & {
  type: Type,
};
