import { Operators } from "./Operators.ts";
import { Specials } from "./Specials.ts";
import { Token, createToken } from "./Token.ts";
import { Whitespace } from "./Whitespace.ts";

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
