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

    public async openInFemcad(): Promise<void> {
        if (vscode.window.activeTextEditor === undefined) {
            return;
        }

        let editor : vscode.TextEditor = vscode.window.activeTextEditor;
     
        try {
            await this.extData.saveDocumentBySettings(editor);
        } catch (error) {
            vscode.window.showErrorMessage(error);
            return;
        }

        let fcsFile: string = editor.document.fileName;

        this.appInsightsClient.sendEvent("Command: Open in FemCAD");
        await this.femcadRunner.openInFemcad(fcsFile);
    }

    public async openInFemcadProfiling(): Promise<void> {
        if (vscode.window.activeTextEditor === undefined) {
            return;
        }

        let editor : vscode.TextEditor = vscode.window.activeTextEditor;
     
        try {
            await this.extData.saveDocumentBySettings(editor);
        } catch (error) {
            vscode.window.showErrorMessage(error);
            return;
        }

        let fcsFile: string = editor.document.fileName;

        this.appInsightsClient.sendEvent("Command: Open in FemCAD with profiling");
        await this.femcadRunner.openInFemcadProfiling(fcsFile);
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

    public async runLineCommand(): Promise<void> {
        this.appInsightsClient.sendEvent("Command: Run line");

        if (vscode.window.activeTextEditor === undefined) {
            vscode.window.showInformationMessage("No code found or selected.");
            return;
        }

        let editor : vscode.TextEditor = vscode.window.activeTextEditor;

        try {
            await this.extData.saveDocumentBySettings(editor);
        } catch (error) {
            vscode.window.showErrorMessage(error);
            return;
        }

        let fcsFile: FcsFileData = this.getFcsFileData(editor);
        let commandFile: LineRunnerCommandCreator = new LineRunnerCommandCreator(fcsFile);
        let fliCommand: FliCommand = commandFile.getFliCommand();

        console.log("Line from source code: " + fcsFile.rawLineCode);
        console.log("Source file path: " + fcsFile.filePath);

        await this.femcadRunner.executeFliCommand(fliCommand);
    }

    public async stopCommand(): Promise<void> {
        this.appInsightsClient.sendEvent("Command: Stop");
        await this.femcadRunner.stopExecutionFliCommand();
    }

    public async openInTerminal(): Promise<void> {
        this.appInsightsClient.sendEvent("Command: Open in terminal");

        if (vscode.window.activeTextEditor === undefined) {
            vscode.window.showInformationMessage("No code found or selected.");
            return;
        }

        let editor : vscode.TextEditor = vscode.window.activeTextEditor;
        
        try {
            await this.extData.saveDocumentBySettings(editor);
        } catch (error) {
            vscode.window.showErrorMessage(error);
            return;
        }

        await this.femcadRunner.openFcsFile( editor.document.fileName );
    }

    private getFcsFileData(editor: vscode.TextEditor): FcsFileData {
        let lineNumber: number = editor.selection.active.line;

        return new FcsFileData(editor.document, lineNumber);
    }

    // const selection: vscode.Selection = this._editor.selection;
    // const ignoreSelection: boolean = this._config.get<boolean>("ignoreSelection");
}