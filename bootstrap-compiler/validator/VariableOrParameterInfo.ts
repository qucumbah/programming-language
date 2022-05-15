import Type from "../ast/Type.ts";

export type VariableOrParameterInfo = {
  kind: 'variable' | 'parameter',
  type: Type,
};
