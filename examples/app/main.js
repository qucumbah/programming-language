async function main() {
  const wasm = await getWasm();
  console.log(wasm);
  wasm.exports.init(100, 100);

  step(wasm);
}

function step(wasm) {
  wasm.exports.step();
  // requestAnimationFrame(() => step(wasm));
}

async function getWasm() {
  const bytes = await fetch("main.wasm").then((res) => res.arrayBuffer());
  const module = await WebAssembly.compile(bytes);
  return WebAssembly.instantiate(module, {
    log: {
      _i32: console.log,
    },
  });
}

main();
