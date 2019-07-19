export class CompilationResult {
  constructor(public success: boolean, public line: number, public offset: number, public errorMessage: string) {
  }
}
