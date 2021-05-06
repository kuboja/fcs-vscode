import * as vscode from "vscode";
import { TelemetryReporterClient } from "./appInsightsClient";

import { ExtensionData } from "./extensionData";
import { FemcadRunner, FliCommand } from "./femcadRunnerManager";
import { FcsCommandsToFliMamanager } from "./fcsCommands";


export class OpenFileInFemCAD {

    private reporter: TelemetryReporterClient;
    private extData: ExtensionData;

    private femcadRunner: FemcadRunner | undefined;

    constructor(extData: ExtensionData) {
        this.extData = extData;
        this.reporter = extData.reporter;
    }

    public async openInFemcad(): Promise<void> {
        if (vscode.window.activeTextEditor === undefined) {
            return;
        }

        let editor: vscode.TextEditor = vscode.window.activeTextEditor;

        try {
            await this.extData.saveDocumentBySettings(editor);
        } catch (error) {
            vscode.window.showErrorMessage(error.message);
            return;
        }

        let fcsFile: string = editor.document.fileName;

        this.reporter.sendEvent("Command: Open in FemCAD");
        await this.getFemcadRunner().openInFemcad(fcsFile);
    }

    public async openInFemcadProfiling(): Promise<void> {
        if (vscode.window.activeTextEditor === undefined) {
            return;
        }

        let editor: vscode.TextEditor = vscode.window.activeTextEditor;

        try {
            await this.extData.saveDocumentBySettings(editor);
        } catch (error) {
            vscode.window.showErrorMessage(error.message);
            return;
        }

        let fcsFile: string = editor.document.fileName;

        this.reporter.sendEvent("Command: Open in FemCAD with profiling");
        await this.getFemcadRunner().openInFemcadProfiling(fcsFile);
    }

    private getFemcadRunner(): FemcadRunner {
        if (!this.femcadRunner){
            this.femcadRunner = new FemcadRunner(this.extData);
        }

        return this.femcadRunner;
    }
}

export class ViewerCommandRunner {
    private reporter: TelemetryReporterClient;
    private extData: ExtensionData;

    private femcadRunner: FemcadRunner | undefined;

    constructor(extData: ExtensionData) {
        this.extData = extData;
        this.reporter = extData.reporter;
    }

    public async openInViewer(): Promise<void> {
        this.reporter.sendEvent("Command: Open in Histruct Viewer");

        const editor = vscode.window.activeTextEditor;

        if (editor === undefined) {
            vscode.window.showInformationMessage("No file is open.");
            return;
        }

        try {
            await this.extData.saveDocumentBySettings(editor);
        } catch (error) {
            vscode.window.showErrorMessage(error.message);
            return;
        }
        
        let ws = vscode.workspace.getWorkspaceFolder(editor.document.uri);

        const fliCommand = new FliCommand(" --view-model " + editor.document.fileName + 
           // " --td Trace" +
           // " --draw-settings c:\\GitHub\\fcs-gsi2\\Gsi_StorageSystems\\Silo_Round\\Geometry\\GsiSilo.fcsdrs" +
           // " --view-settings C:\\GitHub\\fcs-gsi2\\Gsi_StorageSystems\\Silo_Round\\Geometry\\GsiSilo.fcsdrv" +
            (ws ? " --watch " + ws?.uri.fsPath : ""));

        await this.getFemcadRunner().executeFliCommand(fliCommand, false);
    }

    private getFemcadRunner(): FemcadRunner {
        if (!this.femcadRunner){
            this.femcadRunner = new FemcadRunner(this.extData, this.extData.viewerOutpuChannelName);
        }

        return this.femcadRunner;
    }
}

export class FliCommandRunner {

    private extData: ExtensionData;
    private reporter: TelemetryReporterClient;
    
    private femcadRunner: FemcadRunner | undefined;
    private fcsCommmands: FcsCommandsToFliMamanager | undefined;

    constructor(extData: ExtensionData) {
        this.extData = extData;
        this.reporter = extData.reporter;
    }

    public async runLineCommand(): Promise<void> {
        this.reporter.sendEvent("Command: Run line");

        const editor = vscode.window.activeTextEditor;

        if (editor === undefined) {
            vscode.window.showInformationMessage("No file is open.");
            return;
        }

        try {
            await this.extData.saveDocumentBySettings(editor);
        } catch (error) {
            vscode.window.showErrorMessage(error.message);
            return;
        }

        const fliCommand: FliCommand | undefined = this.getFcsCommmands().getFliParameters(editor);

        //console.log("Line from source code: " + fcsFile.rawLineCode);
        //console.log("Source file path: " + fcsFile.filePath);

        if (fliCommand) {
            await this.getFemcadRunner().executeFliCommand(fliCommand);
        }
        else {
            vscode.window.showErrorMessage("Unable to recognize command or expression.");
        }
    }

    public async stopCommand(): Promise<void> {
        this.reporter.sendEvent("Command: Stop");
        await this.getFemcadRunner().stopExecutionFliCommand();
    }

    public async openInTerminal(): Promise<void> {
        this.reporter.sendEvent("Command: Open in terminal");

        if (vscode.window.activeTextEditor === undefined) {
            vscode.window.showInformationMessage("No code found or selected.");
            return;
        }

        let editor: vscode.TextEditor = vscode.window.activeTextEditor;

        try {
            await this.extData.saveDocumentBySettings(editor);
        } catch (error) {
            vscode.window.showErrorMessage(error.message);
            return;
        }

        await this.getFemcadRunner().openFcsFile(editor.document.fileName);
    }

    private getFemcadRunner(){
        if (!this.femcadRunner){
            this.femcadRunner = new FemcadRunner(this.extData);
        }

        return this.femcadRunner;
    }

    private getFcsCommmands(){
        if (!this.fcsCommmands){
            this.fcsCommmands = new FcsCommandsToFliMamanager(this.extData);
        }

        return this.fcsCommmands;
    }
}
