import { VariableOrParameterInfo } from "./VariableOrParameterInfo.ts";

export type Environment = {
  parent?: Environment,
  variablesAndParameters: Map<string, VariableOrParameterInfo>,
};

export function createEmptyEnvironment(parent?: Environment): Environment {
  return {
    parent,
    variablesAndParameters: new Map<string, VariableOrParameterInfo>(),
  };
}

export function lookupVariableOrParameter(
  name: string,
  environment: Environment,
): VariableOrParameterInfo | null {
  const result: VariableOrParameterInfo | undefined = environment.variablesAndParameters.get(name);

  if (result !== undefined) {
    return result;
  }

  if (environment.parent !== undefined) {
    return lookupVariableOrParameter(name, environment.parent);
  }

  return null;
}
