import * as vscode from 'vscode';

export class FcsTextContentProvider implements vscode.TextDocumentContentProvider {

    provideTextDocumentContent(uri: vscode.Uri): string {
        let ind = uri.query.indexOf("&text=");
        let sub = uri.query.substr(ind + 6);

        return sub;
    }
}