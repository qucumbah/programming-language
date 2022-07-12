import { assertEquals } from "https://deno.land/std@0.139.0/testing/asserts.ts";
import ArrayIterator from "../src/lang/ArrayIterator.ts";
import { lex } from "../src/lang/lexer/Lexer.ts";
import { parseType } from "../src/lang/parser/TypeParser.ts";

Deno.test("Parse basic type", async function (test: Deno.TestContext) {
  await test.step("Parses basic type", function () {
    assertEquals(parseType(new ArrayIterator(lex("i32"))), {
      kind: "basic",
      value: "i32",
    });
  });

  await test.step("Parses pointer type", function () {
    assertEquals(parseType(new ArrayIterator(lex("$f32"))), {
      kind: "pointer",
      value: {
        kind: "basic",
        value: "f32",
      },
    });
  });

  await test.step("Parses pointer to pointer type", function () {
    assertEquals(parseType(new ArrayIterator(lex("$$u64"))), {
      kind: "pointer",
      value: {
        kind: "pointer",
        value: {
          kind: "basic",
          value: "u64",
        },
      },
    });
  });
});
