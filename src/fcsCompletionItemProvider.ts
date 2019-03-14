"use strict";

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
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

export class GClass{
    public name? : string;
    public filename? : string;
    public parameters? : string;
}

export enum FcsCallerType {

    Class = 1,
    Function,
    Array,
    Property,
}

class CallerProperties {

    public range : vscode.Range;
    public text : string;

    constructor(startLine : number, startChar : number, endLine : number, endChar : number, text : string) {
        this.range = new vscode.Range(startLine, startChar, endLine, endChar);
        this.text = text;
    }
}

class TargetProperties {

    public range : vscode.Range;
    public text : string;

    constructor(startLine : number, startChar : number, endLine : number, endChar : number, text : string) {
        this.range = new vscode.Range(startLine, startChar, endLine, endChar);
        this.text = text;
    }
}

enum FcsTargetType{
    Unknown = 1,
    FileConstant,
    FileProperty,
    ClassConstant,
    ClassProperty,
    Function,
    FunctionParameter,
    GClass,
    OtherObject,

}

export class FcsTarget {
    public type: FcsTargetType;
    public tag: TargetProperties;
    public content : TargetProperties | undefined;

    public otherType? : string;

    public filename? : string;

    constructor(type: FcsTargetType, tag : TargetProperties, content : TargetProperties | undefined = undefined) {
        this.type = type;
        this.tag = tag;
        this.content = content;
    }
}

export class FcsCaller {

    public type: FcsCallerType;
    public tag : CallerProperties;
    public content : CallerProperties | undefined;

    constructor(type: FcsCallerType, tag : CallerProperties, content : CallerProperties | undefined = undefined) {
        this.type = type;
        this.tag = tag;
        this.content = content;
    }

    public getHover(){
        let type = "";
        switch (this.type) {
            case FcsCallerType.Class: type = "(class)"; break;
            case FcsCallerType.Function: type = "(function)"; break;
            case FcsCallerType.Array: type = "(array)"; break;
            case FcsCallerType.Property: type = "(property)"; break;
        }

        return this.tag.text + " " + type;
    }
}

export class WordTools{

    public static parseFunction(_doc: vscode.TextDocument, _caller : FcsCaller){

    }

    public static getCallerTypeFromBracket( bracketChar : string ) : FcsCallerType {
        if(bracketChar.length <= 0) { return FcsCallerType.Property; }
        
        switch (bracketChar[0]) {
            case "(": case ")": return FcsCallerType.Function;
            case "[": case "]": return FcsCallerType.Array;
            case "{": case "}": return FcsCallerType.Class;
            default: return FcsCallerType.Property;
        }
    }

    public static getFileClasses(doc: vscode.TextDocument): string[] | undefined {
        if (doc.uri.scheme === "file") {
            let filePath = doc.uri.fsPath;
            let dir = path.dirname(filePath);

            if (dir) {
                return WordTools.getFileClassInFolder(dir);
            }
        }

        return;
    }

    public static getFileClassInFolder(folder: string): string[] {
        let names: string[] = [];

        fs.readdirSync(folder).forEach(file => {
            try {
                const typ: fs.Stats = fs.statSync(path.join(folder, file));
                if (typ && typ.isFile() && file.endsWith(".fcs")) {
                    names.push(file.substr(0, file.length - 4));
                }
            } catch { }
        });

        return names;
    }

    public static getDocTargets(doc: vscode.TextDocument, token: vscode.CancellationToken): FcsTarget[] | undefined {
        
        const result: FcsTarget[] = [];
        const lineCount: number = Math.min(doc.lineCount, 10000);

        //console.log("Start");
        //let time = Date.now();
        //let couter = 0;

        const regFunctionDefinition: RegExp = /^([a-zA-Z][a-zA-Z0-9_]+)\s*(:?=)\s*(?:\(\s*)?([a-zA-Z][a-zA-Z0-9\s,]*)=>/;
        const regVariableDefinition: RegExp = /^([a-zA-Z][a-zA-Z0-9_]+)\s*(:?=)/;
        const regGnameDefinition: RegExp = /^([a-zA-Z][a-zA-Z0-9_]+)\s+{([a-zA-Z][a-zA-Z0-9_]+)}\s+/;

        for (let line: number = 0; line < lineCount; line++) {
            if (token.isCancellationRequested) { break; }

            const { text } = doc.lineAt(line);

            if (text.length === 0 || text[0] === " " || text[0] === "#") { continue; }

            let name: string = "";
            let kind: FcsTargetType = FcsTargetType.Unknown;
            let filename: string | undefined;
            let otherType: string = "";

            let gname: RegExpMatchArray | null = text.match(regGnameDefinition);
            if (gname !== null && gname.length > 0) {
                name = (gname.length > 1) ? gname[2] : gname[0];

                if (name.startsWith("{")) {
                    name = name.substr(1, name.length - 2);
                }

                if (text.startsWith("gclass")) {
                    kind = FcsTargetType.GClass;

                    const fileNameReg = /\s+filename\s+\(?"(.+)"\)?\s+/;
                    let filenameResult: RegExpMatchArray | null = text.match(fileNameReg);
                    if (filenameResult && filenameResult.length > 0){
                        filename = filenameResult[1];
                    }
                }
                else {
                    kind = FcsTargetType.OtherObject;
                    otherType = gname[1];
                }
            }

            if (text.includes(":=") || text.includes("=")) {
                let functionName: RegExpMatchArray | null = null;

                if (text.includes("=>")) {
                    functionName = text.match(regFunctionDefinition);
                }

                if (functionName !== null && functionName.length > 0) {
                    name = (functionName.length > 1) ? functionName[1] : functionName[0];
                    kind = FcsTargetType.FunctionParameter;
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
                    let posEnd = this.getEndOfDefinition(doc, line);
                    //let range = new vscode.Range(posStart, posEnd);

                    line = posEnd.line;

                    let prop = new TargetProperties(posStart.line, posStart.character, posEnd.line, posEnd.character, name);
                    let ta = new FcsTarget(kind, prop);
                    ta.filename = filename;
                    ta.otherType = otherType;

                    result.push(ta);
                }
            }
            //couter++;
        }

        //console.log("End - Count: " + couter + " - Time: " + ( Date.now() - time ));
        //let sorted= result.sort(((s1, s2) => FcsSymbolProvider.copmareStrings(s1.name, s2.name)));

        return result;
    }

    private static getEndOfDefinition(document: vscode.TextDocument, startLine: number) {
        let text: string = document.lineAt(startLine).text;

        let lengthOfLine = text.length;
        let numberOfLine = 1;
        let endPosition: vscode.Position | undefined;
        let line = startLine;

        let endOfLine = text;
        let lastPosition = 0;

        while (endOfLine.includes("(") || endOfLine.includes("{") || endOfLine.includes("[")) {

            let firstBracket = this.findOpeningBracket(text, lastPosition);

            if (firstBracket !== undefined) {
                endPosition = this.findClosingBracket(document, line, firstBracket.position, firstBracket.bracket);

                if (endPosition !== undefined) {
                    let textLine: string = text;
                    lastPosition = endPosition.character;
                    if (endPosition.line !== line) {
                        textLine = document.lineAt(endPosition.line).text;
                        lastPosition = 0;
                        text = textLine;
                        line = endPosition.line;
                    }
                    endOfLine = textLine.substr(endPosition.character);

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

    public static getParts(doc: vscode.TextDocument, cursorLine: number, cursorChar: number) : FcsCaller[] | undefined{

        const startPos = this.getWordStartPosition(doc, cursorLine, cursorChar);
        const endPos = this.getWordEndPosition(doc, cursorLine, cursorChar);

        if (!startPos || !endPos) {
            return;
        }

        // pokud není prvním znakem povolený znak, nejedná se o "řetězec" -> nemá smysl popkračovat
        if (!this.isAllowableNameChar(doc.lineAt(startPos.line).text[startPos.character])) {
            return;
        }

        let callerPath : FcsCaller [] = [];

        let iChar = startPos.character;
        let tagChar = iChar;
        let tagLine = startPos.line;
        for (let iLine = startPos.line; iLine < endPos.line+1; iLine++) {
            let textline = doc.lineAt(iLine).text;
            let endChar = iLine === endPos.line ? endPos.character : textline.length - 1;
            
            for (iChar; iChar < endChar+1; iChar++){
                let char = textline[iChar];

                if (Bracket.isAnyLeftBracket(char)) {

                    const endPosBracket = this.findAnyEndingBracket(doc, iLine, iChar, char);
                    if (!endPosBracket) { // pokud nebyla nalezena konečná závorka -> chyba v syntaxi -> nemá smysl pokračovat
                        return;
                    }

                    
                    let charNext = doc.lineAt(endPosBracket.line).text[endPosBracket.character+1];

                    // buď je pozice konce závorky rovna konci "řetězce" nebo musí být závorka následována ".", jinak -> chyba v syntaxi -> nemá smysl pokračovat
                    if (!(endPosBracket.compareTo( endPos ) === 0 || charNext === ".")) {
                        return;
                    }

                    let tag = new CallerProperties(tagLine, tagChar, iLine, iChar - 1, doc.getText( new vscode.Range(tagLine, tagChar, iLine, iChar) ));
                    let content = new CallerProperties(iLine, iChar, endPosBracket.line, endPosBracket.character, doc.getText( new vscode.Range(iLine, iChar, endPosBracket.line, endPosBracket.character) ));               
                    let type = this.getCallerTypeFromBracket(char);
                    
                    let caller = new FcsCaller(type, tag, content);
                    callerPath.push(caller);

                    if (endPosBracket.line !== iLine) {
                        iLine = endPosBracket.line;
                        textline = doc.lineAt(iLine).text;
                        endChar = iLine === endPos.line ? endPos.character : textline.length - 1;
                    }
                    
                    iChar = endPosBracket.character;
                    char = textline[iChar];

                    tagLine = iLine;
                    tagChar = iChar + 2;
                    iChar++;

                } else if (char === "."){
                    let tag = new CallerProperties(tagLine, tagChar, iLine, iChar - 1, doc.getText( new vscode.Range(tagLine, tagChar, iLine, iChar) ));
                    let caller = new FcsCaller(FcsCallerType.Property, tag);
                    callerPath.push(caller);

                    tagChar = iChar + 1;
                }
            }
        }

        let endchar = doc.lineAt(endPos.line).text[endPos.character];
        if (!Bracket.isAnyRightBracket(endchar)){
            let tag = new CallerProperties(tagLine, tagChar, endPos.line, endPos.character, doc.getText( new vscode.Range(tagLine, tagChar, endPos.line, endPos.character+1) ));
            let caller = new FcsCaller(FcsCallerType.Property, tag);
            callerPath.push(caller);
        }

        return callerPath;
    }

    public static getWordStartPosition(doc: vscode.TextDocument, startLine: number, startChar: number): vscode.Position | undefined {

        let iLine = startLine;
        let iChar = startChar;
        let textline = doc.lineAt(iLine).text;

        for (iChar; iChar >= 0; iChar--) {
            let char = textline[iChar];
            if (Bracket.isAnyRightBracket(char)) {
                const newPos = this.findAnyStartingBracket(doc, iLine, iChar, char);
                if (!newPos) { continue; }
                textline = doc.lineAt(newPos.line).text;
                iLine = newPos.line;
                iChar = newPos.character;
            } else if (char === ".") {
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
                if (!newPos) { continue; }
                textline = doc.lineAt(newPos.line).text;
                iLine = newPos.line;
                iChar = newPos.character;
            } else if (char === "."){
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
        
        if (text === undefined || text.length === 0) { return; }

        for (let curPos = pos.character; curPos > 0; curPos--) {
            if (text[curPos] === " ") {
                break;
            }
            //console.log( text[curPos] + " " + curPos)
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
        if (!bracket) { return; }

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
        if (!bracket) { return; }

        return this.findClosingBracket(doc, startLine, startPosition, bracket);
    }

    public static findStaringBracket(document: vscode.TextDocument, startLine: number, startPosition: number, bracketType: Brackets): vscode.Position | undefined {
        if (startLine >= document.lineCount) { return; }
        
        const rExp = Bracket.RegExForBoth(bracketType);
        const leftBracket = Bracket.LeftBracket(bracketType);

        let deep = 0;

        for (let iLine: number = startLine; iLine >= 0; iLine--) {

            let str = document.lineAt(iLine).text;

            if (iLine === startLine) {
                if (startPosition >= str.length) {
                    return;
                }
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
        if (startLine >= document.lineCount) {
            return;
        }
        
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

        // slovo ve kterém je kurzor
        var currentWord: string | undefined = grammar.currentWord(document, position);

        // je tečka před kurzorem?
        var dotBefore: boolean = grammar.dotBefore(document, position, currentWord ? currentWord : "");

        var numberOfDot: number = 0;
        var filteredObjects: GrammarType[] = [];

        if (priorWord) {
            numberOfDot = (priorWord.match(/\./g) || []).length;
        }

        if (token.isCancellationRequested) { return; }

        // pokud je před kurzor na nějaká tečka, tak se vyfiltrují vhodné položky
        if (numberOfDot > 0) {
            filteredObjects = grammar.GrammarNodes.filter( v => v.dot === numberOfDot && v.key.startsWith(priorWord ? priorWord : ""));
        }

        if (token.isCancellationRequested) { return; }

        // pokud nebyla tečka v textu před kurzorem nebo nebyl nalezen žádný vhodný node
        if (filteredObjects.length === 0 ) {
            if ( dotBefore ) {
                numberOfDot = -1;
            }
            var startWith: string = currentWord ? currentWord : "";
            filteredObjects = grammar.GrammarNodes.filter( v => v.dot === numberOfDot && v.key.startsWith( startWith ));
        }

        if (token.isCancellationRequested) { return; }

        //console.log(priorWord  + " | " + currentWord + " | " + numberOfDot + " | " + filteredObjects.map(v => v.name).join(", "));

        var CompletionItems: vscode.CompletionItem[] = filteredObjects.map(v => v.GetCompletionItem());

        return CompletionItems;
    }
}