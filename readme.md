# Language That Compiles To WebAssembly

This is a generic language that compiles to WebAssembly text format.

Currently, it only supports numeric functions that manipulate 32-bit integers and floats.

## Usage

The language is written in typescript and has to be run with Deno:

`deno run --allow-read ./src/index.ts ./source-file.ltctwa > ./result-file.wast`

## Syntax

```
// All types have to be stated explicitly
func functionName(intArgument: i32, floatArgument: f32): void {
  // Variables and constants declarations
  var someVariable: i32 = intArgument + 3;
  const someConstant: f32 = floatArgument;

  // Float numeric literals have to be stated explicitly
  // E.g. in this example, using just `15` wouldn't work.
  const literalsExample: f32 = floatArgument + 15.0;

  // The opposite is also true: float numerals cannot be implicitly converted to integers
  const otherLiteralsExample: f32 = functionThatTakesIntegerArgument(15);

  // Variables can be re-declared with the same name
  const someConstant: i32 = 0; // All declarations have to have an initial value

  // All parameters are constant by default, but they can be re-declared as vars
  var intArgument: i32 = intArgument;
  
  // Conditional statement example
  if (intArgument == 0) {
    return;
  }

  // Loop example
  while (intArgument != 0) {
    intArgument = intArgument + 1;
  }

  // Variables declared inside blocks are different from the outer ones
  var blockScopedExample: i32 = 0;
  if (intArgument == 0) {
    // We can modify outer variables
    blockScopedExample = 1;

    // This is a different variable which doesn't affect the first one
    var blockScopedExample: i32 = 2;
  }
  // The value of `blockScopedExample` is 1 here
}

func functionThatTakesIntegerArgument(argument: i32): f32 {
  if (argument < 2) {
    return 1.5;
  }

  return 2.5;
}
```

The result of the compilation is provided below.

```
(module
  (func
    $functionName
    (param $intArgument i32)
    (param $floatArgument f32)
    (local $someVariable_acc947a9 i32)
    (local $someConstant_dd3eff17 f32)
    (local $literalsExample_487d3ca2 f32)
    (local $otherLiteralsExample_209c29f4 f32)
    (local $someConstant_1db2fec5 i32)
    (local $intArgument_cee54af5 i32)
    (local $blockScopedExample_745bbfd1 i32)
    (local $blockScopedExample_0535d38a i32)
    local.get $intArgument
    i32.const 3
    i32.add
    local.set $someVariable_acc947a9
    local.get $floatArgument
    local.set $someConstant_dd3eff17
    local.get $floatArgument
    f32.const 15
    f32.add
    local.set $literalsExample_487d3ca2
    i32.const 15
    call $functionThatTakesIntegerArgument
    local.set $otherLiteralsExample_209c29f4
    i32.const 0
    local.set $someConstant_1db2fec5
    local.get $intArgument
    local.set $intArgument_cee54af5
    (block $.label_ab23896b
      local.get $intArgument_cee54af5
      i32.const 0
      i32.eq
      i32.eqz
      br_if $.label_ab23896b
      return
    )
    (loop $.label_6d840945
      local.get $intArgument_cee54af5
      i32.const 0
      i32.ne
      i32.eqz
      br_if $.label_6d840945
      local.get $intArgument_cee54af5
      i32.const 1
      i32.add
      local.set $intArgument_cee54af5
    )
    i32.const 0
    local.set $blockScopedExample_745bbfd1
    (block $.label_e6351295
      local.get $intArgument_cee54af5
      i32.const 0
      i32.eq
      i32.eqz
      br_if $.label_e6351295
      i32.const 1
      local.set $blockScopedExample_745bbfd1
      i32.const 2
      local.set $blockScopedExample_0535d38a
    )
  )
  (func
    $functionThatTakesIntegerArgument
    (param $argument i32)
    (result f32)
    (block $.label_938c9637
      local.get $argument
      i32.const 2
      i32.lt
      i32.eqz
      br_if $.label_938c9637
      f32.const 1.5
      return
    )
    f32.const 2.5
    return
  )
)
```
