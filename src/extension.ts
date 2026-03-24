import * as vscode from "vscode";
import { ExtensionData } from "./extensionData";
import { FliCommandRunner, OpenFileInFemCAD, ViewerCommandRunner } from "./commandManager";
import { FcsSymbolProvider } from "./fcsSymbolUtil";
import { FcsCompletionItemProvider } from "./fcsCompletionItemProvider";
import { FcsDefinitionProvider } from "./fcsDefinitionProvider";
import { InteractiveTree } from "./interactiveTree/interactiveTree";
import { TestTree } from "./testTree/testTree";
import { FcsTextContentProvider } from "./fcsTextContentProvider";
import { startLanguageServer, stopLanguageServer, isLanguageServerRunning, getLanguageServerStatus } from "./fcsLanguageServer";
import { selectServerVersionCommand, redownloadServerCommand, checkForUpdatesCommand, scheduleBackgroundUpdates, resolveServerPathFromGitHub, getCachedFlivsTag } from "./githubServerProvider";
import { registerMcpServerProvider } from "./mcpServerProvider";

let extData: ExtensionData;

function createStatusBarItem(context: vscode.ExtensionContext): vscode.StatusBarItem {
    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    item.command = "fcs-vscode.showFliMenu";
    item.tooltip = "FCS Apps — click for options";
    context.subscriptions.push(item);
    return item;
}

function updateStatusBar(item: vscode.StatusBarItem, context: vscode.ExtensionContext): void {
    const overridePath = vscode.workspace.getConfiguration("fcs-vscode").get<string>("localOverridePath", "");
    if (overridePath) {
        item.text = `$(folder) FCS Apps: local`;
        item.tooltip = `FCS Apps — local override: ${overridePath}\nWith updates disabled.\nLS: ${getLanguageServerStatus()}`;
        item.show();
        return;
    }
    const tag = getCachedFlivsTag(context);
    const lsStatus = getLanguageServerStatus();
    if (tag) {
        item.text = `$(server) FCS Apps ${tag}`;
        item.tooltip = `FCS Apps — click for options\nLS: ${lsStatus}`;
        item.show();
    } else {
        item.text = "$(warning) FCS Apps: not installed";
        item.tooltip = `FCS Apps — click for options\nLS: ${lsStatus}`;
        item.show();
    }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {

    extData = new ExtensionData(context);

    registerCommands(extData.context, extData);
    registerMcpServerProvider(extData.context, extData);

    const statusBar = createStatusBarItem(context);
    updateStatusBar(statusBar, context);

    let knownTag = getCachedFlivsTag(context);

    const onUpdated = async () => {
        knownTag = getCachedFlivsTag(context); // keep poll timer in sync — this window did the download
        updateStatusBar(statusBar, context);
        extData.reporter.sendEvent("FCS Apps: updated", { version: knownTag ?? "unknown" });
        const choice = await vscode.window.showInformationMessage(
            "FCS Apps: new version downloaded. Reload window to apply.",
            "Reload"
        );
        if (choice === "Reload") {
            vscode.commands.executeCommand("workbench.action.reloadWindow");
        }
    };

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.checkForUpdates", async () => {
            extData.reporter.sendEvent("Command: Check for FCS Apps Updates");
            await checkForUpdatesCommand(context, async () => {
                updateStatusBar(statusBar, context);
                await onUpdated();
            });
            updateStatusBar(statusBar, context);
        }));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.selectLanguageServerVersion", async () => {
            await selectServerVersionCommand(context, async () => {
                updateStatusBar(statusBar, context);
                await onUpdated();
            }, stopLanguageServer);
        }));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.showFliMenu", async () => {
            type MenuItem = vscode.QuickPickItem & { run: () => Thenable<void> };
            const items: MenuItem[] = [
                {
                    label: "$(sync) Check for Updates",
                    description: "Check GitHub for a newer version",
                    run: () => vscode.commands.executeCommand("fcs-vscode.checkForUpdates"),
                },
                {
                    label: "$(tag) Select Version",
                    description: "Pin or unpin a specific release",
                    run: () => vscode.commands.executeCommand("fcs-vscode.selectLanguageServerVersion"),
                },
                {
                    label: "$(cloud-download) Re-download FCS Apps",
                    description: "Force a fresh download of the current version",
                    run: () => vscode.commands.executeCommand("fcs-vscode.redownloadLanguageServer"),
                },
                { label: "", kind: vscode.QuickPickItemKind.Separator, run: () => Promise.resolve() } as MenuItem,
                {
                    label: "$(debug-start) Start Language Server",
                    description: isLanguageServerRunning() ? "already running" : "not running",
                    run: () => vscode.commands.executeCommand("fcs-vscode.startLanguageServer"),
                },
                {
                    label: "$(debug-stop) Stop Language Server",
                    description: isLanguageServerRunning() ? "running" : "not running",
                    run: () => vscode.commands.executeCommand("fcs-vscode.stopLanguageServer"),
                },
                {
                    label: "$(debug-restart) Restart Language Server",
                    run: () => vscode.commands.executeCommand("fcs-vscode.restartLanguageServer"),
                },
            ];
            const picked = await vscode.window.showQuickPick(items, {
                placeHolder: "FCS Apps — choose an action",
            }) as MenuItem | undefined;
            if (picked) { await picked.run(); }
        }));

    const localOverridePath = vscode.workspace.getConfiguration("fcs-vscode").get<string>("localOverridePath", "");

    if (!localOverridePath) {
        // On startup: check GitHub for a new version (with login prompt).
        // Skipped if a check already happened within the last hour (flivs-last-check.txt).
        // On first install (no cache) this downloads the binary before starting the LS.
        await resolveServerPathFromGitHub(context, true, async () => {
            // Show version in status bar immediately after download, before LS starts.
            updateStatusBar(statusBar, context);
            if (!isLanguageServerRunning()) {
                await startLanguageServer(context, () => {
                    extData.reporter.sendError("Language Server: crashed unexpectedly");
                    updateStatusBar(statusBar, context);
                });
                updateStatusBar(statusBar, context); // update again with LS connection status
            } else {
                await onUpdated();
            }
        }).catch((e) => console.error("FCS Apps: startup update check failed.", e));

        // Sync knownTag so the poll timer doesn't mistake our own download for
        // "installed by another window" (happens when the LS wasn't running yet
        // and the startup callback took the startLanguageServer branch instead of onUpdated).
        knownTag = getCachedFlivsTag(context) ?? knownTag;
    }

    updateStatusBar(statusBar, context);

    // Start LSP from cache (instant, no network).
    // Already started above on first install; this covers the normal case where
    // the binary existed before the update check ran.
    await startLanguageServer(context, () => {
        extData.reporter.sendError("Language Server: crashed unexpectedly");
        updateStatusBar(statusBar, context);
    });
    updateStatusBar(statusBar, context); // update with LS connection status after start attempt
    extData.reporter.sendEvent("Language Server: started", { version: getCachedFlivsTag(context) ?? "unknown" });

    if (!localOverridePath) {
        // Hourly silent background update check (no login prompt).
        scheduleBackgroundUpdates(context, onUpdated);

        // Poll every 30 s: if another VS Code window downloaded a new flivs version,
        // update the status bar and show a reload notification.
        const pollTimer = setInterval(() => {
            const currentTag = getCachedFlivsTag(context);
            if (currentTag && currentTag !== knownTag) {
                const wasKnown = !!knownTag; // false on first install → skip notification
                knownTag = currentTag;
                updateStatusBar(statusBar, context);
                if (wasKnown) {
                    vscode.window.showInformationMessage(
                        `FCS Apps: version ${currentTag} is now available (installed by another window). Reload to apply.`,
                        "Reload"
                    ).then((choice) => {
                        if (choice === "Reload") {
                            vscode.commands.executeCommand("workbench.action.reloadWindow");
                        }
                    });
                }
            }
        }, 30_000);
        context.subscriptions.push({ dispose: () => clearInterval(pollTimer) });
    }

    // Register regex-based providers. Skip definition provider when LSP is
    // active to avoid duplicate "Go to Definition" results.
    registerSymbolManager(extData.context, extData, isLanguageServerRunning());
}


function registerCommands(context: vscode.ExtensionContext, extData: ExtensionData): void {

    const codeManager: FliCommandRunner = new FliCommandRunner(extData);
    const openFcs: OpenFileInFemCAD = new OpenFileInFemCAD(extData);
    const viewerFcs: ViewerCommandRunner = new ViewerCommandRunner(extData);

    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider("fliText", new FcsTextContentProvider()));

    context.subscriptions.push(new InteractiveTree(context, extData));

    context.subscriptions.push(new TestTree(context, extData));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.runLine", async () => { await codeManager.runLineCommand(); }));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.stop", async () => { await codeManager.stopCommand(); }));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.runFcsTerminal", async () => { await codeManager.openInTerminal(); }));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.openInFemcad", async () => { await openFcs.openInFemcad(); }));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.openInFemcadWithProfiling", async () => { await openFcs.openInFemcadProfiling(); }));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.openInViewer", async () => { await viewerFcs.openInViewer(); }));


    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.redownloadLanguageServer", async () => {
            await redownloadServerCommand(
                context,
                async () => await stopLanguageServer(),
                async () => {
                    await resolveServerPathFromGitHub(context, true);
                    await startLanguageServer(context);
                },
                async () => await startLanguageServer(context)
            );
        }));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.startLanguageServer", async () => {
            if (isLanguageServerRunning()) {
                vscode.window.showInformationMessage("FCS Language Server is already running.");
                return;
            }
            await startLanguageServer(context);
            vscode.window.showInformationMessage(
                isLanguageServerRunning()
                    ? "FCS Language Server started."
                    : "FCS Language Server failed to start."
            );
        }));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.stopLanguageServer", async () => {
            if (!isLanguageServerRunning()) {
                vscode.window.showInformationMessage("FCS Language Server is not running.");
                return;
            }
            await stopLanguageServer();
            vscode.window.showInformationMessage("FCS Language Server stopped.");
        }));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.restartLanguageServer", async () => {
            await stopLanguageServer();
            await startLanguageServer(context);
            vscode.window.showInformationMessage(
                isLanguageServerRunning()
                    ? "FCS Language Server restarted."
                    : "FCS Language Server failed to start."
            );
        }));
}


function registerSymbolManager(context: vscode.ExtensionContext, extData: ExtensionData, lspActive: boolean): void {

    let fcsLang = { language: "fcs", scheme: "" };

    // The grammar-based completion provider supplies static Fcs.* namespace completions
    // (e.g. Fcs.Parameter.ItemAction) that the LSP does not cover — always register it.
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(fcsLang, new FcsCompletionItemProvider(extData), ".")
    );

    // Symbol and definition providers are skipped when the LSP is active because
    // the LSP already handles those and registering them twice causes duplicates.
    if (!lspActive) {
        context.subscriptions.push(
            vscode.languages.registerDocumentSymbolProvider(fcsLang, new FcsSymbolProvider())
        );

        context.subscriptions.push(
            vscode.languages.registerDefinitionProvider(fcsLang, new FcsDefinitionProvider())
        );
    }
}

export async function deactivate() {
    await stopLanguageServer();
    if (extData) {
        extData.reporter.sendEvent("Extension deactivated");
        await extData.deactivate();
        console.log("Deactivated");
    }
}