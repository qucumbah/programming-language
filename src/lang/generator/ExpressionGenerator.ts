import { BinaryOperators } from "../lexer/Operators.ts";
import { Environment,lookupLocalId } from "./Environment.ts";
import { assert } from '../Assert.ts';
import { TypedExpression,TypedNumericExpression,TypedIdentifierExpression,TypedUnaryOperatorExpression,TypedBinaryOperatorExpression,TypedFunctionCallExpression } from "../typedAst/TypedExpression.ts";
import { NonVoidBasicTypes } from "../lexer/BasicTypes.ts";

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
  const wasmType: WasmType = getWasmType(expression.resultType.value);

  return `${wasmType}.const ${expression.value}`;
}

export function generateIdentifierExpression(
  expression: TypedIdentifierExpression,
  environment: Environment,
): string {
  const identifierId: number = lookupLocalId(expression.identifier, environment);
  return `local.get ${identifierId}`;
}

export function generateUnaryOperatorExpression(
  expression: TypedUnaryOperatorExpression,
  environment: Environment,
): string {
  switch (expression.operator) {
    case '-': return generateUnaryMinusExpression(expression, environment);
  }
}

function generateUnaryMinusExpression(
  expression: TypedUnaryOperatorExpression,
  environment: Environment,
): string {
  assert(expression.operator === '-', 'generating unary minus expression with incorrect expression');

  const wasmType: WasmType = getWasmType(expression.resultType.value);

  const zero: string = `${wasmType}.const 0`;

  const valueCalculation: string = generateExpression(expression.value, environment);

  const operation: string = `${wasmType}.sub`;

  return [zero, valueCalculation, operation].join('\n');
}

function generateBinaryOperatorExpression(
  expression: TypedBinaryOperatorExpression,
  environment: Environment,
): string {
  const leftCalculation: string = generateExpression(expression.left, environment);
  const rightCalculation: string = generateExpression(expression.right, environment);

  const resultWasmType: WasmType = getWasmType(expression.resultType.value);
  const isInteger: boolean = (resultWasmType === 'i32') || (resultWasmType === 'i64');
  const isSigned: boolean = (
    (expression.resultType.value === 'i32')
    || (expression.resultType.value === 'i64')
  );

  const binaryOperationsMapping: {[op in typeof BinaryOperators[number]]: string} = {
    "+": 'add',
    "-": 'sub',
    "*": 'mul',
    "/": getDivOperator(isInteger, isSigned),
    "==": 'eq',
    "!=": 'ne',
    "<": 'lt',
    ">": 'gt',
    "<=": 'le',
    ">=": 'ge',
  };

  if (expression.left.resultType.kind !== 'basic') {
    throw new Error('Internal error: non-basic operand type');
  }

  if (expression.left.resultType.value === 'void') {
    throw new Error('Internal error: void operand type');
  }

  const operandWasmType: WasmType = getWasmType(expression.left.resultType.value);
  const operation: string = `${operandWasmType}.${binaryOperationsMapping[expression.operator]}`;

  return [leftCalculation, rightCalculation, operation].join('\n');
}

function getDivOperator(isInteger: boolean, isSigned: boolean): string {
  if (!isInteger) {
    return 'div';
  }

  return isSigned ? 'div_s' : 'div_u';
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

type WasmType = 'i32' | 'f32' | 'i64' | 'f64';

/**
 * WASM only has four basic types, so we have to convert all source types (pointers, unsigned ones).
 *
 * @param sourceType source type to convert from
 * @returns the resulting WASM type - i32, f32, i64, or u64
 */
function getWasmType(sourceType: typeof NonVoidBasicTypes[number]): WasmType {
  switch (sourceType) {
    case 'i32':
    case 'u32':
      return 'i32';
    case 'f32':
      return 'f32';
    case 'i64':
    case 'u64':
      return 'i64';
    case 'f64':
      return 'f64';
  }
}
