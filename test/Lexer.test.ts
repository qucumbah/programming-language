import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.139.0/testing/asserts.ts";

import { lex } from "../src/lang/lexer/Lexer.ts";
import LexerError from "../src/lang/lexer/LexerError.ts";
import { Token } from "../src/lang/lexer/Token.ts";

Deno.test(
  "Lex single-line expression",
  async function (test: Deno.TestContext) {
    const expectedTokens: [string, string][] = [
      ["var", "keyword"],
      ["varName", "identifier"],
      [":", "special"],
      ["f32", "basicType"],
      ["=", "operator"],
      ["1", "number"],
      ["+", "operator"],
      ["id", "identifier"],
      ["<=", "operator"],
      ["-", "operator"],
      ["func", "keyword"],
      ["(", "special"],
      ["a", "identifier"],
      ["<", "operator"],
      ["b", "identifier"],
      [")", "special"],
      ["==", "operator"],
      ["c", "identifier"],
      [";", "special"],
    ];

    await test.step("Lexes expression with correct formatting", function () {
      const sample = "var varName: f32 = 1 + id <= -func(a < b) == c;";
      compareTokens(lex(sample), expectedTokens);
    });

    await test.step("Lexes expression with incorrect formatting", function () {
      const sample = "\tvar varName :f32=1 + id<=-func (a<b)==c  \t;";
      compareTokens(lex(sample), expectedTokens);
    });
  },
);

Deno.test("Lex dereference expression", async function () {
  const expectedTokens: [string, string][] = [
    ["while", "keyword"],
    ["(", "special"],
    ["@", "operator"],
    ["(", "special"],
    ["somePointer", "identifier"],
    ["+", "operator"],
    ["1", "number"],
    ["->", "operator"],
    ["$", "special"],
    ["i32", "basicType"],
    [")", "special"],
    ["!=", "operator"],
    ["15", "number"],
    [")", "special"],
  ];

  const sample = "while (@(somePointer + 1 -> $i32) != 15)";
  compareTokens(lex(sample), expectedTokens);
});

Deno.test("Lex expression with comments", async function () {
  const expectedTokens: [string, string][] = [
    ["while", "keyword"],
    ["(", "special"],
    ["arg", "identifier"],
    ["<=", "operator"],
    ["3", "number"],
    [")", "special"],
    ["{", "special"],
    ["}", "special"],
  ];

  const sample = "while (arg <= 3) {} // This is a comment";
  compareTokens(lex(sample), expectedTokens);
});

Deno.test("Lex multi-line expression", async function (test: Deno.TestContext) {
  const expectedTokens: [string, string][] = [
    ["var", "keyword"],
    ["varName", "identifier"],
    [":", "special"],
    ["f32", "basicType"],
    ["=", "operator"],
    ["1", "number"],
    ["+", "operator"],
    ["id", "identifier"],
    ["<=", "operator"],
    ["-", "operator"],
    ["func", "keyword"],
    ["(", "special"],
    ["a", "identifier"],
    ["<", "operator"],
    ["b", "identifier"],
    [")", "special"],
    ["==", "operator"],
    ["c", "identifier"],
    [";", "special"],
  ];

  await test.step("Lexes multi-line expression", function () {
    const sample = "var\nvarName: f32 = \n 1 + id\n<= -func(a\n< b) == c;\n";
    compareTokens(lex(sample), expectedTokens);
  });

  await test.step("Lexes multi-line expression with each token on separate line", function () {
    const sample =
      "var\nvarName\n:\nf32\n=\n1\n+\nid\n<=\n-\nfunc\n(a\n<\nb\n)\n==\nc\n;";
    compareTokens(lex(sample), expectedTokens);
  });

  await test.step("Lexes expression ending with a newline", function () {
    const sample = "var varName: f32 = 1 + id <= -func(a < b) == c;\n";
    compareTokens(lex(sample), expectedTokens);
  });

  await test.step("Lexes expression with CRLF newlines", function () {
    const sample =
      "var varName\r\n: f32 = 1 + id\r\n<= -func(a\r\n< b) == c;\r\n";
    compareTokens(lex(sample), expectedTokens);
  });
});

Deno.test("Lex expression without separators between operators", async function () {
  const expectedTokens: [string, string][] = [
    ["==", "operator"],
    ["<=", "operator"],
    ["<", "operator"],
    ["!=", "operator"],
    ["==", "operator"],
    ["+", "operator"],
    [">=", "operator"],
    ["=", "operator"],
  ];

  const sample = "==<=<!===+>==";
  compareTokens(lex(sample), expectedTokens);
});

Deno.test("Lex numeric tokens", async function (test: Deno.TestContext) {
  await test.step("Lexes integer token", function () {
    const sample = "3145";

    const tokenContent = lex(sample)[0];
    delete (tokenContent as any).position;

    assertEquals(tokenContent, {
      type: "number",
      value: "3145",
      resultType: "i32",
      numericValue: "3145",
    });
  });

  await test.step("Lexes unsigned integer token", function () {
    const sample = "3145u";

    const tokenContent = lex(sample)[0];
    delete (tokenContent as any).position;

    assertEquals(tokenContent, {
      type: "number",
      value: sample,
      resultType: "u32",
      numericValue: "3145",
    });
  });

  await test.step("Lexes unsigned long token", function () {
    const sample = "3145ul";

    const tokenContent = lex(sample)[0];
    delete (tokenContent as any).position;

    assertEquals(tokenContent, {
      type: "number",
      value: sample,
      resultType: "u64",
      numericValue: "3145",
    });
  });

  await test.step("Lexes unsigned long token with different type descriptor order", function () {
    const sample = "3145lu";

    const tokenContent = lex(sample)[0];
    delete (tokenContent as any).position;

    assertEquals(tokenContent, {
      type: "number",
      value: sample,
      resultType: "u64",
      numericValue: "3145",
    });
  });

  await test.step("Lexes float token in format d.ddd", function () {
    const sample = "3.145";

    const tokenContent = lex(sample)[0];
    delete (tokenContent as any).position;

    assertEquals(tokenContent, {
      type: "number",
      value: "3.145",
      resultType: "f32",
      numericValue: "3.145",
    });
  });

  await test.step("Lexes long float", function () {
    const sample = "3.145l";

    const tokenContent = lex(sample)[0];
    delete (tokenContent as any).position;

    assertEquals(tokenContent, {
      type: "number",
      value: sample,
      resultType: "f64",
      numericValue: "3.145",
    });
  });

  await test.step("Lexes float token in format d.", function () {
    const sample = "3.";

    const tokenContent = lex(sample)[0];
    delete (tokenContent as any).position;

    assertEquals(tokenContent, {
      type: "number",
      value: "3.",
      resultType: "f32",
      numericValue: "3",
    });
  });

  await test.step("Lexes float token in format d.<other token>", function () {
    const sample = "3./";

    const tokenContent = lex(sample)[0];
    delete (tokenContent as any).position;

    assertEquals(tokenContent, {
      type: "number",
      value: "3.",
      resultType: "f32",
      numericValue: "3",
    });
  });
});

Deno.test("Lex functions", async function (test: Deno.TestContext) {
  await test.step("Lexes simple function", function () {
    const sample = `
      func funcName(arg: i32): void {}
    `;

    const expectedTokens: [string, string][] = [
      ["func", "keyword"],
      ["funcName", "identifier"],
      ["(", "special"],
      ["arg", "identifier"],
      [":", "special"],
      ["i32", "basicType"],
      [")", "special"],
      [":", "special"],
      ["void", "basicType"],
      ["{", "special"],
      ["}", "special"],
    ];

    compareTokens(lex(sample), expectedTokens);
  });

  await test.step("Lexes import function", function () {
    const sample = `
      import(namespace::specifier) func importedFunc(): void {}
    `;

    const expectedTokens: [string, string][] = [
      ["import", "keyword"],
      ["(", "special"],
      ["namespace", "identifier"],
      ["::", "special"],
      ["specifier", "identifier"],
      [")", "special"],
      ["func", "keyword"],
      ["importedFunc", "identifier"],
      ["(", "special"],
      [")", "special"],
      [":", "special"],
      ["void", "basicType"],
      ["{", "special"],
      ["}", "special"],
    ];

    compareTokens(lex(sample), expectedTokens);
  });
});

Deno.test(
  "Lexer determines token positions",
  async function (test: Deno.TestContext) {
    const sample = `func funcName(): i32 {\n  return 15;\n}`;

    const positions: [number, number, number][] = [
      [1, 1, 5],
      [1, 6, 14],
      [1, 14, 15],
      [1, 15, 16],
      [1, 16, 17],
      [1, 18, 21],
      [1, 22, 23],
      [2, 3, 9],
      [2, 10, 12],
      [2, 12, 13],
      [3, 1, 2],
    ];

    compareTokenPositions(lex(sample), positions);
  },
);

Deno.test(
  "Lex fails on invalid tokens",
  async function (test: Deno.TestContext) {
    await test.step("Fails on invalid integer", function () {
      assertThrows(() => lex("32847a"), LexerError);
      assertThrows(() => lex("328a32"), LexerError);
      assertThrows(() => lex("32_7"), LexerError);
    });

    await test.step("Fails on invalid float", function () {
      assertThrows(() => lex("3.2847a"), LexerError);
      assertThrows(() => lex("3.28a32"), LexerError);
      assertThrows(() => lex("3.2_7"), LexerError);
      assertThrows(() => lex("3.2.7"), LexerError);
      assertThrows(() => lex(".27"), LexerError);
    });

    await test.step("Fails on invalid identifier", function () {
      assertThrows(() => lex("a#b"), LexerError);
      assertThrows(() => lex("qqq?aaa"), LexerError);
    });
  },
);

Deno.test(
  "Lex a full module correctly",
  async function (test: Deno.TestContext) {
    const samples: string[] = [
      // 'lex',
      "parse",
      "validation",
      "generation",
      // 'pointers',
      "unsigned-and-64bit",
      "import-export",
    ];

    for (const sample of samples) {
      const filePath: string = `./test/data/${sample}.ltctwa`;
      await test.step(`Lexes ${filePath}`, () => {
        const sampleContent: string = Deno.readTextFileSync(filePath);
        lex(sampleContent);
      });
    }
  },
);

function compareTokens(
  tokens: Token[],
  expectedTokens: [string, string][],
): void {
  assertEquals(
    tokens.length,
    expectedTokens.length,
    "Unexpected tokens length",
  );
  for (let i = 0; i < tokens.length; i += 1) {
    const [value, type] = expectedTokens[i];

    const token = tokens[i];

    assertEquals(token.value, value);
    assertEquals(token.type, type);
  }
}

function compareTokenPositions(
  tokens: Token[],
  expectedTokenPositions: [number, number, number][],
): void {
  assertEquals(
    tokens.length,
    expectedTokenPositions.length,
    "Unexpected tokens length",
  );
  for (let i = 0; i < tokens.length; i += 1) {
    const [line, colStart, colEnd] = expectedTokenPositions[i];

    const token = tokens[i];

    assertEquals(token.position.line, line);
    assertEquals(token.position.colStart, colStart);
    assertEquals(token.position.colEnd, colEnd);
  }
}
