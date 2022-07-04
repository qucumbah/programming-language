import { assertThrows } from "https://deno.land/std@0.139.0/testing/asserts.ts";
import ArrayIterator from "../src/lang/ArrayIterator.ts";
import { lex } from "../src/lang/lexer/Lexer.ts";
import { Token } from "../src/lang/lexer/Token.ts";
import {
  parse,
  parseFunction,
  parseParameterDeclaration,
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
      kind: "plain",
      signature: {
        name: "funcName",
        type: {
          kind: "void",
        },
        parameters: [],
      },
      body: [],
    });
  });

  await test.step("Parses import function declaration", function () {
    compareFunctionParsingResult(
      "func import(namespace::specifier) funcName(): void;",
      {
        kind: "import",
        importLocation: ["namespace", "specifier"],
        signature: {
          name: "funcName",
          type: {
            kind: "void",
          },
          parameters: [],
        },
      },
    );
  });

  await test.step("Parses function declaration with arguments", function () {
    compareFunctionParsingResult(
      "func funcName(arg1: i32, arg2: f32): void {}",
      {
        kind: "plain",
        signature: {
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
        },
        body: [],
      },
    );
  });

  await test.step("Parses import function declaration with arguments", function () {
    compareFunctionParsingResult(
      "func import(namespace::specifier) funcName(arg1: i32, arg2: f32): void;",
      {
        kind: "import",
        importLocation: ["namespace", "specifier"],
        signature: {
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
        },
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
      kind: "plain",
      signature: {
        name: "funcName",
        type: {
          kind: "basic",
          value: "i32",
        },
        parameters: [],
      },
      body: [
        { kind: "conditional" },
        { kind: "expression" },
        { kind: "return" },
      ],
    });
  });

  await test.step("Parses export function declaration with statements", function () {
    const sample = `
      func export funcName(): i32 {
        if (someCondition()) {
          return -1;
        }

        callSomeFunc();

        return otherFunc();
      }
    `;
    compareFunctionParsingResult(sample, {
      kind: "export",
      signature: {
        name: "funcName",
        type: {
          kind: "basic",
          value: "i32",
        },
        parameters: [],
      },
      body: [
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
          kind: "plain",
          signature: {
            name: "funcName",
            type: {
              kind: "basic",
              value: "i32",
            },
            parameters: [],
          },
          body: [
            { kind: "conditional" },
            { kind: "expression" },
            { kind: "return" },
          ],
        },
      ],
    });
  });

  await test.step("Parses module with multiple different functions", function () {
    const sample = `
      func funcName(): i32 {
        if (someCondition()) {
          return -1;
        }

        callSomeFunc();

        return otherFunc();
      }

      func import(namespace::specifier) otherFunc(arg: i32): void;

      func export finalFunc(): void {
        const someVar: i32 = 15;
      }
    `;

    compareModuleParsingResult(sample, {
      funcs: [
        {
          kind: "plain",
          signature: {
            name: "funcName",
            type: {
              kind: "basic",
              value: "i32",
            },
            parameters: [],
          },
          body: [
            { kind: "conditional" },
            { kind: "expression" },
            { kind: "return" },
          ],
        },
        {
          kind: "import",
          importLocation: ["namespace", "specifier"],
          signature: {
            name: "otherFunc",
            type: {
              kind: "void",
            },
            parameters: [
              { name: "arg" },
            ],
          },
        },
        {
          kind: "export",
          signature: {
            name: "finalFunc",
            type: {
              kind: "void",
            },
            parameters: [],
          },
          body: [
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
          parseParameterDeclaration(new ArrayIterator(lex(sample)));
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
      "export func funcName() {}",
      "export funcName() {}",
      "func export funcName();",
      "func export(namespace::specifier) funcName(): void {}",
      "func export(exportName) funcName(): void {}",
      "func () {}",
      "func name() {}",
      "func (): i32 {}",
      "func func(): void {}",
      "func i32(): void {}",
      "func a(): void;",
      "func a(arg: i32 = 15): void {}",
      "func a(): void { func b(): void {} }",
      "import a(): void;",
      "func import a(): void;",
      "func import(namespace::specifier) a(): void",
      "func import(namespace::specifier) a(): void {}",
      "import(namespace specifier) func a(): void;",
      "func import(namespace::) a(): void;",
      "func import(::) a(): void;",
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
    "generation",
    "unsigned-and-64bit",
    "import-export",
  ];

  for (const sample of samples) {
    const filePath: string = `./test/data/${sample}.ltctwa`;
    await test.step(`Parses ${filePath}`, () => {
      const sampleContent: string = Deno.readTextFileSync(filePath);

      const tokens: Token[] = lex(sampleContent);
      parse(new ArrayIterator(tokens));
    });
  }
});
