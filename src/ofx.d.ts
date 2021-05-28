declare module "ofx" {
  export function parse(input: string): { header: Record<string, string>; OFX: any };
}
