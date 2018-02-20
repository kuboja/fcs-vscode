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

    public get femcadFolderPath(): string {
        return this.config.get<string>("femcadFolder");
    }

    public get showExecutionMessage(): boolean {
        return this.config.get<boolean>("showExecutionMessage");
    }

    public get clearPreviousOutput(): boolean {
        return this.config.get<boolean>("clearPreviousOutput");
    }

    public get preserveFocusInOutput(): boolean {
        return this.config.get<boolean>("preserveFocus");
    }

    public get removeTraceInfo(): boolean {
        return this.config.get<boolean>("removeTraceInfo");
    }

    public get saveAllFilesBeforeRun(): boolean {
        return this.config.get<boolean>("saveAllFilesBeforeRun");
    }

    public get saveFileBeforeRun(): boolean {
        return this.config.get<boolean>("saveFileBeforeRun");
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
}