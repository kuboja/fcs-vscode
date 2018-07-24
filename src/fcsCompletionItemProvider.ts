"use strict";

import * as vscode from "vscode";
import { FcsGrammar, GrammarType } from "./fcsGrammar";
import { ExtensionData } from "./extensionData";


export class FcsCompletionItemProvider implements vscode.CompletionItemProvider {

    private extData: ExtensionData;
    private grammar : FcsGrammar;

    constructor(extData: ExtensionData) {
        this.extData = extData;
        this.grammar = extData.grammar;
    }

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
        Thenable<vscode.CompletionItem[]> {

            
        //console.log("run FcsCompletionItemProvider");

        return Promise.resolve(this.getSuggestions(document, position, token));
    }

    private getSuggestions(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
    Promise<vscode.CompletionItem[]> {

        var grammar : FcsGrammar = this.grammar;

        var priorWord: string = grammar.priorWord(document, position);
        var currentWord: string = grammar.currentWord(document, position);
        var dotBefore: boolean = grammar.dotBefore(document, position, currentWord);

        var numberOfDot: number = 0;
        var filteredObjects: GrammarType[];

        if (priorWord) {
            numberOfDot = (priorWord.match(/\./g) || []).length;
        }

        if (numberOfDot > 0) {
            filteredObjects = grammar.GrammarNodes.filter( v => v.dot === numberOfDot && v.key.startsWith(priorWord));
        }

        if (!filteredObjects || filteredObjects.length === 0 ) {
            if ( dotBefore ) {
                numberOfDot = -1;
            }
            var startWith: string = currentWord ? currentWord : "";
            filteredObjects = grammar.GrammarNodes.filter( v => v.dot === numberOfDot && v.key.startsWith( startWith ));
        }

        //console.log(priorWord  + " | " + currentWord + " | " + numberOfDot + " | " + filteredObjects.map(v => v.name).join(", "));

        var CompletionItems: vscode.CompletionItem[] = filteredObjects.map(v => v.GetCompletionItem());

        return Promise.resolve(CompletionItems);
    }
}