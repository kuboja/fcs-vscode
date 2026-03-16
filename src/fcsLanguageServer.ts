import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind,
} from "vscode-languageclient/node";
import { resolveServerPathFromGitHub } from "./githubServerProvider";

let client: LanguageClient | undefined;

/**
 * Find flils.exe path from settings or well-known locations.
 * Returns undefined if not found — falls through to GitHub download.
 */
function resolveServerPathLocally(): string | undefined {
    const config = vscode.workspace.getConfiguration("fcs-vscode");

    // 1. Explicit setting takes priority
    const explicit = config.get<string>("languageServerPath", "");
    if (explicit && fs.existsSync(explicit)) {
        return explicit;
    }

    // 2. Look alongside fli in fliFolder or femcadFolder
    const fliFolder = config.get<string>("fliFolder", "")
                   || config.get<string>("femcadFolder", "");
    if (fliFolder) {
        const candidate = path.join(fliFolder, "flils.exe");
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return undefined;
}

/**
 * Resolve the language-server binary:
 *  1. Local path from settings / well-known locations.
 *  2. Proprietary binary downloaded from the private GitHub repository
 *     (requires the user to be signed in and have repo access).
 */
async function resolveServerPath(context: vscode.ExtensionContext): Promise<string | undefined> {
    // Local path wins — no GitHub round-trip needed
    const local = resolveServerPathLocally();
    if (local) {
        return local;
    }

    // Fall back to GitHub-authenticated download
    return resolveServerPathFromGitHub(context);
}

export async function startLanguageServer(context: vscode.ExtensionContext): Promise<void> {
    const serverPath = await resolveServerPath(context);
    if (!serverPath) {
        // No server found — extension works fine with regex providers only
        return;
    }

    const config = vscode.workspace.getConfiguration("fcs-vscode");

    const serverOptions: ServerOptions = {
        run:   { command: serverPath, transport: TransportKind.stdio },
        debug: { command: serverPath, transport: TransportKind.stdio },
    };

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

    client = new LanguageClient(
        "fcsLanguageServer",
        "FCS Language Server",
        serverOptions,
        clientOptions
    );

    try {
        await client.start();
        console.log("FCS Language Server started:", serverPath);
    } catch (err) {
        console.error("FCS Language Server failed to start:", err);
        vscode.window.showWarningMessage(
            `FCS Language Server failed to start. The extension will continue with basic features. Error: ${err}`
        );
        client = undefined;
    }
}

export async function stopLanguageServer(): Promise<void> {
    if (client) {
        await client.stop();
        client = undefined;
    }
}

export function isLanguageServerRunning(): boolean {
    return client !== undefined && client.isRunning();
}
