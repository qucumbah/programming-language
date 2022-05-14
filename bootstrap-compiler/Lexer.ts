import Type from "./ast/Type.ts";

export const Whitespace = [
  ' ',
  '\n',
  '\r',
  '\t',
] as const;

export const Specials = [
  ';',
  ',',
  '{',
  '}',
  '(',
  ')',
  ':',
  '=', // `=` is technically an assignment operator, but is considered a special since it doesn't return anything
] as const;

export const UnaryOperators = [
  '-',
] as const;

export const BinaryOperators = [
  '+',
  '-',
  '*',
  '/',
  '==',
  '>=',
  '<=',
  '>',
  '<',
] as const;

export const Operators = [...UnaryOperators, ...BinaryOperators] as const;

export const Keywords = [
  'func',
  'var',
  'if',
  'elif',
  'else',
  'while',
  'return',
] as const;

export const Types = [
  'void',
  'i32',
  'f32',
] as const;

export type Token = TokenContent & TokenPosition;

type TokenContent = {
  type: 'special',
  value: typeof Specials[number],
} | {
  type: 'keyword',
  value: typeof Keywords[number],
} | {
  type: 'operator',
  value: typeof Operators[number],
} | {
  type: 'type',
  value: typeof Types[number],
} | {
  type: 'number',
  value: string,
  resultType: Type,
  numericValue: number,
} | {
  type: 'identifier',
  value: string,
};

type TokenPosition = {
  line: number,
  colStart: number,
  colEnd: number,
};

/**
 * Run lexer on the provided source code (or source code slice).
 * 
 * @param source the source code of the program
 * @returns resulting array of tokens
 */
export function lex(source: string): Token[] {
  const lines: string[] = source.split('\n');
  const linesWithoutComments: string[] = lines.map((line: string) => removeComments(line));
  return linesWithoutComments
    .map(lexLine)
    .flat();
}

/**
 * Removes comments by finding the first '//' occurrence and removing it and everything after it.
 * 
 * @param line the line to remove comments from
 * @returns the line with removed comments
 */
function removeComments(line: string): string {
  if (!line.includes('//')) {
    return line;
  }

  return line.slice(0, line.indexOf('//')).trim();
}

/**
 * Perform lexing on a single line.
 * 
 * @param line line to lex
 * @param lineIndex line index (needed for token positions)
 * @returns resulting array of tokens
 */
function lexLine(line: string, lineIndex: number): Token[] {
  // We're only going to separate by these sequences
  // Separating by anything else is redundant and invalid
  // E.g. if we separate by keywords, we may accidentally separate an identifier
  // that includes the keyword
  const separators: string[] = [...Whitespace, ...Operators, ...Specials];
  const result: Token[] = [];

  // High-level overview:
  // For each of the chars in the line, look if this char is the start of a separator.
  // If it is, then everything behind it is either an identifier or a string of length 0
  // Add a token for everything behind the separator, and another token for separator itself
  // After that, cut the string after the separator (`start` is the start of the cut string)
  let start = 0;
  let cur = 0;
  while (cur < line.length) {
    const slice: string = line.slice(cur);

    const separator: string | undefined = separators.find(
      (separator: string) => slice.startsWith(separator)
    );

    if (separator === undefined) {
      cur += 1;
      continue;
    }

    if (start !== cur) {
      result.push(createToken(line, lineIndex, start, cur));
    }

    if (!(Whitespace as readonly string[]).includes(separator)) {
      const separatorStart: number = cur;
      const separatorEnd: number = cur + separator.length;
      result.push(createToken(line, lineIndex, separatorStart, separatorEnd));
    }

    cur += separator.length;
    start = cur;
  }

  if (start !== line.length) {
    result.push(createToken(line, lineIndex, start, line.length));
  }

  return result;
}

/**
 * Creates a token with content and position.
 * 
 * @param line line to create the token from
 * @param lineIndex line number where the token is positioned at (0-based)
 * @param start start position of the token on the line (inclusive)
 * @param end end position of the token on the line (exclusive)
 * @returns a token with type, value and position
 */
function createToken(line: string, lineIndex: number, start: number, end: number): Token {
  const tokenValue: string = line.slice(start, end);

  return {
    ...getTokenContent(tokenValue),
    ...getTokenPosition(lineIndex, start, end),
  };
}

function getTokenContent(tokenValue: string): TokenContent {
  if ((Specials as readonly string[]).includes(tokenValue)) {
    return {
      type: 'special',
      value: tokenValue as typeof Specials[number],
    };
  }

  if ((Keywords as readonly string[]).includes(tokenValue)) {
    return {
      type: 'keyword',
      value: tokenValue as typeof Keywords[number],
    };
  }

  if ((Operators as readonly string[]).includes(tokenValue)) {
    return {
      type: 'operator',
      value: tokenValue as typeof Operators[number],
    };
  }

  if ((Types as readonly string[]).includes(tokenValue)) {
    return {
      type: 'type',
      value: tokenValue as typeof Types[number],
    };
  }

  if (isDigit(tokenValue[0])) {
    return parseNumericToken(tokenValue);
  }

  return {
    type: 'identifier',
    value: tokenValue,
  };
}

function parseNumericToken(tokenValue: string): TokenContent {
  const firstNonDigitIndex: number = Array.from(tokenValue).findIndex(
    (char: string) => !isDigit(char)
  );

  if (firstNonDigitIndex === -1) {
    return {
      type: 'number',
      value: tokenValue,
      resultType: 'i32',
      numericValue: parseInt(tokenValue),
    };
  } else {
    if (tokenValue[firstNonDigitIndex] === 'f') {
      if (firstNonDigitIndex === tokenValue.length - 1) {
        return {
          type: 'number',
          value: tokenValue,
          resultType: 'f32',
          numericValue: parseInt(tokenValue),
        };
      }

      throw new Error(`Invalid numeric value: ${tokenValue}. The f symbol should be the last one.`);
    } else if (tokenValue[firstNonDigitIndex] === '.') {
      const rest: string = tokenValue.slice(firstNonDigitIndex + 1);
      const containsOtherNonDigits: boolean = Array.from(rest).find(
        (char: string) => !isDigit(char)
      ) !== undefined;

      if (containsOtherNonDigits) {
        throw new Error(`Invalid numeric value: ${tokenValue}.`);
      }

      return {
        type: 'number',
        value: tokenValue,
        resultType: 'f32',
        numericValue: parseFloat(tokenValue),
      };
    } else {
      throw new Error(`Invalid numeric value: ${tokenValue}`);
    }
  }
}

function isDigit(tokenValue: string): boolean {
  return tokenValue[0] >= '0' && tokenValue[0] <= '9';
}

function getTokenPosition(lineIndex: number, start: number, end: number): TokenPosition {
  return {
    line: lineIndex + 1,
    colStart: start + 1,
    colEnd: end + 1,
  };
}
