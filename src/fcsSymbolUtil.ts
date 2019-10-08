import * as vscode from "vscode";


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

    public static getSymbolsInDocument(document: vscode.TextDocument, token?: vscode.CancellationToken): vscode.SymbolInformation[] {
        const result: vscode.SymbolInformation[] = [];
        const lineCount: number = Math.min(document.lineCount, 10000);

        //console.log("Start");
        //let time = Date.now();
        //let couter = 0;

        const regFunctionDefinition: RegExp = /^([a-zA-Z][a-zA-Z0-9_]+)\s*(:?=)\s*(?:\(\s*)?([a-zA-Z][a-zA-Z0-9\s,]*)=>/;
        const regVariableDefinition: RegExp = /^([a-zA-Z][a-zA-Z0-9_]+)\s*(:?=)/;
        const regGnameDefinition: RegExp = / *{([a-zA-Z][a-zA-Z0-9_]+)} *filename/;

        for (let line: number = 0; line < lineCount; line++) {
            if (token && token.isCancellationRequested) { break; }

            const { text } = document.lineAt(line);

            if (text.length === 0 || text[0] === " " || text[0] === "#") { continue; }

            let name: string | null = null;
            let kind: vscode.SymbolKind = vscode.SymbolKind.Variable;

            if (text.startsWith("gblock ") || text.startsWith("gclass ")) {
                let gname: RegExpMatchArray | null = text.match(regGnameDefinition);
                if (gname !== null && gname.length > 0) {
                    name = (gname.length > 1) ? gname[1] : gname[0];
                    if (text.startsWith("gblock ")) {
                        kind = vscode.SymbolKind.Object;
                    }
                    else {
                        kind = vscode.SymbolKind.Class;
                    }
                }
            }

            if (text.includes(":=") || text.includes("=")) {
                let functionName: RegExpMatchArray | null = null;

                if (text.includes("=>")) {
                    functionName = text.match(regFunctionDefinition);
                }

                if (functionName !== null && functionName.length > 0) {
                    name = (functionName.length > 1) ? functionName[1] : functionName[0];
                    kind = vscode.SymbolKind.Function;
                } else {
                    let variableName: RegExpMatchArray | null = text.match(regVariableDefinition);
                    if (variableName !== null && variableName.length > 0) {
                        name = (variableName.length > 1) ? variableName[1] : variableName[0];
                    }
                }
            }

            if (name !== null) {
                if (name.length > 0) {
                    let posStart = new vscode.Position(line, 0);
                    let posEnd = this.endOfDefinition(document, line);
                    let range = new vscode.Range(posStart, posEnd);

                    line = posEnd.line;

                    result.push(new vscode.SymbolInformation(
                        name,
                        kind,
                        "",
                        new vscode.Location(document.uri, range)
                    ));
                }
            }
            //couter++;
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