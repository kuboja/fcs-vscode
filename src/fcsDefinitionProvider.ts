import * as vscode from "vscode";
import { FcsSymbolProvider } from "./fcsSymbolUtil";


export class FcsDefinitionProvider implements vscode.DefinitionProvider {

    public async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
        Promise<vscode.Location | undefined> {

        let wordRange = document.getWordRangeAtPosition(position);

        if (wordRange === undefined) {
            return;
        }

        let symbolsInDoc = FcsSymbolProvider.getSymbolsInDocument(document, token);

        let word = document.getText(wordRange);

        if (word === undefined) {
            return;
        }

        let lacation: vscode.Location | undefined;

        for (const sym of symbolsInDoc) {
            if (sym.name === word) {
                lacation = sym.location;
                break;
            }
        }

        return lacation;
    }
}