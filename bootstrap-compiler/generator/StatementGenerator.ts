import Statement,{ VariableDeclarationStatement,VariableAssignmentStatement,ReturnStatement,ExpressionStatement,ConditionalStatement,LoopStatement } from "../ast/Statement.ts";
import { Environment, lookupAlias } from "./Environment.ts";
import { generateExpression } from "./ExpressionGenerator.ts";
import { sExpression } from "./Generator.ts";

export function generateStatement(statement: Statement, environment: Environment): string {
  switch(statement.type) {
    case 'variableDeclaration': return generateVariableDeclaration(statement, environment);
    case 'variableAssignment': return generateVariableAssignment(statement, environment);
    case 'return': return generateReturnStatement(statement, environment);
    case 'expression': return generateExpressionStatement(statement, environment);
    case 'conditional': return generateConditionalStatement(statement, environment);
    case 'loop': return generateLoopStatement(statement, environment);
  }
}

export function generateVariableDeclaration(
  statement: VariableDeclarationStatement,
  environment: Environment
): string {
  // Calculate the value before changing the alias since we can use previous variable's value
  // in the initializer expression of the new variable.
  const initialValueCalculation: string = generateExpression(statement.value, environment);

  // Now change the alias
  const newVariableAlias: string | undefined = environment.declarationAliases.get(statement);
  if(newVariableAlias === undefined) {
    // This should never happen since we've checked all declarations before function generation
    throw new Error(`Internal error: could not find the new alias for ${statement.variableIdentifier}`);
  }

  environment.currentVariableAliases.set(statement.variableIdentifier, newVariableAlias);

  return [
    // Push calculated initial value to the stack
    initialValueCalculation,
    // Assign the value to the new alias
    `local.set ${newVariableAlias}`,
  ].join('\n');
}

export function generateVariableAssignment(
  statement: VariableAssignmentStatement,
  environment: Environment
): string {
  // Multiple variables with the same name can be declared inside a function or a scope, need to
  // find the most recent one and look up it's alias.
  const variableAlias: string = lookupAlias(statement.variableIdentifier, environment);

  const assignedValueCalculation: string = generateExpression(statement.value, environment);

  return [
    // Push value calculation to the stack
    assignedValueCalculation,
    // Assign the value to the correct alias
    `local.set ${variableAlias}`,
  ].join('\n');
}

export function generateReturnStatement(
  statement: ReturnStatement,
  environment: Environment
): string {
  if(statement.value === null) {
    return 'return';
  }
  const returnValueCalculation: string = generateExpression(statement.value, environment);

  return [
    returnValueCalculation,
    'return'
  ].join('\n');
}

export function generateExpressionStatement(
  statement: ExpressionStatement,
  environment: Environment
): string {
  const calculation: string = generateExpression(statement.value, environment);

  // Calculation result should immediately be dropped
  return [
    calculation,
    'drop',
  ].join('\n');
}

export function generateConditionalStatement(
  statement: ConditionalStatement,
  environment: Environment
): string {
  const children: string[] = [];

  // Conditionals and loops create their own blocks, and, thus, their own environments.
  const innerEnvironment: Environment | undefined = environment.children.get(statement);

  // This should never happen since we've added all environments before function generation
  if(innerEnvironment === undefined) {
    throw new Error(`Internal error: could not find correct inner environment`);
  }

  // Condition is calculated at the very start of the block
  children.push(generateExpression(statement.condition, environment));

  // Then, it's compared to 0
  children.push('i32.eqz');
  // If condition is 0, break out of the current conditional block
  children.push(`br_if ${innerEnvironment.blockOrLoopLabel}`);

  // After condition evaluation are the body statements
  children.push(...statement.body.map(
    // Need to use the inner environment for condition body
    (statement: Statement) => generateStatement(statement, innerEnvironment))
  );

  return sExpression(`block ${innerEnvironment.blockOrLoopLabel}`, children.join('\n'));
}
// This is completely the same as conditional generation, except for the resulting s-expression
// header

export function generateLoopStatement(
  statement: LoopStatement,
  environment: Environment
): string {
  const children: string[] = [];

  const innerEnvironment: Environment | undefined = environment.children.get(statement);

  if(innerEnvironment === undefined) {
    throw new Error(`Internal error: could not find correct inner environment`);
  }

  children.push(generateExpression(statement.condition, environment));

  children.push('i32.eqz');
  children.push(`br_if ${innerEnvironment.blockOrLoopLabel}`);

  children.push(...statement.body.map(
    (statement: Statement) => generateStatement(statement, innerEnvironment))
  );

  // The only difference from conditionals is `loop` instead of `block`
  return sExpression(`loop ${innerEnvironment.blockOrLoopLabel}`, children.join('\n'));
}
