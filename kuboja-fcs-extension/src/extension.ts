'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { FcsExplorerProvider } from './fcsExplorer';
import { FcsSymbolProvider } from './fcsSymbolUtil';
import { FcsCommandService } from './fcsCommands';
import { CodeManager } from "./codeManager";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    //console.log('Congratulations, your extension "kuboja-fcs" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    //let disposable = vscode.commands.registerCommand('extension.sayHello', () => {
        // The code you place here will be executed every time your command is executed

        // Display a message box to the user
    //    vscode.window.showInformationMessage('Hello World!');
    //});

    //context.subscriptions.push(disposable);
    let commandService = new FcsCommandService();

  //  let runLine = vscode.commands.registerCommand("kuboja-fcs.runLine", () => {
  //      commandService.runCurrentLine();
 //   } );

  //  context.subscriptions.push(runLine);


    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider('fcs', new FcsSymbolProvider() )
    );




    const codeManager = new CodeManager(context);
    
    vscode.window.onDidCloseTerminal(() => {
        codeManager.onDidCloseTerminal();
    }); 

    const run = vscode.commands.registerCommand("kuboja-fcs.runLine", () => {
        codeManager.run();
    });

    const stop = vscode.commands.registerCommand("kuboja-fcs.stop", () => {
        codeManager.stop();
    });

    context.subscriptions.push(run);
    context.subscriptions.push(stop);
}

// this method is called when your extension is deactivated
export function deactivate() {
}