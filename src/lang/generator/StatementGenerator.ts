import TypedStatement, {
  TypedConditionalStatement,
  TypedExpressionStatement,
  TypedLoopStatement,
  TypedReturnStatement,
  TypedVariableDeclarationStatement,
} from "../typedAst/TypedStatement.ts";
import { Environment } from "./Environment.ts";
import { generateExpression } from "./ExpressionGenerator.ts";
import { sExpression } from "./Generator.ts";

export function generateStatement(
  statement: TypedStatement,
  environment: Environment,
): string {
  switch (statement.kind) {
    case "variableDeclaration":
      return generateVariableDeclaration(statement, environment);
    case "return":
      return generateReturnStatement(statement, environment);
    case "expression":
      return generateExpressionStatement(statement, environment);
    case "conditional":
      return generateConditionalStatement(statement, environment);
    case "loop":
      return generateLoopStatement(statement, environment);
  }
}

export function generateVariableDeclaration(
  statement: TypedVariableDeclarationStatement,
  environment: Environment,
): string {
  // Calculate the value before changing the id since we can use previous variable's value
  // in the initializer expression of the new variable.
  const initialValueCalculation: string = generateExpression(
    statement.value,
    environment,
  );

  // Now change the id
  const newVariableId: number | undefined = environment.declarationIds.get(
    statement,
  );
  if (newVariableId === undefined) {
    // This should never happen since we've checked all declarations before function generation
    throw new Error(
      `Internal error: could not find the new id for ${statement.variableIdentifier}`,
    );
  }

  environment.currentVariableIds.set(
    statement.variableIdentifier,
    newVariableId,
  );

  return [
    // Push calculated initial value to the stack
    initialValueCalculation,
    // Assign the value to the new alias
    `local.set ${newVariableId}`,
  ].join("\n");
}

export function generateReturnStatement(
  statement: TypedReturnStatement,
  environment: Environment,
): string {
  if (statement.value === null) {
    return "return";
  }
  const returnValueCalculation: string = generateExpression(
    statement.value,
    environment,
  );

  return [
    returnValueCalculation,
    "return",
  ].join("\n");
}

export function generateExpressionStatement(
  statement: TypedExpressionStatement,
  environment: Environment,
): string {
  const calculation: string = generateExpression(statement.value, environment);

  const result: string[] = [calculation];

  if (statement.value.resultType.kind !== "void") {
    // Calculation result should immediately be dropped, if there is any
    result.push("drop");
  }

  return result.join("\n");
}

/**
 * Generates conditional (if) statement.
 * Conditional statement consists of the `block` s-expression that includes condition evaluation
 * at the start and the statement body after.`
 *
 * @param statement conditional statement to generate.
 * @param environment environment that the conditional statement is in.
 * @returns generated conditional statement.
 */
export function generateConditionalStatement(
  statement: TypedConditionalStatement,
  environment: Environment,
): string {
  // Conditionals and loops create their own blocks, and, thus, their own environments.
  const innerEnvironment: Environment | undefined = environment.children.get(
    statement,
  );

  // This should never happen since we've added all environments before function generation
  if (innerEnvironment === undefined) {
    throw new Error(`Internal error: could not find correct inner environment`);
  }

  const children: string[] = [];

  // Condition is calculated at the very start of the block
  children.push(generateExpression(statement.condition, environment));

  // Then, it's compared to 0
  children.push("i32.eqz");
  // If condition is 0, break out of the current conditional block
  // We can use 'br_if 0' to break out of the innermost block
  children.push("br_if 0");

  // After condition evaluation are the body statements
  children.push(...statement.body.map(
    // Need to use the inner environment for condition body
    (statement: TypedStatement) =>
      generateStatement(statement, innerEnvironment),
  ));

  return sExpression("block", children.join("\n"));
}

/**
 * Generates loop (while) statement.
 * This is similar to conditional generation, but there are a few key differences:
 *
 * 1. Resulting s-expression header is `loop` instead of `block`.
 * 2. The whole expression is wrapped in another `block` expression,
 * and branching condition (`br_if`) jumps to the end of the wrapper.
 * 3. There is an additional non-conditional `br` statement at the end of the `loop` s-expression
 * that leads to re-execution of the loop. The loop block starts with the condition evaluation,
 * so if the condition no longer holds, the loop will stop.
 *
 * @param statement loop statement to generate.
 * @param environment environment that the statement is in.
 * @returns generated loop statement.
 */
export function generateLoopStatement(
  statement: TypedLoopStatement,
  environment: Environment,
): string {
  const innerEnvironment: Environment | undefined = environment.children.get(
    statement,
  );

  if (innerEnvironment === undefined) {
    throw new Error(`Internal error: could not find correct inner environment`);
  }

  const children: string[] = [];

  // Evaluate condition at the very start of the loop
  children.push(generateExpression(statement.condition, environment));
  children.push("i32.eqz");
  // If condition doesn't hold, jump to the end of the wrapping `block` statement
  children.push("br_if 1");

  // Otherwise, execute body
  children.push(...statement.body.map(
    (statement: TypedStatement) =>
      generateStatement(statement, innerEnvironment),
  ));

  // Jump back to the start of the loop to evaluate condition again
  children.push("br 0");

  return sExpression("block", sExpression("loop", children.join("\n")));
}
