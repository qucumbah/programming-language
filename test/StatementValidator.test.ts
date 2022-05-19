import { assertObjectMatch } from "https://deno.land/std@0.139.0/testing/asserts.ts";
import ArrayIterator from "../src/lang/ArrayIterator.ts";
import { assert } from "../src/lang/Assert.ts";
import { lex } from "../src/lang/lexer/Lexer.ts";
import { parse } from "../src/lang/parser/Parser.ts";
import TypedModule from "../src/lang/typedAst/TypedModule.ts";
import TypedStatement from "../src/lang/typedAst/TypedStatement.ts";
import { validate } from "../src/lang/validator/Validator.ts";

Deno.test('Validate statements', async function(test: Deno.TestContext) {
  await test.step('Validates expression statement', function() {
    assertObjectMatch(getStatementTypedAst('15;'), {
      value: {
        resultType: {
          kind: 'basic',
          value: 'i32',
        },
      },
    });
  });

  await test.step('Validates variable declaration statement', function() {
    assertObjectMatch(getStatementTypedAst('var someVar: i32 = 15;'), {
      variableType: {
        value: 'i32',
      },
    });
  });

  await test.step('Validates variable assignment statement', function() {
    assertObjectMatch(getStatementTypedAst('var variable: i32 = 15;', 'variable = 35;'), {
      value: {
        resultType: {
          value: 'i32',
        },
      },
    });
  });

  await test.step('Validates empty return statement', function() {
    assertObjectMatch(getStatementTypedAst('return;'), {
      value: null,
    });
  });

  await test.step('Validates empty conditional statement', function() {
    assertObjectMatch(getStatementTypedAst('if (5) {}'), {
      condition: {
        kind: 'numeric',
        resultType: { value: 'i32' },
      },
      body: [],
    });
  });

  await test.step('Validates conditional statement', function() {
    assertObjectMatch(getStatementTypedAst('if (i32Param) { voidFunc(5); }'), {
      condition: {
        kind: 'identifier',
        resultType: { value: 'i32' },
      },
      body: [
        { kind: 'expression' },
      ],
    });
  });

  await test.step('Validates empty loop statement', function() {
    assertObjectMatch(getStatementTypedAst('while (5) {}'), {
      condition: {
        kind: 'numeric',
        resultType: { value: 'i32' },
      },
      body: [],
    });
  });

  await test.step('Validates loop statement', function() {
    assertObjectMatch(getStatementTypedAst('while (i32Param) { voidFunc(5); }'), {
      condition: {
        kind: 'identifier',
        resultType: { value: 'i32' },
      },
      body: [
        { kind: 'expression' },
      ],
    });
  });

  /**
   * Builds typed AST from a function template with provided statements.
   * 
   * @param statements statements to create the AST for
   * @returns typed AST of the last provided statement
   */
  function getStatementTypedAst(...statements: string[]): TypedStatement {
    const moduleSource: string = getModuleWithStatements(statements);
    const typedAst: TypedModule = validate(parse(new ArrayIterator(lex(moduleSource))));

    assert(typedAst.funcs[0].statements.length === statements.length);

    return typedAst.funcs[0].statements[statements.length - 1];
  }

  function getModuleWithStatements(statements: string[]): string {
    return `
      func funcName(i32Param: i32, f32Param: f32): void {
        ${statements.join('\n')}
      }

      func voidFunc(param: i32): void {}
      func i32Func(param: i32): i32 { return param; }
    `;
  }
});
