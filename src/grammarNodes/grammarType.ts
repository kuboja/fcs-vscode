import * as vscode from "vscode";

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
