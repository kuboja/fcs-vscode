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

        for (let line: number = 0; line < lineCount; line++) {
            const { text } = document.lineAt(line);

            const regFunctionDefinition: RegExp = /^([a-zA-Z][a-zA-Z0-9_]+)(?= *(?:=|:=) *\(? *(?:[a-zA-Z0-9]+ *,? *)+=>)/;
            const regVariableDefinition: RegExp = /^([a-zA-Z][a-zA-Z0-9_]+) *(?= =| :=)/;

            let name: RegExpExecArray;
            let kind: vscode.SymbolKind = vscode.SymbolKind.Variable;

            let functionName: RegExpExecArray = regFunctionDefinition.exec(text);
            if (functionName != null && functionName.length > 0) {
                name = functionName;
                kind = vscode.SymbolKind.Function;
            } else {
                let variableName: RegExpExecArray = regVariableDefinition.exec(text);
                if (variableName != null && variableName.length > 0) {
                    name = variableName;
                }
            }

            if (name != null) {
                if (name.length > 0) {
                    result.push(new vscode.SymbolInformation(
                        name[0],
                        kind,
                        "",
                        new vscode.Location(document.uri, new vscode.Position(line, 0))));
                }
            }
        }

        return result;
    }
}