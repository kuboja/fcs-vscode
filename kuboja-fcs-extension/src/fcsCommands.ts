"use strict";

import * as vscode from "vscode";


export class FcsCommandService {

    public runCurrentLine(): void {
        if (!vscode.window.activeTextEditor.selection.isSingleLine) {
            /* spellchecker: disable */
            vscode.window.showErrorMessage("Nelze spustit příkaz pokud je vybráno více řádků!");
        } else {
            let row: number = vscode.window.activeTextEditor.selection.start.line;

            vscode.window.showInformationMessage(row.toString());
        }

        // let tastDef = new vscode.TaskDefinition()
        // const task = new vscode.Task({ type: "catkin", target: "run_tests" }, "run_tests", "catkin");

        //  let ex = new vscode.ShellExecution("echo test");
    }
}