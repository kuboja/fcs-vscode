"use strict";

import appInsights = require("applicationinsights");
import * as vscode from "vscode";


const compilers: string[] = ["gcc -framework Cocoa", "gcc", "g++", "javac"];


export class AppInsightsClient {

    private client;
    private enableAppInsights;

    constructor() {
        this.client = appInsights.getClient("6bbe422b-f6e4-46e8-85a7-ca65a09f4157");
        const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("kuboja-fcs");
        // this._client
        this.enableAppInsights = true;// config.get<boolean>("enableAppInsights");
    }

    public sendEvent(eventName: string): void {
        if (this.enableAppInsights) {
            for (const i in compilers) {
                if (eventName.indexOf(compilers[i] + " ") >= 0) {
                    eventName = compilers[i];
                    break;
                }
            }
            this.client.trackEvent(eventName === "" ? "bat" : eventName);
        }
    }
}