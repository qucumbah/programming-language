import ParameterDeclaration from "../ast/ParameterDeclaration.ts";
import Func from "../ast/Func.ts";
import Module from "../ast/Module.ts";
import Statement from "../ast/Statement.ts";
import Type from "../ast/Type.ts";
import { buildEnvironment, Environment } from "./Environment.ts";
import { generateStatement } from "./StatementGenerator.ts";

export function generate(module: Module): string {
  return generateModule(module);
}

export function generateModule(module: Module): string {
  const funcs: string[] = module.funcs.map(generateFunc);
  return sExpression('module', ...funcs);
}

export function generateFunc(func: Func): string {
  const children: string[] = [];

  // All identifiers in WAT start with $
  // All variable aliases are stored with '$', but function names are taken straight from AST
  // without the '$' symbol, so we have to prepend it manually.
  children.push(`$${func.name}`);

  // Variable and parameter declarations have to be at the top of the function
  // We don't need any aliases for function parameters, leave them unchanged
  children.push(...func.args.map(generateParameter));

  // Result type s-expression should only be added if the function returns anything
  if (func.type !== 'void') {
    children.push(sExpressionOneLine('result', func.type));
  }

  // But we do need aliases for all variables since we can redeclare variables
  const [environment, allAliases]: [Environment, Map<string, Type>] = buildEnvironment(func);
  for (const alias of allAliases) {
    const [name, type]: [string, Type] = alias;
    children.push(sExpressionOneLine('local', name, type));
  }

  children.push(...func.statements.map(
    (statement: Statement) => generateStatement(statement, environment))
  );

  return sExpression('func', ...children);
}

export function generateParameter(arg: ParameterDeclaration): string {
  return sExpressionOneLine('param', `$${arg.name}`, arg.type);
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
