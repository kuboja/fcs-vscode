import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";

import { FcsGrammar } from "./fcsGrammar";


export class ExtensionData {

    public Initialized: boolean = false;
    public appInsightsClient: AppInsightsClient;
    public grammar: FcsGrammar;

    public context: vscode.ExtensionContext;

    private get config(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration("fcs-vscode");
    }

    private GetBooleanValue(name: string, defaultValue: boolean): boolean {
        var settingsValue = this.config.get<boolean>(name);
        if (settingsValue === undefined) {
            return defaultValue;
        }
        else {
            return settingsValue;
        }
    }

    private GetStringValue(name: string, defaultValue: string): string {
        var settingsValue = this.config.get<string>(name);
        if (settingsValue === undefined) {
            return defaultValue;
        }
        else {
            return settingsValue;
        }
    }

    public get femcadFolderPath(): string {
        return this.GetStringValue("femcadFolder", "C:\\FemCad\\Application");
    }

    public get showExecutionMessage(): boolean {
        return this.GetBooleanValue("showExecutionMessage", true);
    }

    public get clearPreviousOutput(): boolean {
        return this.GetBooleanValue("clearPreviousOutput", true);
    }

    public get preserveFocusInOutput(): boolean {
        return this.GetBooleanValue("preserveFocus", true);
    }

    public get removeTraceInfo(): boolean {
        return this.GetBooleanValue("removeTraceInfo", true);
    }

    public get saveAllFilesBeforeRun(): boolean {
        return this.GetBooleanValue("saveAllFilesBeforeRun", true);
    }

    public get saveFileBeforeRun(): boolean {
        return this.GetBooleanValue("saveFileBeforeRun", true);
    }

    public get autoupdateFliVSenabled(): boolean {
        return this.GetBooleanValue("autoupdateFliVSenabled", true);
    }

    public get autoupdateFliVSsource(): string {
        return this.GetStringValue("autoupdateFliVSsource", "Q:\\Builds\\fliVS");
    }

    public get collapseTestAfterRun(): boolean {
        return this.GetBooleanValue("collapseTestAfterRun", true);
    }

    public get testsAutoload(): boolean {
        return this.GetBooleanValue("testsAutoload", true);
    }

    public get openAfterExport(): boolean {
        return this.GetBooleanValue("openAfterExport", true);
    }

    public get outputFolder(): string {
        return this.GetStringValue("outputFolder", "");
    }

    public get isBeta(): boolean {
        return this.GetBooleanValue("beta", false);
    }

    constructor(context: vscode.ExtensionContext) {
        this.context = context;

        this.appInsightsClient = new AppInsightsClient();
        this.appInsightsClient.sendEvent("Extension startup");

     //   this.femcadRunner = new FemcadRunner(this);
        this.grammar = new FcsGrammar();

        this.Initialized = true;
    }

    public async saveDocumentBySettings(editor: vscode.TextEditor): Promise<void> {
        if (editor.document.isUntitled) {
            throw new Error("Nelze spustit, protože soubor ještě nebyl uložen na disk. Uložte nejdříve rozpracovaný soubor.");
        }

        // pokud je povoleno, tak se provede uložení všech souborů...
        if (this.saveAllFilesBeforeRun) {
            await vscode.workspace.saveAll();
            return;
        }

        // pokud je dokument uložený, není potřeba ukládat...
        if (!editor.document.isDirty) {
            return;
        }

        // pokud je soubor rozpracovaný a je povoleno uložení, tak se uloží...
        if (this.saveFileBeforeRun) {
            await editor.document.save();
            return;
        }

        throw new Error("Nelze spustit, protože soubor není uložen. Uložte soubor ručně nebo povolte automatické ukládání v nastavení.");
    }

    private outputChannels: vscode.OutputChannel[] = [];

    public getOutputChannel(name: string): vscode.OutputChannel {
        let outputChannel = this.outputChannels.find(c => c.name === name);

        if (!outputChannel) {
            outputChannel = vscode.window.createOutputChannel(name);
            this.outputChannels.push(outputChannel);
        }

        return outputChannel;
    }

    public getDefaultOutputChannel(): vscode.OutputChannel {
        return this.getOutputChannel(this.defaultOutpuChannelName);
    }

    public readonly defaultOutpuChannelName = "FemCAD";
    public readonly viewerOutpuChannelName = "Histruct Viewer";
}