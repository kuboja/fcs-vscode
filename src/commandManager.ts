"use strict";

import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";

import { ExtensionData } from "./extensionData";
import { FemcadRunner, FliCommand } from "./femcadRunnerManager";
import { FcsFileData, LineRunnerCommandCreator } from "./fcsFileData";


export class OpenFileInFemCAD {

    private appInsightsClient: AppInsightsClient;
    private extData: ExtensionData;
    private femcadRunner: FemcadRunner;

    constructor(extData: ExtensionData) {
        this.extData = extData;

        this.appInsightsClient = extData.appInsightsClient;
        this.femcadRunner = extData.femcadRunner;
    }

    public openInFemcad(): void {
        if (vscode.window.activeTextEditor === undefined) {
            return;
        }

        let editor : vscode.TextEditor = vscode.window.activeTextEditor;
     
        if (!this.extData.saveDocument(editor)) { return; }

        let fcsFile: string = editor.document.fileName;

        this.appInsightsClient.sendEvent("Command: Open in FemCAD");
        this.femcadRunner.openInFemcad(fcsFile);
    }

    public openInFemcadProfiling(): void {
        if (vscode.window.activeTextEditor === undefined) {
            return;
        }

        let editor : vscode.TextEditor = vscode.window.activeTextEditor;
     
        if (!this.extData.saveDocument(editor)) { return; }

        let fcsFile: string = editor.document.fileName;

        this.appInsightsClient.sendEvent("Command: Open in FemCAD with profiling");
        this.femcadRunner.openInFemcadProfiling(fcsFile);
    }
}


export class FliCommandRunner {

    private extData: ExtensionData;
    private appInsightsClient: AppInsightsClient;
    private femcadRunner: FemcadRunner;

    constructor(extData: ExtensionData) {
        this.extData = extData;

        this.appInsightsClient = extData.appInsightsClient;
        this.femcadRunner = extData.femcadRunner;
    }

    public runLineCommand(): void {
        this.appInsightsClient.sendEvent("Command: Run line");

        if (vscode.window.activeTextEditor === undefined) {
            vscode.window.showInformationMessage("No code found or selected.");
            return;
        }

        let editor : vscode.TextEditor = vscode.window.activeTextEditor;

        if (!this.extData.saveDocument(editor)) { return; }

        let fcsFile: FcsFileData = this.getFcsFileData(editor);
        let commandFile: LineRunnerCommandCreator = new LineRunnerCommandCreator(fcsFile);
        let fliCommand: FliCommand = commandFile.getFliCommand();

        console.log("Line from source code: " + fcsFile.rawLineCode);
        console.log("Source file path: " + fcsFile.filePath);

        this.femcadRunner.executeFliCommand(fliCommand);
    }

    public stopCommand(): void {
        this.appInsightsClient.sendEvent("Command: Stop");
        this.femcadRunner.stopExecutionFliCommand();
    }

    public openInTerminal(): void {
        this.appInsightsClient.sendEvent("Command: Open in terminal");

        if (vscode.window.activeTextEditor === undefined) {
            vscode.window.showInformationMessage("No code found or selected.");
            return;
        }

        let editor : vscode.TextEditor = vscode.window.activeTextEditor;
        
        if (!this.extData.saveDocument(editor)) { return; }

        this.femcadRunner.openFcsFile( editor.document.fileName );
    }

    private getFcsFileData(editor: vscode.TextEditor): FcsFileData {
        let lineNumber: number = editor.selection.active.line;

        return new FcsFileData(editor.document, lineNumber);
    }

    // const selection: vscode.Selection = this._editor.selection;
    // const ignoreSelection: boolean = this._config.get<boolean>("ignoreSelection");
}