async function main() {
  const wasm = await getWasm();
  wasm.instance.exports.init(100, 100);

  step(wasm);
}

function step(wasm) {
  wasm.instance.exports.step();
  requestAnimationFrame(() => step(wasm));
}

async function getWasm() {
  return WebAssembly.instantiate(await fetch("main.wasm"));
}

main();
