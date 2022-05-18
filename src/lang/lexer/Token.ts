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
  numericValue: number;
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
