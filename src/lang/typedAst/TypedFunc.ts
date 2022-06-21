import { CommonInfo, FuncSignature } from "../ast/Func.ts";
import { Type } from "../ast/Type.ts";
import TypedParameterDeclaration from "./TypedParameterDeclaration.ts";
import TypedStatement from "./TypedStatement.ts";

export interface TypedFuncSignature extends FuncSignature {
  type: Type;
  parameters: TypedParameterDeclaration[];
}

export interface TypedCommonInfo extends CommonInfo {
  signature: TypedFuncSignature;
}

export interface TypedFuncWithBody extends TypedCommonInfo {
  body: TypedStatement[];
}

export interface TypedPlainFunc extends TypedFuncWithBody {
  kind: "plain";
}

export interface TypedExportFunc extends TypedFuncWithBody {
  kind: "export";
}

export interface TypedImportFunc extends TypedCommonInfo {
  kind: "import";
  importLocation: [string, string];
}

export type TypedFunc = TypedPlainFunc | TypedExportFunc | TypedImportFunc;

export default TypedFunc;
