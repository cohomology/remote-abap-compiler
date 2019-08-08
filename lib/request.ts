import { ActivationResult, ActivationResultMessage, ADTClient, AdtLock, InactiveObject,
         session_types } from "abap-adt-api";
import randomstring from "randomstring";
import util from "util";

export interface ICompilationError {
  line?: number;
  offset?: number;
  errorMessage?: string;
}

export interface ICompilationResult {
  success: boolean;
  errors?: ICompilationError[];
  className: string;
  output?: string;
}

export class CompilationRequest {
  private adtClient: ADTClient;
  private className: string;
  private classUrl: string;

  public constructor(public url: string, public user: string, public client: string, public password: string,
                     public classPrefix: string = "RAC_", public abapPackage: string = "$TMP",
                     public transportRequest: string | undefined) {
    this.adtClient = new ADTClient(url, user, password, client, "EN",  { rejectUnauthorized: false });
    this.className = classPrefix + randomstring.generate({
      capitalization: "uppercase",
      charset: "alphanumeric",
      length: 30 - classPrefix.length,
    });
    this.classUrl = "/sap/bc/adt/oo/classes/" + this.className.toLowerCase();
    if (this.transportRequest !== undefined && this.transportRequest === "") {
      this.transportRequest = undefined;
    }
  }

  public async compile(code: string): Promise<ICompilationResult> {
    let mappedResult;
    try {
      await this.createClass();
      const result = await this.putClassSource(this.getGlobalClassSource(), code);
      mappedResult = this.mapToCompilationResult(result);
      if (mappedResult.success) {
        mappedResult.output = await this.runClass();
      }
    } finally {
      await this.cleanup();
    }
    return mappedResult;
  }

  private async cleanup(ignoreError: boolean = false) {
    try {
      this.adtClient.stateful = session_types.stateful;
      const lock = await this.adtClient.lock(this.classUrl, "MODIFY");
      await this.adtClient.deleteObject(this.classUrl, lock.LOCK_HANDLE, this.transportRequest);
      await this.adtClient.unLock(this.classUrl, lock.LOCK_HANDLE);
      await this.adtClient.dropSession();
    } catch (error) {
      if (!ignoreError) {
        throw error;
      }
    }
  }

  private async createClass() {
    await this.adtClient.statelessClone.createObject("CLAS/OC", this.className, this.abapPackage,
      "remote ABAP compiler", `/sap/bc/adt/packages/${this.abapPackage}`, undefined,
      this.transportRequest === "" ? undefined : this.transportRequest);
  }

  private getGlobalClassSource(): string {
    const source = `class ${this.className} definition public create public final.
                      public section.
                        interfaces if_oo_adt_classrun.
                    endclass.

                    class ${this.className} implementation.
                      method if_oo_adt_classrun~main.
                        new main( )->run( out ).
                      endmethod.
                    endclass.`;
    return source;
  }

  private async putClassSource(globalClass: string, localTypes: string): Promise<ActivationResult> {
    this.adtClient.stateful = session_types.stateful;
    const lock = await this.adtClient.lock(this.classUrl, "MODIFY");
    await this.adtClient.setObjectSource(this.classUrl + "/source/main", globalClass,
      lock.LOCK_HANDLE, this.transportRequest);
    await this.adtClient.setObjectSource(this.classUrl + "/includes/implementations", localTypes,
      lock.LOCK_HANDLE, this.transportRequest);
    await this.adtClient.unLock(this.classUrl, lock.LOCK_HANDLE);
    this.adtClient.stateful = session_types.stateless;
    await this.adtClient.dropSession();
    let result = await this.adtClient.activate(this.className, this.classUrl, undefined, true);
    if (!result.success && result.inactive !== undefined && result.inactive.length > 0) {
      const inactives = result.inactive.map( (object) => object.object)
                              .filter((object) => object !== undefined);
      if (inactives !== undefined) {
        result = await this.adtClient.activate(inactives as InactiveObject[], false);
      }
    }
    return result;
  }

  private mapToCompilationResult(activationResult: ActivationResult): ICompilationResult {
    if (!activationResult.success && activationResult.messages.length > 0) {
      return {
        className: this.className,
        errors: activationResult.messages.map(this.mapErrorMessages.bind(this)),
        success: activationResult.success,
      };
    }
    return {
      className: this.className,
      success: activationResult.success,
    };
  }

  private mapErrorMessages(message: ActivationResultMessage): ICompilationError {
    const mainMethodErrorTag = `Class ${this.className}, Method IF_OO_ADT_CLASSRUN~MAIN`;
    if (message.objDescr === mainMethodErrorTag) {
      return this.mapErrorFromGlobalClass(message);
    } else {
      return this.mapErrorFromLocalTypesInclude(message);
    }
  }

  private mapErrorFromLocalTypesInclude(message: ActivationResultMessage): ICompilationError {
    const search = /#start=(\d+),(\d+)/g;
    const match = search.exec(message.href);
    if (match !== null) {
      return {
        errorMessage: message.shortText,
        line: parseInt(match[1], 10),
        offset: parseInt(match[2], 10),
      };
    } else {
      return {
        errorMessage: message.shortText,
        line: -1,
        offset: -1,
      };
    }
  }

  private mapErrorFromGlobalClass(message: ActivationResultMessage): ICompilationError {
    if (message.shortText === "Type \"MAIN\" is unknown." ||
        message.shortText === "Method \"RUN\" is unknown or PROTECTED or PRIVATE." ||
        message.shortText.startsWith("The type \"MAIN\" is unknown") ||
        message.shortText.startsWith("Method \"RUN\" does not exist")) {
      return {
        errorMessage: "Missing class named \"MAIN\" with public method \"RUN\".",
        line: -1,
        offset: -1,
      };
    } else {
      const defaultErrorMessage = "The method \"RUN\" of class \"MAIN\" " +
        "must have exactly one importing parameter of type \"REF TO IF_OO_ADT_CLASSRUN_OUT\".";
      return {
        errorMessage: defaultErrorMessage,
        line: -1,
        offset: -1,
      };
    }
  }

  private async runClass(): Promise < string > {
    return this.adtClient.runClass(this.className);
  }
}
