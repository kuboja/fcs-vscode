"use strict";

import * as vscode from "vscode";
import { FcsGrammar, GrammarType } from "./fcsGrammar";
import { ExtensionData } from "./extensionData";
import { Bracket, Brackets } from "./fcsSymbolUtil";

// class CursorWord{

//     private document: vscode.TextDocument;
//     private position: vscode.Position;

//     /**
//      *
//      */
//     constructor(document: vscode.TextDocument, position: vscode.Position) {
//         this.document = document;
//         this.position = position;
//     }

//     public getWord(){
//         let prior = WordTools.priorWord(doc, pos);


//     }


// }

export class WordTools{
    
    public static getWordStartPosition(doc: vscode.TextDocument, startLine: number, startChar: number): vscode.Position | undefined {

        let iLine = startLine;
        let iChar = startChar;
        let textline = doc.lineAt(iLine).text;

        for (iChar; iChar >= 0; iChar--) {
            let char = textline[iChar];
            if (Bracket.isAnyRightBracket(char)) {
                const newPos = this.findAnyStartingBracket(doc, iLine, iChar, char);
                if (!newPos) continue;
                textline = doc.lineAt(newPos.line).text;
                iLine = newPos.line;
                iChar = newPos.character;
            } else if (char == ".") {
                continue;
            } else if (!this.isAllowableNameChar(char)) {
                return new vscode.Position(iLine, iChar + 1);
            }
        }

        return new vscode.Position(iLine, 0);
    }

    public static getWordEndPosition(doc: vscode.TextDocument, startLine: number, startChar: number): vscode.Position | undefined {

        let iLine = startLine;
        let iChar = startChar;
        let textline = doc.lineAt(iLine).text;

        for (iChar; iChar <= textline.length; iChar++) {
            let char = textline[iChar];
            if (Bracket.isAnyLeftBracket(char)) {
                const newPos = this.findAnyEndingBracket(doc, iLine, iChar, char);
                if (!newPos) continue;
                textline = doc.lineAt(newPos.line).text;
                iLine = newPos.line;
                iChar = newPos.character;
            } else if (char == "."){
                continue;
            } else if (!this.isAllowableNameChar(char)) {
                return new vscode.Position(iLine, iChar - 1);
            }
        }
        
        return new vscode.Position(iLine, textline.length - 1);
    }

    public static isAllowableNameChar(char: string){
        let reg = /^[a-zA-Z_]+$/;
        return  reg.test(char);
    }

    public static lookWordStart(doc: vscode.TextDocument, pos: vscode.Position): string | undefined{
        try {
            var line: vscode.TextLine = doc.lineAt(pos.line);
        } catch (error) { return; }
        

        var text: string = line.text;
        
        if (text == undefined || text.length == 0) return;

        for (let curPos = pos.character; curPos > 0; curPos--) {
            if (text[curPos] == " ") {
                break;
            }
            console.log( text[curPos] + " " + curPos)
        }

        return;
    }

    public static findAnyStartingBracket(doc: vscode.TextDocument, startLine: number, startPosition: number, _char: string): vscode.Position | undefined {
        let char: string;
        if (_char) {
            char = _char;
        } else {
            char = doc.lineAt(startLine).text[startPosition];
        }

        let bracket = Bracket.charToBracket(char);
        if (!bracket) return;

        return this.findStaringBracket(doc, startLine, startPosition, bracket);
    }

    public static findAnyEndingBracket(doc: vscode.TextDocument, startLine: number, startPosition: number, _char: string): vscode.Position | undefined {
        let char: string;
        if (_char) {
            char = _char;
        } else {
            char = doc.lineAt(startLine).text[startPosition];
        }

        let bracket = Bracket.charToBracket(char);
        if (!bracket) return;

        return this.findClosingBracket(doc, startLine, startPosition, bracket);
    }

    public static findStaringBracket(document: vscode.TextDocument, startLine: number, startPosition: number, bracketType: Brackets): vscode.Position | undefined {
        if (startLine >= document.lineCount)
            return;
        
        const rExp = Bracket.RegExForBoth(bracketType);
        const leftBracket = Bracket.LeftBracket(bracketType);

        let deep = 0;

        for (let iLine: number = startLine; iLine >= 0; iLine--) {

            let str = document.lineAt(iLine).text;

            if (iLine == startLine) {
                if (startPosition >= str.length)
                    return;
                str = str.substring(0, startPosition + 1);
            }

            let poss = this.getAllMatches(rExp, str);

            for (let index = poss.length - 1; index >= 0; index--) {
                const br = poss[index];
                if (!(deep += str[br.index] === leftBracket ? -1 : 1)) {
                    return new vscode.Position( iLine, br.index );
                }
            }
        }

        return;
    }

    public static getAllMatches(regex: RegExp, text: string): RegExpExecArray[] {
        var res: RegExpExecArray[] = [];
        var match: RegExpExecArray | null = null;

        if (regex.global) {
            while (match = regex.exec(text)) {
                res.push(match);
            }
        }
        else {
            if (match = regex.exec(text)) {
                res.push(match);
            }
        }

        return res;
    }

    public static findClosingBracket(document: vscode.TextDocument, startLine: number, startPosition: number, bracketType: Brackets): vscode.Position | undefined {
        if (startLine >= document.lineCount)
            return;
        
        const rExp = Bracket.RegExForBoth(bracketType);
        const leftBracket = Bracket.LeftBracket(bracketType);

        const lineCount: number = Math.min(document.lineCount, startLine + 10000);

        rExp.lastIndex = startPosition;
        
        let deep = 0;
        let pos: RegExpExecArray | null;

        for (let iLine: number = startLine; iLine < lineCount; iLine++) {

            let str = document.lineAt(iLine).text;

            while ((pos = rExp.exec(str))) {
                if (!(deep += str[pos.index] === leftBracket ? 1 : -1)) {
                    return new vscode.Position(iLine, pos.index);
                }
            }
        }

        return;
    }
}

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