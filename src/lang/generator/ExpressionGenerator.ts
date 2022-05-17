import { BinaryOperators } from "../lexer/Operators.ts";
import { Environment,lookupAlias } from "./Environment.ts";
import { assert } from '../Assert.ts';
import { TypedExpression,TypedNumericExpression,TypedIdentifierExpression,TypedUnaryOperatorExpression,TypedBinaryOperatorExpression,TypedFunctionCallExpression } from "../typedAst/TypedExpression.ts";

export function generateExpression(expression: TypedExpression, environment: Environment): string {
  switch (expression.kind) {
    case 'numeric': return generateNumericExpression(expression, environment);
    case 'identifier': return generateIdentifierExpression(expression, environment);
    case 'composite': return generateExpression(expression.value, environment);
    case 'unaryOperator': return generateUnaryOperatorExpression(expression, environment);
    case 'binaryOperator': return generateBinaryOperatorExpression(expression, environment);
    case 'functionCall': return generateFunctionCallExpression(expression, environment);
  }
}

export function generateNumericExpression(
  expression: TypedNumericExpression,
  _environment: Environment,
): string {
  assert(expression.resultType !== undefined, 'unset numeric expression result type');

  return `${expression.resultType.value}.const ${expression.value}`;
}

export function generateIdentifierExpression(
  expression: TypedIdentifierExpression,
  environment: Environment,
): string {
  const identifierAlias: string = lookupAlias(expression.identifier, environment);
  return `local.get ${identifierAlias}`;
}

export function generateUnaryOperatorExpression(
  expression: TypedUnaryOperatorExpression,
  environment: Environment,
): string {
  if (expression.operator === '-') {
    // Special case: unary '-' is converted into binary '0 - ...'
    return generateUnaryMinusExpression(expression, environment);
  }
  
  throw new Error(`Internal error: unknown operator`);
}

function generateUnaryMinusExpression(
  expression: TypedUnaryOperatorExpression,
  environment: Environment,
): string {
  assert(expression.operator === '-', 'generating unary minus expression with incorrect expression');

  // TODO: rewrite this when 64 bit types are introduced
  const zero: string = (expression.resultType.value === 'i32') ? 'i32.const 0' : 'f32.const 0';

  const valueCalculation: string = generateExpression(expression.value, environment);

  const operation: string = (expression.resultType.value === 'i32') ? 'i32.sub' : 'f32.sub';

  return [zero, valueCalculation, operation].join('\n');
}

function generateBinaryOperatorExpression(
  expression: TypedBinaryOperatorExpression,
  environment: Environment,
): string {
  const leftCalculation: string = generateExpression(expression.left, environment);
  const rightCalculation: string = generateExpression(expression.right, environment);

  // TODO; 64 bit
  assert(expression.resultType.value === 'i32' || expression.resultType.value === 'f32');

  const binaryOperationsMapping: {[op in typeof BinaryOperators[number]]: string} = {
    "+": 'add',
    "-": 'sub',
    "*": 'mul',
    "/": expression.resultType.value === 'i32' ? 'div_s' : 'div',
    "==": 'eq',
    "!=": 'ne',
    "<": 'lt',
    ">": 'gt',
    "<=": 'le',
    ">=": 'ge',
  };

  const operation: string = `${expression.resultType.value}.${binaryOperationsMapping[expression.operator]}`;

  return [leftCalculation, rightCalculation, operation].join('\n');
}

function generateFunctionCallExpression(
  expression: TypedFunctionCallExpression,
  environment: Environment,
): string {
  const argumentCalculations: string[] = expression.argumentValues.map((argument: TypedExpression) => {
    return generateExpression(argument, environment);
  })

  return [...argumentCalculations, `call $${expression.functionIdentifier}`].join('\n');
}
