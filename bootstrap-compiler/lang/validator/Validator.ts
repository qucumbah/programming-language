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

  for (const arg of func.args) {
    if (functionEnvironment.variablesAndParameters.has(arg.name)) {
      throw new Error(`Redefinition of parameter ${arg.name}`);
    }

    if (arg.type === 'void') {
      throw new Error(`Parameter cannot be void: ${arg.name}`);
    }

    const parameterInfo: VariableOrParameterInfo = {
      kind: 'parameter',
      type: arg.type,
    };

    functionEnvironment.variablesAndParameters.set(arg.name, parameterInfo);
  }

  let returnStatementEncountered = false;
  for (const statement of func.statements) {
    if (returnStatementEncountered) {
      throw new Error(`Unreachable statement`);
    }

    validateStatement(statement, func, functionEnvironment, funcs);

    if (statement.type === 'return') {
      returnStatementEncountered = true;
    }
  }

  if (!returnStatementEncountered && func.type !== 'void') {
    throw new Error(`Function has to return a value`);
  }
}
