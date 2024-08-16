import * as vscode from "vscode";
import { fcsSpaceGrammarNodes } from "./grammarNodes/fcsGrammarFcsSpace";
import { unitSpaceGrammarNodes } from "./grammarNodes/fcsGrammarUnitSpace";
import { globalSpaceGrammarNodes } from "./grammarNodes/fcsGrammarGlobalSpace";
import { GrammarType } from "./grammarNodes/grammarType";


export class FcsGrammar {

    private _grammarNodes: GrammarType[] | undefined;

    get GrammarNodes(): GrammarType[] {
        if (!this._grammarNodes) {
            this._grammarNodes = Array.prototype.concat(
                globalSpaceGrammarNodes,
                fcsSpaceGrammarNodes,
                unitSpaceGrammarNodes,
            );
        }
        return this._grammarNodes;
    }


    /** Match last word in text preceded by space or open paren/bracket. */
    // private priorWordPattern = /[\s\(\[]([A-Za-z0-9_\.]+)\s*$/;
    private priorWordPattern = /([A-Za-z][A-Za-z0-9_\.]*)$$/;

    public dotBefore(doc: vscode.TextDocument, pos: vscode.Position, currentWord: string): boolean {
        var text: string = doc.lineAt(pos.line).text;
        var currentWordLength: number = (currentWord) ? currentWord.length : 0;
        return text.substring(pos.character - 1 - currentWordLength, pos.character - currentWordLength) === ".";
    }

    /**
     * Get the previous word adjacent to the current position by getting the
     * substring of the current line up to the current position then use a compiled
     * regular expression to match the word nearest the end.
     */
    public priorWord(doc: vscode.TextDocument, pos: vscode.Position): string | undefined {
        var line: vscode.TextLine = doc.lineAt(pos.line);
        var text: string = line.text;
        const match: RegExpExecArray | null = this.priorWordPattern.exec(text.substring(0, pos.character));
        return (match !== null && match.length > 1) ? match[1] : undefined;
    }

    /**
     * Get the word at the current position.
     */
    public currentWord(doc: vscode.TextDocument, pos: vscode.Position): string | undefined {
        const range: vscode.Range | undefined = doc.getWordRangeAtPosition(pos);
        return (range !== undefined && !range.isEmpty) ? doc.getText(range) : undefined;
    }

}