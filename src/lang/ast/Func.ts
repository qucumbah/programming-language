import { TokenSequencePosition } from "../lexer/Token.ts";
import ParameterDeclaration from "./ParameterDeclaration.ts";
import Statement from "./Statement.ts";
import Type from "./Type.ts";

/**
 * Inteface for function signature.
 */
export interface FuncSignature {
  name: string;
  type: Type;
  parameters: ParameterDeclaration[];
}

/**
 * There are three function types: plain function, export function, and export function.
 * This interface contains fields that are common in all function types.
 */
export interface CommonInfo {
  signature: FuncSignature;
  position: TokenSequencePosition;
}

/**
 * Common interface for function types that have a body - plain and export functions.
 */
export interface FuncWithBody extends CommonInfo {
  body: Statement[];
}

/**
 * Plain function consists of commin fields and a body.
 *
 * Example:
 * ```
 * func plainFuncName(param: i32): void {
 *   randomStatement();
 *   ...
 * }
 * ```
 */
export interface PlainFunc extends FuncWithBody {
  kind: "plain";
}

/**
 * Export function is the same as a plain function. The only difference is that it's marked as
 * export during generation.
 *
 * Example:
 * ```
 * export func exportFuncName(param: i32): void {
 *   randomStatement();
 *   ...
 * }
 * ```
 */
export interface ExportFunc extends FuncWithBody {
  kind: "export";
}

/**
 * Imported function doesn't have any body statements, but has import namespace and identifier.
 *
 * Example:
 * ```
 * import (namespace::identifier) func importedFuncName(param: i32): void;
 * ```
 */
export interface ImportFunc extends CommonInfo {
  kind: "import";
  importLocation: [string, string];
}

type Func = PlainFunc | ExportFunc | ImportFunc;

export default Func;
