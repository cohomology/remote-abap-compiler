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
    this.log(`Creating class name=${this.className}, url=${this.classUrl}`);
    await this.adtClient.statelessClone.createObject("CLAS/OC", this.className, "$TMP", "remote ABAP compiler",
      "/sap/bc/adt/packages/$TMP");
    this.log(`Finished creating class name=${this.className}, url=${this.classUrl}`);
    const structure = await this.adtClient.objectStructure(this.classUrl);
    console.log(structure);
  }

  private async createTestClassInclude(): Promise<string> {
    this.adtClient.stateful = session_types.stateful;
    const lock = await this.adtClient.lock(this.classUrl);
    await this.adtClient.createTestInclude(this.className, lock.LOCK_HANDLE);
    await this.adtClient.dropSession();
    const source = await this.adtClient.getObjectSource(this.classUrl + "/includes/testclasses");
    return source;
  }

  private log(str: string) {
    console.log(str);
  }
}
