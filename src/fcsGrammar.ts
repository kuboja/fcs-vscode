import * as vscode from "vscode";
import { fcsSpaceGrammarNodes } from "./grammarNodes/fcsGrammarFcsSpace";
import { unitSpaceGrammarNodes } from "./grammarNodes/fcsGrammarUnitSpace";
import { globalSpaceGrammarNodes } from "./grammarNodes/fcsGrammarGlobalSpace";


export enum GrammarKind {
    Constant,
    Function,
    FunctionEmpty,
    Object,
    Property,
    Module,
    Order,
    OrderWithoutParameters,
}

export class GrammarType {
    public dot: number;
    public key: string;
    public description: string | undefined;
    public kind: GrammarKind = GrammarKind.Constant;

    public constructor(init?: Partial<GrammarType>) {
        this.dot = 0;
        this.key = "";
        Object.assign(this, init);
    }

    private _completionItem: vscode.CompletionItem | undefined;

    public GetCompletionItem(): vscode.CompletionItem {
        if (this._completionItem !== undefined) {
            return this._completionItem;
        }

        var itemLabel: string = this.name;
        var itemKind: vscode.CompletionItemKind = this.GetCompletionItemKind();

        var item: vscode.CompletionItem = new vscode.CompletionItem(itemLabel, itemKind);
        item.detail = this.description;

        if (this.kind === GrammarKind.Function) {
            item.insertText = new vscode.SnippetString(itemLabel + "( ${1} )");
        } else if (this.kind === GrammarKind.FunctionEmpty) {
            item.insertText = itemLabel + "()";
        } else if (this.kind === GrammarKind.Object) {
            item.insertText = new vscode.SnippetString(itemLabel + "{ ${1} }");
        } else if (this.kind === GrammarKind.Order) {
            item.insertText = itemLabel + " ";
        }

        this._completionItem = item;

        return item;
    }

    private GetCompletionItemKind(): vscode.CompletionItemKind {
        switch (this.kind) {
            case GrammarKind.Constant:
                return vscode.CompletionItemKind.Constant;
            case GrammarKind.Function:
                return vscode.CompletionItemKind.Function;
            case GrammarKind.FunctionEmpty:
                return vscode.CompletionItemKind.Function;
            case GrammarKind.Object:
                return vscode.CompletionItemKind.Class;
            case GrammarKind.Property:
                return vscode.CompletionItemKind.Property;
            case GrammarKind.Module:
                return vscode.CompletionItemKind.Module;
            case GrammarKind.Order:
                return vscode.CompletionItemKind.Keyword;
            case GrammarKind.OrderWithoutParameters:
                return vscode.CompletionItemKind.Keyword;

            default:
                return vscode.CompletionItemKind.Property;
        }
    }

    public get name(): string {
        var nodes: string[] = this.key.split(".");
        if (this.dot > 0 && nodes && nodes.length > 0) {
            let name: string = "";
            for (var i = this.dot; i < nodes.length; i++) {
                name += (i > this.dot ? "." : "") + nodes[i];
            }
            return name;
        } else {
            return this.key;
        }
    }
}

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