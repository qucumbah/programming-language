import { NonVoidBasicTypes } from "../lexer/BasicTypes.ts";

export type WasmType = 'i32' | 'f32' | 'i64' | 'f64';
/**
 * WASM only has four basic types, so we have to convert all source types (pointers, unsigned ones).
 *
 * @param sourceType source type to convert from
 * @returns the resulting WASM type - i32, f32, i64, or u64
 */
export function getWasmType(sourceType: typeof NonVoidBasicTypes[number]): WasmType {
  switch(sourceType) {
    case 'i32':
    case 'u32':
      return 'i32';
    case 'f32':
      return 'f32';
    case 'i64':
    case 'u64':
      return 'i64';
    case 'f64':
      return 'f64';
  }
}
