import * as assert from "assert";
import * as path from "path";
import * as vscode from "vscode";
import { FcsDefinitionProvider } from "../fcsDefinitionProvider";

// ---------------------------------------------------------------------------
// Minimal TextDocument mock
// ---------------------------------------------------------------------------
function makeDoc(lines: string[], fsPath: string): vscode.TextDocument {
    return {
        lineCount: lines.length,
        lineAt: (i: number) => ({ text: lines[i] } as vscode.TextLine),
        uri: vscode.Uri.file(fsPath),
    } as vscode.TextDocument;
}

const DOC_URI  = vscode.Uri.file("C:/project/model.fcs");
const DOC_DIR  = path.dirname(DOC_URI.fsPath);
const DOC_PATH = DOC_URI.fsPath;

function pos(character: number): vscode.Position {
    return new vscode.Position(0, character);
}

// ---------------------------------------------------------------------------
suite("FcsDefinitionProvider - getGclassFilenameAtPosition", () => {

    const LINE = 'gclass {res} filename "_FcsComponentResources.fcs"';
    //            0123456789...
    // "  starts at index 22, ends at index 49

    function doc(line: string): vscode.TextDocument {
        return makeDoc([line], DOC_PATH);
    }

    test("cursor on opening quote returns file path", () => {
        const quoteIdx = LINE.indexOf('"');
        const result = FcsDefinitionProvider.getGclassFilenameAtPosition(doc(LINE), pos(quoteIdx));
        assert.strictEqual(result, path.resolve(DOC_DIR, "_FcsComponentResources.fcs"));
    });

    test("cursor inside filename string returns file path", () => {
        const quoteIdx = LINE.indexOf('"');
        const result = FcsDefinitionProvider.getGclassFilenameAtPosition(doc(LINE), pos(quoteIdx + 5));
        assert.strictEqual(result, path.resolve(DOC_DIR, "_FcsComponentResources.fcs"));
    });

    test("cursor on closing quote returns file path", () => {
        const closingIdx = LINE.lastIndexOf('"');
        const result = FcsDefinitionProvider.getGclassFilenameAtPosition(doc(LINE), pos(closingIdx));
        assert.strictEqual(result, path.resolve(DOC_DIR, "_FcsComponentResources.fcs"));
    });

    test("cursor before opening quote (on keyword) returns undefined", () => {
        const quoteIdx = LINE.indexOf('"');
        const result = FcsDefinitionProvider.getGclassFilenameAtPosition(doc(LINE), pos(quoteIdx - 1));
        assert.strictEqual(result, undefined);
    });

    test("cursor after closing quote returns undefined", () => {
        const closingIdx = LINE.lastIndexOf('"');
        const result = FcsDefinitionProvider.getGclassFilenameAtPosition(doc(LINE), pos(closingIdx + 1));
        assert.strictEqual(result, undefined);
    });

    test("cursor on gclass name returns undefined", () => {
        const result = FcsDefinitionProvider.getGclassFilenameAtPosition(doc(LINE), pos(8));
        assert.strictEqual(result, undefined);
    });

    test("non-gclass line returns undefined", () => {
        const line = 'material {mat} filename "mat.fcs"';
        const quoteIdx = line.indexOf('"');
        const result = FcsDefinitionProvider.getGclassFilenameAtPosition(doc(line), pos(quoteIdx + 1));
        assert.strictEqual(result, undefined);
    });

    test("gclass line without filename returns undefined", () => {
        const line = "gclass {res} someattr (val)";
        const result = FcsDefinitionProvider.getGclassFilenameAtPosition(doc(line), pos(10));
        assert.strictEqual(result, undefined);
    });

    test("relative path is resolved relative to document directory", () => {
        const line = 'gclass {res} filename "subdir/MyClass.fcs"';
        const quoteIdx = line.indexOf('"');
        const result = FcsDefinitionProvider.getGclassFilenameAtPosition(doc(line), pos(quoteIdx + 1));
        assert.strictEqual(result, path.resolve(DOC_DIR, "subdir/MyClass.fcs"));
    });

    test("multiple spaces between filename keyword and quote are handled", () => {
        const line = 'gclass {res} filename  "_FcsComponentResources.fcs"';
        const quoteIdx = line.indexOf('"');
        const result = FcsDefinitionProvider.getGclassFilenameAtPosition(doc(line), pos(quoteIdx + 1));
        assert.strictEqual(result, path.resolve(DOC_DIR, "_FcsComponentResources.fcs"));
    });

    test("filename in parens — cursor inside string returns file path", () => {
        const line = 'gclass {res} filename ("_FcsComponentResources.fcs")';
        const quoteIdx = line.indexOf('"');
        const result = FcsDefinitionProvider.getGclassFilenameAtPosition(doc(line), pos(quoteIdx + 1));
        assert.strictEqual(result, path.resolve(DOC_DIR, "_FcsComponentResources.fcs"));
    });

    test("filename in parens — cursor before opening paren returns undefined", () => {
        const line = 'gclass {res} filename ("_FcsComponentResources.fcs")';
        const parenIdx = line.indexOf('(');
        const result = FcsDefinitionProvider.getGclassFilenameAtPosition(doc(line), pos(parenIdx - 1));
        assert.strictEqual(result, undefined);
    });

    test("filename in parens with extra spaces — cursor inside string returns file path", () => {
        const line = 'gclass {res} filename  ("_FcsComponentResources.fcs")';
        const quoteIdx = line.indexOf('"');
        const result = FcsDefinitionProvider.getGclassFilenameAtPosition(doc(line), pos(quoteIdx + 3));
        assert.strictEqual(result, path.resolve(DOC_DIR, "_FcsComponentResources.fcs"));
    });
});
