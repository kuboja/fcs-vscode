"use strict";

import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";

import { FemcadRunner } from "./femcadRunnerManager";
import { FcsGrammar } from "./fcsGrammar";


export class ExtensionData {

    public Initialized: boolean = false;
    public appInsightsClient: AppInsightsClient;
    public femcadRunner: FemcadRunner;
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

    constructor(context: vscode.ExtensionContext) {
        this.context = context;

        this.appInsightsClient = new AppInsightsClient();
        this.appInsightsClient.sendEvent("Extension startup");

        this.femcadRunner = new FemcadRunner(this);
        this.grammar = new FcsGrammar();

        this.Initialized = true && this.femcadRunner.IsInitialized;
    }

    public saveDocument(editor: vscode.TextEditor): boolean {
        if (editor.document.isUntitled) {
            vscode.window.showErrorMessage("Nelze spustit. Uložte nejdříve rozpracovaný soubor.");
            return false;
        }

        // pokud je povoleno, tak se provede uložení všech souborů...
        if (this.saveAllFilesBeforeRun) {
            vscode.workspace.saveAll();
            return true;
        }

        // pokud je dokument uložený, není potřeba ukládat...
        if (!editor.document.isDirty) {
            return true;
        }

        // pokud je soubor rozpracovaný a je povoleno uložení, tak se uloží...
        if (this.saveFileBeforeRun) {
            editor.document.save();
            return true;
        }

        vscode.window.showErrorMessage("Nelze spustit. Uložte nejdříve aktuální soubor, nebo povolte ukládání v nastavení.");
        return false;
    }

    private _outputChannel : vscode.OutputChannel | undefined;
    public get outputChannel(): vscode.OutputChannel {
        if (this._outputChannel === undefined) {
            this._outputChannel = vscode.window.createOutputChannel("FemCAD");
        }
        return this._outputChannel;
    }
}