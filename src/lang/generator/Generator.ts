import { NonVoidType } from "../ast/Type.ts";
import { buildEnvironment, Environment } from "./Environment.ts";
import { generateStatement } from "./StatementGenerator.ts";
import TypedFunc, {
  TypedExportFunc,
  TypedFuncSignature,
  TypedImportFunc,
  TypedPlainFunc,
} from "../typedAst/TypedFunc.ts";
import TypedModule from "../typedAst/TypedModule.ts";
import TypedParameterDeclaration from "../typedAst/TypedParameterDeclaration.ts";
import TypedStatement from "../typedAst/TypedStatement.ts";
import { getWasmType, WasmType } from "./WasmType.ts";
import TypedMemory from "../typedAst/TypedMemory.ts";

export function generate(module: TypedModule): string {
  return generateModule(module);
}

export function generateModule(module: TypedModule): string {
  const children: (TypedFunc | TypedMemory)[] = [...module.funcs];

  if (module.memory !== undefined) {
    children.push(module.memory);
  }

  // Import declarations must occur before non-import ones
  children.sort(
    (left: TypedFunc | TypedMemory, right: TypedFunc | TypedMemory) => {
      const leftPriority: number = (left.kind === "import") ? -1 : 0;
      const rightPriority: number = (right.kind === "import") ? -1 : 0;

      return leftPriority - rightPriority;
    },
  );

  const generatedChildren: string[] = children.map((
    child: TypedFunc | TypedMemory,
  ) => ((child === module.memory)
    ? generateMemory(child)
    : generateFunc(child as TypedFunc))
  );

  return sExpression("module", ...generatedChildren);
}

/**
 * Generates memory declaration of any type: plain, import, export.
 * @param memory memory declaration to generate.
 * @returns generated memory declaration.
 */
export function generateMemory(memory: TypedMemory): string {
  switch (memory.kind) {
    case "plain":
      return sExpressionOneLine("memory", String(memory.size));
    case "export":
      return sExpressionOneLine(
        "memory",
        sExpressionOneLine("export", `"${memory.exportName}"`),
        String(memory.size),
      );
    case "import":
      return sExpressionOneLine(
        "import",
        `"${memory.importLocation[0]}"`,
        `"${memory.importLocation[1]}"`,
        sExpressionOneLine("memory", String(memory.size)),
      );
  }
}

export function generateFunc(func: TypedFunc): string {
  switch (func.kind) {
    case "plain":
    case "export":
      return generatePlainOrExportFunc(func);
    case "import":
      return generateImportFunc(func);
  }
}

export function generatePlainOrExportFunc(
  func: TypedPlainFunc | TypedExportFunc,
): string {
  const children: string[] = [];

  // Functions start with a signature
  children.push(
    ...generateFunctionSignature(func.signature, func.kind === "export"),
  );

  // After signature we can declare the variables
  // All variables are referenced by their numeric ID since there can be multiple variables with the
  // same name in the source code.
  const [environment, idTypeMapping]: [Environment, Map<number, NonVoidType>] =
    buildEnvironment(func);
  for (const [id, type] of idTypeMapping) {
    if (id < func.signature.parameters.length) {
      // The first IDs are parameters, and we've already generated them, so we can skip them here.
      continue;
    }

    children.push(generateVariable(type));
  }

  children.push(
    ...func.body.map((statement: TypedStatement) =>
      generateStatement(statement, environment)
    ),
  );

  return sExpression("func", ...children);
}

/**
 * Generates function import. Similar to plain or export functions, but is wrapped
 * in an import declaration and has no body.
 *
 * @param func function typed AST to generate.
 * @returns generated import function WAT
 */
export function generateImportFunc(func: TypedImportFunc): string {
  const [namespace, specifier]: [string, string] = func.importLocation;

  return sExpression(
    "import",
    `"${namespace}"`,
    `"${specifier}"`,
    sExpression("func", ...generateFunctionSignature(func.signature)),
  );
}

export function generateFunctionSignature(
  signature: TypedFuncSignature,
  isExport = false,
): string[] {
  const result: string[] = [];

  // All identifiers in WAT start with $
  // All variable aliases are stored with '$', but function names are taken straight from AST
  // without the '$' symbol, so we have to prepend it manually.
  result.push(`$${signature.name}`);

  // Export functions only differ in one line in the resulting WAT - the export declaration.
  if (isExport) {
    result.push(sExpressionOneLine("export", `"${signature.name}"`));
  }

  // Variable and parameter declarations have to be at the top of the function
  // First are the params, since they have to be followed by the function's result type
  result.push(...signature.parameters.map(generateParameter));

  // Result type s-expression should only be added if the function returns anything
  if (signature.type.kind !== "void") {
    result.push(sExpressionOneLine("result", getWasmType(signature.type)));
  }

  return result;
}

export function generateParameter(arg: TypedParameterDeclaration): string {
  const wasmType: WasmType = getWasmType(arg.type);
  return sExpressionOneLine("param", wasmType);
}

export function generateVariable(type: NonVoidType): string {
  const wasmType: WasmType = getWasmType(type);
  return sExpressionOneLine("local", wasmType);
}

export function sExpression(nodeType: string, ...children: string[]): string {
  return `(${nodeType}\n${children.map(pad).join("\n")}\n)`;
}

function sExpressionOneLine(nodeType: string, ...children: string[]): string {
  return `(${nodeType} ${children.join(" ")})`;
}

function pad(something: string): string {
  return something
    .split("\n")
    .map((part: string) => `  ${part}`)
    .join("\n");
}
