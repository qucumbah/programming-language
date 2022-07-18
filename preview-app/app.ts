import { compile } from "../src/lang/Compiler.ts";

declare global {
  interface Window {
    editors: {
      html: any;
      css: any;
      js: any;
      ltctwa: any;
    };
    compileModuleFromSource: (text: string) => WebAssembly.Module;
    compiledModule: WebAssembly.Module;
    WabtModule: any;
  }
}

function main() {
  const editors = window.editors;
  const iframe = document.getElementById("previewWindow") as HTMLIFrameElement;

  const iframeWindow: Window = iframe.contentWindow!;

  const changeHandler = async () => {
    iframeWindow.compileModuleFromSource = compileModuleFromSource;
    iframeWindow.compiledModule = await compileModuleFromSource(
      editors.ltctwa.getValue()
    );

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
}

async function compileModuleFromSource(
  source: string
): Promise<WebAssembly.Module> {
  const compilationResult: string = compile(source);
  const wabt = await window.WabtModule();
  const internalModule = wabt.parseWat(compilationResult, compilationResult);
  const module = new WebAssembly.Module(internalModule.toBinary({}).buffer);
  return module;
}

function debounce(func: (...args: unknown[]) => void, ms: number) {
  let currentTimeoutId: number | null = null;
  return (...args: unknown[]) => {
    if (currentTimeoutId !== null) {
      clearTimeout(currentTimeoutId);
    }

    currentTimeoutId = setTimeout(() => func.apply(null, args), ms);
  };
}

main();
