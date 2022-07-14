import { compile } from "../src/lang/Compiler.ts";

import webassemblyjs from "webassemblyjs";

const module = webassemblyjs.instantiateFromSource(compile(""));
console.log(module);
