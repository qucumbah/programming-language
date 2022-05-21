import { assert, assertStringIncludes } from "https://deno.land/std@0.139.0/testing/asserts.ts";
import ArrayIterator from "../src/lang/ArrayIterator.ts";
import { generate } from "../src/lang/generator/Generator.ts";
import { lex } from "../src/lang/lexer/Lexer.ts";
import { parse } from "../src/lang/parser/Parser.ts";
import TypedModule from "../src/lang/typedAst/TypedModule.ts";
import { validate } from "../src/lang/validator/Validator.ts";

Deno.test('Generate variable declaration statements', async function(test: Deno.TestContext) {
  await test.step('Generates variable declaration with literal initializer (f32)', function() {
    assertGeneratedStatementIncludes(['var someVar: f32 = 1.;'], [
      '(local f32)',
      'f32.const 1',
      'local.set 2',
    ]);
  });

  await test.step('Generates variable declaration with function call initializer (i32)', function() {
    assertGeneratedStatementIncludes(['var someVar: i32 = otherFunc(3);'], [
      '(local i32)',
      'i32.const 3',
      'call $otherFunc',
      'local.set 2',
    ]);
  });
});

Deno.test('Generate variable assignment statements', async function(test: Deno.TestContext) {
  await test.step('Generates variable assignment with numeric literal', function() {
    assertGeneratedStatementIncludes([
      'var someVar: f32 = 1.;',
      'someVar = 130.;',
    ], [
      'f32.const 130',
      'local.set 2',
    ]);
  });

  await test.step('Generates variable assignment with expression', function() {
    assertGeneratedStatementIncludes([
      'var someVar: i32 = 0;',
      'someVar = 1 + i32param + otherFunc(15);',
    ], [
      'i32.const 1',
      'local.get 0',
      'i32.add',
      'i32.const 15',
      'call $otherFunc',
      'i32.add',
      'local.set 2',
    ]);
  });
});

Deno.test('Generate return statements', async function(test: Deno.TestContext) {
  await test.step('Generates void return statement', function() {
    assertGeneratedStatementIncludes([
      'return;',
    ], [
      'return',
    ]);
  });

  await test.step('Generates non-void return statement', function() {
    const sample = `
      func sourceFunc(): i32 {
        return 15 * 3;
      }
    `;
    
    const generated: string = generateStatementSample(sample).join('\n');

    assertStringIncludes(generated, [
      'i32.const 15',
      'i32.const 3',
      'i32.mul',
      'return',
    ].join('\n'));
  });
});

Deno.test('Generate expression statements', async function(test: Deno.TestContext) {
  await test.step('Generates numeric literal expression statement', function() {
    assertGeneratedStatementIncludes([
      '15;',
    ], [
      'i32.const 15',
      'drop',
    ]);
  });

  await test.step('Generates non-void return statement', function() {
    const sample = `
      func sourceFunc(): void {
        voidFunc();
      }
      func voidFunc(): void {}
    `;
    
    const generated: string = generateStatementSample(sample).join('\n');

    assertStringIncludes(generated, [
      'call $voidFunc',
      ')',
    ].join('\n'));
  });
});

Deno.test('Generate conditional statements', async function(test: Deno.TestContext) {
  await testConditionalOrLoop('conditional', test);
});

Deno.test('Generate loop statements', async function(test: Deno.TestContext) {
  await testConditionalOrLoop('loop', test);
});

async function testConditionalOrLoop(kind: 'conditional' | 'loop', test: Deno.TestContext): Promise<void> {
  const sourceKeyword: string = (kind === 'conditional') ? 'if' : 'while';
  const generatedKeyword: string = (kind === 'conditional') ? 'block' : 'loop';

  await test.step(`Generates an empty ${kind} statement with numeric literal condition`, function() {
    const sample = `
      func sourceFunc(): void {
        ${sourceKeyword} (15) {

        }
      }
    `;
    
    const generated: string = generateStatementSample(sample).join('\n');

    assertStringIncludes(generated, [
      `(${generatedKeyword}`,
      'i32.const 15',
      'i32.eqz',
      'br_if 0',
      ')',
    ].join('\n'));
  });

  await test.step(`Generates ${kind} statement with inner statements`, function() {
    const sample = `
      func sourceFunc(): i32 {
        ${sourceKeyword} (15) {
          return 5;
        }
        return 0;
      }
    `;
    
    const generated: string = generateStatementSample(sample).join('\n');

    assertStringIncludes(generated, [
      `(${generatedKeyword}`,
      'i32.const 15',
      'i32.eqz',
      'br_if 0',
      'i32.const 5',
      'return',
      ')',
      'i32.const 0',
      'return',
    ].join('\n'));
  });

  await test.step(`Generates ${kind} statement with inner if statement`, function() {
    const sample = `
      func sourceFunc(a: i32, b: i32): i32 {
        ${sourceKeyword} (a) {
          if (b) {
            return 2;
          }
          return 1;
        }
        return 0;
      }
    `;
    
    const generated: string = generateStatementSample(sample).join('\n');

    assertStringIncludes(generated, [
      `(${generatedKeyword}`,
      'local.get 0',
      'i32.eqz',
      'br_if 0',
      '(block',
      'local.get 1',
      'i32.eqz',
      'br_if 0',
      'i32.const 2',
      'return',
      ')',
      'i32.const 1',
      'return',
      ')',
      'i32.const 0',
      'return',
    ].join('\n'));
  });
}

/**
 * Checks that the provided statement(s) result in the provided lines being generated.
 * @param statements statements source that is wrapped in a module
 * @param includes sequence of lines that should be included in the result
 */
function assertGeneratedStatementIncludes(statements: string[], includes: string[]): void {
  const moduleSource = `
    func otherFunc(i32param: i32): i32 {
      return i32param;
    }
    func sourceFunc(i32param: i32, f32param: f32): void {
      ${statements.join('\n')}
    }
  `;

  const generationResult: string = generateStatementSample(moduleSource).join('\n');
  const includedSequence: string = includes.join('\n');
  assertStringIncludes(
    generationResult,
    includedSequence,
  );
}

/**
 * Generates WAST of a module provided source.
 * Returns an array of trimmed generated lines.
 *
 * @param module module source to generate
 * @returns generated WAST
 */
function generateStatementSample(module: string): string[] {
  const typedAst: TypedModule = validate(parse(new ArrayIterator(lex(module))));

  return generate(typedAst)
    .split('\n')
    .map((line: string) => line.trim());
}
