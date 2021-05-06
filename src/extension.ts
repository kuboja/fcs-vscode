import * as vscode from "vscode";
import { ExtensionData } from "./extensionData";
import { FliCommandRunner, OpenFileInFemCAD, ViewerCommandRunner } from "./commandManager";
import { FcsSymbolProvider } from "./fcsSymbolUtil";
import { FcsCompletionItemProvider } from "./fcsCompletionItemProvider";
import { FcsDefinitionProvider } from "./fcsDefinitionProvider";
import { InteractiveTree } from "./interactiveTree/interactiveTree";
import { FliUpdater } from "./fliUpdater/fliUpdater";
import { TestTree } from "./testTree/testTree";
import { FcsTextContentProvider } from "./fcsTextContentProvider";

let extData: ExtensionData;

export function activate(context: vscode.ExtensionContext): void {
    
    //console.log("Activate Extension");

    extData = new ExtensionData(context);

    registerSymbolManager(extData.context, extData);
    registerCommands(extData.context, extData);
}


function registerCommands(context: vscode.ExtensionContext, extData: ExtensionData): void {

    const codeManager: FliCommandRunner = new FliCommandRunner(extData);
    const openFcs: OpenFileInFemCAD = new OpenFileInFemCAD(extData);
    const viewerFcs: ViewerCommandRunner = new ViewerCommandRunner(extData);

    const fliUpdater: FliUpdater = new FliUpdater(context, extData);

    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider("fliText", new FcsTextContentProvider()));

    context.subscriptions.push(new InteractiveTree(context, extData, fliUpdater));

    context.subscriptions.push(new TestTree(context, extData, fliUpdater));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.runLine", async () => { await codeManager.runLineCommand(); }));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.stop", async () => { await codeManager.stopCommand(); }));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.runFcsTerminal", async () => { await codeManager.openInTerminal(); }));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.openInFemcad", async () => { await openFcs.openInFemcad(); }));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.openInFemcadWithProfiling", async () => { await openFcs.openInFemcadProfiling(); }));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.openInViewer", async () => { await viewerFcs.openInViewer(); }));
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

export async function deactivate() {
    if (extData) {
        await extData.deactivate();
        console.log("Deactivated");
    }
}