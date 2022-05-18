import { assertThrows } from "https://deno.land/std@0.139.0/testing/asserts.ts";
import ArrayIterator from "../src/lang/ArrayIterator.ts";
import { lex } from "../src/lang/lexer/Lexer.ts";
import { parseStatement } from "../src/lang/parser/StatementParser.ts";
import { compareStatementParsingResult } from "./parserUtil.ts";

Deno.test('Parse expression statement', async function(test: Deno.TestContext) {
  await test.step('Parses function call expression statement', function() {
    compareStatementParsingResult('funcCall();', {
      kind: 'expression',
      value: {
        kind: 'functionCall',
        functionIdentifier: 'funcCall',
      },
    });
  });

  await test.step('Parses numeric expression statement', function() {
    compareStatementParsingResult('12;', {
      kind: 'expression',
      value: {
        kind: 'numeric',
        value: 12,
      },
    });
  });
});

Deno.test('Parse variable declaration statement', async function(test: Deno.TestContext) {
  await test.step('Parses variable declaration with numeric initializer', function() {
    compareStatementParsingResult('var varName: i32 = 30;', {
      kind: 'variableDeclaration',
      variableIdentifier: 'varName',
      variableType: {
        kind: 'basic',
        value: 'i32',
      },
      variableKind: 'variable',
      value: {
        kind: 'numeric',
        value: 30,
      },
    });
  });

  await test.step('Parses const declaration with numeric initializer', function() {
    compareStatementParsingResult('const varName: i32 = 30;', {
      kind: 'variableDeclaration',
      variableIdentifier: 'varName',
      variableType: {
        kind: 'basic',
        value: 'i32',
      },
      variableKind: 'constant',
      value: {
        kind: 'numeric',
        value: 30,
      },
    });
  });

  await test.step('Parses variable declaration with expression initializer', function() {
    compareStatementParsingResult('var varName: i32 = 30 + id + funcCall();', {
      kind: 'variableDeclaration',
      variableIdentifier: 'varName',
      variableType: {
        kind: 'basic',
        value: 'i32',
      },
      variableKind: 'variable',
      value: {
        kind: 'binaryOperator',
      },
    });
  });
});

Deno.test('Parse variable assignment statement', async function(test: Deno.TestContext) {
  await test.step('Parses assigning number to variable', function() {
    compareStatementParsingResult('varName = 30;', {
      kind: 'variableAssignment',
      variableIdentifier: 'varName',
      value: {
        kind: 'numeric',
        value: 30,
      },
    });
  });

  await test.step('Parses assigning expression to variable', function() {
    compareStatementParsingResult('varName = 30 + id + funcCall();', {
      kind: 'variableAssignment',
      variableIdentifier: 'varName',
      value: {
        kind: 'binaryOperator',
      },
    });
  });
});

Deno.test('Parse return statement', async function(test: Deno.TestContext) {
  await test.step('Parses returning expression', function() {
    compareStatementParsingResult('return 30 + id + funcCall();', {
      kind: 'return',
      value: {
        kind: 'binaryOperator',
      },
    });
  });

  await test.step('Parses returning nothing', function() {
    compareStatementParsingResult('return;', {
      kind: 'return',
      value: null,
    });
  });
});

Deno.test('Parse conditional statement', async function(test: Deno.TestContext) {
  await testConditionalOrLoop('conditional', test);
});

Deno.test('Parse loop statement', async function(test: Deno.TestContext) {
  await testConditionalOrLoop('loop', test);
});

async function testConditionalOrLoop(kind: 'conditional' | 'loop', test: Deno.TestContext) {
  const keyword = (kind === 'conditional') ? 'if' : 'while';

  await test.step(`Parses empty ${kind} statement`, function() {
    compareStatementParsingResult(`${keyword} (30 + id) {}`, {
      kind,
      condition: {
        kind: 'binaryOperator',
        left: { kind: 'numeric' },
        right: { kind: 'identifier' },
      },
      body: [],
    });
  });

  await test.step(`Parses ${kind} statement with body`, function() {
    compareStatementParsingResult(`${keyword} (30 + id) { doNothing(); }`, {
      kind,
      condition: {
        kind: 'binaryOperator',
        left: { kind: 'numeric' },
        right: { kind: 'identifier' },
      },
      body: [
        {
          kind: 'expression',
          value: {
            kind: 'functionCall',
          },
        },
      ],
    });
  });

  await test.step(`Parses ${kind} statement with multiple steps`, function() {
    compareStatementParsingResult(`${keyword} (30 + id) { doNothing(); 15; }`, {
      kind,
      condition: {
        kind: 'binaryOperator',
        left: { kind: 'numeric' },
        right: { kind: 'identifier' },
      },
      body: [
        {
          kind: 'expression',
          value: {
            kind: 'functionCall',
          },
        },
        {
          kind: 'expression',
          value: {
            kind: 'numeric',
          },
        },
      ],
    });
  });

  await test.step(`Parses composite ${kind} statement`, function() {
    const sample = `
      ${keyword} (condition) {
        if (otherCondition) {
          return;
        }

        outerBody();
      }
    `;

    compareStatementParsingResult(sample, {
      kind,
      condition: { kind: 'identifier' },
      body: [
        {
          kind: 'conditional',
          condition: { kind: 'identifier' },
          body: [ { kind: 'return' } ]
        },
        {
          kind: 'expression',
          value: { kind: 'functionCall' },
        },
      ],
    });
  });
}

Deno.test('Parse valid statement', async function(test: Deno.TestContext) {
  const validStatements: string[] = [
    'while (1) { doSomething; }',
    'if (isSuccessful()) { return returnValue + 15 + funcCall(); }',
    'if (con) { var con: f32 = 13.5 + 15; } while (somethingElse) {  }',
    'const constName: i32 = 1; const constName: i32 = 1; const constName: i32 = 1;',
    '1 + 2 * 3;',
  ];

  for (const statement of validStatements) {
    await test.step(`Parses "${statement}"`, function () {
      parseStatement(new ArrayIterator(lex(statement)));
    });
  }
});

Deno.test('Parse fails on invalid statement', async function(test: Deno.TestContext) {
  const invalidStatements: string[] = [
    'while () { doSomething; }',
    'if (isSuccessful() { }',
    'var autoVar = 15;',
    'if (var = 13) {}',
    'if (condition);',
    'func innerFunc(): void {};',
    ';',
  ];

  for (const statement of invalidStatements) {
    await test.step(`Fails to parse "${statement}"`, function () {
      assertThrows(function() {
        parseStatement(new ArrayIterator(lex(statement)));
      });
    });
  }
});
