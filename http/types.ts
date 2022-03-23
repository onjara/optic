import { Stream } from "../types.ts";

export interface RequestResponseConsumer {
  consumesRequestBody:boolean;
  consumesResponseBody:boolean;
}

// deno-lint-ignore no-explicit-any
export function isRequestResponseConsumer(obj:any): obj is RequestResponseConsumer {
  return 'consumesRequestBody' in obj && 'consumesResponseBody' in obj;
}

export type HttpStream = Stream & RequestResponseConsumer;
