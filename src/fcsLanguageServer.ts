import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind,
} from "vscode-languageclient/node";
import { getFlivsExePath } from "./githubServerProvider";

let client: LanguageClient | undefined;
let activeTransport: "pipe" | "stdio" | undefined;
let resolvedServerPath: string | undefined;

const outputChannel = vscode.window.createOutputChannel("FCS Language Server (diagnostics)");

function log(msg: string): void {
    const time = new Date().toLocaleTimeString();
    outputChannel.appendLine(`[${time}] ${msg}`);
}

/** Returns a human-readable status string suitable for a tooltip or info message. */
export function getLanguageServerStatus(): string {
    if (!resolvedServerPath) { return "flils.exe not found"; }
    const bin = path.basename(resolvedServerPath);
    if (!client)           { return `not running  (${bin})`; }
    if (client.isRunning()) { return `running via ${activeTransport ?? "unknown"} transport  (${bin})`; }
    return `stopped  (${bin})`;
}

/**
 * Resolve the language-server binary from cache only.
 * Updates are handled exclusively by the background timer and the re-download command.
 */
function resolveServerPath(context: vscode.ExtensionContext): string | undefined {
    const exePath = getFlivsExePath(context, "flils.exe");
    return fs.existsSync(exePath) ? exePath : undefined;
}

async function tryStartWithTransport(
    serverPath: string,
    transport: TransportKind,
    clientOptions: LanguageClientOptions,
    timeoutMs = 0
): Promise<LanguageClient | undefined> {
    const label = TransportKind[transport];
    log(`Trying transport: ${label}  (${serverPath})`);
    const serverOptions: ServerOptions = {
        run:   { command: serverPath, transport },
        debug: { command: serverPath, transport },
    };
    const c = new LanguageClient("fcsLanguageServer", "FCS Language Server", serverOptions, clientOptions);
    try {
        const startPromise = c.start();
        if (timeoutMs > 0) {
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(`connection timeout after ${timeoutMs} ms`)), timeoutMs)
            );
            await Promise.race([startPromise, timeoutPromise]);
        } else {
            await startPromise;
        }
        log(`Connected via ${label}`);
        return c;
    } catch (err) {
        log(`Failed with ${label}: ${err}`);
        try { await c.stop(); } catch { /* ignore */ }
        return undefined;
    }
}

export async function startLanguageServer(context: vscode.ExtensionContext): Promise<void> {
    if (client?.isRunning()) {
        return;
    }

    activeTransport = undefined;
    resolvedServerPath = undefined;

    const serverPath = resolveServerPath(context);
    if (!serverPath) {
        log("flils.exe not found — language server disabled, using regex providers only");
        return;
    }
    resolvedServerPath = serverPath;

    const config = vscode.workspace.getConfiguration("fcs-vscode");

    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: "file", language: "fcs" }],
        synchronize: {
            configurationSection: "fcs-vscode",
            fileEvents: vscode.workspace.createFileSystemWatcher("**/*.fcs"),
        },
        outputChannelName: "FCS Language Server",
        traceOutputChannel: vscode.window.createOutputChannel("FCS Language Server Trace"),
        initializationOptions: {
            maxNumberOfProblems: config.get<number>("maxNumberOfProblems", 100),
        },
    };

    // Try pipe transport first (preferred — no console window).
    // Use a 5-second timeout: if flils.exe doesn't support pipe it will never
    // connect to the named pipe and c.start() would hang indefinitely.
    // Fall back to stdio for older flils.exe builds that don't support pipe.
    client = await tryStartWithTransport(serverPath, TransportKind.pipe, clientOptions, 5000);
    if (client) {
        activeTransport = "pipe";
        return;
    }

    client = await tryStartWithTransport(serverPath, TransportKind.stdio, clientOptions);
    if (client) {
        activeTransport = "stdio";
        return;
    }

    log("Both pipe and stdio transports failed — extension will continue with basic features");
    vscode.window.showWarningMessage(
        "FCS Language Server failed to start. The extension will continue with basic features."
    );
}

export async function stopLanguageServer(): Promise<void> {
    if (client) {
        log("Stopping language server");
        await client.stop();
        client = undefined;
        activeTransport = undefined;
    }
}

export function isLanguageServerRunning(): boolean {
    return client !== undefined && client.isRunning();
}
