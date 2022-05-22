import { Keywords } from "./Keywords.ts";
import { Operators } from "./Operators.ts";
import { Specials } from "./Specials.ts";
import { BasicTypes, NonVoidBasicTypes } from "./BasicTypes.ts";
import LexerError from "./LexerError.ts";

export type Token = TokenContent & {
  position: TokenPosition,
};

export type TokenContent = {
  type: 'special';
  value: typeof Specials[number];
} | {
  type: 'keyword';
  value: typeof Keywords[number];
} | {
  type: 'operator';
  value: typeof Operators[number];
} | {
  type: 'basicType';
  value: typeof BasicTypes[number];
} | {
  type: 'number';
  value: string;
  resultType: typeof NonVoidBasicTypes[number];
  numericValue: string;
} | {
  type: 'identifier';
  value: string;
};

export type TokenPosition = {
  line: number;
  colStart: number;
  colEnd: number;
};


/**
 * Creates a token with content and position.
 * 
 * @param line line to create the token from
 * @param lineIndex line number where the token is positioned at (0-based)
 * @param start start position of the token on the line (inclusive)
 * @param end end position of the token on the line (exclusive)
 * @returns a token with type, value and position
 */
export function createToken(line: string, lineIndex: number, start: number, end: number): Token {
  const tokenValue: string = line.slice(start, end);

  const position: TokenPosition = getTokenPosition(lineIndex, start, end);
  let content: TokenContent;
  try {
    content = getTokenContent(tokenValue);
  } catch (error) {
    throw new LexerError(error.message, position);
  }

  return {
    ...content,
    position,
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

  if ((BasicTypes as readonly string[]).includes(tokenValue)) {
    return {
      type: 'basicType',
      value: tokenValue as typeof BasicTypes[number],
    };
  }

  if (isDigit(tokenValue[0])) {
    return parseNumericToken(tokenValue);
  }

  validateIdentifier(tokenValue);

  return {
    type: 'identifier',
    value: tokenValue,
  };
}

/**
 * Parses and validates numeric token.
 * 
 * Example: `123.45ul`
 * Need to check for duplicate fraction (e.g. `11.22.33`)
 * and type mark in the wrong place (e.g. `123u.4`)
 * 
 * @param tokenValue 
 * @returns 
 */
function parseNumericToken(tokenValue: string): TokenContent {
  let isFloat: boolean = false;
  let isUnsigned: boolean = false;
  let isLong: boolean = false;

  let resultingLiteral: string = '';

  // First char is guaranteed to be a digit since that is how we determine that the token is numeric
  if (!isDigit(tokenValue[0])) {
    throw new Error(`Internal error: numeric token ${tokenValue} starts with a non-digit`);
  }

  for (const char of tokenValue) {
    if (isDigit(char)) {
      if (isUnsigned || isLong) {
        // Type mark(s) have already been encountered, can't have any digits after
        throw new Error(`Digits found after type marks: ${tokenValue}`);
      }

      resultingLiteral = resultingLiteral + char;
      continue;
    }

    if (char === '.') {
      if (isUnsigned || isLong) {
        // Same as for digits: a dot may not follow the type marks
        throw new Error(`Digits found after type marks: ${tokenValue}`);
      }

      if (isFloat) {
        throw new Error(`Duplicate fractional part found in numeric literal: ${tokenValue}`);
      }

      isFloat = true;
      resultingLiteral = resultingLiteral + char;
      continue;
    }

    if (char === 'u') {
      isUnsigned = true;
      continue;
    }

    if (char === 'l') {
      isLong = true;
      continue;
    }

    throw new Error(`Numeric literals contains invalid characters: ${tokenValue}`);
  }

  let resultType: typeof NonVoidBasicTypes[number] = getNumericLiteralType(
    isFloat,
    isUnsigned,
    isLong,
  );

  if (resultingLiteral.endsWith('.')) {
    resultingLiteral = resultingLiteral.slice(0, resultingLiteral.length - 1);
  }

  return {
    type: 'number',
    resultType,
    value: tokenValue,
    numericValue: resultingLiteral,
  };
}

function isDigit(tokenValue: string): boolean {
  return tokenValue[0] >= '0' && tokenValue[0] <= '9';
}

function getNumericLiteralType(
  isFloat: boolean,
  isUnsigned: boolean,
  isLong: boolean,
): typeof NonVoidBasicTypes[number] {
  if (isFloat && isUnsigned) {
    throw new Error(`Float values cannot be unsigned`);
  }

  if (isFloat) {
    return isLong ? 'f64' : 'f32';
  }

  if (isUnsigned) {
    return isLong ? 'u64' : 'u32';
  }

  return isLong ? 'i64' : 'i32';
}

function validateIdentifier(identifier: string): void {
  // Identifiers may only include a-z, A-Z, 0-9 and _
  // They cannot start with a digit, but this is already checked for
  // (any token starting with a digit is considered a numeric literal)
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
    throw new Error(`Invalid identifier. Should only contain letters, digits and '_': ${identifier}`);
  }
}

function getTokenPosition(lineIndex: number, start: number, end: number): TokenPosition {
  return {
    line: lineIndex + 1,
    colStart: start + 1,
    colEnd: end + 1,
  };
}
