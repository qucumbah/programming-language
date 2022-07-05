set -e

rm -rf ./dist

mkdir ./dist

deno run --allow-read ./src/index.ts ./examples/rockPaperScissors.ltctwa > ./dist/compiled.wast
wat2wasm ./dist/compiled.wast -o ./dist/main.wasm

cp ./examples/app/* ./dist
