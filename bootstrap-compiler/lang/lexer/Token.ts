import Type from "../ast/Type.ts";
import { Keywords } from "./Keywords.ts";
import { Operators } from "./Operators.ts";
import { Specials } from "./Specials.ts";
import { Types } from "./Types.ts";

export type Token = TokenContent & TokenPosition;

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
  type: 'type';
  value: typeof Types[number];
} | {
  type: 'number';
  value: string;
  resultType: Type;
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
