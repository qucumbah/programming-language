import { assertStringIncludes } from "https://deno.land/std@0.139.0/testing/asserts.ts";
import { generateModuleSample } from "./generatorUtil.ts";

Deno.test(
  "Generate memory declarations",
  async function (test: Deno.TestContext) {
    await test.step("Generates plain memory declaration", function () {
      const sample = `
      memory(1u);
    `;

      assertStringIncludes(
        generateModuleSample(sample).join("\n"),
        [
          "(memory 1)",
        ].join("\n"),
      );
    });

    await test.step("Generates import memory declaration", function () {
      const sample = `
      memory(2u) import(namespace::specifier);
    `;

      assertStringIncludes(
        generateModuleSample(sample).join("\n"),
        [
          `(import "namespace" "specifier" (memory 2))`,
        ].join("\n"),
      );
    });

    await test.step("Generates export memory declaration", function () {
      const sample = `
      memory(3u) export(exportName);
    `;

      assertStringIncludes(
        generateModuleSample(sample).join("\n"),
        [
          `(memory (export "exportName") 3)`,
        ].join("\n"),
      );
    });
  },
);

Deno.test(
  "Generate functions with name, parameters and return types",
  async function (test: Deno.TestContext) {
    await test.step("Generates void function without arguments", function () {
      const sample = `
      func funcName(): void {}
    `;

      assertStringIncludes(
        generateModuleSample(sample).join("\n"),
        [
          "(func",
          "$funcName",
          ")",
        ].join("\n"),
      );
    });

    await test.step("Generates void function with arguments", function () {
      const sample = `
      func funcName(a: i32, b: f32, c: u32, d: u64): void {}
    `;

      assertStringIncludes(
        generateModuleSample(sample).join("\n"),
        [
          "(func",
          "$funcName",
          "(param i32)",
          "(param f32)",
          "(param i32)",
          "(param i64)",
          ")",
        ].join("\n"),
      );
    });

    await test.step("Generates export function with arguments", function () {
      const sample = `
      func export funcName(a: i32, b: f32, c: u32, d: u64): void {}
    `;

      assertStringIncludes(
        generateModuleSample(sample).join("\n"),
        [
          "(func",
          "$funcName",
          `(export "funcName")`,
          "(param i32)",
          "(param f32)",
          "(param i32)",
          "(param i64)",
          ")",
        ].join("\n"),
      );
    });

    await test.step("Generates import function with arguments", function () {
      const sample = `
      func import(namespace::specifier) funcName(a: i32, b: f32, c: u32, d: u64): void;
    `;

      assertStringIncludes(
        generateModuleSample(sample).join("\n"),
        [
          "(import",
          `"namespace"`,
          `"specifier"`,
          "(func",
          "$funcName",
          "(param i32)",
          "(param f32)",
          "(param i32)",
          "(param i64)",
          ")",
          ")",
        ].join("\n"),
      );
    });

    await test.step("Generates function returning i64", function () {
      const sample = `
      func funcName(): i64 {
        return 1l;
      }
    `;

      assertStringIncludes(
        generateModuleSample(sample).join("\n"),
        [
          "(func",
          "$funcName",
          "(result i64)",
          "i64.const 1",
          "return",
          ")",
        ].join("\n"),
      );
    });

    await test.step("Generates void function with arguments returning value", function () {
      const sample = `
      func funcName(a: i32, b: f32, c: u32, d: u64): i32 {
        return a;
      }
    `;

      assertStringIncludes(
        generateModuleSample(sample).join("\n"),
        [
          "(func",
          "$funcName",
          "(param i32)",
          "(param f32)",
          "(param i32)",
          "(param i64)",
          "(result i32)",
          "local.get 0",
          "return",
          ")",
        ].join("\n"),
      );
    });

    await test.step("Generates function returning u64", function () {
      const sample = `
      func funcName(): u64 {
        return 1lu;
      }
    `;

      assertStringIncludes(
        generateModuleSample(sample).join("\n"),
        [
          "(func",
          "$funcName",
          "(result i64)",
          "i64.const 1",
          "return",
          ")",
        ].join("\n"),
      );
    });

    await test.step("Generates function returning pointer", function () {
      const sample = `
      func funcName(): $u64 {
        return 1 -> $u64;
      }
    `;

      assertStringIncludes(
        generateModuleSample(sample).join("\n"),
        [
          "(func",
          "$funcName",
          "(result i32)",
          "i32.const 1",
          "return",
          ")",
        ].join("\n"),
      );
    });

    await test.step("Generates function with pointer arguments", function () {
      const sample = `
      func funcName(a: $i32, b: $$f32): $u64 {
        return a -> $u64;
      }
    `;

      assertStringIncludes(
        generateModuleSample(sample).join("\n"),
        [
          "(func",
          "$funcName",
          "(param i32)",
          "(param i32)",
          "(result i32)",
          "local.get 0",
          "return",
          ")",
        ].join("\n"),
      );
    });
  },
);

Deno.test(
  "Generate module children in correct order",
  async function (test: Deno.TestContext) {
    await test.step("Generates import functions before others", function () {
      const sample = `
      func plainFunc(): void {}
      func export exportFunc(): void {}
      func import(namespace::specifier) importFunc(): void;
    `;

      assertStringIncludes(
        generateModuleSample(sample).join("\n"),
        [
          "(import",
          `"namespace"`,
          `"specifier"`,
          "(func",
          "$importFunc",
          ")",
          ")",
          "(func",
          "$plainFunc",
          ")",
          "(func",
          "$exportFunc",
          `(export "exportFunc")`,
          ")",
        ].join("\n"),
      );
    });

    await test.step("Generates import function before memory declaration", function () {
      const sample = `
      memory(1u);
      func import(namespace::specifier) importFunc(): void;
    `;

      assertStringIncludes(
        generateModuleSample(sample).join("\n"),
        [
          "(import",
          `"namespace"`,
          `"specifier"`,
          "(func",
          "$importFunc",
          ")",
          ")",
          "(memory 1)",
        ].join("\n"),
      );
    });
  },
);

Deno.test(
  "Generate full module correctly",
  async function (test: Deno.TestContext) {
    const samples: string[] = [
      // 'lex',
      // 'parse',
      // 'validation',
      "generation",
      // 'pointers',
      "unsigned-and-64bit",
      "import-export",
      "memory/plain",
      "memory/import",
      "memory/export",
    ];

    for (const sample of samples) {
      const filePath: string = `./test/data/${sample}.ltctwa`;
      await test.step(`Generates ${filePath}`, function () {
        const sampleContent: string = Deno.readTextFileSync(filePath);
        generateModuleSample(sampleContent);
      });
    }
  },
);
