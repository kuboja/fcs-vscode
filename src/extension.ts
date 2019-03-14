"use strict";

import * as vscode from "vscode";

import { ExtensionData } from "./extensionData";
import { FliCommandRunner, OpenFileInFemCAD } from "./commandManager";
import { FcsSymbolProvider } from "./fcsSymbolUtil";
import { FcsCompletionItemProvider } from "./fcsCompletionItemProvider";
import { FcsDefinitionProvider } from "./fcsDefinitionProvider";


export function activate(context: vscode.ExtensionContext): void {

    //console.log("Activate Extension");

    let extData: ExtensionData = new ExtensionData(context);

    registerSymbolManager(extData.context, extData);
    registerCommands(extData.context, extData);
}


function registerCommands(context: vscode.ExtensionContext, extData: ExtensionData): void {

    const codeManager: FliCommandRunner = new FliCommandRunner(extData);
    const openFcs: OpenFileInFemCAD = new OpenFileInFemCAD(extData);

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.runLine", () => { codeManager.runLineCommand(); }));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.stop", () => { codeManager.stopCommand(); }));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.runFcsTerminal", () => { codeManager.openInTerminal(); }));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.openInFemcad", () => { openFcs.openInFemcad(); }));
}


function registerSymbolManager(context: vscode.ExtensionContext, extData: ExtensionData): void {

    let fcsLang = { language: "fcs", scheme: "" };

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(fcsLang, new FcsCompletionItemProvider(extData), ".")
    );

    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(fcsLang, new FcsSymbolProvider())
    );

    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(fcsLang, new FcsDefinitionProvider())
    );
}