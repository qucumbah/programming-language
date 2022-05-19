import { assert, assertEquals } from "https://deno.land/std@0.139.0/testing/asserts.ts";
import ArrayIterator from "../src/lang/ArrayIterator.ts";
import { generateExpression } from "../src/lang/generator/ExpressionGenerator.ts";
import { lex } from "../src/lang/lexer/Lexer.ts";
import { parse } from "../src/lang/parser/Parser.ts";
import TypedModule from "../src/lang/typedAst/TypedModule.ts";
import { buildEnvironment } from "../src/lang/generator/Environment.ts";
import { validate } from "../src/lang/validator/Validator.ts";

Deno.test('Generate numeric expressions', async function(test: Deno.TestContext) {
  await test.step('Generates integer expression', function() {
    assertEquals(generateExpressionSample('12'), 'i32.const 12');
  });

  await test.step('Generates float expression', function() {
    assertEquals(generateExpressionSample('12.'), 'f32.const 12');
  });
});

function generateExpressionSample(expressionSource: string): string {
  const moduleSource = `
    func someFunc(i32param: i32, f32param: f32): void {
      ${expressionSource};
    }
  `;

  const typedAst: TypedModule = validate(parse(new ArrayIterator(lex(moduleSource))));

  assert(typedAst.funcs.length === 1);
  assert(typedAst.funcs[0].statements.length === 1);
  assert(typedAst.funcs[0].statements[0].kind === 'expression');

  const [environment] = buildEnvironment(typedAst.funcs[0]);
  
  return generateExpression(typedAst.funcs[0].statements[0].value, environment);
}
