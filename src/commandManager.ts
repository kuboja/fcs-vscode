"use strict";

import * as fs from "fs";
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
        let editor: vscode.TextEditor = vscode.window.activeTextEditor;
        if (!this.extData.saveDocument(editor)) { return; }

        let fcsFile: string = editor.document.fileName;

        this.appInsightsClient.sendEvent("Command: Open in FemCAD");
        this.femcadRunner.openInFemcad(fcsFile);
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

        let editor: vscode.TextEditor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage("No code found or selected.");
            return;
        }

        if (!this.extData.saveDocument(editor)) { return; }

        let fcsFile: FcsFileData = this.getFcsFileData();
        let commandFile: LineRunnerCommandCreator = new LineRunnerCommandCreator(fcsFile);
        let fliCommand: FliCommand = commandFile.fliCommand;

        console.log("Line from source code: " + fcsFile.rawLineCode);
        console.log("Source file path: " + fcsFile.filePath);

        this.femcadRunner = this.extData.femcadRunner;
        this.femcadRunner.executeFliCommand(fliCommand);
    }

    public stopCommand(): void {
        this.appInsightsClient.sendEvent("Command: Stop");
        this.femcadRunner.stopExecutionFliCommand();
    }

    private getFcsFileData(): FcsFileData {
        let editor: vscode.TextEditor = vscode.window.activeTextEditor;
        let lineNumber: number = editor.selection.active.line;

        return new FcsFileData(editor.document, lineNumber);
    }

    // const selection: vscode.Selection = this._editor.selection;
    // const ignoreSelection: boolean = this._config.get<boolean>("ignoreSelection");
}