import Expression,{ NumericExpression,IdentifierExpression,UnaryOperatorExpression,BinaryOperatorExpression,FunctionCallExpression } from "../ast/Expression.ts";
import { BinaryOperators } from "../lexer/Operators.ts";
import { Environment,lookupAlias } from "./Environment.ts";

export function generateExpression(expression: Expression, environment: Environment): string {
  switch (expression.type) {
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
  switch (expression.resultType) {
    case 'i32': return `i32.const ${expression.value}`;
    case 'f32': return `f32.const ${expression.value}`;
  }

  throw new Error('Internal error: void expression result type');
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
  if (expression.operator !== '-') {
    throw new Error(`Internal error: generating unary minus expression with incorrect expression`);
  }

  if (expression.resultType === 'void') {
    throw new Error('Internal error: void expression result type');
  }

  const zero: string = (expression.resultType === 'i32') ? 'i32.const 0' : 'f32.const 0';

  const valueCalculation: string = generateExpression(expression.value, environment);

  const operation: string = (expression.resultType === 'i32') ? 'i32.sub' : 'f32.sub';

  return [zero, valueCalculation, operation].join('\n');
}

function generateBinaryOperatorExpression(
  expression: BinaryOperatorExpression,
  environment: Environment,
): string {
  if (expression.resultType === 'void') {
    throw new Error('Internal error: void expression result type');
  }

  const leftCalculation: string = generateExpression(expression.left, environment);
  const rightCalculation: string = generateExpression(expression.right, environment);

  const binaryOperationsMapping: {[op in typeof BinaryOperators[number]]: string} = {
    "+": 'add',
    "-": 'sub',
    "*": 'mul',
    "/": expression.resultType === 'i32' ? 'div_s' : 'div',
    "==": 'eq',
    "<": 'lt',
    ">": 'gt',
    "<=": 'le',
    ">=": 'ge',
  };

  const operation: string = `${expression.resultType}.${binaryOperationsMapping[expression.operator]}`;

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
