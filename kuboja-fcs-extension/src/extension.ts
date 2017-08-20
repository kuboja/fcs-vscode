'use strict';

import * as vscode from "vscode";
import { FcsExplorerProvider } from './fcsExplorer';
import { FcsSymbolProvider } from './fcsSymbolUtil';
import { FcsCommandService } from './fcsCommands';
import { CodeManager } from "./codeManager";

export function activate(context: vscode.ExtensionContext) {

    registerSymbolManager(context);
    registerCodeRunner(context);

}

function registerCodeRunner(context: vscode.ExtensionContext) {
    const codeManager = new CodeManager(context);

    const run = vscode.commands.registerCommand("kuboja-fcs.runLine", () => {
        codeManager.run();
    });

    const stop = vscode.commands.registerCommand("kuboja-fcs.stop", () => {
        codeManager.stop();
    });

    context.subscriptions.push(run);
    context.subscriptions.push(stop);
}

function registerSymbolManager(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider('fcs', new FcsSymbolProvider())
    );
}

export function deactivate() {
}