"use strict";

import * as vscode from "vscode";
import { FcsSymbolProvider } from "./fcsSymbolUtil";


export class FcsDefinitionProvider implements vscode.DefinitionProvider {
    
    
    public async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Location | undefined> {
        let wordRange = document.getWordRangeAtPosition(position);
        
        if (wordRange === undefined) {
            return;
        }

        let symbolsInDoc = FcsSymbolProvider.getSymbolsInDocumet(document, token);

        let word = document.getText(wordRange);

        if ( word == undefined ) {
            return;
        }

        let lacation : vscode.Location | undefined

        for (const sym of symbolsInDoc) {
            if (sym.name == word) {
                lacation = sym.location
                break;
            }
        }

        return lacation;


  
        // let uri: vscode.Uri = vscode.Uri.file("C:\\GitHub\\zaloha\\_Common\\FcsSections\\ThinCeeSection.fcs");
        // const statAsync = promisify(stat);
        // let check = await statAsync("C:\\GitHub\\zaloha\\_Common\\FcsSections\\ThinCeeSection.fcs");
        // if (!check.isFile) {
        //     return;
        // }
        // let range = new vscode.Range(10, 1, 10, 11);
        // return new vscode.Location(uri, range);
    }
}