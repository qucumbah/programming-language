import { BinaryOperators } from "../lexer/Operators.ts";
import { Environment, lookupLocalId } from "./Environment.ts";
import { assert } from "../Assert.ts";
import {
  TypedBinaryOperatorExpression,
  TypedExpression,
  TypedFunctionCallExpression,
  TypedIdentifierExpression,
  TypedNumericExpression,
  TypedTypeConversionExpression,
  TypedUnaryOperatorExpression,
} from "../typedAst/TypedExpression.ts";
import { NonVoidBasicTypes } from "../lexer/BasicTypes.ts";
import { getWasmType, WasmType } from "./WasmType.ts";

export function generateExpression(
  expression: TypedExpression,
  environment: Environment,
): string {
  switch (expression.kind) {
    case "numeric":
      return generateNumericExpression(expression, environment);
    case "identifier":
      return generateIdentifierExpression(expression, environment);
    case "composite":
      return generateExpression(expression.value, environment);
    case "unaryOperator":
      return generateUnaryOperatorExpression(expression, environment);
    case "binaryOperator":
      return generateBinaryOperatorExpression(expression, environment);
    case "functionCall":
      return generateFunctionCallExpression(expression, environment);
    case "typeConversion":
      return generateTypeConversionExpression(expression, environment);
  }
}

export function generateNumericExpression(
  expression: TypedNumericExpression,
  _environment: Environment,
): string {
  const wasmType: WasmType = getWasmType(expression.resultType);

  return `${wasmType}.const ${expression.value}`;
}

export function generateIdentifierExpression(
  expression: TypedIdentifierExpression,
  environment: Environment,
): string {
  const identifierId: number = lookupLocalId(
    expression.identifier,
    environment,
  );
  return `local.get ${identifierId}`;
}

export function generateUnaryOperatorExpression(
  expression: TypedUnaryOperatorExpression,
  environment: Environment,
): string {
  switch (expression.operator) {
    case "-":
      return generateUnaryMinusExpression(expression, environment);
    case "@":
      return generateDereferenceExpression(expression, environment);
    case "!":
      return generateLogicalNotExpression(expression, environment);
  }
}

function generateUnaryMinusExpression(
  expression: TypedUnaryOperatorExpression,
  environment: Environment,
): string {
  assert(
    expression.operator === "-",
    "generating unary minus expression with incorrect expression",
  );
  // TODO: I think it's possible to statically check for this
  assert(
    expression.value.resultType.kind !== "void",
    "trying to apply unary minus to void",
  );

  const wasmType: WasmType = getWasmType(expression.value.resultType);

  const zero: string = `${wasmType}.const 0`;

  const valueCalculation: string = generateExpression(
    expression.value,
    environment,
  );

  const operation: string = `${wasmType}.sub`;

  return [zero, valueCalculation, operation].join("\n");
}

function generateDereferenceExpression(
  expression: TypedUnaryOperatorExpression,
  environment: Environment,
): string {
  assert(
    expression.operator === "@",
    "generating dereference expression with incorrect expression",
  );
  assert(
    expression.value.resultType.kind !== "void",
    "trying to apply dereference to void",
  );

  const valueCalculation: string = generateExpression(
    expression.value,
    environment,
  );

  const wasmResultType: WasmType = getWasmType(expression.resultType);

  return [
    valueCalculation,
    `${wasmResultType}.load`,
  ].join("\n");
}

function generateLogicalNotExpression(
  expression: TypedUnaryOperatorExpression,
  environment: Environment,
): string {
  assert(
    expression.operator === "!",
    "generating unary minus expression with incorrect expression",
  );

  assert(
    expression.value.resultType.kind === "basic" &&
      expression.value.resultType.value === "i32",
    "trying to apply logical not to a non-boolean",
  );

  const valueCalculation: string = generateExpression(
    expression.value,
    environment,
  );

  return [valueCalculation, "i32.eqz"].join("\n");
}

function generateBinaryOperatorExpression(
  expression: TypedBinaryOperatorExpression,
  environment: Environment,
): string {
  // Special case: variable/pointer assignment is generated differently
  if (expression.operator === "=") {
    if (expression.left.kind === "identifier") {
      return generateVariableAssignmentExpression(expression, environment);
    }

    if (
      expression.left.kind === "unaryOperator" &&
      expression.left.operator === "@"
    ) {
      return generatePointerAssignmentExpression(expression, environment);
    }

    assert(false, "assignment to something other than a variable or a pointer");
  }

  assert(expression.operator !== "->", "Type conversion operator is handled separately from other operators");

  assert(
    (expression.left.resultType.kind !== "void") &&
      (expression.right.resultType.kind !== "void"),
    "void operand type",
  );

  const leftCalculation: string = generateExpression(
    expression.left,
    environment,
  );
  const rightCalculation: string = generateExpression(
    expression.right,
    environment,
  );

  const operandWasmType: WasmType = getWasmType(expression.left.resultType);
  const isInteger: boolean = (operandWasmType === "i32") ||
    (operandWasmType === "i64");
  const isSigned: boolean = (
    (expression.left.resultType.value === "i32") ||
    (expression.left.resultType.value === "i64")
  );

  const binaryOperationsMapping: {
    [op in typeof BinaryOperators[number]]: string;
  } = {
    "=": "", // We've already handled assignment at the start
    "->": "", // This should never happen since type conversion operator is parsed as type conversion expression, not binary
    "+": "add",
    "-": "sub",
    "*": "mul",
    "/": getOperatorForType("div", isInteger, isSigned),
    "&": "and",
    "|": "or",
    "==": "eq",
    "!=": "ne",
    "^": "xor",
    "<<": "shl",
    ">>": getOperatorForType("shr", isInteger, isSigned),
    "<": getOperatorForType("lt", isInteger, isSigned),
    ">": getOperatorForType("gt", isInteger, isSigned),
    "<=": getOperatorForType("le", isInteger, isSigned),
    ">=": getOperatorForType("ge", isInteger, isSigned),
  };

  const operation: string = `${operandWasmType}.${
    binaryOperationsMapping[expression.operator]
  }`;

  return [leftCalculation, rightCalculation, operation].join("\n");
}

function getOperatorForType(
  operator: string,
  isInteger: boolean,
  isSigned: boolean,
): string {
  if (!isInteger) {
    return operator;
  }

  return `${operator}_${isSigned ? "s" : "u"}`;
}

function generateVariableAssignmentExpression(
  expression: TypedBinaryOperatorExpression,
  environment: Environment,
): string {
  assert(
    expression.left.kind === "identifier",
    "variable assignment with non-identifier left part",
  );

  // Multiple variables with the same name can be declared inside a function or a scope, need to
  // find the most recent one and look up it's id.
  const variableId: number = lookupLocalId(
    expression.left.identifier,
    environment,
  );

  const assignedValueCalculation: string = generateExpression(
    expression.right,
    environment,
  );

  return [
    // Push value calculation to the stack
    assignedValueCalculation,
    // Assign the value to the correct id
    `local.set ${variableId}`,
  ].join("\n");
}

function generatePointerAssignmentExpression(
  expression: TypedBinaryOperatorExpression,
  environment: Environment,
): string {
  assert(
    expression.left.kind === "unaryOperator",
    "pointer assignment with non-unary expression left part",
  );
  assert(
    expression.left.operator === "@",
    "pointer assignment with incorrect unary operator",
  );
  assert(
    expression.right.resultType.kind !== "void",
    "assigning void to pointer",
  );

  // Need to push the address, not the result of the dereference operation
  const addressCalculation: string = generateExpression(
    expression.left.value,
    environment,
  );
  const valueCalculation: string = generateExpression(
    expression.right,
    environment,
  );

  const valueWasmType: WasmType = getWasmType(expression.right.resultType);

  return [
    addressCalculation,
    valueCalculation,
    `${valueWasmType}.store`,
  ].join("\n");
}

function generateFunctionCallExpression(
  expression: TypedFunctionCallExpression,
  environment: Environment,
): string {
  const argumentCalculations: string[] = expression.argumentValues.map(
    (argument: TypedExpression) => {
      return generateExpression(argument, environment);
    },
  );

  return [...argumentCalculations, `call $${expression.functionIdentifier}`]
    .join("\n");
}

function generateTypeConversionExpression(
  expression: TypedTypeConversionExpression,
  environment: Environment,
): string {
  const valueToConvertCalculation: string = generateExpression(
    expression.valueToConvert,
    environment,
  );

  assert(
    expression.valueToConvert.resultType.kind !== "void",
    "trying to convert void expression",
  );

  let fromType: typeof NonVoidBasicTypes[number];
  if (expression.valueToConvert.resultType.kind === "basic") {
    fromType = expression.valueToConvert.resultType.value;
  } else {
    fromType = "i32";
  }

  let toType: typeof NonVoidBasicTypes[number];
  if (expression.resultType.kind === "basic") {
    toType = expression.resultType.value;
  } else {
    toType = "i32";
  }

  const operation: string = getTypeConversionOperation(fromType, toType);

  if (operation === "nop") {
    return valueToConvertCalculation;
  }

  return [valueToConvertCalculation, operation].join("\n");
}

function getTypeConversionOperation(
  from: typeof NonVoidBasicTypes[number],
  to: typeof NonVoidBasicTypes[number],
): string {
  type ConversionKind =
    `${typeof NonVoidBasicTypes[number]}-${typeof NonVoidBasicTypes[number]}`;

  const conversionTable: { [key in ConversionKind]: string } = {
    "i32-i32": "nop",
    "i32-u32": "nop",
    "i32-f32": "f32.convert_i32_s",
    "i32-i64": "i64.extend_i32_s",
    "i32-u64": "i64.extend_i32_u",
    "i32-f64": "f64.convert_i32_s",

    "u32-i32": "nop",
    "u32-u32": "nop",
    "u32-f32": "f32.convert_i32_u",
    "u32-i64": "i64.extend_i32_u",
    "u32-u64": "i64.extend_i32_u",
    "u32-f64": "f64.convert_i32_u",

    "f32-i32": "i32.trunc_f32_s",
    "f32-u32": "i32.trunc_f32_u",
    "f32-f32": "nop",
    "f32-i64": "i64.trunc_f32_s",
    "f32-u64": "i64.trunc_f32_u",
    "f32-f64": "f64.promote_f32",

    "i64-i32": "i32.wrap_i64",
    "i64-u32": "i32.wrap_i64",
    "i64-f32": "f32.convert_i64_s",
    "i64-i64": "nop",
    "i64-u64": "nop",
    "i64-f64": "f64.convert_i64_s",

    "u64-i32": "i32.wrap_i64",
    "u64-u32": "i32.wrap_i64",
    "u64-f32": "f32.convert_i64_u",
    "u64-i64": "nop",
    "u64-u64": "nop",
    "u64-f64": "f64.convert_i64_u",

    "f64-i32": "i32.trunc_f64_s",
    "f64-u32": "i32.trunc_f64_u",
    "f64-f32": "f32.demote_f64",
    "f64-i64": "i64.trunc_f64_s",
    "f64-u64": "i64.trunc_f64_u",
    "f64-f64": "nop",
  };

  return conversionTable[`${from}-${to}`];
}
