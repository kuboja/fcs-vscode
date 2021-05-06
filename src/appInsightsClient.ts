import * as vscode from "vscode";
import * as os from "os";
import TelemetryReporter from "vscode-extension-telemetry";


export class TelemetryReporterClient {

    private readonly key = "6bbe422b-f6e4-46e8-85a7-ca65a09f4157";
    private readonly extensionId = "fcs-vscode";

    private reporter: TelemetryReporter;
    private enableAppInsights: boolean;

    constructor(context: vscode.ExtensionContext) {
        let version = context.extension.packageJSON.version;

        let reporter = new TelemetryReporter(this.extensionId, version, this.key);

        // tslint:disable-next-line: no-any
        (<any>reporter).appInsightsClient.context.tags[(<any>reporter).appInsightsClient.context.keys.userId] = os.userInfo().username;
        
        context.subscriptions.push(reporter);

        this.enableAppInsights = true;
        this.reporter = reporter;
    }

    public sendEvent(eventName: string): void {
        if (this.enableAppInsights) {
            this.reporter.sendTelemetryEvent(eventName);
        }
    }

    public async deactivate() {
        await this.reporter.dispose();
    }
}