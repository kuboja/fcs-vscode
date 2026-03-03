import * as assert from "assert";
import { FcsCommandsToFliMamanager } from "../fcsCommands";

const FILE = "/project/model.fcs";
const OUT  = "/tmp/out";

function fli(rawLine: string): string | undefined {
    return FcsCommandsToFliMamanager.getFliParamsForLine(rawLine, FILE, OUT);
}

// ---------------------------------------------------------------------------
suite("FcsCommandsToFliMamanager - command detection", () => {

    // --- export commands: single space (already worked) --------------------

    test("browse_report with single space is detected", () => {
        const result = fli("# browse_report dokument");
        assert.ok(result, "should produce FLI params");
        assert.ok(result!.includes('"dokument"'), `unexpected params: ${result}`);
    });

    test("fli_pdf with single space is detected", () => {
        const result = fli("# fli_pdf myReport");
        assert.ok(result, "should produce FLI params");
        assert.ok(result!.includes('"myReport"'), `unexpected params: ${result}`);
    });

    // --- issue #24: multiple spaces between # and command ------------------

    test("browse_report with two spaces after # is detected (issue #24)", () => {
        const result = fli("#  browse_report  dokument");
        assert.ok(result, "should produce FLI params");
        assert.ok(result!.includes('"dokument"'), `unexpected params: ${result}`);
    });

    test("browse_report with tab after # is detected", () => {
        const result = fli("#\tbrowse_report\tdokument");
        assert.ok(result, "should produce FLI params");
        assert.ok(result!.includes('"dokument"'), `unexpected params: ${result}`);
    });

    test("fli_pdf with multiple spaces after # is detected", () => {
        const result = fli("#   fli_pdf   myReport");
        assert.ok(result, "should produce FLI params");
        assert.ok(result!.includes('"myReport"'), `unexpected params: ${result}`);
    });

    // --- expression command ------------------------------------------------

    test("expression without # is detected", () => {
        const result = fli("myVariable");
        assert.ok(result, "should produce FLI params");
        assert.ok(result!.includes('"myVariable"'), `unexpected params: ${result}`);
    });

    test("expression with # and single space is detected", () => {
        const result = fli("# myVariable");
        assert.ok(result, "should produce FLI params");
        assert.ok(result!.includes('"myVariable"'), `unexpected params: ${result}`);
    });

    test("expression with # and multiple spaces is detected (issue #24)", () => {
        const result = fli("#  myVariable");
        assert.ok(result, "should produce FLI params");
        assert.ok(result!.includes('"myVariable"'), `unexpected params: ${result}`);
    });

    test("indented expression line (leading spaces before #) is detected", () => {
        const result = fli("  # myVariable");
        assert.ok(result, "should produce FLI params");
        assert.ok(result!.includes('"myVariable"'), `unexpected params: ${result}`);
    });

    test("indented line with multiple spaces before and after # is detected", () => {
        const result = fli("  #  myVariable");
        assert.ok(result, "should produce FLI params");
        assert.ok(result!.includes('"myVariable"'), `unexpected params: ${result}`);
    });

    // --- variable assignment -----------------------------------------------

    test("variable assignment extracts variable name", () => {
        const result = fli("myVar := 42");
        assert.ok(result, "should produce FLI params");
        assert.ok(result!.includes('"myVar"'), `unexpected params: ${result}`);
    });

    test("indented variable assignment extracts variable name", () => {
        const result = fli("  myVar := 42");
        assert.ok(result, "should produce FLI params");
        assert.ok(result!.includes('"myVar"'), `unexpected params: ${result}`);
    });
});
