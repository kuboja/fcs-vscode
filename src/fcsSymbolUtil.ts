import * as vscode from "vscode";
import * as path from "path";


export enum fcsSymbolType {

    Unknown,
    GClass,
    VariableNumber,
    VariableString,
    Function
}


export class FcsSymbolInformation extends vscode.SymbolInformation {

    public name: string = "";
    public kspSymbolType: fcsSymbolType = fcsSymbolType.Unknown;
    public isConst: boolean = false;
    public description: string = "";
    public lineNumber: number = -1;
    public column: number = -1;
}


export class FcsSymbolProvider implements vscode.DocumentSymbolProvider {

    public provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.SymbolInformation[] {
        return FcsSymbolProvider.getSymbolsInDocument(document, token);
    }

    /** Returns absolute paths of all files imported by this document. */
    public static getImportPathsInDocument(document: vscode.TextDocument): string[] {
        const regImport = /^\s*import\s+"([^"]+)"/;
        const dir = path.dirname(document.uri.fsPath);
        const paths: string[] = [];

        for (let line = 0; line < document.lineCount; line++) {
            const match = document.lineAt(line).text.match(regImport);
            if (match) {
                paths.push(path.resolve(dir, match[1]));
            }
        }
        return paths;
    }

    /**
     * Returns a map of gclass name → absolute file path for all lines of the form
     * `gclass {Name} ... filename "file.fcs"` or `filename ("file.fcs")` in the document.
     */
    public static getGclassFileReferences(document: vscode.TextDocument): Map<string, string> {
        const reg = /^gclass\s+\{([a-zA-Z][a-zA-Z0-9_]*)\}.*?\bfilename\s+\(?"([^"]+)"\)?/;
        const dir = path.dirname(document.uri.fsPath);
        const result = new Map<string, string>();

        for (let line = 0; line < document.lineCount; line++) {
            const match = document.lineAt(line).text.match(reg);
            if (match) {
                result.set(match[1], path.resolve(dir, match[2]));
            }
        }
        return result;
    }

    /** Maps FCS definition keywords to their VS Code SymbolKind. */
    public static readonly keywordKinds: ReadonlyMap<string, vscode.SymbolKind> = new Map([
        ["gclass",        vscode.SymbolKind.Class],
        ["gblock",        vscode.SymbolKind.Object],
        ["material",      vscode.SymbolKind.Object],
        ["thickness",     vscode.SymbolKind.Object],
        ["planestress",   vscode.SymbolKind.Object],
        ["traction",      vscode.SymbolKind.Object],
        ["area",          vscode.SymbolKind.Object],
        ["curve",         vscode.SymbolKind.Object],
        ["vertex",        vscode.SymbolKind.Object],
        ["layer",         vscode.SymbolKind.Object],
        ["volume",        vscode.SymbolKind.Object],
        ["distribution",  vscode.SymbolKind.Object],
        ["beam",          vscode.SymbolKind.Object],
        ["cross_section", vscode.SymbolKind.Object],
        ["pointlcs",      vscode.SymbolKind.Object],
        ["lcs",           vscode.SymbolKind.Object],
        ["curvelcs",      vscode.SymbolKind.Object],
        ["shell",         vscode.SymbolKind.Object],
        ["load",          vscode.SymbolKind.Object],
        ["support",       vscode.SymbolKind.Object],
        ["mesharea",      vscode.SymbolKind.Object],
        ["meshcurve",     vscode.SymbolKind.Object],
        ["meshvertex",    vscode.SymbolKind.Object],
    ]);

    public static getSymbolsInDocument(document: vscode.TextDocument, token?: vscode.CancellationToken): vscode.SymbolInformation[] {
        const result: vscode.SymbolInformation[] = [];
        const lineCount: number = Math.min(document.lineCount, 10000);

        const regFunctionDefinition: RegExp = /^([a-zA-Z][a-zA-Z0-9_]+)\s*(:?=)\s*(?:\(\s*)?([a-zA-Z][a-zA-Z0-9\s,]*)=>/;
        const regVariableDefinition: RegExp = /^([a-zA-Z][a-zA-Z0-9_]+)\s*(:?=)/;
        const regBraceName: RegExp = /\{([a-zA-Z][a-zA-Z0-9_]*)\}/;

        for (let line: number = 0; line < lineCount; line++) {
            if (token && token.isCancellationRequested) { break; }

            const { text } = document.lineAt(line);

            if (text.length === 0 || text[0] === " " || text[0] === "#") { continue; }

            let name: string | null = null;
            let kind: vscode.SymbolKind = vscode.SymbolKind.Variable;

            // Check for keyword {name} patterns (gclass, gblock, material, …)
            for (const [keyword, kwKind] of FcsSymbolProvider.keywordKinds) {
                if (text.startsWith(keyword + " ") || text === keyword) {
                    const match = text.match(regBraceName);
                    if (match) {
                        name = match[1];
                        kind = kwKind;
                    }
                    break;
                }
            }

            // Check for variable / function definitions (only if no keyword matched)
            if (name === null && (text.includes(":=") || text.includes("="))) {
                if (text.includes("=>")) {
                    const functionName = text.match(regFunctionDefinition);
                    if (functionName !== null && functionName.length > 0) {
                        name = (functionName.length > 1) ? functionName[1] : functionName[0];
                        kind = vscode.SymbolKind.Function;
                    }
                }

                if (name === null) {
                    const variableName = text.match(regVariableDefinition);
                    if (variableName !== null && variableName.length > 0) {
                        name = (variableName.length > 1) ? variableName[1] : variableName[0];
                    }
                }
            }

            if (name !== null && name.length > 0) {
                const posStart = new vscode.Position(line, 0);
                const posEnd = this.endOfDefinition(document, line);
                const range = new vscode.Range(posStart, posEnd);

                line = posEnd.line;

                result.push(new vscode.SymbolInformation(
                    name,
                    kind,
                    "",
                    new vscode.Location(document.uri, range)
                ));
            }
        }

        //console.log("End - Count: " + couter + " - Time: " + ( Date.now() - time ));
        //let sorted= result.sort(((s1, s2) => FcsSymbolProvider.copmareStrings(s1.name, s2.name)));
        return result;
    }

    public static copmareStrings(a: string, b: string): number {
        let nameA = a.toUpperCase(); // ignore upper and lowercase
        let nameB = b.toUpperCase(); // ignore upper and lowercase
        if (nameA < nameB) {
            return -1;
        }
        if (nameA > nameB) {
            return 1;
        }

        // names must be equal
        return 0;
    }

    private static endOfDefinition(document: vscode.TextDocument, startLine: number) {
        let text: string = document.lineAt(startLine).text;

        let lengthOfLine = text.length;
        let numberOfLine = 1;
        let endPosition: { line: number; position: number } | undefined;
        let line = startLine;

        let endOfLine = text;
        let lastPosition = 0;

        while (endOfLine.includes("(") || endOfLine.includes("{") || endOfLine.includes("[")) {

            let firstBracket = this.findOpeningBracket(text, lastPosition);

            if (firstBracket !== undefined) {
                endPosition = this.findClosingBracket(document, line, firstBracket.position, firstBracket.bracket);

                if (endPosition !== undefined) {
                    let textLine: string = text;
                    lastPosition = endPosition.position;
                    if (endPosition.line !== line) {
                        textLine = document.lineAt(endPosition.line).text;
                        lastPosition = 0;
                        text = textLine;
                        line = endPosition.line;
                    }
                    endOfLine = textLine.substr(endPosition.position);

                    continue;
                }
            }

            break;
        }

        if (endPosition !== undefined) {
            lengthOfLine = document.lineAt(endPosition.line).text.length;
            numberOfLine = endPosition.line - line + 1;
        }

        return new vscode.Position(line + numberOfLine - 1, lengthOfLine);
    }

    private static findOpeningBracket(text: string, startPos: number): { position: number; bracket: Brackets } | undefined {
        let posPar = text.indexOf("(", startPos);
        let posSqr = text.indexOf("[", startPos);
        let posCur = text.indexOf("{", startPos);
        let max = Math.max(posPar, posSqr, posCur);

        if (max === -1) { return undefined; }

        switch (max) {
            case posPar: return { position: max, bracket: Brackets.Parenthesis };
            case posSqr: return { position: max, bracket: Brackets.SquareBracket };
            case posCur: return { position: max, bracket: Brackets.CurlyBracket };
            default: return undefined;
        }
    }

    private static findClosingBracket(document: vscode.TextDocument, startLine: number, startPosition: number, bracketType: Brackets): { line: number; position: number } | undefined {
        const rExp = Bracket.RegExForBoth(bracketType);
        const leftBracket = Bracket.LeftBracket(bracketType);

        const lineCount: number = Math.min(document.lineCount, 10000);

        rExp.lastIndex = startPosition + 1;

        let deep = 1;
        let pos: RegExpExecArray | null;

        for (let iLine: number = startLine; iLine < lineCount; iLine++) {

            let str = document.lineAt(iLine).text;

            while ((pos = rExp.exec(str))) {
                if (!(deep += str[pos.index] === leftBracket ? 1 : -1)) {
                    return { line: iLine, position: pos.index };
                }
            }
        }

        return undefined;
    }
}

enum Brackets {

    Parenthesis,
    SquareBracket,
    CurlyBracket,
}

class Bracket {

    public static LeftBracket(bracketType: Brackets): string {
        switch (bracketType) {
            case Brackets.Parenthesis: return "(";
            case Brackets.SquareBracket: return "[";
            case Brackets.CurlyBracket: return "{";
        }
    }

    public static RightBracket(bracketType: Brackets): string {
        switch (bracketType) {
            case Brackets.Parenthesis: return ")";
            case Brackets.SquareBracket: return "]";
            case Brackets.CurlyBracket: return "}";
        }
    }

    public static RegExForBoth(bracketType: Brackets): RegExp {
        switch (bracketType) {
            case Brackets.Parenthesis: return /\(|\)/g;
            case Brackets.SquareBracket: return /\[|\]/g;
            case Brackets.CurlyBracket: return /\{|\}/g;
        }
    }
}