"use strict";

import * as vscode from "vscode";
import { FcsGrammar, GrammarType } from "./fcsGrammar";
import { ExtensionData } from "./extensionData";


export class FcsCompletionItemProvider implements vscode.CompletionItemProvider {

    //private extData: ExtensionData;
    private grammar : FcsGrammar;

    constructor(extData: ExtensionData) {
        //this.extData = extData;
        this.grammar = extData.grammar;
    }

    public async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
        Promise<vscode.CompletionItem[] | undefined> {

            
        //console.log("run FcsCompletionItemProvider");

        return this.getSuggestions(document, position, token);
    }

    private async getSuggestions(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
    Promise<vscode.CompletionItem[] | undefined> {

        var grammar : FcsGrammar = this.grammar;

        // text, který je před kurozorem: Fcs.Action.Cl| -> "Fcs.Action.Cl"
        var priorWord: string | undefined = grammar.priorWord(document, position);

        // slovo ve kterém je kurzor: 
        var currentWord: string | undefined = grammar.currentWord(document, position);

        // je tečka před kurzorem?
        var dotBefore: boolean = grammar.dotBefore(document, position, currentWord ? currentWord : "");

        var numberOfDot: number = 0;
        var filteredObjects: GrammarType[] = [];

        if (priorWord) {
            numberOfDot = (priorWord.match(/\./g) || []).length;
        }

        if (token.isCancellationRequested) return;

        // pokud je před kurzor na nějaká tečka, tak se vyfiltrují vhodné položky
        if (numberOfDot > 0) {
            filteredObjects = grammar.GrammarNodes.filter( v => v.dot === numberOfDot && v.key.startsWith(priorWord ? priorWord : ""));
        }

        if (token.isCancellationRequested) return;

        // pokud nebyla tečka v textu před kurzorem nebo nebyl nalezen žádný vhodný node
        if (filteredObjects.length === 0 ) {
            if ( dotBefore ) {
                numberOfDot = -1;
            }
            var startWith: string = currentWord ? currentWord : "";
            filteredObjects = grammar.GrammarNodes.filter( v => v.dot === numberOfDot && v.key.startsWith( startWith ));
        }

        if (token.isCancellationRequested) return;

        //console.log(priorWord  + " | " + currentWord + " | " + numberOfDot + " | " + filteredObjects.map(v => v.name).join(", "));

        var CompletionItems: vscode.CompletionItem[] = filteredObjects.map(v => v.GetCompletionItem());

        return CompletionItems;
    }
}