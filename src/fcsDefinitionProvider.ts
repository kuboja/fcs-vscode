"use strict";

import * as vscode from "vscode";

//import { stat } from "fs";
//import { promisify } from "util";
import { FcsSymbolProvider } from "./fcsSymbolUtil";
import { WordTools } from "./fcsCompletionItemProvider";


export class FcsDefinitionProvider implements vscode.DefinitionProvider, vscode.HoverProvider {
    
    
    public async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken)
        : Promise<vscode.Location | undefined> {

        let wordRange = document.getWordRangeAtPosition(position);
        
        if (wordRange === undefined) {
            return;
        }

        let symbolsInDoc = FcsSymbolProvider.getSymbolsInDocument(document, token);

        let word = document.getText(wordRange);

        if ( word === undefined ) {
            return;
        }

        let lacation : vscode.Location | undefined;

        for (const sym of symbolsInDoc) {
            if (sym.name === word) {
                lacation = sym.location;
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

    public async provideHover(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken)
    : Promise<vscode.Hover | undefined> {

        let parts = WordTools.getParts(document, position.line, position.character);
        if (parts && parts.length > 0){

            let range = new vscode.Range(parts[0].tag.range.start, parts[parts.length-1].tag.range.end);

            let hoverText = parts.map( val => val.getHover() ).join( " -> ");

            let hover = new vscode.Hover(hoverText,range);
            
            return hover;

        }
        return;
    }
    
    public dispose(){

    }

}