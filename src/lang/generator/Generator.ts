import Type from "../ast/Type.ts";
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
  // We don't need any aliases for function parameters, leave them unchanged
  children.push(...func.parameters.map(generateParameter));

  // Result type s-expression should only be added if the function returns anything
  if (func.type.value !== 'void') {
    assert(func.type.kind === 'basic', 'pointer types are not implemented');
    children.push(sExpressionOneLine('result', func.type.value));
  }

  // But we do need aliases for all variables since we can redeclare variables
  const [environment, allAliases]: [Environment, Map<string, Type>] = buildEnvironment(func);
  for (const alias of allAliases) {
    const [name, type]: [string, Type] = alias;
    assert(type.kind === 'basic', 'pointer types are not implemented');
    children.push(sExpressionOneLine('local', name, type.value));
  }

  children.push(...func.statements.map(
    (statement: TypedStatement) => generateStatement(statement, environment))
  );

  return sExpression('func', ...children);
}

export function generateParameter(arg: TypedParameterDeclaration): string {
  assert(arg.type.kind === 'basic', 'pointer types are not implemented');
  return sExpressionOneLine('param', `$${arg.name}`, arg.type.value);
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
