import Func from "../ast/Func.ts";
import Module from "../ast/Module.ts";
import { Environment,createEmptyEnvironment } from "./Environment.ts";
import { validateStatement } from "./StatementValidator.ts";
import { VariableOrParameterInfo } from "./VariableOrParameterInfo.ts";

export function validate(module: Module): void {
  const globalEnvironment: Environment = createEmptyEnvironment();
  const funcs = new Map<string, Func>();

  for (const func of module.funcs) {
    funcs.set(func.name, func);
  }

  for (const func of module.funcs) {
    validateFunc(func, globalEnvironment, funcs);
  }
}

export function validateFunc(
  func: Func,
  globalEnvironment: Environment,
  funcs: Map<string, Func>,
): void {
  const functionEnvironment: Environment = createEmptyEnvironment(globalEnvironment);

  for (const parameter of func.parameters) {
    if (functionEnvironment.variablesAndParameters.has(parameter.name)) {
      throw new Error(`Redefinition of parameter ${parameter.name}`);
    }

    if (parameter.type.value === 'void') {
      throw new Error(`Parameter cannot be void: ${parameter.name}`);
    }

    const parameterInfo: VariableOrParameterInfo = {
      kind: 'parameter',
      declarationStatement: parameter,
      type: parameter.type,
    };

    functionEnvironment.variablesAndParameters.set(parameter.name, parameterInfo);
  }

  let returnStatementEncountered = false;
  for (const statement of func.statements) {
    if (returnStatementEncountered) {
      throw new Error(`Unreachable statement`);
    }

    validateStatement(statement, func, functionEnvironment, funcs);

    if (statement.kind === 'return') {
      returnStatementEncountered = true;
    }
  }

  if (!returnStatementEncountered && func.type.value !== 'void') {
    throw new Error(`Function has to return a value`);
  }
}
