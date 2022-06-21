import Func, { FuncWithBody } from "../ast/Func.ts";
import Statement, {
  ConditionalStatement,
  LoopStatement,
  ReturnStatement,
  VariableDeclarationStatement,
} from "../ast/Statement.ts";
import Type, { isSameType, stringifyType } from "../ast/Type.ts";
import {
  createEmptyEnvironment,
  Environment,
} from "./Environment.ts";
import ValidationError from "./ValidationError.ts";
import { validateExpression } from "./ExpressionValidator.ts";
import { TypedExpression } from "../typedAst/TypedExpression.ts";
import { VariableOrParameterInfo } from "./VariableOrParameterInfo.ts";
import TypedStatement, {
  TypedConditionalStatement,
  TypedLoopStatement,
  TypedReturnStatement,
  TypedVariableDeclarationStatement,
} from "../typedAst/TypedStatement.ts";

export function validateStatement(
  statement: Statement,
  func: FuncWithBody,
  environment: Environment,
  funcs: Map<string, Func>,
): TypedStatement {
  switch (statement.kind) {
    case "variableDeclaration":
      return validateVariableDeclaration(statement, environment, funcs);
    case "return":
      return validateReturn(statement, func.signature.type, environment, funcs);
    case "conditional":
      return validateConditional(statement, func, environment, funcs);
    case "loop":
      return validateLoop(statement, func, environment, funcs);
    // Only need to validate the inner expression, everything else stays the same
    case "expression":
      return {
        ...statement,
        value: validateExpression(statement.value, environment, funcs),
      };
  }
}

export function validateVariableDeclaration(
  statement: VariableDeclarationStatement,
  environment: Environment,
  funcs: Map<string, Func>,
): TypedVariableDeclarationStatement {
  // Don't check if variable already exists in environment since re-declaration is allowed

  const expressionValidationResult: TypedExpression = validateExpression(
    statement.value,
    environment,
    funcs,
  );

  if (
    !isSameType(expressionValidationResult.resultType, statement.variableType)
  ) {
    throw new ValidationError(
      `Cannot assign value of type ${
        stringifyType(expressionValidationResult.resultType)
      } to a variable of type ${stringifyType(statement.variableType)}`,
      statement,
    );
  }

  const variableInfo: VariableOrParameterInfo = {
    kind: "variable",
    declarationStatement: statement,
    type: statement.variableType,
  };

  // From now on, the variable type just changes
  // This change will only affect the current scope
  environment.variablesAndParameters.set(
    statement.variableIdentifier,
    variableInfo,
  );

  return {
    ...statement,
    variableType: statement.variableType,
    value: expressionValidationResult,
  };
}

export function validateReturn(
  statement: ReturnStatement,
  expectedType: Type,
  environment: Environment,
  funcs: Map<string, Func>,
): TypedReturnStatement {
  if (statement.value === null) {
    if (expectedType.kind === "void") {
      return {
        ...statement,
        value: null,
      };
    }

    throw new ValidationError(
      `Trying to return a void value from a function with type ${
        stringifyType(expectedType)
      }`,
      statement,
    );
  }

  const expressionValidationResult: TypedExpression = validateExpression(
    statement.value,
    environment,
    funcs,
  );

  if (!isSameType(expressionValidationResult.resultType, expectedType)) {
    throw new ValidationError(
      `Cannot return value of type ${
        stringifyType(expressionValidationResult.resultType)
      } from a function of type ${stringifyType(expectedType)}`,
      statement,
    );
  }

  return {
    ...statement,
    value: expressionValidationResult,
  };
}

export function validateConditional(
  statement: ConditionalStatement,
  func: FuncWithBody,
  environment: Environment,
  funcs: Map<string, Func>,
): TypedConditionalStatement {
  const conditionValidationResult: TypedExpression = validateExpression(
    statement.condition,
    environment,
    funcs,
  );

  if (
    conditionValidationResult.resultType.kind !== "basic" ||
    conditionValidationResult.resultType.value !== "i32"
  ) {
    throw new ValidationError(
      `Expected i32 type in condition. Found ${
        stringifyType(conditionValidationResult.resultType)
      }`,
      statement.condition,
    );
  }

  const innerEnvironment: Environment = createEmptyEnvironment(environment);

  const typedBodyStatements: TypedStatement[] = [];

  let returnStatementEncountered = false;
  for (const innerStatement of statement.body) {
    if (returnStatementEncountered) {
      throw new ValidationError(`Unreachable statement`, innerStatement);
    }

    const statementValidationResult: TypedStatement = validateStatement(
      innerStatement,
      func,
      innerEnvironment,
      funcs,
    );
    typedBodyStatements.push(statementValidationResult);

    if (innerStatement.kind === "return") {
      returnStatementEncountered = true;
    }
  }

  return {
    ...statement,
    condition: conditionValidationResult,
    body: typedBodyStatements,
  };
}

export function validateLoop(
  statement: LoopStatement,
  func: FuncWithBody,
  environment: Environment,
  funcs: Map<string, Func>,
): TypedLoopStatement {
  const conditionValidationResult: TypedExpression = validateExpression(
    statement.condition,
    environment,
    funcs,
  );

  if (
    conditionValidationResult.resultType.kind !== "basic" ||
    conditionValidationResult.resultType.value !== "i32"
  ) {
    throw new ValidationError(
      `Expected i32 type in condition. Found ${
        stringifyType(conditionValidationResult.resultType)
      }`,
      statement.condition,
    );
  }

  const innerEnvironment: Environment = createEmptyEnvironment(environment);

  const typedBodyStatements: TypedStatement[] = [];

  let returnStatementEncountered = false;
  for (const innerStatement of statement.body) {
    if (returnStatementEncountered) {
      throw new ValidationError(`Unreachable statement`, innerStatement);
    }

    const statementValidationResult: TypedStatement = validateStatement(
      innerStatement,
      func,
      innerEnvironment,
      funcs,
    );
    typedBodyStatements.push(statementValidationResult);

    if (innerStatement.kind === "return") {
      returnStatementEncountered = true;
    }
  }

  return {
    ...statement,
    condition: conditionValidationResult,
    body: typedBodyStatements,
  };
}
