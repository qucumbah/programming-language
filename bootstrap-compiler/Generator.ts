import Argument from "./ast/Argument.ts";
import Func from "./ast/Func.ts";
import Module from "./ast/Module.ts";
import Statement, { VariableDeclarationStatement } from "./ast/Statement.ts";
import Type from "./ast/Type.ts";

export function generate(module: Module): string {
  return generateModule(module);
}

export function generateModule(module: Module): string {
  const funcs: string[] = module.funcs.map(generateFunc);
  return sExpression('module', ...funcs);
}

/**
 * There can be multiple variables with the same name in the source code, but all identifiers have
 * to be unique in the generated code. Thus, we'll have to create a mapping from each declaration
 * statement to a unique alias of the variable.
 * Each time we encounter a variable declaration during generation, we're going to switch
 * to the appropriate alias.
 */
type Environment = {
  parent?: Environment,
  children: Map<Statement, Environment>,
  /**
   * This is used to check which alias the declaration statement switches the variable name to.
   * Filled before generation (as soon as we enter the function generation).
   */
  declarationAliases: Map<VariableDeclarationStatement, string>,
  /**
   * This stores the current aliases for variables.
   * Filled with parameters before generation.
   * Filled with variables during generation.
   */
  currentVariableAliases: Map<string, string>,
};

export function generateFunc(func: Func): string {
  // TODO: check identifiers for invalid characters during lexing
  const children: string[] = [];

  // All identifiers in WAT start with $
  children.push(`$${func.name}`);

  // Variable and parameter declarations have to be at the top of the function
  // We don't need any aliases for function parameters, leave them unchanged
  children.push(...func.args.map(generateArg));

  // But we do need aliases for all variables since we can redeclare variables
  const [environment, allAliases]: [Environment, Map<string, Type>] = buildEnvironment(func);
  for (const alias of allAliases) {
    const [name, type]: [string, Type] = alias;
    children.push(sExpressionOneLine('local', `$${name}`, type));
  }

  // Result type s-expression should only be added if the function returns anything
  if (func.type !== 'void') {
    children.push(sExpressionOneLine('result', func.type));
  }

  children.push(...func.statements.map(
    (statement: Statement) => generateStatement(statement, environment))
  );

  return sExpression('func', ...children);
}

/**
 * Since variables can be re-declared, we need to know exactly which variable an identifier refers
 * to at any given point. To do this, we go through the function's AST before code generation.
 * During this walk-through, we check every variable declaration and assign a unique alias to the
 * identifier of this variable.
 * 
 * All of the aliased variables and their types are collected to be converted into local
 * declarations during function generation.
 * 
 * @param func function to build the environment for
 * 
 * @returns first result is the built environment which is more thoroughly explained in the
 * Environment type declaration. The second part of the result is a mapping from each alias to the
 * appropriate type
 */
function buildEnvironment(func: Func): [Environment, Map<string, Type>] {
  const resultingEnvironment: Environment = createEmptyEnvironment();
  const aliasTypeMapping = new Map<string, Type>();

  // Handle args first: add them to the current variables list right now because they are visible
  // before the function code executes.
  for (const arg of func.args) {
    // Don't create aliases for function parameters.
    // Parameter names cannot repeat.
    // Parameters can be overshadowed by variable declarations with the same name, but these new
    // variables will have their own aliases, which won't collide with parameter names.
    resultingEnvironment.currentVariableAliases.set(arg.name, arg.name);
  }

  buildEnvironmentInner(func.statements, resultingEnvironment, aliasTypeMapping);
  return [resultingEnvironment, aliasTypeMapping];
}

function buildEnvironmentInner(
  statements: Statement[],
  resultingEnvironment: Environment,
  aliasTypeMapping: Map<string, Type>,
): void {
  for (const statement of statements) {
    switch (statement.type) {
      case 'variableDeclaration':
        const newAlias: string = createUniqueAlias(
          statement.variableIdentifier,
          new Set(aliasTypeMapping.keys()),
        );
        resultingEnvironment.declarationAliases.set(statement, newAlias);
        aliasTypeMapping.set(newAlias, statement.variableType);
        break;
      case 'conditional':
      case 'loop':
        const innerEnvironment: Environment = createEmptyEnvironment(resultingEnvironment);
        resultingEnvironment.children.set(statement, innerEnvironment);
        buildEnvironmentInner(statement.body, innerEnvironment, aliasTypeMapping);
        break;
    }
  }
}

function createUniqueAlias(identifier: string, existingAliases: Set<string>): string {
  while (true) {
    // Alias is generated by appending a random 8-character hex string to an identifier
    const hexString: string = new Array(8)
      .fill(null)
      .map(() => Math.floor(Math.random() * 16).toString(16))
      .join('');
    const possibleUniqueAlias: string = `${identifier}_${hexString}`;

    if (!existingAliases.has(possibleUniqueAlias)) {
      return possibleUniqueAlias;
    }
  }
}

function createEmptyEnvironment(parent?: Environment): Environment {
  return {
    parent,
    children: new Map<Statement, Environment>(),
    declarationAliases: new Map<VariableDeclarationStatement, string>(),
    currentVariableAliases: new Map<string, string>(),
  };
}

export function generateArg(arg: Argument): string {
  return sExpressionOneLine('param', `$${arg.name}`, arg.type);
}

export function generateStatement(statement: Statement, environment: Environment): string {
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
