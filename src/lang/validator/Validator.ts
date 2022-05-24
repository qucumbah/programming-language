import Func from "../ast/Func.ts";
import Module from "../ast/Module.ts";
import ParameterDeclaration from "../ast/ParameterDeclaration.ts";
import TypedFunc from "../typedAst/TypedFunc.ts";
import TypedModule from "../typedAst/TypedModule.ts";
import TypedParameterDeclaration from "../typedAst/TypedParameterDeclaration.ts";
import TypedStatement from "../typedAst/TypedStatement.ts";
import { createEmptyEnvironment, Environment } from "./Environment.ts";
import { validateStatement } from "./StatementValidator.ts";
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

  for (const func of module.funcs) {
    if (funcs.has(func.name)) {
      throw new Error(`Duplicate function declaration: ${func.name}`);
    }
    funcs.set(func.name, func);
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
  };
}

export function validateFunction(
  func: Func,
  globalEnvironment: Environment,
  funcs: Map<string, Func>,
): TypedFunc {
  const functionEnvironment: Environment = createEmptyEnvironment(
    globalEnvironment,
  );

  const typedParameterDeclarations: TypedParameterDeclaration[] = [];
  for (const parameter of func.parameters) {
    const parameterValidationResult: TypedParameterDeclaration =
      validateParameter(
        parameter,
        functionEnvironment,
      );
    typedParameterDeclarations.push(parameterValidationResult);
  }

  const typedBodyStatements: TypedStatement[] = [];

  let returnStatementEncountered = false;
  for (const statement of func.statements) {
    if (returnStatementEncountered) {
      throw new Error(`Unreachable statement`);
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

  if (!returnStatementEncountered && func.type.kind !== "void") {
    throw new Error(`Function has to return a value`);
  }

  return {
    ...func,
    parameters: typedParameterDeclarations,
    statements: typedBodyStatements,
  };
}

export function validateParameter(
  parameter: ParameterDeclaration,
  environment: Environment,
): TypedParameterDeclaration {
  if (environment.variablesAndParameters.has(parameter.name)) {
    throw new Error(`Redefinition of parameter ${parameter.name}`);
  }

  const parameterInfo: VariableOrParameterInfo = {
    kind: "parameter",
    declarationStatement: parameter,
    type: parameter.type,
  };

  environment.variablesAndParameters.set(parameter.name, parameterInfo);

  return parameter;
}
