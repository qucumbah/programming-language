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

export type Token = ({
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
}) & {
  // line: number,
  // colStart: number,
  // colEnd: number,
};

export function lex(source: string): Token[] {
  const lines: string[] = source.split('\n').map((line: string) => line.trim());
  const linesWithoutComments: string[] = lines.map((line: string) => removeComments(line));
  const rawTokens: string[] = linesWithoutComments.map((line: string) => {
    return splitBy(line, [...Whitespace, ...Specials, ...Operators])
      .map((token: string) => token.trim())
      .filter((token: string) => token.length !== 0);
  }).flat();
  
  return rawTokens.map((token: string) => {
    if ((Specials as readonly string[]).includes(token)) {
      return {
        type: 'special',
        value: token as typeof Specials[number],
      };
    }

    if ((Keywords as readonly string[]).includes(token)) {
      return {
        type: 'keyword',
        value: token as typeof Keywords[number],
      };
    }

    if ((Operators as readonly string[]).includes(token)) {
      return {
        type: 'operator',
        value: token as typeof Operators[number],
      };
    }

    if ((Types as readonly string[]).includes(token)) {
      return {
        type: 'type',
        value: token as typeof Types[number],
      };
    }

    if (token[0] >= '0' && token[0] <= '9') {
      return {
        type: 'number',
        value: token,
      };
    }

    return {
      type: 'identifier',
      value: token,
    };
  });
}

function removeComments(line: string): string {
  if (!line.includes('//')) {
    return line;
  }

  return line.slice(0, line.indexOf('//')).trim();
}

function splitBy(line: string, separators: string[]): string[] {
  const result: string[] = [];

  let start = 0;
  for (let end = 0; end < line.length; end += 1) {
    const slice: string = line.slice(end);

    for (const separator of separators) {
      if (slice.startsWith(separator)) {
        if (start !== end) {
          result.push(line.slice(start, end));
        }

        result.push(separator);
        start = end + separator.length;
        break;
      }
    }
  }

  if (start !== line.length) {
    result.push(line.slice(start));
  }

  return result;
}
