import Iter from "../ArrayIterator.ts";
import ParameterDeclaration from "../ast/ParameterDeclaration.ts";
import Func, {
  ExportFunc,
  FuncSignature,
  ImportFunc,
  PlainFunc,
} from "../ast/Func.ts";
import Module from "../ast/Module.ts";
import Statement from "../ast/Statement.ts";
import Type, { NonVoidType } from "../ast/Type.ts";
import { Token } from "../lexer/Token.ts";
import { expect, expectType } from "./Expect.ts";
import { parseStatement } from "./StatementParser.ts";
import { parseNonVoidType, parseType } from "./TypeParser.ts";
import Memory from "../ast/Memory.ts";

/**
 * Shorthand for `parseModule`
 *
 * @param tokens iterator of tokens that compose this module.
 *   It will be moved until all module tokens are consumed.
 * @returns the resulting module
 */
export function parse(tokens: Iter<Token>): Module {
  return parseModule(tokens);
}

/**
 * Currently, module is just a collection of functions, so we can parse them one-by-one
 *
 * @param tokens iterator of tokens that compose this module.
 *   It will be moved until all module tokens are consumed.
 * @returns the resulting module
 */
export function parseModule(tokens: Iter<Token>): Module {
  const funcs: Func[] = [];
  const memories: Memory[] = [];
  while (tokens.hasNext()) {
    const firstToken: Token = tokens.peekNext();

    switch (firstToken.value) {
      case "func":
        funcs.push(parseFunction(tokens));
        break;
      case "memory":
        memories.push(parseMemory(tokens));
        break;
      default:
        throw new Error(`Unexpected token: ${firstToken.value}.`);
    }
  }

  return {
    funcs,
    memories,
  };
}

/**
 * Parser for all function types: plain, import, export.
 *
 * @param tokens iterator of tokens that compose this function.
 *   It will be moved until all function tokens are consumed.
 * @returns the resulting function.
 */
export function parseFunction(tokens: Iter<Token>): Func {
  // We can determine the function kind from the second token
  const secondToken: Token = tokens.peekNext(1);
  switch (secondToken.value) {
    case "export":
      return parseExportFunction(tokens);
    case "import":
      return parseImportFunction(tokens);
    default:
      return parsePlainFunction(tokens);
  }
}

/**
 * Parser for plain function needs to parse the default function signature and body.
 *
 * Plain function example:
 * ```
 * func someFunc(param: f32): i32 {
 *   return param as i32;
 * }
 * ```
 *
 * @param tokens iterator of tokens that compose this function.
 *   It will be moved until all function tokens are consumed.
 * @returns the resulting function.
 */
export function parsePlainFunction(tokens: Iter<Token>): PlainFunc {
  const firstToken: Token = tokens.next();
  expect(firstToken, "func");

  const signature: FuncSignature = parseFunctionSignature(tokens);
  const body: Statement[] = parseFunctionBody(tokens);

  const lastToken: Token = tokens.peekPrev();

  return {
    kind: "plain",
    body,
    signature,
    position: {
      start: firstToken.position,
      end: lastToken.position,
    },
  };
}

/**
 * Parser for export function is almost the same as a plain function parser. The only difference
 * is the `export` keyword.
 *
 * Export function example:
 * ```
 * func export someFunc(param: f32): i32 {
 *   return param as i32;
 * }
 * ```
 *
 * @param tokens iterator of tokens that compose this function.
 *   It will be moved until all function tokens are consumed.
 * @returns the resulting function.
 */
export function parseExportFunction(tokens: Iter<Token>): ExportFunc {
  const firstToken: Token = tokens.next();
  expect(firstToken, "func");
  const secondToken: Token = tokens.next();
  expect(secondToken, "export");

  const signature: FuncSignature = parseFunctionSignature(tokens);
  const body: Statement[] = parseFunctionBody(tokens);

  const lastToken: Token = tokens.peekPrev();

  return {
    kind: "export",
    body,
    signature,
    position: {
      start: firstToken.position,
      end: lastToken.position,
    },
  };
}

/**
 * Parser for import function needs to parse import location and function signature.
 *
 * Import function example:
 * ```
 * func import(namespace::location) someFunc(param: f32): i32;
 * ```
 *
 * @param tokens iterator of tokens that compose this function.
 *   It will be moved until all function tokens are consumed.
 * @returns the resulting function.
 */
export function parseImportFunction(tokens: Iter<Token>): ImportFunc {
  const firstToken: Token = tokens.next();
  expect(firstToken, "func");

  const importLocation: [string, string] = parseImportLocation(tokens);
  const signature: FuncSignature = parseFunctionSignature(tokens);

  const lastToken: Token = tokens.next();
  expect(lastToken, ";");

  return {
    kind: "import",
    importLocation,
    signature,
    position: {
      start: firstToken.position,
      end: lastToken.position,
    },
  };
}

/**
 * Parser for function signature.
 * Signature consists of the `func` keyword, function identifier, list of params and a return type.
 *
 * Example:
 * ```
 * func identifier(param: i32): void
 * ```
 *
 * @param tokens tokens that the function signature consists of. Will consume all signature tokens.
 * @returns the resulting function signature.
 */
export function parseFunctionSignature(tokens: Iter<Token>): FuncSignature {
  const name: string = expectType(tokens.next(), "identifier");

  expect(tokens.next(), "(");

  const parameters: ParameterDeclaration[] = [];
  while (tokens.peekNext().value !== ")") {
    parameters.push(parseParameterDeclaration(tokens));
  }

  expect(tokens.next(), ")");
  expect(tokens.next(), ":");

  const type: Type = parseType(tokens);

  return {
    name,
    type,
    parameters,
  };
}

/**
 * Parser for function body.
 * Body consists of the opening and closing braces and statements between.
 *
 * Example:
 * ```
 * {
 *   funcCall();
 *   if (condition) {
 *   }
 *   var someVar: i32 = 15;
 * }
 * ```
 *
 * @param tokens tokens that the function body consists of. Will consume all body tokens.
 * @returns the resulting function body.
 */
export function parseFunctionBody(tokens: Iter<Token>): Statement[] {
  expect(tokens.next(), "{");

  const statements: Statement[] = [];
  while (tokens.peekNext().value !== "}") {
    statements.push(parseStatement(tokens));
  }

  const closingBracket: Token = tokens.next();
  expect(closingBracket, "}");

  return statements;
}

/**
 * Parameter consists of name (identifier) and type
 *
 * @param tokens iterator of tokens that compose this parameter.
 *   It will be moved until all parameter tokens (including the comma after the argument)
 *   are consumed.
 * @returns the resulting parameter declaration.
 */
export function parseParameterDeclaration(
  tokens: Iter<Token>,
): ParameterDeclaration {
  const firstToken: Token = tokens.next();
  expectType(firstToken, "identifier");
  const name: string = firstToken.value;

  expect(tokens.next(), ":");

  const type: NonVoidType = parseNonVoidType(tokens);

  // Consume trailing comma
  if (tokens.peekNext().value === ",") {
    tokens.next();
  }

  return {
    name,
    type,
    position: {
      start: firstToken.position,
      end: firstToken.position,
    },
  };
}

/**
 * Parser for all memory types: plain, import, export. Examples of each type:
 *
 * memory(1u);
 * memory(1u) export(exportName);
 * memory(1u) import(namespace::specifier);
 *
 * @param tokens iterator of tokens that compose this memory.
 *   It will be moved until all memory tokens are consumed.
 * @returns the resulting memory.
 */
export function parseMemory(tokens: Iter<Token>): Memory {
  const firstToken: Token = tokens.next();
  expect(firstToken, "memory");

  expect(tokens.next(), "(");

  const memorySizeToken: Token = tokens.next();
  if (
    memorySizeToken.type !== "number" ||
    memorySizeToken.resultType !== "u32"
  ) {
    throw new Error(
      `Invalid memory size: ${memorySizeToken.value}. Expected u32.`,
    );
  }

  const memorySize = Number(memorySizeToken.numericValue);

  expect(tokens.next(), ")");

  switch (tokens.peekNext().value) {
    case ";": {
      // Plain memory: consume the semicolon and return
      const terminatorToken: Token = tokens.next();
      return {
        kind: "plain",
        size: memorySize,
        position: {
          start: firstToken.position,
          end: terminatorToken.position,
        },
      };
    }
    case "export": {
      // Export memory: parse export name and return
      tokens.next(); // Consume the "export" token
      expect(tokens.next(), "(");

      const exportName: string = expectType(tokens.next(), "identifier");

      expect(tokens.next(), ")");

      const terminatorToken: Token = tokens.next();
      expect(terminatorToken, ";");

      return {
        kind: "export",
        size: memorySize,
        exportName,
        position: {
          start: firstToken.position,
          end: terminatorToken.position,
        },
      };
    }
    case "import": {
      // Import memory: parse import location and return
      const importLocation: [string, string] = parseImportLocation(tokens);

      const terminatorToken: Token = tokens.next();
      expect(terminatorToken, ";");

      return {
        kind: "import",
        size: memorySize,
        importLocation,
        position: {
          start: firstToken.position,
          end: terminatorToken.position,
        },
      };
    }
    default:
      throw new Error(
        `Unexpected memory type token: ${tokens.peekNext().value}`,
      );
  }
}

/**
 * Parser for import locatoin.
 * Import location consists of the `import` keyword, opening and closing parentheses,
 * and a namespace-specifier pair separated by the `::` operator.
 *
 * Example:
 * ```
 * import(namespace::specifier)
 * ```
 *
 * @param tokens tokens that the location consists of. Will consume all location tokens.
 * @returns the resulting function location - a tuple of namespace and specifier.
 */
export function parseImportLocation(tokens: Iter<Token>): [string, string] {
  expect(tokens.next(), "import");
  expect(tokens.next(), "(");

  const namespace: string = expectType(tokens.next(), "identifier");

  expect(tokens.next(), "::");

  const specifier: string = expectType(tokens.next(), "identifier");

  expect(tokens.next(), ")");

  return [namespace, specifier];
}
