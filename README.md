# remote-abap-compiler
This is the starting point for a remote ABAP compiler (command line) and the corresponding library. The library can be used independently from the command line utility. The implementation language is node.js with typescript.

## Building the project
Please have [node.js](https://nodejs.org/en) installed (with npm). As editor, [Visual Studio Code](https://code.visualstudio.com/) is recommended.

The install the prerequisites, type the following in the checked-out repo folder:
```
npm install
```
To build the whole project and install the command line utility in a shared folder type the following:
```
npm link
```
After that, the ABAP compiler utility should be available in some shared location. You can call it like follows:
```
abapc compile -u https://your_abap_server_url:port_number -n username -c 000 file.abap
```
For the http requests, the `axios` library is used, which heavily uses Javascripts `async` and `await` concepts.
