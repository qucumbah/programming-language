import { assertStringIncludes } from "https://deno.land/std@0.139.0/testing/asserts.ts";
import {
  assertGeneratedStatementIncludes,
  generateModuleSample,
} from "./generatorUtil.ts";

Deno.test(
  "Generate variable declaration statements",
  async function (test: Deno.TestContext) {
    await test.step("Generates variable declaration with literal initializer (f32)", function () {
      assertGeneratedStatementIncludes(["var someVar: f32 = 1.;"], [
        "(local f32)",
        "f32.const 1",
        "local.set 2",
      ]);
    });

    await test.step("Generates variable declaration with function call initializer (i32)", function () {
      assertGeneratedStatementIncludes(["var someVar: i32 = otherFunc(3);"], [
        "(local i32)",
        "i32.const 3",
        "call $otherFunc",
        "local.set 2",
      ]);
    });
  },
);

Deno.test(
  "Generate return statements",
  async function (test: Deno.TestContext) {
    await test.step("Generates void return statement", function () {
      assertGeneratedStatementIncludes([
        "return;",
      ], [
        "return",
      ]);
    });

    await test.step("Generates non-void return statement", function () {
      const sample = `
      func sourceFunc(): i32 {
        return 15 * 3;
      }
    `;

      const generated: string = generateModuleSample(sample).join("\n");

      assertStringIncludes(
        generated,
        [
          "i32.const 15",
          "i32.const 3",
          "i32.mul",
          "return",
        ].join("\n"),
      );
    });
  },
);

Deno.test(
  "Generate expression statements",
  async function (test: Deno.TestContext) {
    await test.step("Generates numeric literal expression statement", function () {
      assertGeneratedStatementIncludes([
        "15;",
      ], [
        "i32.const 15",
        "drop",
      ]);
    });

    await test.step("Generates non-void return statement", function () {
      const sample = `
      func sourceFunc(): void {
        voidFunc();
      }
      func voidFunc(): void {}
    `;

      const generated: string = generateModuleSample(sample).join("\n");

      assertStringIncludes(
        generated,
        [
          "call $voidFunc",
          ")",
        ].join("\n"),
      );
    });

    await test.step("Generates return statement with type conversion", function () {
      const sample = `
      func sourceFunc(arg: i32): u64 {
        return arg as u64;
      }
    `;

      const generated: string = generateModuleSample(sample).join("\n");

      assertStringIncludes(
        generated,
        [
          "local.get 0",
          "i64.extend_i32_u",
          "return",
        ].join("\n"),
      );
    });
  },
);

Deno.test(
  "Generate conditional statements",
  async function (test: Deno.TestContext) {
    await testConditionalOrLoop("conditional", test);
  },
);

Deno.test("Generate loop statements", async function (test: Deno.TestContext) {
  await testConditionalOrLoop("loop", test);
});

async function testConditionalOrLoop(
  kind: "conditional" | "loop",
  test: Deno.TestContext,
): Promise<void> {
  const sourceKeyword: string = (kind === "conditional") ? "if" : "while";
  const generatedKeyword: string = (kind === "conditional") ? "block" : "loop";

  await test.step(`Generates an empty ${kind} statement with numeric literal condition`, function () {
    const sample = `
      func sourceFunc(): void {
        ${sourceKeyword} (15) {

        }
      }
    `;

    const generated: string = generateModuleSample(sample).join("\n");

    assertStringIncludes(
      generated,
      [
        `(${generatedKeyword}`,
        "i32.const 15",
        "i32.eqz",
        "br_if 0",
        ")",
      ].join("\n"),
    );
  });

  await test.step(`Generates ${kind} statement with inner statements`, function () {
    const sample = `
      func sourceFunc(): i32 {
        ${sourceKeyword} (15) {
          return 5;
        }
        return 0;
      }
    `;

    const generated: string = generateModuleSample(sample).join("\n");

    assertStringIncludes(
      generated,
      [
        `(${generatedKeyword}`,
        "i32.const 15",
        "i32.eqz",
        "br_if 0",
        "i32.const 5",
        "return",
        ")",
        "i32.const 0",
        "return",
      ].join("\n"),
    );
  });

  await test.step(`Generates ${kind} statement with inner if statement`, function () {
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

    const generated: string = generateModuleSample(sample).join("\n");

    assertStringIncludes(
      generated,
      [
        `(${generatedKeyword}`,
        "local.get 0",
        "i32.eqz",
        "br_if 0",
        "(block",
        "local.get 1",
        "i32.eqz",
        "br_if 0",
        "i32.const 2",
        "return",
        ")",
        "i32.const 1",
        "return",
        ")",
        "i32.const 0",
        "return",
      ].join("\n"),
    );
  });
}

Deno.test(
  "Generate variable declarations in composite blocks of code",
  async function (test: Deno.TestContext) {
    await test.step("Generates composite blocks of code with variable declaration", function () {
      const sample = `
        func sourceFunc(): i32 {
          var a: i32 = 0;
          while (a) {
            var b: i32 = 0;
            return a + b;
          }
          return a;
        }
      `;

      const generated: string = generateModuleSample(sample).join("\n");

      assertStringIncludes(
        generated,
        [
          "(local i32)",
          "(local i32)",
          "i32.const 0",
          "local.set 0",
          "(loop",
          "local.get 0",
          "i32.eqz",
          "br_if 0",
          "i32.const 0",
          "local.set 1",
        ].join("\n"),
      );
    });
  },
);
