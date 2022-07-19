import { compile } from "../src/lang/Compiler.ts";

type EditorType = "html" | "css" | "js" | "ltctwa";

declare global {
  interface Window {
    compileModuleFromSource: (text: string) => WebAssembly.Module;
    compiledModule: WebAssembly.Module;
    WabtModule: any;
    monaco: any;
  }
}

function main() {
  const editors = createEditors();
  const iframe = document.getElementById("previewWindow") as HTMLIFrameElement;

  const iframeWindow: Window = iframe.contentWindow!;

  const sourceCodeChangeHandler = async () => {
    iframeWindow.compileModuleFromSource = compileModuleFromSource;
    iframeWindow.compiledModule = await compileModuleFromSource(
      editors.get("ltctwa").getValue(),
    );

    const iframeDocument: Document = iframe.contentDocument!;
    iframeDocument.open();
    iframeDocument.write(
      ...[
        editors.get("html").getValue(),
        `<style>${editors.get("css").getValue()}</style>`,
        `<script>${editors.get("js").getValue()}</script>`,
      ],
    );
    iframeDocument.close();
  };
  iframe.addEventListener("load", sourceCodeChangeHandler);

  iframeWindow.location.reload();

  Array.from(editors.values()).forEach((editor) => {
    editor
      .getModel()
      .onDidChangeContent(debounce(() => iframeWindow.location.reload(), 1000));
  });

  const editorChoiseRadios = document.querySelectorAll(
    'input[name="editorChoise"]',
  ) as NodeListOf<HTMLInputElement>;
  const editorElements = document.querySelectorAll(
    ".editor",
  ) as NodeListOf<HTMLDivElement>;
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

  self.addEventListener("load", () => {
    const loader = document.querySelector(".loader") as HTMLDivElement;
    loader.classList.remove("disableTransition");
    loader.classList.add("transparent");
  });
}

function createEditors(): Map<EditorType, any> {
  const editors = new Map<EditorType, any>();

  function createEditor(
    name: EditorType,
    initialContent: string,
    language?: string,
  ) {
    const editor = window.monaco.editor.create(
      document.getElementById(`${name}EditorContainer`),
      {
        value: initialContent,
        theme: "vs-dark",
        language,
        automaticLayout: true,
        minimap: {
          enabled: false,
        },
      },
    );

    editors.set(name, editor);
  }

  const htmlEditorInitialContent =
    `<!-- CSS, JS, and LTCTWA content scripts are injected automatically -->
<div id="outputContainer"></div>
`;

  const cssEditorInitialContent = `#outputContainer {
  font-weight: bold;
}
`;

  const jsEditorInitialContent = `async function main() {
  const instance = await WebAssembly.instantiate(window.compiledModule);
  document.getElementById("outputContainer").innerHTML = "Value from LTCTWA: " + instance.exports.getValueFromLtctwa();
}

main();
`;

  const ltctwaEditorInitialContent = `func export getValueFromLtctwa(): i32 {
  return 1234;
}
`;

  createEditor("html", htmlEditorInitialContent, "html");
  createEditor("css", cssEditorInitialContent, "css");
  createEditor("js", jsEditorInitialContent, "javascript");
  createEditor("ltctwa", ltctwaEditorInitialContent);

  return editors;
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
