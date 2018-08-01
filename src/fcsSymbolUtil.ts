"use strict";

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
        const result: vscode.SymbolInformation[] = [];
        const lineCount: number = Math.min(document.lineCount, 10000);

        // console.log("Start");
        // var time = Date.now();
        // var couter = 0;

        const regFunctionDefinition: RegExp = /^([a-zA-Z][a-zA-Z0-9_]+)\s*(=|:=)\s*(?:\(\s*)?([a-zA-Z][a-zA-Z0-9\s,]*)=>/;
        const regVariableDefinition: RegExp = /^([a-zA-Z][a-zA-Z0-9_]+)\s*(=|:=)/;

        for (let line: number = 0; line < lineCount; line++) {
            if (token.isCancellationRequested) break;

            const { text } = document.lineAt(line);

            if (text.length == 0 ) continue;

            if (text[0] == " " || text[0] == "#" || text.startsWith("gblock")) continue;

            let name: string;
            let kind: vscode.SymbolKind = vscode.SymbolKind.Variable;

            if (text.includes(":=")) {
                let functionName: RegExpMatchArray

                if (text.includes("=>")) {
                    functionName = text.match(regFunctionDefinition);
                }

                if (functionName != null && functionName.length > 0) {
                    name = (functionName.length > 1) ? functionName[1] : functionName[0];
                    kind = vscode.SymbolKind.Function;
                } else {
                    let variableName: RegExpMatchArray = text.match(regVariableDefinition);
                    if (variableName != null && variableName.length > 0) {
                        name = (variableName.length > 1) ? variableName[1] : variableName[0];
                    }
                }
            }

            if (name != null) {
                if (name.length > 0) {
                    result.push(new vscode.SymbolInformation(
                        name,
                        kind,
                        "",
                        new vscode.Location(document.uri, new vscode.Position(line, 0))));
                }
            }
            // couter++;
        }

        // console.log("End - Count: " + couter + " - Time: " + ( Date.now() - time ));


        return result;
    }
}