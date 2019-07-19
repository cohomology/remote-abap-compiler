import { ADTClient, session_types } from "abap-adt-api";
import randomstring from "randomstring";

export class CompilationRequest {
  private adtClient: ADTClient;
  private className: string;
  private classUrl: string;

  public constructor(public url: string, public user: string, public client: string, public password: string) {
    this.adtClient = new ADTClient(url, user, password, client, "EN",  { rejectUnauthorized: false });
    this.className = "RAC_" + randomstring.generate({
      capitalization: "uppercase",
      charset: "alphanumeric",
      length: 26,
    });
    console.log(this.className);
    this.classUrl = "/sap/bc/adt/oo/classes/" + this.className.toLowerCase();
  }

  public async compile(code: string): Promise<string> {
    await this.cleanup(true);
    const source: string = "";
    try {
      await this.createClass();
      await this.putClassSource(this.getGlobalClassSource(), code);
    } finally {
      await this.cleanup();
    }
    return source;
  }

  private async cleanup(ignoreError: boolean = false) {
    try {
      this.adtClient.stateful = session_types.stateful;
      const lock = await this.adtClient.lock(this.classUrl);
      await this.adtClient.deleteObject(this.classUrl, lock.LOCK_HANDLE);
      await this.adtClient.dropSession();
    } catch (error) {
      if (!ignoreError) {
        throw error;
      }
    }
  }

  private async createClass() {
    await this.adtClient.statelessClone.createObject("CLAS/OC", this.className, "$TMP", "remote ABAP compiler",
      "/sap/bc/adt/packages/$TMP");
  }

  private getGlobalClassSource(): string {
    const source = `class ${this.className} definition public create public final.
                      public section.
                        interfaces if_oo_adt_classrun.
                    endclass.

                    class ${this.className} implementation.
                      method if_oo_adt_classrun~main.
                        new main()->run( out ).
                      endmethod.
                    endclass.`;
    return source;
  }

  private async putClassSource(globalClass: string, localTypes: string) {
    this.adtClient.stateful = session_types.stateful;
    const lock = await this.adtClient.lock(this.classUrl);
    await this.adtClient.setObjectSource(this.classUrl + "/source/main", globalClass, lock.LOCK_HANDLE);
    await this.adtClient.setObjectSource(this.classUrl + "/includes/implementations", localTypes, lock.LOCK_HANDLE);
    await this.adtClient.dropSession();
    const result = await this.adtClient.activate(this.className, this.classUrl);
    console.log(this.className);
    console.log(result);
  }
}
