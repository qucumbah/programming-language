import { Token } from './types.ts';

const whitespace = [
  ' ',
  '\n',
  '\r',
  '\t',
];

const specials = [
  ';',
  ',',
  '{',
  '}',
  '(',
  ')',
  ':',
];

const operators = [
  '=',
  '+',
  '-',
  '*',
  '/',
  '==',
  '>',
  '<',
  '>=',
  '<=',
];

const keywords = [
  'func',
  'var',
  'if',
  'elif',
  'else',
  'while',
  'return',
];

const types = [
  'i32',
  'f32',
];

export default function lex(source: string): Token[] {
  const lines: string[] = source.split('\n').map((line: string) => line.trim());
  const linesWithoutComments: string[] = lines.map((line: string) => removeComments(line));
  const rawTokens: string[] = linesWithoutComments.map((line: string) => {
    return splitBy(line, [...whitespace, ...specials, ...operators])
      .map((token: string) => token.trim())
      .filter((token: string) => token.length !== 0);
  }).flat();
  
  return rawTokens.map((token: string) => {
    if ([...specials, ...keywords].includes(token)) {
      return [token, ''];
    }

    if (operators.includes(token)) {
      return ['operator', token];
    }

    if (types.includes(token)) {
      return ['type', token];
    }

    if (token[0] >= '0' && token[0] <= '9') {
      return ['number', token];
    }

    return ['identifier', token];
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
