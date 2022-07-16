import { compile } from "../src/lang/Compiler.ts";

async function main() {
  const binaryen: any = await getBinaryen();
  const source = document.querySelector("#source") as HTMLTextAreaElement;
  const output = document.querySelector("#output") as HTMLTextAreaElement;
  const compileButton = document.querySelector(
    "#compileButton"
  ) as HTMLButtonElement;
  compileButton.addEventListener("click", async () => {
    const result = await getModuleFromSource(binaryen, source.value);
    output.value = result.toString();
  });
}

async function getModuleFromSource(
  binaryen: any,
  source: string
): Promise<WebAssembly.Instance> {
  const compilationResult: string = compile(source);
  const internalModule = binaryen.parseText(compilationResult);
  const module = new WebAssembly.Module(internalModule.emitBinary());
  const instance: WebAssembly.Instance = await WebAssembly.instantiate(module);
  console.log(instance);
  return instance;
}

/**
 * Although browsers understand ES modules quite well, Deno doesn't like them as much.
 * Thus, we can't use a direct import, so we have to import via eval.
 * Eval is needed because bundler is too smart and tries to bundle the ES module from the CDN,
 * which is exactly what causes Deno to fail.
 */
async function getBinaryen() {
  const { default: binaryen } = await (0, eval)(
    "import('https://esm.sh/binaryen@109.0.0')"
  );
  return binaryen;
}

main();
