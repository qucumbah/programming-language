import {
  assertObjectMatch,
  assertThrows,
} from "https://deno.land/std@0.139.0/testing/asserts.ts";
import ArrayIterator from "../src/lang/ArrayIterator.ts";
import { assert } from "../src/lang/Assert.ts";
import { lex } from "../src/lang/lexer/Lexer.ts";
import { parse } from "../src/lang/parser/Parser.ts";
import { TypedExpression } from "../src/lang/typedAst/TypedExpression.ts";
import TypedModule from "../src/lang/typedAst/TypedModule.ts";
import { validate } from "../src/lang/validator/Validator.ts";

Deno.test(
  "Validate numeric expression",
  async function (test: Deno.TestContext) {
    await test.step("Validates integer numeric expression", function () {
      assertObjectMatch(getExpressionTypedAst("15;"), {
        resultType: {
          kind: "basic",
          value: "i32",
        },
      });
    });

    await test.step("Validates unsigned long numeric expression", function () {
      assertObjectMatch(getExpressionTypedAst("15ul;"), {
        resultType: {
          kind: "basic",
          value: "u64",
        },
      });
    });
  },
);

Deno.test(
  "Validate identifier expression",
  async function (test: Deno.TestContext) {
    await test.step("Validates identifier expression", function () {
      assertObjectMatch(getExpressionTypedAst("f32Param;"), {
        resultType: {
          kind: "basic",
          value: "f32",
        },
      });
    });
  },
);

Deno.test("Validate function call", async function (test: Deno.TestContext) {
  await test.step("Validates function call expression", function () {
    assertObjectMatch(getExpressionTypedAst("voidFunc(3);"), {
      resultType: {
        kind: "void",
      },
    });
  });
});

Deno.test("Validate unary expression", async function (test: Deno.TestContext) {
  await test.step("Validates unary expression with numeric literal", function () {
    assertObjectMatch(getExpressionTypedAst("-1.5;"), {
      resultType: {
        kind: "basic",
        value: "f32",
      },
    });
  });

  await test.step("Validates unary expression with identifier", function () {
    assertObjectMatch(getExpressionTypedAst("-i32Param;"), {
      resultType: {
        kind: "basic",
        value: "i32",
      },
    });
  });

  await test.step("Validates dereference expression", function () {
    assertObjectMatch(getExpressionTypedAst("@(i32Param -> $i32);"), {
      resultType: {
        kind: "basic",
        value: "i32",
      },
    });
  });

  await test.step("Validates dereference of double pointer expression", function () {
    assertObjectMatch(getExpressionTypedAst("@(i32Param -> $$i32);"), {
      resultType: {
        kind: "pointer",
        value: {
          kind: "basic",
          value: "i32",
        },
      },
    });
  });

  await test.step("Validates logical not expression", function () {
    assertObjectMatch(getExpressionTypedAst("!i32Param;"), {
      resultType: {
        kind: "basic",
        value: "i32",
      },
    });
  });

  await test.step("Fails when passing non-integer type to logical not", function () {
    assertThrows(() => {
      getExpressionTypedAst("!f32Param;");
    });
  });
});

Deno.test(
  "Validate binary expression",
  async function (test: Deno.TestContext) {
    await test.step("Validates binary expression with integers", function () {
      assertObjectMatch(getExpressionTypedAst("5 + i32Param;"), {
        resultType: {
          kind: "basic",
          value: "i32",
        },
      });
    });

    await test.step("Validates binary expression with long integers", function () {
      assertObjectMatch(getExpressionTypedAst("5l + 3l;"), {
        resultType: {
          kind: "basic",
          value: "i64",
        },
      });
    });

    await test.step("Validates binary expression with floats", function () {
      assertObjectMatch(getExpressionTypedAst("0.5 * f32Param;"), {
        resultType: {
          kind: "basic",
          value: "f32",
        },
      });
    });

    await test.step("Validates binary expression with comparison", function () {
      assertObjectMatch(getExpressionTypedAst("15 <= 3;"), {
        resultType: {
          kind: "basic",
          value: "i32",
        },
      });
    });

    await test.step("Validates binary expression with comparison and sum", function () {
      assertObjectMatch(getExpressionTypedAst("20 > (15 + -5);"), {
        resultType: {
          kind: "basic",
          value: "i32",
        },
        right: {
          resultType: {
            kind: "basic",
            value: "i32",
          },
        },
      });
    });

    await test.step("Validates binary expression with comparison of floats", function () {
      assertObjectMatch(getExpressionTypedAst("((0.3 * 0.7) <= 1.0) + 3;"), {
        resultType: {
          kind: "basic",
          value: "i32",
        },
        left: {
          resultType: {
            kind: "basic",
            value: "i32",
          },
          left: {
            resultType: {
              kind: "basic",
              value: "f32",
            },
          },
        },
      });
    });

    await test.step("Validates binary expression with result type dependent on operator priority", function () {
      assertObjectMatch(getExpressionTypedAst("1. > 0.5 + 3.;"), {
        resultType: {
          kind: "basic",
          value: "i32",
        },
        right: {
          resultType: {
            kind: "basic",
            value: "f32",
          },
        },
      });
    });

    await test.step("Validates binary expression with bitwise operator", function () {
      assertObjectMatch(getExpressionTypedAst("4 & 2;"), {
        resultType: {
          kind: "basic",
          value: "i32",
        },
      });
    });

    await test.step("Returns correct type when applying bitwise operation", function () {
      assertObjectMatch(getExpressionTypedAst("4u & 2u;"), {
        resultType: {
          kind: "basic",
          value: "u32",
        },
      });
    });

    await test.step("Validates binary expression with bitwise operator on unsigned 64-bit int", function () {
      assertObjectMatch(getExpressionTypedAst("4ul & 2 -> u64;"), {
        resultType: {
          kind: "basic",
          value: "u64",
        },
      });
    });
  },
);

Deno.test(
  "Validate assignment expression",
  async function (test: Deno.TestContext) {
    await test.step("Validates variable assignment expression", function () {
      const moduleSource = `
      func someFunc(): void {
        var someVar: i32 = 15;
        someVar = 35;
      }
    `;

      const typedAst: TypedModule = validate(
        parse(new ArrayIterator(lex(moduleSource))),
      );

      assert(typedAst.funcs.length === 1);
      assert(typedAst.funcs[0].kind === "plain");
      assert(typedAst.funcs[0].body.length === 2);
      assert(typedAst.funcs[0].body[1].kind === "expression");

      assertObjectMatch(typedAst.funcs[0].body[1].value, {
        kind: "binaryOperator",
        operator: "=",
        left: {
          kind: "identifier",
          identifier: "someVar",
          resultType: { value: "i32" },
        },
        right: {
          kind: "numeric",
          resultType: { value: "i32" },
        },
        resultType: {
          kind: "void",
        },
      });
    });

    await test.step("Validates pointer assignment expression", function () {
      const moduleSource = `
      func someFunc(): void {
        var someVar: $u64 = 15 -> $u64;
        @someVar = 35ul;
      }
    `;

      const typedAst: TypedModule = validate(
        parse(new ArrayIterator(lex(moduleSource))),
      );

      assert(typedAst.funcs.length === 1);
      assert(typedAst.funcs[0].kind === "plain");
      assert(typedAst.funcs[0].body.length === 2);
      assert(typedAst.funcs[0].body[1].kind === "expression");

      assertObjectMatch(typedAst.funcs[0].body[1].value, {
        kind: "binaryOperator",
        operator: "=",
        left: {
          kind: "unaryOperator",
          operator: "@",
          resultType: { value: "u64" },
        },
        right: {
          kind: "numeric",
          resultType: { value: "u64" },
        },
        resultType: {
          kind: "void",
        },
      });
    });

    await test.step("Validates compound pointer assignment expression", function () {
      const moduleSource = `
      func someFunc(): void {
        var someVar: $u64 = 15 -> $u64;
        @(someVar + 1 -> $u64) = 35ul;
      }
    `;

      const typedAst: TypedModule = validate(
        parse(new ArrayIterator(lex(moduleSource))),
      );

      assert(typedAst.funcs.length === 1);
      assert(typedAst.funcs[0].kind === "plain");
      assert(typedAst.funcs[0].body.length === 2);
      assert(typedAst.funcs[0].body[1].kind === "expression");

      assertObjectMatch(typedAst.funcs[0].body[1].value, {
        kind: "binaryOperator",
        operator: "=",
        left: {
          kind: "unaryOperator",
          operator: "@",
          resultType: { value: "u64" },
        },
        right: {
          kind: "numeric",
          resultType: { value: "u64" },
        },
        resultType: {
          kind: "void",
        },
      });
    });
  },
);

Deno.test(
  "Validate type conversion expression",
  async function (test: Deno.TestContext) {
    await test.step("Validates type conversion expression", function () {
      assertObjectMatch(getExpressionTypedAst("1. -> i32;"), {
        resultType: {
          kind: "basic",
          value: "i32",
        },
        valueToConvert: {
          kind: "numeric",
          value: "1",
          resultType: {
            kind: "basic",
            value: "f32",
          },
        },
      });
    });

    await test.step("Validates type conversion to pointer expression", function () {
      assertObjectMatch(getExpressionTypedAst("1. -> $i32;"), {
        resultType: {
          kind: "pointer",
          value: {
            kind: "basic",
            value: "i32",
          },
        },
        valueToConvert: {
          kind: "numeric",
          value: "1",
          resultType: {
            kind: "basic",
            value: "f32",
          },
        },
      });
    });
  },
);

function getExpressionTypedAst(expression: string): TypedExpression {
  const moduleSource: string = getModuleWithExpression(expression);
  const typedAst: TypedModule = validate(
    parse(new ArrayIterator(lex(moduleSource))),
  );

  assert(typedAst.funcs[0].kind === "plain");
  assert(typedAst.funcs[0].body.length === 1);
  assert(typedAst.funcs[0].body[0].kind === "expression");

  return typedAst.funcs[0].body[0].value;
}

function getModuleWithExpression(expression: string): string {
  return `
    func funcName(i32Param: i32, f32Param: f32): void {
      ${expression}
    }

    func voidFunc(param: i32): void {}
    func i32Func(param: i32): i32 { return param; }
  `;
}

Deno.test(
  "Validation fails on invalid expressions",
  async function (test: Deno.TestContext) {
    const invalidExpressions: string[] = [
      "15 + 0.5;",
      "-voidFunc();",
      "15 + voidFunc();",
      "15 > voidFunc();",
      "15 > 15.;",
      "(1. > 0.5) + 3.;",
      "15 -> 3;",
      "15 | 15u;",
      "15 | 15.;",
      // "15ul << 3;", // TODO
      "15. << 1;",
    ];

    for (const invalidExpression of invalidExpressions) {
      const moduleIncludingInvalidExpression = `
      func funcName(i32Param: i32, f32Param: f32): void {
        ${invalidExpression}
      }
      func voidFunc(): void {}
    `;

      await test.step(`Validation fails on "${invalidExpression}"`, function () {
        assertThrows(function () {
          validate(
            parse(new ArrayIterator(lex(moduleIncludingInvalidExpression))),
          );
        });
      });
    }
  },
);
