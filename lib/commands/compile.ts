import {Command, flags as cmdFlags} from "@oclif/command";
import { readFile } from "fs";
import read from "read";
import {CompilationRequest} from "../compiler/request";

export default class Compile extends Command {
  public static description = "Compile an ABAP source file";

  public static examples = [
    `$ abapc compile -u https://server_name:port_number -u user file.abap
`,
  ];

  public static flags = {
    client: cmdFlags.string({char: "c", description: "ABAP client", required: true}),
    help: cmdFlags.help({char: "h"}),
    password: cmdFlags.string({char: "p", description: "server password"}),
    url: cmdFlags.string({char: "u", description: "server url", required: true}),
    user: cmdFlags.string({char: "n", description: "username", required: true}),
  };

  public static args = [{name: "file"}];

  public async run() {
    const {args, flags} = this.parse(Compile);
    readFile(args.file, "utf8", (err, buffer) => {
      if (err) { throw err; }
      this.requirePassword(flags.url, flags.user, flags.client, flags.password,
        (url, user, client, password) => {
          this.connectAndCompile(flags.url, flags.user, flags.client, password, buffer);
      });
    });
  }

  private requirePassword(url: string, user: string, client: string, password: string | undefined,
                          callback: (url: any, user: any, client: any, password: any) => void) {
    if (!password) {
      read({ prompt: "Password: ", silent: true }, (err, pw) => {
        if (!err) {
          callback(url, user, client, pw);
        } else {
          console.log("Cancelled");
        }
      });
    } else {
      callback(url, user, client, password);
    }
  }

  private async connectAndCompile(url: string, user: string, client: string, password: string, code: string) {
    const req = new CompilationRequest(url, user, client, password);
    try {
      const result = await req.compile(code);
      if (result.success) {
        console.log("Ok");
      } else {
        console.log("Line: ", result.line, " Offset: ", result.offset, " Error: \"", result.errorMessage, "\".");
      }
    } catch (error) {
      console.error(error);
    }
  }
}
