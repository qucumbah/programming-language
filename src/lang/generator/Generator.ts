import { NonVoidType } from "../ast/Type.ts";
import { buildEnvironment, Environment } from "./Environment.ts";
import { generateStatement } from "./StatementGenerator.ts";
import { assert } from "../Assert.ts";
import TypedFunc from "../typedAst/TypedFunc.ts";
import TypedModule from "../typedAst/TypedModule.ts";
import TypedParameterDeclaration from "../typedAst/TypedParameterDeclaration.ts";
import TypedStatement from "../typedAst/TypedStatement.ts";

export function generate(module: TypedModule): string {
  return generateModule(module);
}

export function generateModule(module: TypedModule): string {
  const funcs: string[] = module.funcs.map(generateFunc);
  return sExpression('module', ...funcs);
}

export function generateFunc(func: TypedFunc): string {
  const children: string[] = [];

  // All identifiers in WAT start with $
  // All variable aliases are stored with '$', but function names are taken straight from AST
  // without the '$' symbol, so we have to prepend it manually.
  children.push(`$${func.name}`);

  // Variable and parameter declarations have to be at the top of the function
  // First are the params, since they have to be followed by the function's result type
  children.push(...func.parameters.map(generateParameter));

  // Result type s-expression should only be added if the function returns anything
  if (func.type.value !== 'void') {
    assert(func.type.kind === 'basic', 'pointer types are not implemented');
    children.push(sExpressionOneLine('result', func.type.value));
  }

  // After result type we can declare the variables
  // All variables are referenced by their numeric ID since there can be multiple variables with the
  // same name in the source code.
  const [environment, idTypeMapping]: [Environment, Map<number, NonVoidType>] = buildEnvironment(func);
  for (const [_id, type] of idTypeMapping) {
    children.push(generateVariable(type));
  }

  children.push(...func.statements.map(
    (statement: TypedStatement) => generateStatement(statement, environment))
  );

  return sExpression('func', ...children);
}

export function generateParameter(arg: TypedParameterDeclaration): string {
  assert(arg.type.kind === 'basic', 'pointer types are not implemented');
  return sExpressionOneLine('param', arg.type.value);
}

export function generateVariable(type: NonVoidType): string {
  assert(type.kind === 'basic', 'pointer types are not implemented');
  return sExpressionOneLine('local', type.value);
}

export function sExpression(nodeType: string, ...children: string[]): string {
  return `(${nodeType}\n${children.map(pad).join('\n')}\n)`;
}

function sExpressionOneLine(nodeType: string, ...children: string[]): string {
  return `(${nodeType} ${children.join(' ')})`;
}

function pad(something: string): string {
  return something.split('\n').map((part: string) => `  ${part}`).join('\n');
}
