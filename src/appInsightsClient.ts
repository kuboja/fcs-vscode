"use strict";

import * as appInsights from "applicationinsights";
import * as os from "os";
import * as vscode from "vscode";


export class AppInsightsClient {

    private client : appInsights.TelemetryClient;
    private enableAppInsights;

    constructor() {
        this.enableAppInsights = true;

        appInsights.setup("6bbe422b-f6e4-46e8-85a7-ca65a09f4157")
            .setAutoDependencyCorrelation(false)
            .setAutoCollectRequests(false)
            .setAutoCollectPerformance(false)
            .setAutoCollectExceptions(true)
            .setAutoCollectDependencies(true)
            .start();

        this.client = appInsights.defaultClient;

        this.client.context.tags[this.client.context.keys.userId] = os.userInfo().username;
    }

    public sendEvent(eventName: string): void {
        if (this.enableAppInsights) {
            this.client.trackEvent({ name: eventName });
        }
    }
}