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
  while (true) {
    if (environment.variablesAndParameters.has(name)) {
      return environment.variablesAndParameters.get(name) as VariableOrParameterInfo;
    }

    if (environment.parent === undefined) {
      return null;
    }

    environment = environment.parent;
  }
}
