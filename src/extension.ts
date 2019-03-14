"use strict";

import * as vscode from "vscode";

import { ExtensionData } from "./extensionData";
import { FliCommandRunner, OpenFileInFemCAD } from "./commandManager";
//import { FcsSymbolProvider } from "./fcsSymbolUtil";
//import { FcsCompletionItemProvider } from "./fcsCompletionItemProvider";
//import { FcsDefinitionProvider } from "./fcsDefinitionProvider";
import { LangServer } from "./server";



export function activate(context: vscode.ExtensionContext): void {

    //console.log("Activate Extension");

    let extData: ExtensionData = new ExtensionData(context);

    registerSymbolManager(extData.context, extData);
    registerCommands(extData.context, extData);

    let server = new LangServer();
    server.activate(context);

    context.subscriptions.push(server);

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


function registerSymbolManager(_context: vscode.ExtensionContext, _extData: ExtensionData): void {

    //let fcsLang = { language: "fcs", scheme: "" };

  //  context.subscriptions.push(
  //      vscode.languages.registerCompletionItemProvider(fcsLang, new FcsCompletionItemProvider(extData), ".")
  //  );

  //  context.subscriptions.push(
  //      vscode.languages.registerDocumentSymbolProvider(fcsLang, new FcsSymbolProvider())
  //  );

  //  let defProv = new FcsDefinitionProvider();
//    context.subscriptions.push(defProv);

 //  context.subscriptions.push(
 //      vscode.languages.registerDefinitionProvider(fcsLang, defProv)
 //  );

 //  context.subscriptions.push(
 //      vscode.languages.registerHoverProvider(fcsLang, defProv)
 //  );

}