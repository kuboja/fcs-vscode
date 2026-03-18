import * as vscode from "vscode";
import * as os from "os";
import { TelemetryReporter } from '@vscode/extension-telemetry';


export class TelemetryReporterClient {

    private readonly connectionString = "InstrumentationKey=6bbe422b-f6e4-46e8-85a7-ca65a09f4157;IngestionEndpoint=https://westeurope-0.in.applicationinsights.azure.com/;LiveEndpoint=https://westeurope.livediagnostics.monitor.azure.com/;ApplicationId=858b8c98-09fe-4cbd-9801-17278ed10b51";

    private reporter: TelemetryReporter;
    private enableAppInsights: boolean;
    private readonly extensionVersion: string;

    constructor(context: vscode.ExtensionContext) {
        this.extensionVersion = context.extension.packageJSON.version ?? "unknown";

        const reporter = new TelemetryReporter(this.connectionString);
        reporter.setContextTag("user.id", os.userInfo().username);
        reporter.setContextTag("extension.version", this.extensionVersion);

        context.subscriptions.push(reporter);

        this.enableAppInsights = true;
        this.reporter = reporter;
    }

    public sendEvent(eventName: string, properties?: Record<string, string>, measurements?: Record<string, number>): void {
        if (this.enableAppInsights) {
            this.reporter.sendTelemetryEvent(eventName, properties, measurements);
        }
    }

    public sendError(eventName: string, error?: Error, properties?: Record<string, string>): void {
        if (!this.enableAppInsights) { return; }
        const errorProps: Record<string, string> = {
            ...properties,
            ...(error ? { errorMessage: error.message, errorName: error.name } : {}),
        };
        this.reporter.sendTelemetryErrorEvent(eventName, errorProps);
    }

    public async deactivate() {
        await this.reporter.dispose();
    }
}