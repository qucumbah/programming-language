import Func from "../ast/Func.ts";
import Module from "../ast/Module.ts";
import ParameterDeclaration from "../ast/ParameterDeclaration.ts";
import { NonVoidType } from "../ast/Type.ts";
import TypedFunc from "../typedAst/TypedFunc.ts";
import TypedModule from "../typedAst/TypedModule.ts";
import TypedParameterDeclaration from "../typedAst/TypedParameterDeclaration.ts";
import TypedStatement from "../typedAst/TypedStatement.ts";
import { Environment,createEmptyEnvironment } from "./Environment.ts";
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
  const globalEnvironment: Environment = createEmptyEnvironment();
  const funcs = new Map<string, Func>();

  for (const func of module.funcs) {
    funcs.set(func.name, func);
  }

  const funcsValidationResult: TypedFunc[] = [];

  for (const func of module.funcs) {
    const funcValidationResult: TypedFunc = validateFunc(func, globalEnvironment, funcs);
    funcsValidationResult.push(funcValidationResult);
  }

  return {
    ...module,
    funcs: funcsValidationResult,
  };
}

export function validateFunc(
  func: Func,
  globalEnvironment: Environment,
  funcs: Map<string, Func>,
): TypedFunc {
  const functionEnvironment: Environment = createEmptyEnvironment(globalEnvironment);

  const typedParameterDeclarations: TypedParameterDeclaration[] = [];
  for (const parameter of func.parameters) {
    const parameterValidationResult: TypedParameterDeclaration = validateParameter(
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

    if (statement.kind === 'return') {
      returnStatementEncountered = true;
    }
  }

  if (!returnStatementEncountered && func.type.value !== 'void') {
    throw new Error(`Function has to return a value`);
  }

  return {
    ...func,
    type: {
      ...func.type,
      canBeVoid: true,
    },
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

  if (parameter.type.value === 'void') {
    throw new Error(`Parameter cannot be void: ${parameter.name}`);
  }

  // TODO: code duplication, ugliness. Maybe there is a way to fix this?
  // This is the only way ts compiler understands that parameter type is non-void
  const parameterType: NonVoidType = (parameter.type.kind === 'pointer') ? {
    kind: 'pointer',
    value: parameter.type.value,
    canBeVoid: false,
  } : {
    kind: 'basic',
    value: parameter.type.value,
    canBeVoid: false,
  };

  const parameterInfo: VariableOrParameterInfo = {
    kind: 'parameter',
    declarationStatement: parameter,
    type: parameterType,
  };

  environment.variablesAndParameters.set(parameter.name, parameterInfo);

  return {
    ...parameter,
    type: parameterType,
  };
}
