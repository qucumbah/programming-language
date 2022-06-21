import {
  assertEquals,
  assertObjectMatch,
  assertThrows,
} from "https://deno.land/std@0.139.0/testing/asserts.ts";
import ArrayIterator from "../src/lang/ArrayIterator.ts";
import { lex } from "../src/lang/lexer/Lexer.ts";
import { parse } from "../src/lang/parser/Parser.ts";
import TypedFunc from "../src/lang/typedAst/TypedFunc.ts";
import TypedModule from "../src/lang/typedAst/TypedModule.ts";
import { validate } from "../src/lang/validator/Validator.ts";

Deno.test(
  "Validate function signatures",
  async function (test: Deno.TestContext) {
    await test.step("Validates void function declaration", function () {
      assertObjectMatch(getFunctionTypedAst("func voidFunc(): void {}"), {
        signature: {
          parameters: [],
          type: {
            kind: "void",
          },
        },
      });
    });

    await test.step("Validates function declaration with parameters", function () {
      assertObjectMatch(
        getFunctionTypedAst(
          "func voidFuncWithParams(i32Param: i32, f32Param: f32): void {}",
        ),
        {
          signature: {
            parameters: [
              { type: { value: "i32" } },
              { type: { value: "f32" } },
            ],
            type: {
              kind: "void",
            },
          },
        },
      );
    });

    await test.step("Validates import function declaration with parameters", function () {
      assertObjectMatch(
        getFunctionTypedAst(
          "import(namespace::specifier) func i32Func2(a: i32): i32;",
        ),
        {
          signature: {
            parameters: [
              { type: { value: "i32" } },
            ],
            type: {
              kind: "basic",
              value: "i32",
            },
          },
        },
      );
    });

    await test.step("Validates function declaration returning integer", function () {
      assertObjectMatch(
        getFunctionTypedAst("func i32Func(): i32 { return 1; }"),
        {
          signature: {
            parameters: [],
            type: {
              kind: "basic",
              value: "i32",
            },
          },
        },
      );
    });

    await test.step("Validates function declaration returning float", function () {
      assertObjectMatch(
        getFunctionTypedAst("func f32Func(): f32 { return 1.0; }"),
        {
          signature: {
            parameters: [],
            type: {
              kind: "basic",
              value: "f32",
            },
          },
        },
      );
    });

    await test.step("Validates function declaration returning param", function () {
      assertObjectMatch(
        getFunctionTypedAst("func i32Func2(a: i32): i32 { return a; }"),
        {
          signature: {
            parameters: [
              { type: { value: "i32" } },
            ],
            type: {
              kind: "basic",
              value: "i32",
            },
          },
        },
      );
    });

    await test.step("Validates export function declaration returning param", function () {
      assertObjectMatch(
        getFunctionTypedAst("export func i32Func2(a: i32): i32 { return a; }"),
        {
          signature: {
            parameters: [
              { type: { value: "i32" } },
            ],
            type: {
              kind: "basic",
              value: "i32",
            },
          },
        },
      );
    });

    function getFunctionTypedAst(source: string): TypedFunc {
      const typedAst: TypedModule = validate(
        parse(new ArrayIterator(lex(source))),
      );

      assertEquals(typedAst.funcs.length, 1);

      return typedAst.funcs[0];
    }
  },
);

Deno.test(
  "Validation fails on invalid function signatures",
  async function (test: Deno.TestContext) {
    const sampleFuncs: string[] = [
      "func voidFunc(): i32 {}",
      "export func voidFunc(): i32 {}",
      "func voidFuncWithVoidParam(param: void): void {}",
      "import func voidFuncWithVoidParam(param: void): void;",
      "func voidFuncWithVoidVariable(): void { var voidVar: void; }",
      "func voidFuncWithVoidVariable(): void { var voidVar: void = 15; }",
      "func invalidReturnTypeFunc(): i32 { return 1.0; }",
      "func invalidReturnTypeFunc2(a: i32, b: f32): i32 { return b; }",
      "func invalidReturnTypeFunc3(): i32 { return; }",
      "func redeclaration(a: i32, a: f32): f32 { return a; }",
      "func unreachable(): void { return; 1.5; }",
      "func duplicateFunc(): void {} func duplicateFunc(): void {}",
    ];

    for (const sample of sampleFuncs) {
      await test.step(`Validation fails on "${sample}"`, function () {
        assertThrows(function () {
          validate(parse(new ArrayIterator(lex(sample))));
        });
      });
    }
  },
);

Deno.test(
  "Validation of sample modules",
  async function (test: Deno.TestContext) {
    await test.step("Validates variable re-declaration", function () {
      assertValidationSucceeds(`
      func someFunc(param: i32): void {
        const param: i32 = param + 20;
        var param: i32 = param - 3;
        param = param + 5;
      }
    `);
    });

    await test.step("Validates parameter re-declaration", function () {
      assertValidationSucceeds(`
      func someFunc(param: i32): void {
        const param: f32 = 15.;
        param + 0.5; // This will fail if param is still i32
      }
    `);
    });

    await test.step("Validates constant re-declaration", function () {
      assertValidationSucceeds(`
      func someFunc(param: i32): void {
        const param: i32 = 15;
        const param: i32 = 16;
      }
    `);
    });

    await test.step("Validates block-scoped variable declarations", function () {
      assertValidationSucceeds(`
      func someFunc(): void {
        const someConst: i32 = 15;

        if (0) {
          someConst + 30; // Check that someConst is still i32 here
          const someConst: f32 = 5.0;
          someConst + 0.5; // Check that someConst is f32 now
        }

        someConst + 30; // Check that someConst is still i32 in the outer block
      }
    `);
    });

    function assertValidationSucceeds(sample: string): void {
      validate(parse(new ArrayIterator(lex(sample))));
    }
  },
);

Deno.test(
  "Validation of invalid modules fails",
  async function (test: Deno.TestContext) {
    await test.step("Fails when trying to assign to parameter", function () {
      assertValidationThrows(`
      func someFunc(param: i32): void {
        param = 15;
      }
    `);
    });

    await test.step("Fails when trying to assign to constant", function () {
      assertValidationThrows(`
      func someFunc(): void {
        const someConst: i32 = 15;
        someConst = 15;
      }
    `);
    });

    function assertValidationThrows(sample: string): void {
      assertThrows(function () {
        validate(parse(new ArrayIterator(lex(sample))));
      });
    }
  },
);

Deno.test(
  "Validation of full modules",
  async function (test: Deno.TestContext) {
    const samples: string[] = [
      // 'lex-test',
      // 'parse-test',
      "validation-test",
      "generation-test",
      // 'pointers-test',
      "unsigned-and-64bit-test",
      "import-export-test",
    ];

    for (const sample of samples) {
      const filePath: string = `./examples/${sample}.ltctwa`;
      await test.step(`Validates ${filePath}`, () => {
        const sampleContent: string = Deno.readTextFileSync(filePath);
        assertValidationSucceeds(sampleContent);
      });
    }

    function assertValidationSucceeds(sample: string): void {
      validate(parse(new ArrayIterator(lex(sample))));
    }
  },
);
