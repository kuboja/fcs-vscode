"use strict";

import * as vscode from "vscode";

import { ExtensionData } from "./extensionData";
import { FliCommandRunner, OpenFileInFemCAD } from "./commandManager";
import { FcsSymbolProvider } from "./fcsSymbolUtil";


export function activate(context: vscode.ExtensionContext): void {

    console.log("Activate Extension");

    let extData: ExtensionData = new ExtensionData(context);

    registerSymbolManager(extData.context);
    registerCommand(extData);
}


function registerCommand(extData: ExtensionData): void {

    const codeManager: FliCommandRunner = new FliCommandRunner(extData);

    const run: vscode.Disposable = vscode.commands.registerCommand("fcs-vscode.runLine", () => {
        codeManager.runLineCommand();
    });

    const stop: vscode.Disposable = vscode.commands.registerCommand("fcs-vscode.stop", () => {
        codeManager.stopCommand();
    });

    const openFcsTerminal: vscode.Disposable = vscode.commands.registerCommand("fcs-vscode.runFcsTerminal", () => {
        codeManager.openInTerminal();
    });

    const openFcs: OpenFileInFemCAD = new OpenFileInFemCAD(extData);

    const open: vscode.Disposable = vscode.commands.registerCommand("fcs-vscode.openInFemcad", () => {
        openFcs.openInFemcad();
    });

    extData.context.subscriptions.push(run);
    extData.context.subscriptions.push(stop);
    extData.context.subscriptions.push(open);
}


function registerSymbolManager(context: vscode.ExtensionContext): void {

    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider("fcs", new FcsSymbolProvider())
    );
}