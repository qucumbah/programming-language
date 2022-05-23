import { assertThrows } from "https://deno.land/std@0.139.0/testing/asserts.ts";
import ArrayIterator from "../src/lang/ArrayIterator.ts";
import { lex } from "../src/lang/lexer/Lexer.ts";
import { parseExpression } from "../src/lang/parser/ExpressionParser.ts";
import { compareExpressionParsingResult } from "./parserUtil.ts";

Deno.test('Parse numeric expression', async function(test: Deno.TestContext) {
  await test.step('Parses integer numeric expression', function() {
    compareExpressionParsingResult('12;', {
      kind: 'numeric',
      literalType: {
        value: 'i32',
      },
      value: '12',
    });
  });

  await test.step('Parses float numeric expression 1', function() {
    compareExpressionParsingResult('12.;', {
      kind: 'numeric',
      literalType: {
        value: 'f32',
      },
      value: '12',
    });
  });

  await test.step('Parses float numeric expression 2', function() {
    compareExpressionParsingResult('12.5;', {
      kind: 'numeric',
      literalType: {
        value: 'f32',
      },
      value: '12.5',
    });
  });

  await test.step('Parses long float numeric expression', function() {
    compareExpressionParsingResult('12.5l;', {
      kind: 'numeric',
      literalType: {
        value: 'f64',
      },
      value: '12.5',
    });
  });
});

Deno.test('Parse identifier expression', async function(test: Deno.TestContext) {
  await test.step('Parses integer numeric expression', function() {
    compareExpressionParsingResult('someVar;', {
      kind: 'identifier',
      identifier: 'someVar',
    });
  });
});

Deno.test('Parse composite expression', async function(test: Deno.TestContext) {
  await test.step('Parses composite expression', function() {
    compareExpressionParsingResult('(1);', {
      kind: 'composite',
      value: {
        kind: 'numeric',
        value: '1',
      },
    });
  });
});

Deno.test('Parse unary operator expression', async function(test: Deno.TestContext) {
  await test.step('Parses unary operator expression with numeric literal', function() {
    compareExpressionParsingResult('-15;', {
      kind: 'unaryOperator',
      operator: '-',
      value: {
        kind: 'numeric',
        value: '15',
      },
    });
  });

  await test.step('Parses unary operator expression with identifier', function() {
    compareExpressionParsingResult('-variable;', {
      kind: 'unaryOperator',
      operator: '-',
      value: {
        kind: 'identifier',
        identifier: 'variable',
      },
    });
  });

  await test.step('Parses double unary operator expression', function() {
    compareExpressionParsingResult('--variable;', {
      kind: 'unaryOperator',
      operator: '-',
      value: {
        kind: 'unaryOperator',
        operator: '-',
        value: {
          kind: 'identifier',
          identifier: 'variable',
        },
      },
    });
  });
});

Deno.test('Parse binary operator expression', async function(test: Deno.TestContext) {
  await test.step('Parses binary operator expression with numeric literals', function() {
    compareExpressionParsingResult('1 - 2;', {
      kind: 'binaryOperator',
      operator: '-',
      left: {
        kind: 'numeric',
        value: '1',
      },
      right: {
        kind: 'numeric',
        value: '2',
      },
    });
  });

  await test.step('Parses binary operator expression with multiple operators of same precedence', function() {
    compareExpressionParsingResult('1 - 2 + 3;', {
      kind: 'binaryOperator',
      operator: '+',
      left: {
        kind: 'binaryOperator',
        operator: '-',
        left: {
          kind: 'numeric',
          value: '1',
        },
        right: {
          kind: 'numeric',
          value: '2',
        },
      },
      right: {
        kind: 'numeric',
        value: '3',
      },
    });
  });

  await test.step('Parses binary operator expression with multiple operators with different precedence', function() {
    compareExpressionParsingResult('1 - 2 <= 3 * 4;', {
      kind: 'binaryOperator',
      operator: '<=',
      left: {
        kind: 'binaryOperator',
        operator: '-',
        left: {
          kind: 'numeric',
          value: '1',
        },
        right: {
          kind: 'numeric',
          value: '2',
        },
      },
      right: {
        kind: 'binaryOperator',
        operator: '*',
        left: {
          kind: 'numeric',
          value: '3',
        },
        right: {
          kind: 'numeric',
          value: '4',
        },
      },
    });
  });

  await test.step('Parses binary operator expression with composite expression', function() {
    compareExpressionParsingResult('1 - (2 <= 3) * 4;', {
      kind: 'binaryOperator',
      operator: '-',
      left: {
        kind: 'numeric',
        value: '1',
      },
      right: {
        kind: 'binaryOperator',
        operator: '*',
        left: {
          kind: 'composite',
          value: {
            kind: 'binaryOperator',
            operator: '<=',
            left: {
              kind: 'numeric',
              value: '2',
            },
            right: {
              kind: 'numeric',
              value: '3',
            },
          },
        },
        right: {
          kind: 'numeric',
          value: '4',
        },
      },
    });
  });
});

Deno.test('Parse type conversion expression', async function(test: Deno.TestContext) {
  await test.step('Parses simple type conversion', function() {
    compareExpressionParsingResult('1 as f32;', {
      kind: 'typeConversion',
      valueToConvert: {
        kind: 'numeric',
        value: '1',
      },
      resultType: {
        kind: 'basic',
        value: 'f32',
      },
    });
  });

  await test.step('Parses compound type conversion', function() {
    compareExpressionParsingResult('(1 + 2) as f64;', {
      kind: 'typeConversion',
      valueToConvert: {
        kind: 'composite',
        value: {
          kind: 'binaryOperator',
          left: {
            kind: 'numeric',
            value: '1',
          },
          right: {
            kind: 'numeric',
            value: '2',
          },
        },
      },
      resultType: {
        kind: 'basic',
        value: 'f64',
      },
    });
  });

  await test.step('Parses type conversion inside expression in correct order', function() {
    compareExpressionParsingResult('1.l + 2 as f64;', {
      kind: 'binaryOperator',
      left: {
        kind: 'numeric',
        value: '1',
      },
      right: {
        kind: 'typeConversion',
        valueToConvert: {
          kind: 'numeric',
          value: '2',
        },
        resultType: {
          kind: 'basic',
          value: 'f64',
        },
      },
    });
  });
});

Deno.test('Parse function call expression', async function(test: Deno.TestContext) {
  await test.step('Parses function call without arguments', function() {
    compareExpressionParsingResult('fnName();', {
      kind: 'functionCall',
      functionIdentifier: 'fnName',
    });
  });

  await test.step('Parses function call with arguments', function() {
    compareExpressionParsingResult('fnName(1, someVar, otherFn());', {
      kind: 'functionCall',
      functionIdentifier: 'fnName',
      argumentValues: [
        { kind: 'numeric', value: '1' },
        { kind: 'identifier', identifier: 'someVar' },
        { kind: 'functionCall', functionIdentifier: 'otherFn' },
      ]
    });
  });
});

Deno.test('Parse valid expression', async function(test: Deno.TestContext) {
  const validExpressions: string[] = [
    '1 + 2 * 3 / 4 <= 5 == 6 != 7 + 8 / 9 > 10 != 11 - 12 / 13 - 14;',
    '(1 + 2) * 3 / (4 <= 5 == 6) != (7 + 8 / (9 > 10 != 11) - 12) / (13 - 14);',
    '3 * 15.5 + (3 - fnCall(identifier));',
    '3 * (15.5 + (3 - fnCall(identifier)));',
    '3 * ((15.5 + (3 - fnCall(identifier))));',
    '3 * ((15.5 + (3 - fnCall(a,b,c,))));',
    '3 * ((15.5 + (3 - fnCall(a,b+3,-c,))));',
    '3*((15.5+(3--fnCall(a,b+3,-c,))));',
    '((funcCall((0))));',
  ];

  for (const expression of validExpressions) {
    await test.step(`Parses "${expression}"`, function () {
      parseExpression(new ArrayIterator(lex(expression)));
    });
  }
});

Deno.test('Parse fails on invalid expression', async function(test: Deno.TestContext) {
  const invalidExpressions: string[] = [
    'func();',
    '();',
    ');',
    '(;',
    '-(;',
    '-();',
    '-+id;',
    'id < = 3;',
    'var1 + (var2 = 5);',
    'func innerFunc(): void {};',
  ];

  for (const expression of invalidExpressions) {
    await test.step(`Fails to parse "${expression}"`, function () {
      assertThrows(function() {
        parseExpression(new ArrayIterator(lex(expression)));
      });
    });
  }
});
