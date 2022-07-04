import { ExportMemory, ImportMemory, PlainMemory } from "../ast/Memory.ts";

export interface TypedPlainMemory extends PlainMemory {
  kind: "plain";
}

export interface TypedImportMemory extends ImportMemory {
  kind: "import";
  importLocation: [string, string];
}

export interface TypedExportMemory extends ExportMemory {
  kind: "export";
  exportName: string;
}

type TypedMemory = TypedPlainMemory | TypedImportMemory | TypedExportMemory;

export default TypedMemory;
