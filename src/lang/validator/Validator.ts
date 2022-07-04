import Func, {
  ExportFunc,
  FuncSignature,
  FuncWithBody,
  ImportFunc,
  PlainFunc,
} from "../ast/Func.ts";
import Memory from "../ast/Memory.ts";
import Module from "../ast/Module.ts";
import ParameterDeclaration from "../ast/ParameterDeclaration.ts";
import TypedFunc, {
  TypedExportFunc,
  TypedFuncSignature,
  TypedFuncWithBody,
  TypedImportFunc,
  TypedPlainFunc,
} from "../typedAst/TypedFunc.ts";
import TypedMemory from "../typedAst/TypedMemory.ts";
import TypedModule from "../typedAst/TypedModule.ts";
import TypedParameterDeclaration from "../typedAst/TypedParameterDeclaration.ts";
import TypedStatement from "../typedAst/TypedStatement.ts";
import { createEmptyEnvironment, Environment } from "./Environment.ts";
import { validateStatement } from "./StatementValidator.ts";
import ValidationError from "./ValidationError.ts";
import { VariableOrParameterInfo } from "./VariableOrParameterInfo.ts";

/**
 * Validates the ast, returns typed AST as a result.
 * Typed AST is almost the same as the original one, but contains more precise info
 * (mostly type info).
 *
 * @param module module to validate
 */
export function validate(module: Module): TypedModule {
  return validateModule(module);
}

/**
 * Validates the provided module, returns typed AST as a result.
 *
 * @param module module to validate
 */
export function validateModule(module: Module): TypedModule {
  const globalEnvironment: Environment = createEmptyEnvironment();
  const funcs = new Map<string, Func>();

  if (module.memories.length > 1) {
    throw new ValidationError(
      `Only one memory declaration is allowed`,
      module.memories[1],
    );
  }

  for (const func of module.funcs) {
    if (funcs.has(func.signature.name)) {
      throw new ValidationError(
        `Duplicate function declaration: ${func.signature.name}`,
        func,
      );
    }
    funcs.set(func.signature.name, func);
  }

  const funcsValidationResult: TypedFunc[] = [];

  for (const func of module.funcs) {
    const funcValidationResult: TypedFunc = validateFunction(
      func,
      globalEnvironment,
      funcs,
    );
    funcsValidationResult.push(funcValidationResult);
  }

  return {
    ...module,
    funcs: funcsValidationResult,
    memory: module.memories.length === 1
      ? validateMemory(module.memories[0], funcs)
      : undefined,
  };
}

/**
 * Validates the provided function.
 *
 * @param func function to validate.
 * @param globalEnvironment global module environment.
 * @param funcs functions in the module.
 * @returns typed function.
 */
export function validateFunction(
  func: Func,
  globalEnvironment: Environment,
  funcs: Map<string, Func>,
): TypedFunc {
  switch (func.kind) {
    case "plain":
      return validatePlainFunction(func, globalEnvironment, funcs);
    case "export":
      return validateExportFunction(func, globalEnvironment, funcs);
    case "import":
      return validateImportFunction(func);
  }
}

/**
 * Validates the provided plain function.
 *
 * @param func function to validate.
 * @param globalEnvironment global module environment.
 * @param funcs functions in the module.
 * @returns typed function.
 */
export function validatePlainFunction(
  func: PlainFunc,
  globalEnvironment: Environment,
  funcs: Map<string, Func>,
): TypedPlainFunc {
  const validationResult: TypedFuncWithBody = validateFunctionWithBody(
    func,
    globalEnvironment,
    funcs,
  );

  return {
    kind: "plain",
    ...validationResult,
  };
}

/**
 * Validates the provided export function.
 *
 * @param func function to validate.
 * @param globalEnvironment global module environment.
 * @param funcs functions in the module.
 * @returns typed function.
 */
export function validateExportFunction(
  func: ExportFunc,
  globalEnvironment: Environment,
  funcs: Map<string, Func>,
): TypedExportFunc {
  const validationResult: TypedFuncWithBody = validateFunctionWithBody(
    func,
    globalEnvironment,
    funcs,
  );

  return {
    kind: "export",
    ...validationResult,
  };
}

export function validateFunctionWithBody(
  func: FuncWithBody,
  globalEnvironment: Environment,
  funcs: Map<string, Func>,
): TypedFuncWithBody {
  const functionEnvironment: Environment = createEmptyEnvironment(
    globalEnvironment,
  );

  // This adds parameter declarations to the environment
  const signatureValidationResult: TypedFuncSignature =
    validateFunctionSignature(func.signature, functionEnvironment);

  const typedBodyStatements: TypedStatement[] = validateFunctionBody(
    func,
    functionEnvironment,
    funcs,
  );

  return {
    ...func,
    signature: signatureValidationResult,
    body: typedBodyStatements,
  };
}

/**
 * Validates the provided import function.
 * Only have to validate the signature here since import function doesn't have anything else.
 *
 * @param func function to validate.
 * @returns typed function.
 */
export function validateImportFunction(func: ImportFunc): TypedImportFunc {
  // Need a temporary environment to avoid repeating parameter declarations
  const tempEnvironment: Environment = createEmptyEnvironment();

  const signatureValidationResult: TypedFuncSignature =
    validateFunctionSignature(func.signature, tempEnvironment);

  return {
    ...func,
    signature: signatureValidationResult,
  };
}

export function validateFunctionSignature(
  signature: FuncSignature,
  functionEnvironment: Environment,
): TypedFuncSignature {
  const typedParameterDeclarations: TypedParameterDeclaration[] = [];
  for (const parameter of signature.parameters) {
    const parameterValidationResult: TypedParameterDeclaration =
      validateParameter(parameter, functionEnvironment);
    typedParameterDeclarations.push(parameterValidationResult);
  }

  return {
    ...signature,
    parameters: typedParameterDeclarations,
  };
}

export function validateFunctionBody(
  func: FuncWithBody,
  functionEnvironment: Environment,
  funcs: Map<string, Func>,
): TypedStatement[] {
  const typedBodyStatements: TypedStatement[] = [];

  let returnStatementEncountered = false;
  for (const statement of func.body) {
    if (returnStatementEncountered) {
      throw new ValidationError(`Unreachable statement`, statement);
    }

    const statementValidationResult: TypedStatement = validateStatement(
      statement,
      func,
      functionEnvironment,
      funcs,
    );
    typedBodyStatements.push(statementValidationResult);

    if (statement.kind === "return") {
      returnStatementEncountered = true;
    }
  }

  if (!returnStatementEncountered && func.signature.type.kind !== "void") {
    throw new ValidationError(`Function has to return a value`, func);
  }

  return typedBodyStatements;
}

export function validateParameter(
  parameter: ParameterDeclaration,
  environment: Environment,
): TypedParameterDeclaration {
  if (environment.variablesAndParameters.has(parameter.name)) {
    throw new ValidationError(
      `Redefinition of parameter ${parameter.name}`,
      parameter,
    );
  }

  const parameterInfo: VariableOrParameterInfo = {
    kind: "parameter",
    declarationStatement: parameter,
    type: parameter.type,
  };

  environment.variablesAndParameters.set(parameter.name, parameterInfo);

  return parameter;
}

/**
 * Validates the provided memory.
 *
 * @param memory memory declarations to validate.
 * @param funcs functions in the module.
 * @returns typed memory declaration.
 */
export function validateMemory(
  memory: Memory,
  funcs: Map<string, Func>,
): TypedMemory {
  // Plain and import memory declarations are always valid if they passed the parsing stage
  if (memory.kind !== "export") {
    return memory;
  }

  // Export memory is the only one that needs to be validated: check for duplicate export name
  const allFuncs: Func[] = Array.from(funcs.values());
  const exportFunctionWithSameName: Func | undefined = allFuncs.find(
    (func: Func) =>
      func.kind === "export" && func.signature.name === memory.exportName,
  );
  if (exportFunctionWithSameName !== undefined) {
    throw new ValidationError(
      `Duplicate export name: ${memory.exportName}. Already used in export function.`,
      memory,
    );
  }

  return memory;
}
