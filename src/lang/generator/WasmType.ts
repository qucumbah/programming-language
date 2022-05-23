import { NonVoidType } from "../ast/Type.ts";

export type WasmType = 'i32' | 'f32' | 'i64' | 'f64';
/**
 * WASM only has four basic types, so we have to convert all source types (pointers, unsigned ones).
 *
 * @param sourceType source type to convert from
 * @returns the resulting WASM type - i32, f32, i64, or u64
 */
export function getWasmType(sourceType: NonVoidType): WasmType {
  // Pointer types are always represented as i32
  if (sourceType.kind === 'pointer') {
    return 'i32';
  }

  switch (sourceType.value) {
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
