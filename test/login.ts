import { CompilationRequest } from "../lib/request";

export function connect() {
  return new CompilationRequest(
    process.env.ADT_URL!,
    process.env.ADT_USER!,
    process.env.ADT_CLIENT!,
    process.env.ADT_PASS!,
    process.env.ADT_CLASS_PREFIX!,
    process.env.ADT_PACKAGE!,
    process.env.ADT_TRANSPORT!,
  );
}
