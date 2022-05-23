import TypedStatement,{ TypedVariableDeclarationStatement,TypedReturnStatement,TypedExpressionStatement,TypedConditionalStatement,TypedLoopStatement } from "../typedAst/TypedStatement.ts";
import { Environment, lookupLocalId } from "./Environment.ts";
import { generateExpression } from "./ExpressionGenerator.ts";
import { sExpression } from "./Generator.ts";

export function generateStatement(statement: TypedStatement, environment: Environment): string {
  switch(statement.kind) {
    case 'variableDeclaration': return generateVariableDeclaration(statement, environment);
    case 'return': return generateReturnStatement(statement, environment);
    case 'expression': return generateExpressionStatement(statement, environment);
    case 'conditional': return generateConditionalStatement(statement, environment);
    case 'loop': return generateLoopStatement(statement, environment);
  }
}

export function generateVariableDeclaration(
  statement: TypedVariableDeclarationStatement,
  environment: Environment
): string {
  // Calculate the value before changing the id since we can use previous variable's value
  // in the initializer expression of the new variable.
  const initialValueCalculation: string = generateExpression(statement.value, environment);

  // Now change the id
  const newVariableId: number | undefined = environment.declarationIds.get(statement);
  if(newVariableId === undefined) {
    // This should never happen since we've checked all declarations before function generation
    throw new Error(`Internal error: could not find the new id for ${statement.variableIdentifier}`);
  }

  environment.currentVariableIds.set(statement.variableIdentifier, newVariableId);

  return [
    // Push calculated initial value to the stack
    initialValueCalculation,
    // Assign the value to the new alias
    `local.set ${newVariableId}`,
  ].join('\n');
}

export function generateReturnStatement(
  statement: TypedReturnStatement,
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
  statement: TypedExpressionStatement,
  environment: Environment
): string {
  const calculation: string = generateExpression(statement.value, environment);

  const result: string[] = [calculation];

  if (statement.value.resultType.kind !== 'void') {
    // Calculation result should immediately be dropped, if there is any
    result.push('drop');
  }

  return result.join('\n');
}

export function generateConditionalStatement(
  statement: TypedConditionalStatement,
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
  // We can use 'br_if 0' to break out of the innermost block
  children.push(`br_if 0`);

  // After condition evaluation are the body statements
  children.push(...statement.body.map(
    // Need to use the inner environment for condition body
    (statement: TypedStatement) => generateStatement(statement, innerEnvironment))
  );

  return sExpression(`block`, children.join('\n'));
}

// This is completely the same as conditional generation, except for the resulting s-expression
// header
export function generateLoopStatement(
  statement: TypedLoopStatement,
  environment: Environment
): string {
  const children: string[] = [];

  const innerEnvironment: Environment | undefined = environment.children.get(statement);

  if(innerEnvironment === undefined) {
    throw new Error(`Internal error: could not find correct inner environment`);
  }

  children.push(generateExpression(statement.condition, environment));

  children.push('i32.eqz');
  children.push(`br_if 0`);

  children.push(...statement.body.map(
    (statement: TypedStatement) => generateStatement(statement, innerEnvironment))
  );

  // The only difference from conditionals is `loop` instead of `block`
  return sExpression(`loop`, children.join('\n'));
}
