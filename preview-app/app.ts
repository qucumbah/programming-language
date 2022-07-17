import { compile } from "../src/lang/Compiler.ts";

declare global {
  interface Window {
    editors: {
      html: any;
      css: any;
      js: any;
      ltctwa: any;
    };
    compile: (text: string) => WebAssembly.Module;
  }
}

async function main() {
  const binaryen: any = (await getNpmModuleFromCdn("binaryen")).default;

  const editors = window.editors;
  const iframe = document.getElementById("previewWindow") as HTMLIFrameElement;

  const iframeWindow: Window = iframe.contentWindow!;

  iframeWindow.compile = (text: string) => getModuleFromSource(binaryen, text);

  const changeHandler = () => {
    const iframeDocument: Document = iframe.contentDocument!;
    iframeDocument.open();
    iframeDocument.write(
      ...[
        editors.html.getValue(),
        `<style>${editors.css.getValue()}</style>`,
        `<script>${editors.js.getValue()}</script>`,
      ]
    );
    iframeDocument.close();
  };
  iframe.addEventListener("load", changeHandler);

  Object.values(editors).forEach((editor) => {
    editor
      .getModel()
      .onDidChangeContent(debounce(() => iframeWindow.location.reload(), 1000));
  });

  console.log(editors);
  const a = async () => {
    const result = await getModuleFromSource(binaryen, "source");
    const resultV = result.toString();
  };
}

function getModuleFromSource(
  binaryen: any,
  source: string
): WebAssembly.Module {
  const compilationResult: string = compile(source);
  const internalModule = binaryen.parseText(compilationResult);
  const module = new WebAssembly.Module(internalModule.emitBinary());
  return module;
}

/**
 * Although browsers understand ES modules quite well, Deno doesn't like them as much.
 * Thus, we can't use a direct import, so we have to import via eval.
 * Eval is needed because bundler is too smart and tries to bundle the ES module from the CDN,
 * which is exactly what causes Deno to fail.
 */
async function getNpmModuleFromCdn(moduleName: string): Promise<any> {
  // Direct eval is problematic, so use indirect eval.
  // https://esbuild.github.io/content-types/#direct-eval
  return await (0, eval)(`import("https://esm.sh/${moduleName}")`);
}

// async function test() {
//   const a = 1 as HTMLIFrameElement;
//   const doc: Document = a.contentDocument!;
//   doc.open
// }

function debounce(func: Function, ms: number) {
  let currentTimeoutId: number | null = null;
  return (...args: any[]) => {
    if (currentTimeoutId !== null) {
      clearTimeout(currentTimeoutId);
    }

    currentTimeoutId = setTimeout(() => func.apply(null, args), ms);
  };
}

main();
