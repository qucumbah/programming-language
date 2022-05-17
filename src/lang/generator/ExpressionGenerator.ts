import Expression,{ NumericExpression,IdentifierExpression,UnaryOperatorExpression,BinaryOperatorExpression,FunctionCallExpression } from "../ast/Expression.ts";
import { BinaryOperators } from "../lexer/Operators.ts";
import { Environment,lookupAlias } from "./Environment.ts";
import { assert } from '../Assert.ts';

export function generateExpression(expression: Expression, environment: Environment): string {
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
  expression: NumericExpression,
  _environment: Environment,
): string {
  assert(expression.resultType !== undefined, 'unset numeric expression result type');
  assert(expression.resultType.kind === 'basic', 'numeric expression has pointer type');
  assert(expression.resultType.value !== 'void', 'numeric expression type is void');

  return `${expression.resultType.value}.const ${expression.value}`;
}

export function generateIdentifierExpression(
  expression: IdentifierExpression,
  environment: Environment,
): string {
  const identifierAlias: string = lookupAlias(expression.identifier, environment);
  return `local.get ${identifierAlias}`;
}

export function generateUnaryOperatorExpression(
  expression: UnaryOperatorExpression,
  environment: Environment,
): string {
  if (expression.operator === '-') {
    // Special case: unary '-' is converted into binary '0 - ...'
    return generateUnaryMinusExpression(expression, environment);
  }
  
  throw new Error(`Internal error: unknown operator`);
}

function generateUnaryMinusExpression(
  expression: UnaryOperatorExpression,
  environment: Environment,
): string {
  assert(expression.operator === '-', 'generating unary minus expression with incorrect expression');
  assert(expression.resultType !== undefined, 'unset expression result type');
  assert(expression.resultType.kind === 'basic', 'expression has pointer type');
  assert(expression.resultType.value !== 'void', 'expression type is void');

  // TODO: rewrite this when 64 bit types are introduced
  const zero: string = (expression.resultType.value === 'i32') ? 'i32.const 0' : 'f32.const 0';

  const valueCalculation: string = generateExpression(expression.value, environment);

  const operation: string = (expression.resultType.value === 'i32') ? 'i32.sub' : 'f32.sub';

  return [zero, valueCalculation, operation].join('\n');
}

function generateBinaryOperatorExpression(
  expression: BinaryOperatorExpression,
  environment: Environment,
): string {
  assert(expression.resultType !== undefined, 'unset expression result type');
  assert(expression.resultType.value !== 'void', 'void expression result type');

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
  expression: FunctionCallExpression,
  environment: Environment,
): string {
  const argumentCalculations: string[] = expression.argumentValues.map((argument: Expression) => {
    return generateExpression(argument, environment);
  })

  return [...argumentCalculations, `call $${expression.functionIdentifier}`].join('\n');
}
