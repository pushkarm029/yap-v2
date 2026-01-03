declare module 'js-sha3' {
  export const keccak256: {
    (data: string | ArrayBuffer | Uint8Array): string;
    arrayBuffer(data: string | ArrayBuffer | Uint8Array): ArrayBuffer;
    array(data: string | ArrayBuffer | Uint8Array): number[];
    digest(data: string | ArrayBuffer | Uint8Array): number[];
    hex(data: string | ArrayBuffer | Uint8Array): string;
  };
}
