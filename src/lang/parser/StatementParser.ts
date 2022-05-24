import Iter from "../ArrayIterator.ts";
import Type, { NonVoidType } from "../ast/Type.ts";
import Statement from "../ast/Statement.ts";
import Expression from "../ast/Expression.ts";
import { Token } from "../lexer/Token.ts";
import { expect, expectType } from "./Expect.ts";
import { parseExpression } from "./ExpressionParser.ts";
import { BasicTypes } from "../lexer/BasicTypes.ts";
import { parseNonVoidType } from "./TypeParser.ts";

/**
 * Function for parsing different kinds of statements: conditionals, loops, returns, etc.
 *
 * @param tokens iterator of tokens that compose this statement.
 *   It will be moved until all statement tokens (including `;`) are consumed.
 * @returns the resulting argument
 */
export function parseStatement(tokens: Iter<Token>): Statement {
  const firstToken: Token = tokens.peekNext();

  if (firstToken.value === "if") {
    return parseConditionalStatement(tokens);
  }

  if (firstToken.value === "while") {
    return parseLoopStatement(tokens);
  }

  if (firstToken.value === "var" || firstToken.value === "const") {
    return parseVariableDeclarationStatement(tokens);
  }

  if (firstToken.value === "return") {
    return parseReturnStatement(tokens);
  }

  return parseExpressionStatement(tokens);
}
function parseConditionalStatement(tokens: Iter<Token>): Statement {
  const ifToken: Token = tokens.next();
  expect(ifToken, "if");

  expect(tokens.next(), "(");
  const condition: Expression = parseExpression(tokens);
  expect(tokens.next(), ")");

  expect(tokens.next(), "{");
  const body: Statement[] = [];
  while (tokens.peekNext().value !== "}") {
    body.push(parseStatement(tokens));
  }
  const closingBracket: Token = tokens.next();
  expect(closingBracket, "}");

  return {
    kind: "conditional",
    condition,
    body,
    position: {
      start: ifToken.position,
      end: closingBracket.position,
    },
  };
}
function parseLoopStatement(tokens: Iter<Token>): Statement {
  const whileToken: Token = tokens.next();
  expect(whileToken, "while");

  expect(tokens.next(), "(");
  const condition: Expression = parseExpression(tokens);
  expect(tokens.next(), ")");

  expect(tokens.next(), "{");
  const body: Statement[] = [];
  while (tokens.peekNext().value !== "}") {
    body.push(parseStatement(tokens));
  }
  const closingBracket: Token = tokens.next();
  expect(closingBracket, "}");

  return {
    kind: "loop",
    condition,
    body,
    position: {
      start: whileToken.position,
      end: closingBracket.position,
    },
  };
}
function parseVariableDeclarationStatement(tokens: Iter<Token>): Statement {
  // First token indicates what kind the variable is: variable or const
  const firstToken: Token = tokens.next();

  if (firstToken.value !== "var" && firstToken.value !== "const") {
    throw new Error(
      `Unexpected token at the start of the variable declaration: ${firstToken}. Position: line ${firstToken.position.line}, col ${firstToken.position.colStart}.`,
    );
  }

  const variableIdentifier: string = expectType(tokens.next(), "identifier");

  expect(tokens.next(), ":");
  const variableType: NonVoidType = parseNonVoidType(tokens);

  // For now, we have to initialize the newly declared variable. This may change.
  expect(tokens.next(), "=");

  const value: Expression = parseExpression(tokens);

  const terminator: Token = tokens.next();
  expect(terminator, ";");

  return {
    kind: "variableDeclaration",
    variableIdentifier,
    variableType,
    variableKind: firstToken.value === "var" ? "variable" : "constant",
    value,
    position: {
      start: firstToken.position,
      end: terminator.position,
    },
  };
}
function parseReturnStatement(tokens: Iter<Token>): Statement {
  const returnToken: Token = tokens.next();
  expect(returnToken, "return");

  // We may simply return from the function if its type is void
  const returnValue: Expression | null = (
    (tokens.peekNext().value === ";") ? null : parseExpression(tokens)
  );

  const terminator: Token = tokens.next();
  expect(terminator, ";");

  return {
    kind: "return",
    value: returnValue,
    position: {
      start: returnToken.position,
      end: terminator.position,
    },
  };
}

function parseExpressionStatement(tokens: Iter<Token>): Statement {
  const value: Expression = parseExpression(tokens);

  const terminator: Token = tokens.next();
  expect(terminator, ";");

  return {
    kind: "expression",
    value,
    position: {
      start: value.position.start,
      end: terminator.position,
    },
  };
}
