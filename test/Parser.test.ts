import { assertThrows } from "https://deno.land/std@0.139.0/testing/asserts.ts";
import ArrayIterator from "../src/lang/ArrayIterator.ts";
import { lex } from "../src/lang/lexer/Lexer.ts";
import { Token } from "../src/lang/lexer/Token.ts";
import {
  parse,
  parseArgument,
  parseFunction,
} from "../src/lang/parser/Parser.ts";
import {
  compareArgumentParsingResult,
  compareFunctionParsingResult,
  compareModuleParsingResult,
} from "./parserUtil.ts";

Deno.test("Parse argument", async function (test: Deno.TestContext) {
  await test.step("Parses final argument", function () {
    compareArgumentParsingResult("argName: i32)", {
      name: "argName",
      type: {
        kind: "basic",
        value: "i32",
      },
    });
  });

  await test.step("Parses argument with trailing comma", function () {
    compareArgumentParsingResult("argName: i32,", {
      name: "argName",
      type: {
        kind: "basic",
        value: "i32",
      },
    });
  });
});

Deno.test("Parse function", async function (test: Deno.TestContext) {
  await test.step("Parses empty function declaration", function () {
    compareFunctionParsingResult("func funcName(): void {}", {
      name: "funcName",
      type: {
        kind: "void",
      },
      parameters: [],
      statements: [],
    });
  });

  await test.step("Parses function declaration with arguments", function () {
    compareFunctionParsingResult(
      "func funcName(arg1: i32, arg2: f32): void {}",
      {
        name: "funcName",
        type: {
          kind: "void",
        },
        parameters: [
          {
            name: "arg1",
            type: {
              kind: "basic",
              value: "i32",
            },
          },
          {
            name: "arg2",
            type: {
              kind: "basic",
              value: "f32",
            },
          },
        ],
        statements: [],
      },
    );
  });

  await test.step("Parses function declaration with statements", function () {
    const sample = `
      func funcName(): i32 {
        if (someCondition()) {
          return -1;
        }

        callSomeFunc();

        return otherFunc();
      }
    `;
    compareFunctionParsingResult(sample, {
      name: "funcName",
      type: {
        kind: "basic",
        value: "i32",
      },
      parameters: [],
      statements: [
        { kind: "conditional" },
        { kind: "expression" },
        { kind: "return" },
      ],
    });
  });
});

Deno.test("Parse module", async function (test: Deno.TestContext) {
  await test.step("Parses module with a single function", function () {
    const sample = `
      func funcName(): i32 {
        if (someCondition()) {
          return -1;
        }

        callSomeFunc();

        return otherFunc();
      }
    `;

    compareModuleParsingResult(sample, {
      funcs: [
        {
          name: "funcName",
          type: {
            kind: "basic",
            value: "i32",
          },
          parameters: [],
          statements: [
            { kind: "conditional" },
            { kind: "expression" },
            { kind: "return" },
          ],
        },
      ],
    });
  });

  await test.step("Parses module with multiple functions", function () {
    const sample = `
      func funcName(): i32 {
        if (someCondition()) {
          return -1;
        }

        callSomeFunc();

        return otherFunc();
      }

      func otherFunc(arg: f32): void {
        funcName();
      }

      func finalFunc(): void {
        const someVar: i32 = 15;
      }
    `;

    compareModuleParsingResult(sample, {
      funcs: [
        {
          name: "funcName",
          type: {
            kind: "basic",
            value: "i32",
          },
          parameters: [],
          statements: [
            { kind: "conditional" },
            { kind: "expression" },
            { kind: "return" },
          ],
        },
        {
          name: "otherFunc",
          type: {
            kind: "void",
          },
          parameters: [
            { name: "arg" },
          ],
          statements: [
            { kind: "expression" },
          ],
        },
        {
          name: "finalFunc",
          type: {
            kind: "void",
          },
          parameters: [],
          statements: [
            { kind: "variableDeclaration" },
          ],
        },
      ],
    });
  });
});

Deno.test(
  "Parse fails on invalid argument samples",
  async function (test: Deno.TestContext) {
    const invalidArguments: string[] = [
      "someArg,",
      "someArg = 15,",
      "...someArg,",
      ",,",
    ];

    for (const sample of invalidArguments) {
      await test.step(`Fails to parse "${sample}"`, function () {
        assertThrows(function () {
          parseArgument(new ArrayIterator(lex(sample)));
        });
      });
    }
  },
);

Deno.test(
  "Parse fails on invalid function samples",
  async function (test: Deno.TestContext) {
    const invalidfunctions: string[] = [
      "funcName() {}",
      "func () {}",
      "func name() {}",
      "func (): i32 {}",
      "func func(): void {}",
      "func i32(): void {}",
      "func a(): void;",
      "func a(arg: i32 = 15): void {}",
      "func a(): void { func b(): void {} }",
    ];

    for (const sample of invalidfunctions) {
      await test.step(`Fails to parse "${sample}"`, function () {
        assertThrows(function () {
          parseFunction(new ArrayIterator(lex(sample)));
        });
      });
    }
  },
);

Deno.test("Parse module end-to-end", async function (test: Deno.TestContext) {
  const samples: string[] = [
    "generation-test",
    "unsigned-and-64bit-test",
  ];

  for (const sample of samples) {
    const filePath: string = `./examples/${sample}.ltctwa`;
    await test.step(`Parses ${filePath}`, () => {
      const sampleContent: string = Deno.readTextFileSync(filePath);

      const tokens: Token[] = lex(sampleContent);
      parse(new ArrayIterator(tokens));
    });
  }
});
