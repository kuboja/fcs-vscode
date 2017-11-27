"use strict";

import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";

import { FemcadRunner } from "./femcadRunnerManager";


export class ExtensionData {

    public Initialized: boolean = false;
    public config: vscode.WorkspaceConfiguration;
    public appInsightsClient: AppInsightsClient;
    public femcadRunner: FemcadRunner;

    public context: vscode.ExtensionContext;

    public outputChannel: vscode.OutputChannel;

    public get showExecutionMessage(): boolean {
        if (this.Initialized) {
            return this.config.get<boolean>("showExecutionMessage");
        }
        return true;
    }

    public get clearPreviousOutput(): boolean {
        if (this.Initialized) {
            return this.config.get<boolean>("clearPreviousOutput");
        }
        return true;
    }

    public get preserveFocusInOutput(): boolean {
        if (this.Initialized) {
            return this.config.get<boolean>("preserveFocus");
        }
        return false;
    }

    public get removeTraceInfo(): boolean {
        if (this.Initialized) {
            return this.config.get<boolean>("removeTraceInfo");
        }
        return false;
    }

    public get saveAllFilesBeforeRun(): boolean {
        if (this.Initialized) {
            return this.config.get<boolean>("saveAllFilesBeforeRun");
        }
        return true;
    }

    public get saveFileBeforeRun(): boolean {
        if (this.Initialized) {
            return this.config.get<boolean>("saveFileBeforeRun");
        }
        return true;
    }

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel("fcsoutput");

        this.appInsightsClient = new AppInsightsClient();
        this.appInsightsClient.sendEvent("Extension startup");

        this.config = vscode.workspace.getConfiguration("fcs-vscode");

        this.femcadRunner = new FemcadRunner(this.config, this);

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
}