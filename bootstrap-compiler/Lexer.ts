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
  '=', // `=` is technically an assignment operator, but is considered a keyword since it doesn't return anything
] as const;

export const Types = [
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
} | {
  type: 'identifier',
  value: string,
};

type TokenPosition = {
  line: number,
  colStart: number,
  colEnd: number,
};

export function lex(source: string): Token[] {
  const lines: string[] = source.split('\n');
  const linesWithoutComments: string[] = lines.map((line: string) => removeComments(line));
  return linesWithoutComments
    .map(lexLine)
    .flat();
}

function removeComments(line: string): string {
  if (!line.includes('//')) {
    return line;
  }

  return line.slice(0, line.indexOf('//')).trim();
}

function lexLine(line: string, lineIndex: number): Token[] {
  const separators: string[] = [...Whitespace, ...Specials, ...Operators];
  const result: Token[] = [];

  let start = 0;
  for (let end = 0; end < line.length; end += 1) {
    const slice: string = line.slice(end);

    for (const separator of separators) {
      if (slice.startsWith(separator)) {
        if (start !== end) {
          result.push(createToken(line, lineIndex, start, end));
        }

        if ((Whitespace as readonly string[]).includes(separator)) {
          start = end + separator.length;
          break;
        }

        const separatorStart: number = end;
        const separatorEnd: number = end + separator.length;
        result.push(createToken(line, lineIndex, separatorStart, separatorEnd));
        start = end + separator.length;
        break;
      }
    }
  }

  if (start !== line.length) {
    result.push(createToken(line, lineIndex, start, line.length));
  }

  return result;
}

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

  if (tokenValue[0] >= '0' && tokenValue[0] <= '9') {
    return {
      type: 'number',
      value: tokenValue,
    };
  }

  return {
    type: 'identifier',
    value: tokenValue,
  };
}

function getTokenPosition(lineIndex: number, start: number, end: number): TokenPosition {
  return {
    line: lineIndex + 1,
    colStart: start + 1,
    colEnd: end + 1,
  };
}
