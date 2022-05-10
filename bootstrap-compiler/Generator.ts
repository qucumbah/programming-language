import Argument from "./ast/Argument.ts";
import Func from "./ast/Func.ts";
import Module from "./ast/Module.ts";
import Statement from "./ast/Statement.ts";

export function generate(module: Module): string {
  return generateModule(module);
}

export function generateModule(module: Module): string {
  const funcs: string[] = module.funcs.map(generateFunc);
  return sExpression('module', ...funcs);
}

export function generateFunc(func: Func): string {
  // TODO: check identifiers for invalid characters during lexing
  const children: string[] = [];

  // All identifiers in WAT start with $
  children.push(`$${func.name}`);

  children.push(...func.args.map(generateArg));

  // Result type s expression should only be added if the function returns anything
  if (func.type !== 'void') {
    children.push(sExpressionOneLine('result', func.type));
  }

  children.push(...func.statements.map(generateStatement));

  return sExpression('func', ...children);
}

export function generateArg(arg: Argument): string {
  return sExpressionOneLine('param', `$${arg.name}`, arg.type);
}

export function generateStatement(statement: Statement): string {
  return statement.type + ' statement';
}

function sExpression(nodeType: string, ...children: string[]): string {
  return `(${nodeType}\n${children.map(pad).join('\n')}\n)`;
}

function sExpressionOneLine(nodeType: string, ...children: string[]): string {
  return `(${nodeType} ${children.join(' ')})`;
}

function pad(something: string): string {
  return something.split('\n').map((part: string) => `  ${part}`).join('\n');
}
