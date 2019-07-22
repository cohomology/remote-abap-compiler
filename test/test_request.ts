import { expect } from "chai";
import { CompilationRequest } from "../lib";
import { connect } from "./login";

describe("CompilationRequestTest", () => {
  it("Test: working", async () => {
    const request = connect();
    const source =  `class main definition.
                       public section.
                         methods run importing out type ref to if_oo_adt_classrun_out.
                     endclass.

                     class main implementation.
                       method run.
                         out->write( 'Hello World' ).
                       endmethod.
                      endclass.`;
    const result = await request.compile(source);
    expect(result.success).eql(true);
    expect(result.output).eql("Hello World\n");
  });
  it("Test: no main class", async () => {
    const request = connect();
    const source =  `class main2 definition.
                       public section.
                         methods run importing out type ref to if_oo_adt_classrun_out.
                     endclass.

                     class main2 implementation.
                       method run.
                         out->write( 'Hello World' ).
                       endmethod.
                      endclass.`;
    const result = await request.compile(source);
    expect(result.success).eql(false);
    expect(result.errors).eql([{ errorMessage: "Missing class named \"MAIN\" with public method \"RUN\".",
    line:  -1,
    offset: -1 }]);
  });
  it("Test: no run method", async () => {
    const request = connect();
    const source =  `class main definition.
                       public section.
                         methods run2 importing out type ref to if_oo_adt_classrun_out.
                     endclass.

                     class main implementation.
                       method run2.
                         out->write( 'Hello World' ).
                       endmethod.
                      endclass.`;
    const result = await request.compile(source);
    expect(result.success).eql(false);
    expect(result.errors).eql([{ errorMessage: "Missing class named \"MAIN\" with public method \"RUN\".",
    line: -1,
    offset: -1 }]);
  });
  it("Test: no import parameter", async () => {
    const request = connect();
    const source =  `class main definition.
                       public section.
                         methods run.
                     endclass.

                     class main implementation.
                       method run.
                       endmethod.
                      endclass.`;
    const result = await request.compile(source);
    expect(result.success).eql(false);
    expect(result.errors).eql([{ errorMessage:
     "The method \"RUN\" of class \"MAIN\" must have exactly one importing parameter" +
     " of type \"REF TO IF_OO_ADT_CLASSRUN_OUT\".",
    line: -1,
    offset: -1 }]);
  });
  it("Test: syntax error in user code", async () => {
    const request = connect();
    const source =  `class main definition.
                       public section.
                         methods run importing out type ref to if_oo_adt_classrun_out.
                     endclass.

                     class main implementation.
                       method run.
                         not_exist.
                       endmethod.
                      endclass.`;
    const result = await request.compile(source);
    expect(result.success).eql(false);
    expect(result.errors).eql([{ errorMessage: "The statement \"NOT_EXIST\" is invalid. Check the spelling.",
      line: 8,
      offset: 25 }]);
  });

});
