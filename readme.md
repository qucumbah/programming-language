# Language That Compiles To WebAssembly

- [Language That Compiles To WebAssembly](#language-that-compiles-to-webassembly)
  - [About](#about)
  - [Try it out](#try-it-out)
  - [Usage](#usage)
  - [Language overview](#language-overview)
    - [Getting started](#getting-started)
    - [Type system](#type-system)
    - [Statements](#statements)
    - [Expressions](#expressions)
    - [Numeric literals](#numeric-literals)
    - [Comments](#comments)
    - [Explicit type conversions](#explicit-type-conversions)
    - [Functions](#functions)
    - [Function parameters](#function-parameters)
    - [Variables and constants](#variables-and-constants)
    - [Variable scoping and re-declarations](#variable-scoping-and-re-declarations)
    - [Operators](#operators)
    - [Control flow](#control-flow)
    - [Pointers usage](#pointers-usage)
    - [Memory declarations](#memory-declarations)

## About

LTCTWA is a low-level statically-typed C-like language that compiles to
WebAssembly text format.

## Try it out

There is an interactive demo available on
[GitHub Pages](https://qucumbah.github.io/programming-language/).

## Usage

The language is written in typescript and has to be run with Deno.

Compiling a source file into WAST:

`deno run --allow-read ./src/index.ts ./source-file.ltctwa > ./result-file.wast`

You will need a separate compiler to convert the result into WASM binary.
[WABT](https://github.com/WebAssembly/wabt) is a good tool for this task.

Running unit tests:

`deno test --allow-read`

## Language overview

### Getting started

Create a file named `main.ltctwa` and paste the following contents into it:

```
func export inc(arg: i32): i32 {
  return arg + 1;
}
```

Use `deno run --allow-read ./src/index.ts ./main.ltctwa > ./output.wast` to
compile to WebAssembly text format.

This will produce the following output:

```
(module
  (func
    $inc
    (export "inc")
    (param i32)
    (result i32)
    local.get 0
    i32.const 1
    i32.add
    return
  )
)
```

The next step is to compile the result into WebAssembly binary, which can be
done with `wat2wasm ./dist/compiled.wast -o ./dist/main.wasm`.

Now, the resulting code may be imported and executed from JavaScript:

```js
async function main() {
  const wasm = await getWasm();
  const result = wasm.exports.inc(15);
  console.log(result);
}

async function getWasm() {
  const bytes = await fetch("main.wasm").then((res) => res.arrayBuffer());
  const module = await WebAssembly.compile(bytes);
  return WebAssembly.instantiate(module);
}
```

### Type system

There are 7 basic types:

- Signed integers: `i32`, `i64`
- Unsigned integers: `i32`, `i64`;
- Floats: `f32`, `f64`;
- Void (only available for function returns): `void`

There are also pointer types, which can only point to sections of memory, not to
other variables.

Pointer type is prepended with a `$` symbol: `$i32`, `$$u64` (pointer to
pointer) etc.

There is no void pointer for generic sections of memory; a pointer to `i32` can
be used instead.

### Statements

A program consists of a series of statements that are terminated by the
semicolon (`;`).

There are 5 kinds of statements:

- Conditional Statement (`if`)
- Loop Statement (`while`)
- Return Statement (`return`)
- VariableDeclaration Statement (operator `=`)
- Expression Statement (any expression terminated with a semicolon)

### Expressions

There are 7 kinds of expressions:

- Identifier Expression (variables/constants/parameters access)
- Numeric Expression (numeric literals)
- Function Call Expression (functionName(arg1value, arg2value))
- Unary Operator Expression (-val, !val, ...)
- Binary Operator Expression (val1 + val2, val1 << val2, ...)
- Type Conversion Expression (a special kind of binary operator expression: val
  -> type)
- Composite Expression (any expression inside parentheses)

### Numeric literals

Values of non-void types can be created with numeric literals:

```
var signed: i32 = -1;
var unsigned: u32 = 1u;
var long: i32 = 1l;
var unsignedLong: i32 = 1ul;
var float: f32 = 1.;
var double: f64 = 1.l;
```

### Comments

Only single-line comments are supported. Use `//` for comments:

```
// This is a comment
var someVar: i32 = 15; // Also a comment
```

### Explicit type conversions

Implicit type conversions are not allowed. All type changes have to be performed
explicitly using the type conversion operator `->`:

```
const float: f32 = 5. + 1 -> f32;

const float: f32 = 5. + 1; // This would fail
```

Type conversions can also be chained. This is useful for converting negative
floats to unsigned integer, as this will cause a runtime error in WASM:

```
const unsignedLong: u64 = -1. -> i64 -> u64;
```

### Functions

There are three kinds of functions: plain (internal, not available in JS),
export (available both in module and JS), import (imported from JS).

Each of them has to have an explicit result type.

Examples:

```
func plainFunction(arg1: i32, arg2: i32): i32 {
  return arg1 & arg2;
}

func export exportFunction(arg1: i32, arg2: i32): i32 {
  return arg1 & arg2;
}

func import(console::log) console_log(arg: i32): void;
```

Import object is used to pass import function's body from JS.

For example, to use import function from above it has to be passed like this:

```js
WebAssembly.instantiate(module, {
  console: {
    log: console.log,
  },
});
```

### Function parameters

Each function parameter has to have an explicit non-void type.

All parameters are constant.

### Variables and constants

All variables and constants have to be initialized from the start, and have to
have an explicit type:

```
var someVariable: i32 = 3;
const someConstant: f32 = someFloatArgument;
```

### Variable scoping and re-declarations

Variables, constants and parameters can be re-declared with a different type:

```
func redeclarationFunc(arg: i32): void {
  const arg: f32 = arg -> f32;
  const arg: u64 = 15ul;

  var someVar: i32 = 3;
  var someVar: i64 = someVar -> i64;
}
```

Variables are block-scoped:

```
const someValue: i32 = 1;
if (1) {
  const someValue: f32 = 2.;
  console_log(someValue); // The value is now 2.0
}
```

If a variable is not declared in the current scope, its value is taken from the
outer one:

```
var someVar: i32 = 1;
if (1) {
  console_log(someVar); // The value is still 1
  
  // If we change it here, the outer variable will be affected
  someVar = 2;

  const someVar: i32 = 3;
  console_log(someVar); // Inside this block of code, someVar's value is now 3
}

console_log(someVar); // But the outer value is still 2
```

### Operators

Operators precedence table with explanation:

| Precedence | Operator(s)                   | Description                                                                    | Accepted value(s)                    | Return value     |
| ---------- | ----------------------------- | ------------------------------------------------------------------------------ | ------------------------------------ | ---------------- |
| 1          | `!`<br> `@`<br> `-`           | Logical NOT<br>Pointer dereference<br>Unary minus                              | Integers<br>Pointers<br>Non-void<br> | Same as operands |
| 2          | `*`<br> `/`                   | Multiplication<br>Division                                                     | Non-void                             | Same as operands |
| 3          | `+`<br> `-`                   | Addition<br>Subtraction                                                        | Non-void                             | Same as operands |
| 4          | `>`<br> `<`<br> `>=`<br> `<=` | Greater than<br>Less than<br>Greater than or equal to<br>Less than or equal to | Non-void                             | `i32`            |
| 5          | `==`<br> `!=`                 | Equal to<br>Not equal to                                                       | Non-void                             | `i32`            |
| 6          | `<<`<br> `>>`                 | Left shift<br>Right shift                                                      | Integers                             | Same as operands |
| 7          | `&`                           | Logical AND                                                                    | Integers                             | Same as operands |
| 8          | `^`                           | Logical XOR                                                                    | Integers                             | Same as operands |
| 9          | `\|`                          | Logical OR                                                                     | Integers                             | Same as operands |
| 10         | `=`                           | Assignment                                                                     | Identifier `=` Non-void              | `void`           |
| 11         | `->`                          | Type conversion                                                                | Non-void `->` `type`                 | `type`           |

Pointer type is also included in the non-void values category.

Just as with variable assignment, there is no implicit conversion, so both
operands have to be the same type. The only two exceptions to this rule are
assignment and type conversion operators.

### Control flow

There are three control flow statements: conditional, loop, and return
statements.

Examples:

```
func loopTest(arg: u32): i32 {
  var someVar: i32 = 1;
  // Conditional and loop statements accept a value of type `i32`
  while (someVar < arg) {
    if (someVar == 256) {
      return 256;
    }
    someVar = someVar * 2;
  }

  return someVar;
}
```

### Pointers usage

Pointers are represented as `i32` internally.

Pointer arithmetic is available, but all adresses are counted in bytes. Example:

```
// All values have to be converted into pointers
var pointerToInt: $i32 = 0 -> $i32;
var pointerToNextInt: $i32 = pointerToInt + 4 -> $i32;
```

In C, second variable's value would have been calculated as `pointerToInt + 1`.

The expression would be the same as
`(byte*)pointerToInt + (1 * sizeof(*pointerToInt))`.

In LTCTWA, such implicit calculation is absent.

To manipulate a value that is pointed to, dereference operator "`@`" is used:

```
var somePointer: $i32 = 100 -> $i32;
@somePointer = 1;
@(somePointer + 4) = 2;
const two: i32 = @(104 -> $i32);

var pointerToPointer: $$i32 = 200;
@pointerToPointer = somePointer;
const one = @@pointerToPointer;
const two = @(@pointerToPointer + 4 -> $i32);
```

There is no way to get an adress of a variable on the stack, only adresses of
memory can be used.

### Memory declarations

Just like functions, there are three ways to declare memory: plain (only used
within a module), export (may be accessed from JS), and import (imported from
JS).

There may only be one memory declaration per module.

Syntax examples:

```
memory(1u);

// This can be accessed in JS as `instance.exports.exportMem`
memory(1u) export(exportMem);

// For this to work an instance of `WebAssembly.Memory` has to be passed to the import object
memory(1u) import(memoryNamespace::memoryName);
```
