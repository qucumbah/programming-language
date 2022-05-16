import Type from "../ast/Type.ts";

export type VariableOrParameterInfo = {
  kind: 'variable' | 'constant' | 'parameter',
  type: Type,
};
