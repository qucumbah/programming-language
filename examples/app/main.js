const canvas = document.getElementById("canvas");

async function main() {
  const wasm = await getWasm();
  console.log(wasm);
  wasm.exports.init(100, 100);

  step(wasm);
}

function step(wasm) {
  const imageStart = wasm.exports.step();
  const imageDataBuffer = new Uint8ClampedArray(
    wasm.exports.mem.buffer.slice(imageStart, imageStart + 100 * 100 * 4),
  );
  const imageData = new ImageData(imageDataBuffer, 100, 100);
  console.log(imageData);
  canvas.getContext("2d").putImageData(imageData, 0, 0);
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
