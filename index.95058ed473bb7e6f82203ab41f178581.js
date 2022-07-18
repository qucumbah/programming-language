(() => {
  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/ArrayIterator.ts
  var Iter = class {
    constructor(items) {
      this.items = items;
      this.nextItemIndex = 0;
    }
    next(after = 0) {
      const result = this.peekNext(after);
      this.nextItemIndex += 1;
      return result;
    }
    peekNext(after = 0) {
      if (this.nextItemIndex + after >= this.items.length) {
        throw new Error(`Unexpected end of input`);
      }
      return this.items[this.nextItemIndex + after];
    }
    peekPrev() {
      if (this.nextItemIndex === 0) {
        throw new Error(`Unable to find previous token`);
      }
      return this.items[this.nextItemIndex - 1];
    }
    hasNext() {
      return this.nextItemIndex < this.items.length;
    }
    remainingCount() {
      return this.items.length - this.nextItemIndex;
    }
    clone() {
      const result = new Iter(this.items);
      result.nextItemIndex = this.nextItemIndex;
      return result;
    }
  };

  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/generator/Environment.ts
  function buildEnvironment(func) {
    const resultingEnvironment = createEmptyEnvironment();
    const idTypeMapping = new Map();
    for (const parameter of func.signature.parameters) {
      const id = getNextId(idTypeMapping);
      idTypeMapping.set(id, parameter.type);
      resultingEnvironment.declarationIds.set(parameter, id);
      resultingEnvironment.currentVariableIds.set(parameter.name, id);
    }
    buildEnvironmentInner(func.body, resultingEnvironment, idTypeMapping);
    return [resultingEnvironment, idTypeMapping];
  }
  function buildEnvironmentInner(statements, resultingEnvironment, idTypeMapping, takenLabels = new Set()) {
    for (const statement of statements) {
      switch (statement.kind) {
        case "variableDeclaration":
          const variableId = getNextId(idTypeMapping);
          resultingEnvironment.declarationIds.set(statement, variableId);
          idTypeMapping.set(variableId, statement.variableType);
          break;
        case "conditional":
        case "loop":
          const innerEnvironment = createEmptyEnvironment(resultingEnvironment);
          resultingEnvironment.children.set(statement, innerEnvironment);
          buildEnvironmentInner(statement.body, innerEnvironment, idTypeMapping, takenLabels);
          break;
      }
    }
  }
  function getNextId(idTypeMapping) {
    return idTypeMapping.size;
  }
  function createEmptyEnvironment(parent) {
    return {
      parent,
      children: new Map(),
      declarationIds: new Map(),
      currentVariableIds: new Map()
    };
  }
  function lookupLocalId(identifier, environment) {
    if (environment.currentVariableIds.has(identifier)) {
      return environment.currentVariableIds.get(identifier);
    }
    if (environment.parent) {
      return lookupLocalId(identifier, environment.parent);
    }
    throw new Error(`Internal error: could not find alias for ${identifier}`);
  }

  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/Assert.ts
  function assert(condition, errorMessage) {
    if (!condition) {
      throw new Error(`Internal error: ${errorMessage ?? "unspecified"}`);
    }
  }

  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/generator/WasmType.ts
  function getWasmType(sourceType) {
    if (sourceType.kind === "pointer") {
      return "i32";
    }
    switch (sourceType.value) {
      case "i32":
      case "u32":
        return "i32";
      case "f32":
        return "f32";
      case "i64":
      case "u64":
        return "i64";
      case "f64":
        return "f64";
    }
  }

  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/generator/ExpressionGenerator.ts
  function generateExpression(expression, environment) {
    switch (expression.kind) {
      case "numeric":
        return generateNumericExpression(expression, environment);
      case "identifier":
        return generateIdentifierExpression(expression, environment);
      case "composite":
        return generateExpression(expression.value, environment);
      case "unaryOperator":
        return generateUnaryOperatorExpression(expression, environment);
      case "binaryOperator":
        return generateBinaryOperatorExpression(expression, environment);
      case "functionCall":
        return generateFunctionCallExpression(expression, environment);
      case "typeConversion":
        return generateTypeConversionExpression(expression, environment);
    }
  }
  function generateNumericExpression(expression, _environment) {
    const wasmType = getWasmType(expression.resultType);
    return `${wasmType}.const ${expression.value}`;
  }
  function generateIdentifierExpression(expression, environment) {
    const identifierId = lookupLocalId(expression.identifier, environment);
    return `local.get ${identifierId}`;
  }
  function generateUnaryOperatorExpression(expression, environment) {
    switch (expression.operator) {
      case "-":
        return generateUnaryMinusExpression(expression, environment);
      case "@":
        return generateDereferenceExpression(expression, environment);
      case "!":
        return generateLogicalNotExpression(expression, environment);
    }
  }
  function generateUnaryMinusExpression(expression, environment) {
    assert(expression.operator === "-", "generating unary minus expression with incorrect expression");
    assert(expression.value.resultType.kind !== "void", "trying to apply unary minus to void");
    const wasmType = getWasmType(expression.value.resultType);
    const zero = `${wasmType}.const 0`;
    const valueCalculation = generateExpression(expression.value, environment);
    const operation = `${wasmType}.sub`;
    return [zero, valueCalculation, operation].join("\n");
  }
  function generateDereferenceExpression(expression, environment) {
    assert(expression.operator === "@", "generating dereference expression with incorrect expression");
    assert(expression.value.resultType.kind !== "void", "trying to apply dereference to void");
    const valueCalculation = generateExpression(expression.value, environment);
    const wasmResultType = getWasmType(expression.resultType);
    return [
      valueCalculation,
      `${wasmResultType}.load`
    ].join("\n");
  }
  function generateLogicalNotExpression(expression, environment) {
    assert(expression.operator === "!", "generating unary minus expression with incorrect expression");
    assert(expression.value.resultType.kind === "basic" && expression.value.resultType.value === "i32", "trying to apply logical not to a non-boolean");
    const valueCalculation = generateExpression(expression.value, environment);
    return [valueCalculation, "i32.eqz"].join("\n");
  }
  function generateBinaryOperatorExpression(expression, environment) {
    if (expression.operator === "=") {
      if (expression.left.kind === "identifier") {
        return generateVariableAssignmentExpression(expression, environment);
      }
      if (expression.left.kind === "unaryOperator" && expression.left.operator === "@") {
        return generatePointerAssignmentExpression(expression, environment);
      }
      assert(false, "assignment to something other than a variable or a pointer");
    }
    assert(expression.operator !== "->", "Type conversion operator is handled separately from other operators");
    assert(expression.left.resultType.kind !== "void" && expression.right.resultType.kind !== "void", "void operand type");
    const leftCalculation = generateExpression(expression.left, environment);
    const rightCalculation = generateExpression(expression.right, environment);
    const operandWasmType = getWasmType(expression.left.resultType);
    const isInteger = operandWasmType === "i32" || operandWasmType === "i64";
    const isSigned = expression.left.resultType.value === "i32" || expression.left.resultType.value === "i64";
    const binaryOperationsMapping = {
      "=": "",
      "->": "",
      "+": "add",
      "-": "sub",
      "*": "mul",
      "/": getOperatorForType("div", isInteger, isSigned),
      "&": "and",
      "|": "or",
      "==": "eq",
      "!=": "ne",
      "^": "xor",
      "<<": "shl",
      ">>": getOperatorForType("shr", isInteger, isSigned),
      "<": getOperatorForType("lt", isInteger, isSigned),
      ">": getOperatorForType("gt", isInteger, isSigned),
      "<=": getOperatorForType("le", isInteger, isSigned),
      ">=": getOperatorForType("ge", isInteger, isSigned)
    };
    const operation = `${operandWasmType}.${binaryOperationsMapping[expression.operator]}`;
    return [leftCalculation, rightCalculation, operation].join("\n");
  }
  function getOperatorForType(operator, isInteger, isSigned) {
    if (!isInteger) {
      return operator;
    }
    return `${operator}_${isSigned ? "s" : "u"}`;
  }
  function generateVariableAssignmentExpression(expression, environment) {
    assert(expression.left.kind === "identifier", "variable assignment with non-identifier left part");
    const variableId = lookupLocalId(expression.left.identifier, environment);
    const assignedValueCalculation = generateExpression(expression.right, environment);
    return [
      assignedValueCalculation,
      `local.set ${variableId}`
    ].join("\n");
  }
  function generatePointerAssignmentExpression(expression, environment) {
    assert(expression.left.kind === "unaryOperator", "pointer assignment with non-unary expression left part");
    assert(expression.left.operator === "@", "pointer assignment with incorrect unary operator");
    assert(expression.right.resultType.kind !== "void", "assigning void to pointer");
    const addressCalculation = generateExpression(expression.left.value, environment);
    const valueCalculation = generateExpression(expression.right, environment);
    const valueWasmType = getWasmType(expression.right.resultType);
    return [
      addressCalculation,
      valueCalculation,
      `${valueWasmType}.store`
    ].join("\n");
  }
  function generateFunctionCallExpression(expression, environment) {
    const argumentCalculations = expression.argumentValues.map((argument) => {
      return generateExpression(argument, environment);
    });
    return [...argumentCalculations, `call $${expression.functionIdentifier}`].join("\n");
  }
  function generateTypeConversionExpression(expression, environment) {
    const valueToConvertCalculation = generateExpression(expression.valueToConvert, environment);
    assert(expression.valueToConvert.resultType.kind !== "void", "trying to convert void expression");
    let fromType;
    if (expression.valueToConvert.resultType.kind === "basic") {
      fromType = expression.valueToConvert.resultType.value;
    } else {
      fromType = "i32";
    }
    let toType;
    if (expression.resultType.kind === "basic") {
      toType = expression.resultType.value;
    } else {
      toType = "i32";
    }
    const operation = getTypeConversionOperation(fromType, toType);
    if (operation === "nop") {
      return valueToConvertCalculation;
    }
    return [valueToConvertCalculation, operation].join("\n");
  }
  function getTypeConversionOperation(from, to) {
    const conversionTable = {
      "i32-i32": "nop",
      "i32-u32": "nop",
      "i32-f32": "f32.convert_i32_s",
      "i32-i64": "i64.extend_i32_s",
      "i32-u64": "i64.extend_i32_u",
      "i32-f64": "f64.convert_i32_s",
      "u32-i32": "nop",
      "u32-u32": "nop",
      "u32-f32": "f32.convert_i32_u",
      "u32-i64": "i64.extend_i32_u",
      "u32-u64": "i64.extend_i32_u",
      "u32-f64": "f64.convert_i32_u",
      "f32-i32": "i32.trunc_f32_s",
      "f32-u32": "i32.trunc_f32_u",
      "f32-f32": "nop",
      "f32-i64": "i64.trunc_f32_s",
      "f32-u64": "i64.trunc_f32_u",
      "f32-f64": "f64.promote_f32",
      "i64-i32": "i32.wrap_i64",
      "i64-u32": "i32.wrap_i64",
      "i64-f32": "f32.convert_i64_s",
      "i64-i64": "nop",
      "i64-u64": "nop",
      "i64-f64": "f64.convert_i64_s",
      "u64-i32": "i32.wrap_i64",
      "u64-u32": "i32.wrap_i64",
      "u64-f32": "f32.convert_i64_u",
      "u64-i64": "nop",
      "u64-u64": "nop",
      "u64-f64": "f64.convert_i64_u",
      "f64-i32": "i32.trunc_f64_s",
      "f64-u32": "i32.trunc_f64_u",
      "f64-f32": "f32.demote_f64",
      "f64-i64": "i64.trunc_f64_s",
      "f64-u64": "i64.trunc_f64_u",
      "f64-f64": "nop"
    };
    return conversionTable[`${from}-${to}`];
  }

  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/generator/StatementGenerator.ts
  function generateStatement(statement, environment) {
    switch (statement.kind) {
      case "variableDeclaration":
        return generateVariableDeclaration(statement, environment);
      case "return":
        return generateReturnStatement(statement, environment);
      case "expression":
        return generateExpressionStatement(statement, environment);
      case "conditional":
        return generateConditionalStatement(statement, environment);
      case "loop":
        return generateLoopStatement(statement, environment);
    }
  }
  function generateVariableDeclaration(statement, environment) {
    const initialValueCalculation = generateExpression(statement.value, environment);
    const newVariableId = environment.declarationIds.get(statement);
    if (newVariableId === void 0) {
      throw new Error(`Internal error: could not find the new id for ${statement.variableIdentifier}`);
    }
    environment.currentVariableIds.set(statement.variableIdentifier, newVariableId);
    return [
      initialValueCalculation,
      `local.set ${newVariableId}`
    ].join("\n");
  }
  function generateReturnStatement(statement, environment) {
    if (statement.value === null) {
      return "return";
    }
    const returnValueCalculation = generateExpression(statement.value, environment);
    return [
      returnValueCalculation,
      "return"
    ].join("\n");
  }
  function generateExpressionStatement(statement, environment) {
    const calculation = generateExpression(statement.value, environment);
    const result = [calculation];
    if (statement.value.resultType.kind !== "void") {
      result.push("drop");
    }
    return result.join("\n");
  }
  function generateConditionalStatement(statement, environment) {
    const innerEnvironment = environment.children.get(statement);
    if (innerEnvironment === void 0) {
      throw new Error(`Internal error: could not find correct inner environment`);
    }
    const children = [];
    children.push(generateExpression(statement.condition, environment));
    children.push("i32.eqz");
    children.push("br_if 0");
    children.push(...statement.body.map((statement2) => generateStatement(statement2, innerEnvironment)));
    return sExpression("block", children.join("\n"));
  }
  function generateLoopStatement(statement, environment) {
    const innerEnvironment = environment.children.get(statement);
    if (innerEnvironment === void 0) {
      throw new Error(`Internal error: could not find correct inner environment`);
    }
    const children = [];
    children.push(generateExpression(statement.condition, environment));
    children.push("i32.eqz");
    children.push("br_if 1");
    children.push(...statement.body.map((statement2) => generateStatement(statement2, innerEnvironment)));
    children.push("br 0");
    return sExpression("block", sExpression("loop", children.join("\n")));
  }

  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/generator/Generator.ts
  function generate(module) {
    return generateModule(module);
  }
  function generateModule(module) {
    const children = [...module.funcs];
    if (module.memory !== void 0) {
      children.push(module.memory);
    }
    children.sort((left, right) => {
      const leftPriority = left.kind === "import" ? -1 : 0;
      const rightPriority = right.kind === "import" ? -1 : 0;
      return leftPriority - rightPriority;
    });
    const generatedChildren = children.map((child) => child === module.memory ? generateMemory(child) : generateFunc(child));
    return sExpression("module", ...generatedChildren);
  }
  function generateMemory(memory) {
    switch (memory.kind) {
      case "plain":
        return sExpressionOneLine("memory", String(memory.size));
      case "export":
        return sExpressionOneLine("memory", sExpressionOneLine("export", `"${memory.exportName}"`), String(memory.size));
      case "import":
        return sExpressionOneLine("import", `"${memory.importLocation[0]}"`, `"${memory.importLocation[1]}"`, sExpressionOneLine("memory", String(memory.size)));
    }
  }
  function generateFunc(func) {
    switch (func.kind) {
      case "plain":
      case "export":
        return generatePlainOrExportFunc(func);
      case "import":
        return generateImportFunc(func);
    }
  }
  function generatePlainOrExportFunc(func) {
    const children = [];
    children.push(...generateFunctionSignature(func.signature, func.kind === "export"));
    const [environment, idTypeMapping] = buildEnvironment(func);
    for (const [id, type] of idTypeMapping) {
      if (id < func.signature.parameters.length) {
        continue;
      }
      children.push(generateVariable(type));
    }
    children.push(...func.body.map((statement) => generateStatement(statement, environment)));
    return sExpression("func", ...children);
  }
  function generateImportFunc(func) {
    const [namespace, specifier] = func.importLocation;
    return sExpression("import", `"${namespace}"`, `"${specifier}"`, sExpression("func", ...generateFunctionSignature(func.signature)));
  }
  function generateFunctionSignature(signature, isExport = false) {
    const result = [];
    result.push(`$${signature.name}`);
    if (isExport) {
      result.push(sExpressionOneLine("export", `"${signature.name}"`));
    }
    result.push(...signature.parameters.map(generateParameter));
    if (signature.type.kind !== "void") {
      result.push(sExpressionOneLine("result", getWasmType(signature.type)));
    }
    return result;
  }
  function generateParameter(arg) {
    const wasmType = getWasmType(arg.type);
    return sExpressionOneLine("param", wasmType);
  }
  function generateVariable(type) {
    const wasmType = getWasmType(type);
    return sExpressionOneLine("local", wasmType);
  }
  function sExpression(nodeType, ...children) {
    return `(${nodeType}
${children.map(pad).join("\n")}
)`;
  }
  function sExpressionOneLine(nodeType, ...children) {
    return `(${nodeType} ${children.join(" ")})`;
  }
  function pad(something) {
    return something.split("\n").map((part) => `  ${part}`).join("\n");
  }

  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/lexer/Operators.ts
  var UnaryOperators = [
    "-",
    "@",
    "!"
  ];
  var ShiftOperators = [
    "<<",
    ">>"
  ];
  var LogicalOperators = [
    "|",
    "&",
    "^"
  ];
  var BinaryOperators = [
    ...ShiftOperators,
    ...LogicalOperators,
    "->",
    "->",
    "==",
    "!=",
    ">=",
    "<=",
    ">",
    "<",
    "=",
    "+",
    "-",
    "*",
    "/"
  ];
  var Operators = [...BinaryOperators, ...UnaryOperators];

  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/lexer/Specials.ts
  var Specials = [
    ";",
    ",",
    "{",
    "}",
    "(",
    ")",
    "::",
    ":",
    "$"
  ];

  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/lexer/Keywords.ts
  var Keywords = [
    "func",
    "var",
    "const",
    "if",
    "elif",
    "else",
    "while",
    "return",
    "as",
    "import",
    "export",
    "memory"
  ];

  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/lexer/BasicTypes.ts
  var SignedIntegerTypes = [
    "i32",
    "i64"
  ];
  var UnsignedIntegerTypes = [
    "u32",
    "u64"
  ];
  var IntegerTypes = [
    ...SignedIntegerTypes,
    ...UnsignedIntegerTypes
  ];
  var FloatingPointTypes = [
    "f32",
    "f64"
  ];
  var NonVoidBasicTypes = [
    ...IntegerTypes,
    ...FloatingPointTypes
  ];
  var Void = "void";
  var BasicTypes = [
    ...NonVoidBasicTypes,
    Void
  ];

  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/lexer/LexerError.ts
  var LexerError = class extends Error {
    constructor(message, failingPosition) {
      super(`${message} Position: line ${failingPosition.line}, col ${failingPosition.colStart}`);
      this.failingPosition = failingPosition;
    }
  };

  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/lexer/Token.ts
  function createToken(line, lineIndex, start, end) {
    const tokenValue = line.slice(start, end);
    const position = getTokenPosition(lineIndex, start, end);
    let content;
    try {
      content = getTokenContent(tokenValue);
    } catch (error) {
      throw new LexerError(error.message, position);
    }
    return {
      ...content,
      position
    };
  }
  function getTokenContent(tokenValue) {
    if (Specials.includes(tokenValue)) {
      return {
        type: "special",
        value: tokenValue
      };
    }
    if (Keywords.includes(tokenValue)) {
      return {
        type: "keyword",
        value: tokenValue
      };
    }
    if (Operators.includes(tokenValue)) {
      return {
        type: "operator",
        value: tokenValue
      };
    }
    if (BasicTypes.includes(tokenValue)) {
      return {
        type: "basicType",
        value: tokenValue
      };
    }
    if (isDigit(tokenValue[0])) {
      return parseNumericToken(tokenValue);
    }
    validateIdentifier(tokenValue);
    return {
      type: "identifier",
      value: tokenValue
    };
  }
  function parseNumericToken(tokenValue) {
    let isFloat = false;
    let isUnsigned = false;
    let isLong = false;
    let resultingLiteral = "";
    if (!isDigit(tokenValue[0])) {
      throw new Error(`Internal error: numeric token ${tokenValue} starts with a non-digit`);
    }
    for (const char of tokenValue) {
      if (isDigit(char)) {
        if (isUnsigned || isLong) {
          throw new Error(`Digits found after type marks: ${tokenValue}`);
        }
        resultingLiteral = resultingLiteral + char;
        continue;
      }
      if (char === ".") {
        if (isUnsigned || isLong) {
          throw new Error(`Digits found after type marks: ${tokenValue}`);
        }
        if (isFloat) {
          throw new Error(`Duplicate fractional part found in numeric literal: ${tokenValue}`);
        }
        isFloat = true;
        resultingLiteral = resultingLiteral + char;
        continue;
      }
      if (char === "u") {
        isUnsigned = true;
        continue;
      }
      if (char === "l") {
        isLong = true;
        continue;
      }
      throw new Error(`Numeric literals contains invalid characters: ${tokenValue}`);
    }
    let resultType = getNumericLiteralType(isFloat, isUnsigned, isLong);
    if (resultingLiteral.endsWith(".")) {
      resultingLiteral = resultingLiteral.slice(0, resultingLiteral.length - 1);
    }
    return {
      type: "number",
      resultType,
      value: tokenValue,
      numericValue: resultingLiteral
    };
  }
  function isDigit(tokenValue) {
    return tokenValue[0] >= "0" && tokenValue[0] <= "9";
  }
  function getNumericLiteralType(isFloat, isUnsigned, isLong) {
    if (isFloat && isUnsigned) {
      throw new Error(`Float values cannot be unsigned`);
    }
    if (isFloat) {
      return isLong ? "f64" : "f32";
    }
    if (isUnsigned) {
      return isLong ? "u64" : "u32";
    }
    return isLong ? "i64" : "i32";
  }
  function validateIdentifier(identifier) {
    if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
      throw new Error(`Invalid identifier. Should only contain letters, digits and '_': ${identifier}`);
    }
  }
  function getTokenPosition(lineIndex, start, end) {
    return {
      line: lineIndex + 1,
      colStart: start + 1,
      colEnd: end + 1
    };
  }

  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/lexer/Whitespace.ts
  var Whitespace = [
    " ",
    "\n",
    "\r",
    "	"
  ];

  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/lexer/Lexer.ts
  function lex(source) {
    const lines = source.split("\n");
    const linesWithoutComments = lines.map((line) => removeComments(line));
    return linesWithoutComments.map(lexLine).flat();
  }
  function removeComments(line) {
    if (!line.includes("//")) {
      return line;
    }
    return line.slice(0, line.indexOf("//")).trim();
  }
  function lexLine(line, lineIndex) {
    const separators = [...Whitespace, ...Operators, ...Specials];
    const result = [];
    let start = 0;
    let cur = 0;
    while (cur < line.length) {
      const slice = line.slice(cur);
      const separator = separators.find((separator2) => slice.startsWith(separator2));
      if (separator === void 0) {
        cur += 1;
        continue;
      }
      if (start !== cur) {
        result.push(createToken(line, lineIndex, start, cur));
      }
      if (!Whitespace.includes(separator)) {
        const separatorStart = cur;
        const separatorEnd = cur + separator.length;
        result.push(createToken(line, lineIndex, separatorStart, separatorEnd));
      }
      cur += separator.length;
      start = cur;
    }
    if (start !== line.length) {
      result.push(createToken(line, lineIndex, start, line.length));
    }
    return result;
  }

  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/parser/Expect.ts
  function expect(token, value) {
    if (token.value !== value) {
      throwTokenError(token, `Unexpected token: ${token.value}. Expected: ${value}.`);
    }
  }
  function expectType(token, type) {
    if (token.type !== type) {
      throwTokenError(token, `Unexpected token type: ${token.type}. Expected: ${type}.`);
    }
    return token.value;
  }
  function throwTokenError(token, message) {
    throw new Error(`${message} Position: line ${token.position.line}, col ${token.position.colStart}.`);
  }

  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/parser/TypeParser.ts
  function parseType(tokens) {
    if (tokens.peekNext().value === "void") {
      tokens.next();
      return {
        kind: "void"
      };
    }
    return parseNonVoidType(tokens);
  }
  function parseNonVoidType(tokens) {
    const nextToken = tokens.next();
    if (nextToken.value === "$") {
      return {
        kind: "pointer",
        value: parseNonVoidType(tokens)
      };
    }
    if (nextToken.type !== "basicType") {
      throw new Error(`Could not parse type descriptor: expected type, received ${nextToken.value}`);
    }
    if (nextToken.value === "void") {
      throw new Error(`Could not parse type descriptor: expected non-void type, received void`);
    }
    return {
      kind: "basic",
      value: nextToken.value
    };
  }

  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/parser/ExpressionParser.ts
  var operatorPrecenenceMap = {
    "=": 0,
    "|": 1,
    "^": 2,
    "&": 3,
    "<<": 4,
    ">>": 4,
    "==": 5,
    "!=": 5,
    "<": 6,
    "<=": 6,
    ">": 6,
    ">=": 6,
    "+": 7,
    "-": 7,
    "*": 8,
    "/": 8,
    "->": 9
  };
  var possiblePrecedenceLevels = [
    ...new Set(Object.values(operatorPrecenenceMap))
  ];
  var operatorPrecenence = possiblePrecedenceLevels.map((precedence) => {
    return BinaryOperators.filter((operator) => operatorPrecenenceMap[operator] === precedence);
  });
  function parseExpression(tokens) {
    const expressionParseResult = parseExpressionInner(tokens);
    if (expressionParseResult.error) {
      const failingToken = expressionParseResult.failingToken;
      throw new Error(`Expression parse error: unexpected token ${failingToken.value}. Line ${failingToken.position.line}, col ${failingToken.position.colStart}.`);
    }
    while (tokens.peekNext() !== expressionParseResult.tokensAfter.peekNext()) {
      tokens.next();
    }
    return expressionParseResult.expression;
  }
  function parseExpressionInner(tokens, level = 0) {
    const tokensClone = tokens.clone();
    if (level === operatorPrecenence.length) {
      const firstToken = tokensClone.next();
      if (firstToken.type === "number") {
        const expression = {
          kind: "numeric",
          literalType: {
            kind: "basic",
            value: firstToken.resultType
          },
          value: firstToken.numericValue,
          position: {
            start: firstToken.position,
            end: firstToken.position
          }
        };
        return {
          error: false,
          expression,
          tokensAfter: tokensClone,
          lastToken: firstToken
        };
      }
      if (firstToken.type === "identifier") {
        const secondToken = tokensClone.peekNext();
        if (secondToken.value === "(") {
          tokensClone.next();
          const argumentValues = [];
          while (true) {
            if (tokensClone.peekNext().value === ")") {
              break;
            }
            argumentValues.push(parseExpression(tokensClone));
            if (tokensClone.peekNext().value === ",") {
              tokensClone.next();
            }
          }
          const closingParethesis = tokensClone.next();
          expect(closingParethesis, ")");
          const expression2 = {
            kind: "functionCall",
            functionIdentifier: firstToken.value,
            argumentValues,
            position: {
              start: firstToken.position,
              end: closingParethesis.position
            }
          };
          return {
            error: false,
            expression: expression2,
            tokensAfter: tokensClone,
            lastToken: closingParethesis
          };
        }
        const expression = {
          kind: "identifier",
          identifier: firstToken.value,
          position: {
            start: firstToken.position,
            end: firstToken.position
          }
        };
        return {
          error: false,
          expression,
          tokensAfter: tokensClone,
          lastToken: firstToken
        };
      }
      if (firstToken.value === "(") {
        const innerExpressionParsingResult = parseExpressionInner(tokensClone);
        if (innerExpressionParsingResult.error) {
          return innerExpressionParsingResult;
        }
        const closingParethesis = innerExpressionParsingResult.tokensAfter.next();
        expect(closingParethesis, ")");
        const expression = {
          kind: "composite",
          value: innerExpressionParsingResult.expression,
          position: {
            start: firstToken.position,
            end: closingParethesis.position
          }
        };
        return {
          error: false,
          expression,
          tokensAfter: innerExpressionParsingResult.tokensAfter,
          lastToken: closingParethesis
        };
      }
      if (firstToken.type === "operator" && UnaryOperators.includes(firstToken.value)) {
        const innerExpressionParsingResult = parseExpressionInner(tokensClone, operatorPrecenence.length);
        if (innerExpressionParsingResult.error) {
          return innerExpressionParsingResult;
        }
        const expression = {
          kind: "unaryOperator",
          operator: firstToken.value,
          value: innerExpressionParsingResult.expression,
          position: {
            start: firstToken.position,
            end: innerExpressionParsingResult.lastToken.position
          }
        };
        return {
          error: false,
          expression,
          tokensAfter: innerExpressionParsingResult.tokensAfter,
          lastToken: innerExpressionParsingResult.lastToken
        };
      }
      return { error: true, failingToken: firstToken };
    }
    const leftmost = parseExpressionInner(tokens, level + 1);
    if (leftmost.error) {
      return leftmost;
    }
    let result = leftmost;
    while (true) {
      const nextToken = result.tokensAfter.peekNext();
      if (!operatorPrecenence[level].includes(nextToken.value)) {
        if (!BinaryOperators.includes(nextToken.value)) {
          return result;
        }
        return result;
      }
      if (nextToken.value === "->") {
        result.tokensAfter.next();
        const resultType = parseNonVoidType(result.tokensAfter);
        const expression2 = {
          kind: "typeConversion",
          valueToConvert: result.expression,
          resultType,
          position: {
            start: leftmost.expression.position.start,
            end: result.tokensAfter.peekPrev().position
          }
        };
        result = {
          error: false,
          expression: expression2,
          tokensAfter: result.tokensAfter,
          lastToken: result.tokensAfter.peekPrev()
        };
        continue;
      }
      const tokensAfter = result.tokensAfter;
      const operator = expectType(tokensAfter.next(), "operator");
      const nextPart = parseExpressionInner(tokensAfter, level + 1);
      if (nextPart.error) {
        return nextPart;
      }
      const expression = {
        kind: "binaryOperator",
        left: result.expression,
        right: nextPart.expression,
        operator,
        position: {
          start: leftmost.expression.position.start,
          end: nextPart.lastToken.position
        }
      };
      result = {
        error: false,
        expression,
        tokensAfter: nextPart.tokensAfter,
        lastToken: nextPart.lastToken
      };
    }
  }

  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/parser/StatementParser.ts
  function parseStatement(tokens) {
    const firstToken = tokens.peekNext();
    if (firstToken.value === "if") {
      return parseConditionalStatement(tokens);
    }
    if (firstToken.value === "while") {
      return parseLoopStatement(tokens);
    }
    if (firstToken.value === "var" || firstToken.value === "const") {
      return parseVariableDeclarationStatement(tokens);
    }
    if (firstToken.value === "return") {
      return parseReturnStatement(tokens);
    }
    return parseExpressionStatement(tokens);
  }
  function parseConditionalStatement(tokens) {
    const ifToken = tokens.next();
    expect(ifToken, "if");
    expect(tokens.next(), "(");
    const condition = parseExpression(tokens);
    expect(tokens.next(), ")");
    expect(tokens.next(), "{");
    const body = [];
    while (tokens.peekNext().value !== "}") {
      body.push(parseStatement(tokens));
    }
    const closingBracket = tokens.next();
    expect(closingBracket, "}");
    return {
      kind: "conditional",
      condition,
      body,
      position: {
        start: ifToken.position,
        end: closingBracket.position
      }
    };
  }
  function parseLoopStatement(tokens) {
    const whileToken = tokens.next();
    expect(whileToken, "while");
    expect(tokens.next(), "(");
    const condition = parseExpression(tokens);
    expect(tokens.next(), ")");
    expect(tokens.next(), "{");
    const body = [];
    while (tokens.peekNext().value !== "}") {
      body.push(parseStatement(tokens));
    }
    const closingBracket = tokens.next();
    expect(closingBracket, "}");
    return {
      kind: "loop",
      condition,
      body,
      position: {
        start: whileToken.position,
        end: closingBracket.position
      }
    };
  }
  function parseVariableDeclarationStatement(tokens) {
    const firstToken = tokens.next();
    if (firstToken.value !== "var" && firstToken.value !== "const") {
      throw new Error(`Unexpected token at the start of the variable declaration: ${firstToken}. Position: line ${firstToken.position.line}, col ${firstToken.position.colStart}.`);
    }
    const variableIdentifier = expectType(tokens.next(), "identifier");
    expect(tokens.next(), ":");
    const variableType = parseNonVoidType(tokens);
    expect(tokens.next(), "=");
    const value = parseExpression(tokens);
    const terminator = tokens.next();
    expect(terminator, ";");
    return {
      kind: "variableDeclaration",
      variableIdentifier,
      variableType,
      variableKind: firstToken.value === "var" ? "variable" : "constant",
      value,
      position: {
        start: firstToken.position,
        end: terminator.position
      }
    };
  }
  function parseReturnStatement(tokens) {
    const returnToken = tokens.next();
    expect(returnToken, "return");
    const returnValue = tokens.peekNext().value === ";" ? null : parseExpression(tokens);
    const terminator = tokens.next();
    expect(terminator, ";");
    return {
      kind: "return",
      value: returnValue,
      position: {
        start: returnToken.position,
        end: terminator.position
      }
    };
  }
  function parseExpressionStatement(tokens) {
    const value = parseExpression(tokens);
    const terminator = tokens.next();
    expect(terminator, ";");
    return {
      kind: "expression",
      value,
      position: {
        start: value.position.start,
        end: terminator.position
      }
    };
  }

  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/parser/Parser.ts
  function parse(tokens) {
    return parseModule(tokens);
  }
  function parseModule(tokens) {
    const funcs = [];
    const memories = [];
    while (tokens.hasNext()) {
      const firstToken = tokens.peekNext();
      switch (firstToken.value) {
        case "func":
          funcs.push(parseFunction(tokens));
          break;
        case "memory":
          memories.push(parseMemory(tokens));
          break;
        default:
          throw new Error(`Unexpected token: ${firstToken.value}.`);
      }
    }
    return {
      funcs,
      memories
    };
  }
  function parseFunction(tokens) {
    const secondToken = tokens.peekNext(1);
    switch (secondToken.value) {
      case "export":
        return parseExportFunction(tokens);
      case "import":
        return parseImportFunction(tokens);
      default:
        return parsePlainFunction(tokens);
    }
  }
  function parsePlainFunction(tokens) {
    const firstToken = tokens.next();
    expect(firstToken, "func");
    const signature = parseFunctionSignature(tokens);
    const body = parseFunctionBody(tokens);
    const lastToken = tokens.peekPrev();
    return {
      kind: "plain",
      body,
      signature,
      position: {
        start: firstToken.position,
        end: lastToken.position
      }
    };
  }
  function parseExportFunction(tokens) {
    const firstToken = tokens.next();
    expect(firstToken, "func");
    const secondToken = tokens.next();
    expect(secondToken, "export");
    const signature = parseFunctionSignature(tokens);
    const body = parseFunctionBody(tokens);
    const lastToken = tokens.peekPrev();
    return {
      kind: "export",
      body,
      signature,
      position: {
        start: firstToken.position,
        end: lastToken.position
      }
    };
  }
  function parseImportFunction(tokens) {
    const firstToken = tokens.next();
    expect(firstToken, "func");
    const importLocation = parseImportLocation(tokens);
    const signature = parseFunctionSignature(tokens);
    const lastToken = tokens.next();
    expect(lastToken, ";");
    return {
      kind: "import",
      importLocation,
      signature,
      position: {
        start: firstToken.position,
        end: lastToken.position
      }
    };
  }
  function parseFunctionSignature(tokens) {
    const name = expectType(tokens.next(), "identifier");
    expect(tokens.next(), "(");
    const parameters = [];
    while (tokens.peekNext().value !== ")") {
      parameters.push(parseParameterDeclaration(tokens));
    }
    expect(tokens.next(), ")");
    expect(tokens.next(), ":");
    const type = parseType(tokens);
    return {
      name,
      type,
      parameters
    };
  }
  function parseFunctionBody(tokens) {
    expect(tokens.next(), "{");
    const statements = [];
    while (tokens.peekNext().value !== "}") {
      statements.push(parseStatement(tokens));
    }
    const closingBracket = tokens.next();
    expect(closingBracket, "}");
    return statements;
  }
  function parseParameterDeclaration(tokens) {
    const firstToken = tokens.next();
    expectType(firstToken, "identifier");
    const name = firstToken.value;
    expect(tokens.next(), ":");
    const type = parseNonVoidType(tokens);
    if (tokens.peekNext().value === ",") {
      tokens.next();
    }
    return {
      name,
      type,
      position: {
        start: firstToken.position,
        end: firstToken.position
      }
    };
  }
  function parseMemory(tokens) {
    const firstToken = tokens.next();
    expect(firstToken, "memory");
    expect(tokens.next(), "(");
    const memorySizeToken = tokens.next();
    if (memorySizeToken.type !== "number" || memorySizeToken.resultType !== "u32") {
      throw new Error(`Invalid memory size: ${memorySizeToken.value}. Expected u32.`);
    }
    const memorySize = Number(memorySizeToken.numericValue);
    expect(tokens.next(), ")");
    switch (tokens.peekNext().value) {
      case ";": {
        const terminatorToken = tokens.next();
        return {
          kind: "plain",
          size: memorySize,
          position: {
            start: firstToken.position,
            end: terminatorToken.position
          }
        };
      }
      case "export": {
        tokens.next();
        expect(tokens.next(), "(");
        const exportName = expectType(tokens.next(), "identifier");
        expect(tokens.next(), ")");
        const terminatorToken = tokens.next();
        expect(terminatorToken, ";");
        return {
          kind: "export",
          size: memorySize,
          exportName,
          position: {
            start: firstToken.position,
            end: terminatorToken.position
          }
        };
      }
      case "import": {
        const importLocation = parseImportLocation(tokens);
        const terminatorToken = tokens.next();
        expect(terminatorToken, ";");
        return {
          kind: "import",
          size: memorySize,
          importLocation,
          position: {
            start: firstToken.position,
            end: terminatorToken.position
          }
        };
      }
      default:
        throw new Error(`Unexpected memory type token: ${tokens.peekNext().value}`);
    }
  }
  function parseImportLocation(tokens) {
    expect(tokens.next(), "import");
    expect(tokens.next(), "(");
    const namespace = expectType(tokens.next(), "identifier");
    expect(tokens.next(), "::");
    const specifier = expectType(tokens.next(), "identifier");
    expect(tokens.next(), ")");
    return [namespace, specifier];
  }

  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/validator/Environment.ts
  function createEmptyEnvironment2(parent) {
    return {
      parent,
      variablesAndParameters: new Map()
    };
  }
  function lookupVariableOrParameter(name, environment) {
    const result = environment.variablesAndParameters.get(name);
    if (result !== void 0) {
      return result;
    }
    if (environment.parent !== void 0) {
      return lookupVariableOrParameter(name, environment.parent);
    }
    return null;
  }

  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/ast/Type.ts
  function isSameType(a, b) {
    if (a.kind !== b.kind) {
      return false;
    }
    if (a.kind === "void" && b.kind === "void") {
      return true;
    }
    if (a.kind === "basic" && b.kind === "basic") {
      return a.value === b.value;
    }
    return isSameType(a.value, b.value);
  }
  function stringifyType(type) {
    if (type.kind === "void") {
      return "void";
    }
    if (type.kind === "basic") {
      return type.value;
    }
    return `&${stringifyType(type.value)}`;
  }

  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/validator/ValidationError.ts
  var ValidationError = class extends Error {
    constructor(message, failReason) {
      super(`${message} Position: line ${failReason.position.start.line}, col ${failReason.position.start.colStart}`);
      this.failReason = failReason;
    }
  };

  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/validator/ExpressionValidator.ts
  function validateExpression(expression, environment, funcs) {
    switch (expression.kind) {
      case "numeric":
        return validateNumericExpression(expression);
      case "identifier":
        return validateIdentifierExpression(expression, environment);
      case "composite":
        return validateExpression(expression.value, environment, funcs);
      case "functionCall":
        return validateFunctionCallException(expression, environment, funcs);
      case "unaryOperator":
        return validateUnaryOperatorExpression(expression, environment, funcs);
      case "binaryOperator":
        return validateBinaryOperatorExpression(expression, environment, funcs);
      case "typeConversion":
        return validateTypeConversionExpression(expression, environment, funcs);
    }
  }
  function validateNumericExpression(expression) {
    return {
      ...expression,
      resultType: expression.literalType
    };
  }
  function validateIdentifierExpression(expression, environment) {
    const lookupResult = lookupVariableOrParameter(expression.identifier, environment);
    if (lookupResult === null) {
      throw new ValidationError(`Unknown identifier: ${expression.identifier}`, expression);
    }
    return {
      ...expression,
      resultType: lookupResult.type
    };
  }
  function validateFunctionCallException(expression, environment, funcs) {
    if (!funcs.has(expression.functionIdentifier)) {
      throw new ValidationError(`Unknown function: ${expression.functionIdentifier}`, expression);
    }
    const func = funcs.get(expression.functionIdentifier);
    if (func.signature.parameters.length !== expression.argumentValues.length) {
      throw new ValidationError(`Function ${func.signature.name} expects exactly ${func.signature.parameters.length} arguments. Provided ${expression.argumentValues.length}`, expression);
    }
    const typedArgumentValues = [];
    for (let i = 0; i < expression.argumentValues.length; i += 1) {
      const argumentValue = expression.argumentValues[i];
      const argumentValueValidationResult = validateExpression(argumentValue, environment, funcs);
      const parameterDescriptor = func.signature.parameters[i];
      if (!isSameType(argumentValueValidationResult.resultType, parameterDescriptor.type)) {
        throw new ValidationError(`Expected argument of type ${stringifyType(parameterDescriptor.type)}, received ${stringifyType(argumentValueValidationResult.resultType)}`, argumentValue);
      }
      typedArgumentValues.push(argumentValueValidationResult);
    }
    return {
      ...expression,
      argumentValues: typedArgumentValues,
      resultType: func.signature.type
    };
  }
  function validateUnaryOperatorExpression(expression, environment, funcs) {
    switch (expression.operator) {
      case "-":
        return validateUnaryMinusExpression(expression, environment, funcs);
      case "@":
        return validateDereferenceExpression(expression, environment, funcs);
      case "!":
        return validateLogicalNotExpression(expression, environment, funcs);
    }
  }
  function validateUnaryMinusExpression(expression, environment, funcs) {
    assert(expression.operator === "-", "validating unary minus expression with incorrect operator");
    const typedOperand = validateExpression(expression.value, environment, funcs);
    if (typedOperand.resultType.kind === "void") {
      throw new ValidationError("Unary operation cannot be performed on void", expression);
    }
    const result = {
      ...expression,
      value: typedOperand,
      resultType: typedOperand.resultType
    };
    return result;
  }
  function validateDereferenceExpression(expression, environment, funcs) {
    assert(expression.operator === "@", "validating dereference expression with incorrect operator");
    const typedOperand = validateExpression(expression.value, environment, funcs);
    if (typedOperand.resultType.kind !== "pointer") {
      throw new ValidationError("Cannot dereference a non-pointer", expression);
    }
    const result = {
      ...expression,
      value: typedOperand,
      resultType: typedOperand.resultType.value
    };
    return result;
  }
  function validateLogicalNotExpression(expression, environment, funcs) {
    assert(expression.operator === "!", "validating logical not expression with incorrect operator");
    const typedOperand = validateExpression(expression.value, environment, funcs);
    if (typedOperand.resultType.kind !== "basic" || typedOperand.resultType.value !== "i32") {
      throw new ValidationError("Cannot apply logical not to a non-boolean value", expression);
    }
    const result = {
      ...expression,
      value: typedOperand,
      resultType: {
        kind: "basic",
        value: "i32"
      }
    };
    return result;
  }
  function validateBinaryOperatorExpression(expression, environment, funcs) {
    const leftPartValidationResult = validateExpression(expression.left, environment, funcs);
    const rightPartValidationResult = validateExpression(expression.right, environment, funcs);
    if (expression.operator === "=") {
      if (leftPartValidationResult.kind === "identifier") {
        return validateVariableAssignmentExpression(expression, environment, leftPartValidationResult, rightPartValidationResult);
      } else if (leftPartValidationResult.kind === "unaryOperator" && leftPartValidationResult.operator === "@") {
        return validatePointerAssignmentExpression(expression, leftPartValidationResult, rightPartValidationResult);
      } else {
        throw new ValidationError("Invalid assignment to expression", expression);
      }
    }
    if (leftPartValidationResult.resultType.kind === "void" || rightPartValidationResult.resultType.kind === "void") {
      throw new ValidationError("Binary operation cannot be performed on void", expression);
    }
    const isOperatorShift = ShiftOperators.includes(expression.operator);
    const isLeftPartInteger = leftPartValidationResult.resultType.kind === "basic" && IntegerTypes.includes(leftPartValidationResult.resultType.value);
    const isRightPartInteger = rightPartValidationResult.resultType.kind === "basic" && IntegerTypes.includes(rightPartValidationResult.resultType.value);
    if (isOperatorShift) {
      if (!isLeftPartInteger || !isRightPartInteger) {
        throw new ValidationError(`Bitwise shift operator ${expression.operator} may only be applied to integers`, expression);
      }
    } else {
      if (!isSameType(leftPartValidationResult.resultType, rightPartValidationResult.resultType)) {
        throw new ValidationError(`Cannot apply operator ${expression.operator} to different types: ${stringifyType(leftPartValidationResult.resultType)} and ${stringifyType(rightPartValidationResult.resultType)}`, expression);
      }
      const isOperatorLogical = LogicalOperators.includes(expression.operator);
      if (isOperatorLogical && !isLeftPartInteger) {
        throw new ValidationError(`Operator ${expression.operator} may only be applied to integer types`, expression);
      }
    }
    let resultType;
    switch (expression.operator) {
      case "+":
      case "-":
      case "*":
      case "/":
      case "<<":
      case ">>":
      case "&":
      case "|":
      case "^":
        resultType = leftPartValidationResult.resultType;
        break;
      case "==":
      case "!=":
      case ">":
      case "<":
      case ">=":
      case "<=":
        resultType = {
          kind: "basic",
          value: "i32"
        };
        break;
      case "->":
        throw new Error("Internal error: received binary expression with type conversion");
    }
    return {
      ...expression,
      left: leftPartValidationResult,
      right: rightPartValidationResult,
      resultType
    };
  }
  function validateVariableAssignmentExpression(expression, environment, leftPartValidationResult, rightPartValidationResult) {
    assert(expression.operator === "=");
    assert(leftPartValidationResult.kind === "identifier");
    if (rightPartValidationResult.resultType.kind === "void") {
      throw new ValidationError("Invalid assignment of void value", expression);
    }
    if (!isSameType(leftPartValidationResult.resultType, rightPartValidationResult.resultType)) {
      throw new ValidationError(`Cannot assign value of type ${stringifyType(rightPartValidationResult.resultType)} to a variable of type ${stringifyType(leftPartValidationResult.resultType)}`, expression);
    }
    const variableLookupResult = lookupVariableOrParameter(leftPartValidationResult.identifier, environment);
    if (variableLookupResult === null) {
      throw new ValidationError(`Trying to assign a value to an unknown variable ${leftPartValidationResult.identifier}`, expression);
    }
    if (variableLookupResult.kind === "variable" && variableLookupResult.declarationStatement.variableKind === "constant") {
      throw new ValidationError(`Trying to assign a value to a constant ${leftPartValidationResult.identifier}`, expression);
    }
    if (variableLookupResult.kind === "parameter") {
      throw new ValidationError(`Trying to assign a value to a parameter ${leftPartValidationResult.identifier}`, expression);
    }
    return {
      ...expression,
      left: leftPartValidationResult,
      right: rightPartValidationResult,
      resultType: { kind: "void" }
    };
  }
  function validatePointerAssignmentExpression(expression, leftPartValidationResult, rightPartValidationResult) {
    assert(expression.operator === "=");
    assert(leftPartValidationResult.kind === "unaryOperator");
    assert(leftPartValidationResult.operator === "@");
    assert(leftPartValidationResult.value.resultType.kind === "pointer");
    if (rightPartValidationResult.resultType.kind === "void") {
      throw new ValidationError("Invalid assignment of void value", expression);
    }
    if (!isSameType(leftPartValidationResult.resultType, rightPartValidationResult.resultType)) {
      throw new ValidationError(`Cannot assign value of type ${stringifyType(rightPartValidationResult.resultType)} to a pointer to ${stringifyType(leftPartValidationResult.resultType)}`, expression);
    }
    return {
      ...expression,
      left: leftPartValidationResult,
      right: rightPartValidationResult,
      resultType: { kind: "void" }
    };
  }
  function validateTypeConversionExpression(expression, environment, funcs) {
    const valueToConvertValidationResult = validateExpression(expression.valueToConvert, environment, funcs);
    if (valueToConvertValidationResult.resultType.kind === "void") {
      throw new ValidationError("Cannot typecast expression with type void", expression);
    }
    return {
      ...expression,
      valueToConvert: valueToConvertValidationResult
    };
  }

  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/validator/StatementValidator.ts
  function validateStatement(statement, func, environment, funcs) {
    switch (statement.kind) {
      case "variableDeclaration":
        return validateVariableDeclaration(statement, environment, funcs);
      case "return":
        return validateReturn(statement, func.signature.type, environment, funcs);
      case "conditional":
        return validateConditional(statement, func, environment, funcs);
      case "loop":
        return validateLoop(statement, func, environment, funcs);
      case "expression":
        return {
          ...statement,
          value: validateExpression(statement.value, environment, funcs)
        };
    }
  }
  function validateVariableDeclaration(statement, environment, funcs) {
    const expressionValidationResult = validateExpression(statement.value, environment, funcs);
    if (!isSameType(expressionValidationResult.resultType, statement.variableType)) {
      throw new ValidationError(`Cannot assign value of type ${stringifyType(expressionValidationResult.resultType)} to a variable of type ${stringifyType(statement.variableType)}`, statement);
    }
    const variableInfo = {
      kind: "variable",
      declarationStatement: statement,
      type: statement.variableType
    };
    environment.variablesAndParameters.set(statement.variableIdentifier, variableInfo);
    return {
      ...statement,
      variableType: statement.variableType,
      value: expressionValidationResult
    };
  }
  function validateReturn(statement, expectedType, environment, funcs) {
    if (statement.value === null) {
      if (expectedType.kind === "void") {
        return {
          ...statement,
          value: null
        };
      }
      throw new ValidationError(`Trying to return a void value from a function with type ${stringifyType(expectedType)}`, statement);
    }
    const expressionValidationResult = validateExpression(statement.value, environment, funcs);
    if (!isSameType(expressionValidationResult.resultType, expectedType)) {
      throw new ValidationError(`Cannot return value of type ${stringifyType(expressionValidationResult.resultType)} from a function of type ${stringifyType(expectedType)}`, statement);
    }
    return {
      ...statement,
      value: expressionValidationResult
    };
  }
  function validateConditional(statement, func, environment, funcs) {
    const conditionValidationResult = validateExpression(statement.condition, environment, funcs);
    if (conditionValidationResult.resultType.kind !== "basic" || conditionValidationResult.resultType.value !== "i32") {
      throw new ValidationError(`Expected i32 type in condition. Found ${stringifyType(conditionValidationResult.resultType)}`, statement.condition);
    }
    const innerEnvironment = createEmptyEnvironment2(environment);
    const typedBodyStatements = [];
    let returnStatementEncountered = false;
    for (const innerStatement of statement.body) {
      if (returnStatementEncountered) {
        throw new ValidationError(`Unreachable statement`, innerStatement);
      }
      const statementValidationResult = validateStatement(innerStatement, func, innerEnvironment, funcs);
      typedBodyStatements.push(statementValidationResult);
      if (innerStatement.kind === "return") {
        returnStatementEncountered = true;
      }
    }
    return {
      ...statement,
      condition: conditionValidationResult,
      body: typedBodyStatements
    };
  }
  function validateLoop(statement, func, environment, funcs) {
    const conditionValidationResult = validateExpression(statement.condition, environment, funcs);
    if (conditionValidationResult.resultType.kind !== "basic" || conditionValidationResult.resultType.value !== "i32") {
      throw new ValidationError(`Expected i32 type in condition. Found ${stringifyType(conditionValidationResult.resultType)}`, statement.condition);
    }
    const innerEnvironment = createEmptyEnvironment2(environment);
    const typedBodyStatements = [];
    let returnStatementEncountered = false;
    for (const innerStatement of statement.body) {
      if (returnStatementEncountered) {
        throw new ValidationError(`Unreachable statement`, innerStatement);
      }
      const statementValidationResult = validateStatement(innerStatement, func, innerEnvironment, funcs);
      typedBodyStatements.push(statementValidationResult);
      if (innerStatement.kind === "return") {
        returnStatementEncountered = true;
      }
    }
    return {
      ...statement,
      condition: conditionValidationResult,
      body: typedBodyStatements
    };
  }

  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/validator/Validator.ts
  function validate(module) {
    return validateModule(module);
  }
  function validateModule(module) {
    const globalEnvironment = createEmptyEnvironment2();
    const funcs = new Map();
    if (module.memories.length > 1) {
      throw new ValidationError(`Only one memory declaration is allowed`, module.memories[1]);
    }
    for (const func of module.funcs) {
      if (funcs.has(func.signature.name)) {
        throw new ValidationError(`Duplicate function declaration: ${func.signature.name}`, func);
      }
      funcs.set(func.signature.name, func);
    }
    const funcsValidationResult = [];
    for (const func of module.funcs) {
      const funcValidationResult = validateFunction(func, globalEnvironment, funcs);
      funcsValidationResult.push(funcValidationResult);
    }
    return {
      ...module,
      funcs: funcsValidationResult,
      memory: module.memories.length === 1 ? validateMemory(module.memories[0], funcs) : void 0
    };
  }
  function validateFunction(func, globalEnvironment, funcs) {
    switch (func.kind) {
      case "plain":
        return validatePlainFunction(func, globalEnvironment, funcs);
      case "export":
        return validateExportFunction(func, globalEnvironment, funcs);
      case "import":
        return validateImportFunction(func);
    }
  }
  function validatePlainFunction(func, globalEnvironment, funcs) {
    const validationResult = validateFunctionWithBody(func, globalEnvironment, funcs);
    return {
      kind: "plain",
      ...validationResult
    };
  }
  function validateExportFunction(func, globalEnvironment, funcs) {
    const validationResult = validateFunctionWithBody(func, globalEnvironment, funcs);
    return {
      kind: "export",
      ...validationResult
    };
  }
  function validateFunctionWithBody(func, globalEnvironment, funcs) {
    const functionEnvironment = createEmptyEnvironment2(globalEnvironment);
    const signatureValidationResult = validateFunctionSignature(func.signature, functionEnvironment);
    const typedBodyStatements = validateFunctionBody(func, functionEnvironment, funcs);
    return {
      ...func,
      signature: signatureValidationResult,
      body: typedBodyStatements
    };
  }
  function validateImportFunction(func) {
    const tempEnvironment = createEmptyEnvironment2();
    const signatureValidationResult = validateFunctionSignature(func.signature, tempEnvironment);
    return {
      ...func,
      signature: signatureValidationResult
    };
  }
  function validateFunctionSignature(signature, functionEnvironment) {
    const typedParameterDeclarations = [];
    for (const parameter of signature.parameters) {
      const parameterValidationResult = validateParameter(parameter, functionEnvironment);
      typedParameterDeclarations.push(parameterValidationResult);
    }
    return {
      ...signature,
      parameters: typedParameterDeclarations
    };
  }
  function validateFunctionBody(func, functionEnvironment, funcs) {
    const typedBodyStatements = [];
    let returnStatementEncountered = false;
    for (const statement of func.body) {
      if (returnStatementEncountered) {
        throw new ValidationError(`Unreachable statement`, statement);
      }
      const statementValidationResult = validateStatement(statement, func, functionEnvironment, funcs);
      typedBodyStatements.push(statementValidationResult);
      if (statement.kind === "return") {
        returnStatementEncountered = true;
      }
    }
    if (!returnStatementEncountered && func.signature.type.kind !== "void") {
      throw new ValidationError(`Function has to return a value`, func);
    }
    return typedBodyStatements;
  }
  function validateParameter(parameter, environment) {
    if (environment.variablesAndParameters.has(parameter.name)) {
      throw new ValidationError(`Redefinition of parameter ${parameter.name}`, parameter);
    }
    const parameterInfo = {
      kind: "parameter",
      declarationStatement: parameter,
      type: parameter.type
    };
    environment.variablesAndParameters.set(parameter.name, parameterInfo);
    return parameter;
  }
  function validateMemory(memory, funcs) {
    if (memory.kind !== "export") {
      return memory;
    }
    const allFuncs = Array.from(funcs.values());
    const exportFunctionWithSameName = allFuncs.find((func) => func.kind === "export" && func.signature.name === memory.exportName);
    if (exportFunctionWithSameName !== void 0) {
      throw new ValidationError(`Duplicate export name: ${memory.exportName}. Already used in export function.`, memory);
    }
    return memory;
  }

  // deno:file:///home/runner/work/programming-language/programming-language/src/lang/Compiler.ts
  function compile(source) {
    const tokens = lex(source);
    const tree = parse(new Iter(tokens));
    const typedTree = validate(tree);
    const generatedSource = generate(typedTree);
    return generatedSource;
  }

  // deno:file:///home/runner/work/programming-language/programming-language/preview-app/app.ts
  function main() {
    const editors = window.editors;
    const iframe = document.getElementById("previewWindow");
    const iframeWindow = iframe.contentWindow;
    const sourceCodeChangeHandler = async () => {
      iframeWindow.compileModuleFromSource = compileModuleFromSource;
      iframeWindow.compiledModule = await compileModuleFromSource(editors.ltctwa.getValue());
      const iframeDocument = iframe.contentDocument;
      iframeDocument.open();
      iframeDocument.write(...[
        editors.html.getValue(),
        `<style>${editors.css.getValue()}</style>`,
        `<script>${editors.js.getValue()}<\/script>`
      ]);
      iframeDocument.close();
    };
    iframe.addEventListener("load", sourceCodeChangeHandler);
    iframeWindow.location.reload();
    Object.values(editors).forEach((editor) => {
      editor.getModel().onDidChangeContent(debounce(() => iframeWindow.location.reload(), 1e3));
    });
    const editorChoiseRadios = document.querySelectorAll('input[name="editorChoise"]');
    const editorElements = document.querySelectorAll(".editor");
    editorChoiseRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        editorElements.forEach((element) => {
          element.classList.add("hidden");
        });
        const editorElement = document.querySelector(`#${radio.value}EditorContainer`);
        editorElement.classList.remove("hidden");
      });
    });
  }
  async function compileModuleFromSource(source) {
    const compilationResult = compile(source);
    const wabt = await window.WabtModule();
    const internalModule = wabt.parseWat(compilationResult, compilationResult);
    const module = new WebAssembly.Module(internalModule.toBinary({}).buffer);
    return module;
  }
  function debounce(func, ms) {
    let currentTimeoutId = null;
    return (...args) => {
      if (currentTimeoutId !== null) {
        clearTimeout(currentTimeoutId);
      }
      currentTimeoutId = setTimeout(() => func.apply(null, args), ms);
    };
  }
  main();
})();
