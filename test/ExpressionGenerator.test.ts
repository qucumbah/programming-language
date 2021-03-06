import {
  assert,
  assertArrayIncludes,
  assertEquals,
} from "https://deno.land/std@0.139.0/testing/asserts.ts";
import ArrayIterator from "../src/lang/ArrayIterator.ts";
import { generateExpression } from "../src/lang/generator/ExpressionGenerator.ts";
import { lex } from "../src/lang/lexer/Lexer.ts";
import { parse } from "../src/lang/parser/Parser.ts";
import TypedModule from "../src/lang/typedAst/TypedModule.ts";
import { buildEnvironment } from "../src/lang/generator/Environment.ts";
import { validate } from "../src/lang/validator/Validator.ts";
import { assertGeneratedStatementIncludes } from "./generatorUtil.ts";

Deno.test(
  "Generate numeric expressions",
  async function (test: Deno.TestContext) {
    await test.step("Generates integer expression", function () {
      assertEquals(generateExpressionSample("12"), ["i32.const 12"]);
    });

    await test.step("Generates float expression", function () {
      assertEquals(generateExpressionSample("12."), ["f32.const 12"]);
    });

    await test.step("Generates 64-bit integer expression", function () {
      assertEquals(generateExpressionSample("12l"), ["i64.const 12"]);
    });

    await test.step("Generates 64-bit unsigned integer expression", function () {
      assertEquals(generateExpressionSample("12ul"), ["i64.const 12"]);
    });

    await test.step("Generates 64-bit integer expression", function () {
      assertEquals(generateExpressionSample("12.l"), ["f64.const 12"]);
    });
  },
);

Deno.test(
  "Generate identifier expressions",
  async function (test: Deno.TestContext) {
    await test.step("Generates integer identifier expression", function () {
      assertEquals(generateExpressionSample("i32param"), ["local.get 0"]);
    });

    await test.step("Generates float identifier expression", function () {
      assertEquals(generateExpressionSample("f32param"), ["local.get 1"]);
    });
  },
);

Deno.test(
  "Generate function call expressions",
  async function (test: Deno.TestContext) {
    await test.step("Generates function call expression with numeric literal argument", function () {
      assertEquals(generateExpressionSample("otherFunc(1)"), [
        "i32.const 1",
        "call $otherFunc",
      ]);
    });

    await test.step("Generates function call expression with identifier argument", function () {
      assertEquals(generateExpressionSample("otherFunc(i32param)"), [
        "local.get 0",
        "call $otherFunc",
      ]);
    });

    await test.step("Generates function call expression with argument from another function call", function () {
      assertEquals(generateExpressionSample("otherFunc(otherFunc(3))"), [
        "i32.const 3",
        "call $otherFunc",
        "call $otherFunc",
      ]);
    });
  },
);

Deno.test(
  "Generate compound expressions",
  async function (test: Deno.TestContext) {
    await test.step("Generates compound expression with numeric literal argument", function () {
      assertEquals(generateExpressionSample("(1)"), ["i32.const 1"]);
    });

    await test.step("Generates compound expression with numeric identifier argument", function () {
      assertEquals(generateExpressionSample("(f32param)"), ["local.get 1"]);
    });

    await test.step("Generates compound expression with binary expression argument", function () {
      assertEquals(generateExpressionSample("(otherFunc(3))"), [
        "i32.const 3",
        "call $otherFunc",
      ]);
    });

    await test.step("Generates compound expression with unary expression argument", function () {
      assertEquals(generateExpressionSample("(-1.)"), [
        "f32.const 0",
        "f32.const 1",
        "f32.sub",
      ]);
    });

    await test.step("Generates compound expression with binary expression argument", function () {
      assertEquals(generateExpressionSample("(1. - 2.)"), [
        "f32.const 1",
        "f32.const 2",
        "f32.sub",
      ]);
    });
  },
);

Deno.test(
  "Generate unary minus expressions",
  async function (test: Deno.TestContext) {
    await test.step("Generates unary minus expression with integer literal", function () {
      assertEquals(generateExpressionSample("-1"), [
        "i32.const 0",
        "i32.const 1",
        "i32.sub",
      ]);
    });

    await test.step("Generates unary minus expression with float literal", function () {
      assertEquals(generateExpressionSample("-1."), [
        "f32.const 0",
        "f32.const 1",
        "f32.sub",
      ]);
    });

    await test.step("Generates unary minus expression with integer identifier", function () {
      assertEquals(generateExpressionSample("-i32param"), [
        "i32.const 0",
        "local.get 0",
        "i32.sub",
      ]);
    });

    await test.step("Generates unary minus expression with float identifier", function () {
      assertEquals(generateExpressionSample("-f32param"), [
        "f32.const 0",
        "local.get 1",
        "f32.sub",
      ]);
    });

    await test.step("Generates unary minus expression with function call", function () {
      assertEquals(generateExpressionSample("-otherFunc(3)"), [
        "i32.const 0",
        "i32.const 3",
        "call $otherFunc",
        "i32.sub",
      ]);
    });

    await test.step("Generates pointer dereference", function () {
      assertEquals(generateExpressionSample("@(otherFunc(15) -> $i32)"), [
        "i32.const 15",
        "call $otherFunc",
        "i32.load",
      ]);
    });
  },
);

Deno.test(
  "Generate binary operator expressions",
  async function (test: Deno.TestContext) {
    await test.step("Generates binary operator expression with +, - and numeric literals", function () {
      assertEquals(generateExpressionSample("1 + 2 - 3"), [
        "i32.const 1",
        "i32.const 2",
        "i32.add",
        "i32.const 3",
        "i32.sub",
      ]);
    });

    await test.step("Generates binary operator expression with +, * and operator precedence is correct", function () {
      assertEquals(generateExpressionSample("1 + 2 * 3"), [
        "i32.const 1",
        "i32.const 2",
        "i32.const 3",
        "i32.mul",
        "i32.add",
      ]);
    });

    await test.step("Generates binary operator expression with identifier", function () {
      assertEquals(generateExpressionSample("1. + f32param"), [
        "f32.const 1",
        "local.get 1",
        "f32.add",
      ]);
    });

    await test.step("Generates binary operator expression with division of integers", function () {
      assertEquals(generateExpressionSample("1 / 2"), [
        "i32.const 1",
        "i32.const 2",
        "i32.div_s",
      ]);
    });

    await test.step("Generates binary operator expression with division of floats", function () {
      assertEquals(generateExpressionSample("1. / 2."), [
        "f32.const 1",
        "f32.const 2",
        "f32.div",
      ]);
    });

    await test.step("Generates binary operator expression with strict comparison operators", function () {
      assertEquals(generateExpressionSample("(1. < 2.) != (3. > 4.)"), [
        "f32.const 1",
        "f32.const 2",
        "f32.lt",
        "f32.const 3",
        "f32.const 4",
        "f32.gt",
        "i32.ne",
      ]);
    });

    await test.step("Generates binary operator expression with non-strict comparison operators", function () {
      assertEquals(generateExpressionSample("(1. <= 2.) == (3. >= 4.)"), [
        "f32.const 1",
        "f32.const 2",
        "f32.le",
        "f32.const 3",
        "f32.const 4",
        "f32.ge",
        "i32.eq",
      ]);
    });

    await test.step("Generates binary operator expression with comparison of signed and unsigned integers", function () {
      assertEquals(generateExpressionSample("(1 < 2) >= (3u > 4u) -> i32"), [
        "i32.const 1",
        "i32.const 2",
        "i32.lt_s",
        "i32.const 3",
        "i32.const 4",
        "i32.gt_u",
        "i32.ge_s",
      ]);
    });
  },
);

Deno.test(
  "Generate type conversion expressions",
  async function (test: Deno.TestContext) {
    await test.step("Generates signed int to long int type conversion expression", function () {
      assertEquals(generateExpressionSample("1 -> i64"), [
        "i32.const 1",
        "i64.extend_i32_s",
      ]);
    });

    await test.step("Generates signed int to float type conversion expression", function () {
      assertEquals(generateExpressionSample("1 -> f32"), [
        "i32.const 1",
        "f32.convert_i32_s",
      ]);
    });

    await test.step("Generates unsigned int to float type conversion expression", function () {
      assertEquals(generateExpressionSample("1u -> f32"), [
        "i32.const 1",
        "f32.convert_i32_u",
      ]);
    });

    await test.step("Generates unsigned long to float type conversion expression", function () {
      assertEquals(generateExpressionSample("1ul -> f32"), [
        "i64.const 1",
        "f32.convert_i64_u",
      ]);
    });

    await test.step("Generates 32-bit float promotion to 64-bit float", function () {
      assertEquals(generateExpressionSample("1. -> f64"), [
        "f32.const 1",
        "f64.promote_f32",
      ]);
    });

    await test.step("Generates float to int conversion", function () {
      assertEquals(generateExpressionSample("f32param -> u64"), [
        "local.get 1",
        "i64.trunc_f32_u",
      ]);
    });

    await test.step("Generates basic to pointer conversion", function () {
      assertEquals(generateExpressionSample("f32param -> $u64"), [
        "local.get 1",
        "i32.trunc_f32_s",
      ]);
    });

    await test.step("Generates compound conversion correctly", function () {
      // Converting negative floats straignt to unsigned causes RTE in WASM, so conversion
      // to signed type is recommended first.
      // Since i64 is represented in the same way as u64, only conversion to i64 is needed
      assertEquals(generateExpressionSample("f32param -> i64 -> u64"), [
        "local.get 1",
        "i64.trunc_f32_s",
      ]);
    });

    await test.step("Generates basic to pointer to basic conversion", function () {
      assertEquals(generateExpressionSample("f32param -> $u64 -> i64"), [
        "local.get 1",
        "i32.trunc_f32_s",
        "i64.extend_i32_s",
      ]);
    });
  },
);

Deno.test(
  "Generate variable assignment expressions",
  async function (test: Deno.TestContext) {
    await test.step("Generates variable assignment with numeric literal", function () {
      assertGeneratedStatementIncludes([
        "var someVar: f32 = 1.;",
        "someVar = 130.;",
      ], [
        "f32.const 130",
        "local.set 2",
      ]);
    });

    await test.step("Generates variable assignment with expression", function () {
      assertGeneratedStatementIncludes([
        "var someVar: i32 = 0;",
        "someVar = 1 + i32param + otherFunc(15);",
      ], [
        "i32.const 1",
        "local.get 0",
        "i32.add",
        "i32.const 15",
        "call $otherFunc",
        "i32.add",
        "local.set 2",
      ]);
    });

    await test.step("Generates variable assignment with pointers", function () {
      assertGeneratedStatementIncludes([
        "var someVar: $u64 = 1 -> $u64;",
        "someVar = 2 -> $u64;",
      ], [
        "i32.const 1",
        "local.set 2",
        "i32.const 2",
        "local.set 2",
      ]);
    });

    await test.step("Generates pointer assignment", function () {
      assertGeneratedStatementIncludes([
        "var someVar: $f32 = 5 -> $f32;",
        "@someVar = 1. + f32param;",
      ], [
        "i32.const 5",
        "local.set 2",
        "local.get 2",
        "f32.const 1",
        "local.get 1",
        "f32.add",
        "f32.store",
      ]);
    });

    await test.step("Generates compound pointer assignment", function () {
      assertGeneratedStatementIncludes([
        "var someVar: $f32 = 5 -> $f32;",
        "@(someVar + otherFunc(3) -> $f32) = 1.;",
      ], [
        "i32.const 5",
        "local.set 2",
        "local.get 2",
        "i32.const 3",
        "call $otherFunc",
        "i32.add",
        "f32.const 1",
        "f32.store",
      ]);
    });

    await test.step("Generates double pointer assignment", function () {
      assertGeneratedStatementIncludes([
        "var someVar: $$f32 = 11 -> $$f32;",
        "var otherVar: $f32 = 12 -> $f32;",
        "@someVar = 1 -> $f32 + otherVar;",
        "@@someVar = 1.;",
      ], [
        // someVar initialization
        "i32.const 11",
        "local.set 2",
        // otherVar initialization
        "i32.const 12",
        "local.set 3",
        // @someVar assignment
        "local.get 2",
        "i32.const 1",
        "local.get 3",
        "i32.add",
        "i32.store",
        // @@someVar assignment
        "local.get 2",
        "i32.load",
        "f32.const 1",
        "f32.store",
      ]);
    });
  },
);

Deno.test(
  "Generate expressions succeeds",
  async function (test: Deno.TestContext) {
    const validExpressions: string[] = [
      "1. != 2. == 3",
      "1 != (2. == 3.)",
      "1 != otherFunc(2. == 3.)",
      "1 != otherFunc((2. == 3.))",
      "(1 != otherFunc((2. == 3.)))",
      "@@@(1u -> $$$i64)",
    ];

    for (const sample of validExpressions) {
      await test.step(`Generates "${sample}"`, function () {
        generateExpressionSample(sample);
      });
    }
  },
);

function generateExpressionSample(expressionSource: string): string[] {
  const moduleSource = `
    func someFunc(i32param: i32, f32param: f32): void {
      ${expressionSource};
    }
    func otherFunc(i32param: i32): i32 {
      return i32param;
    }
  `;

  const typedAst: TypedModule = validate(
    parse(new ArrayIterator(lex(moduleSource))),
  );

  assert(typedAst.funcs.length === 2);
  assert(typedAst.funcs[0].kind === "plain");
  assert(typedAst.funcs[0].body.length === 1);
  assert(typedAst.funcs[0].body[0].kind === "expression");

  const [environment] = buildEnvironment(typedAst.funcs[0]);

  return generateExpression(typedAst.funcs[0].body[0].value, environment)
    .split("\n")
    .map((line: string) => line.trim());
}
