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

  const sourceCodeChangeHandler = async () => {
    iframeWindow.compileModuleFromSource = compileModuleFromSource;
    iframeWindow.compiledModule = await compileModuleFromSource(
      editors.ltctwa.getValue(),
    );

    const iframeDocument: Document = iframe.contentDocument!;
    iframeDocument.open();
    iframeDocument.write(
      ...[
        editors.html.getValue(),
        `<style>${editors.css.getValue()}</style>`,
        `<script>${editors.js.getValue()}</script>`,
      ],
    );
    iframeDocument.close();
  };
  iframe.addEventListener("load", sourceCodeChangeHandler);

  iframeWindow.location.reload();

  Object.values(editors).forEach((editor) => {
    editor
      .getModel()
      .onDidChangeContent(debounce(() => iframeWindow.location.reload(), 1000));
  });

  const editorChoiseRadios = document.querySelectorAll(
    'input[name="editorChoise"]',
  ) as NodeListOf<HTMLInputElement>;
  const editorElements = document.querySelectorAll(".editor") as NodeListOf<
    HTMLDivElement
  >;
  editorChoiseRadios.forEach((radio: HTMLInputElement) => {
    radio.addEventListener("change", () => {
      editorElements.forEach((element: HTMLDivElement) => {
        element.classList.add("hidden");
      });
      const editorElement = document.querySelector(
        `#${radio.value}EditorContainer`,
      ) as HTMLDivElement;
      editorElement.classList.remove("hidden");
    });
  });
}

async function compileModuleFromSource(
  source: string,
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
