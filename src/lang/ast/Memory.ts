import { TokenSequencePosition } from "../lexer/Token.ts";

export interface CommonInfo {
  size: number;
  position: TokenSequencePosition;
}

export interface PlainMemory extends CommonInfo {
  kind: "plain";
}

export interface ImportMemory extends CommonInfo {
  kind: "import";
  importLocation: [string, string];
}

export interface ExportMemory extends CommonInfo {
  kind: "export";
  exportName: string;
}

type Memory = PlainMemory | ImportMemory | ExportMemory;

export default Memory;
