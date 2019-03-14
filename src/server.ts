'use strict';

import * as path from 'path';
import * as os from 'os';
import { workspace, ExtensionContext } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	ExecutableOptions,
	Executable
} from 'vscode-languageclient';

let client: LanguageClient;

export class LangServer{

    public activate(context: ExtensionContext){

        // The server is implemented in C#
        let serverCommand = context.asAbsolutePath(path.join('server', 'FCS.LanguageServer.exe'));
        let commandOptions: ExecutableOptions = { stdio: 'pipe', detached: false };

        // If the extension is launched in debug mode then the debug server options are used
        // Otherwise the run options are used
        let serverOptions: ServerOptions =
            (os.platform() === 'win32') ? {
                run: <Executable>{ command: serverCommand, options: commandOptions },
                debug: <Executable>{ command: serverCommand, options: commandOptions }
            } : {
                    run: <Executable>{ command: 'mono', args: [serverCommand], options: commandOptions },
                    debug: <Executable>{ command: 'mono', args: [serverCommand], options: commandOptions }
                };

        // Options to control the language client
        let clientOptions: LanguageClientOptions = {
            // Register the server for plain text documents
            documentSelector: ['fcs'],
            synchronize: {
                // Synchronize the setting section 'languageServerExample' to the server
                configurationSection: 'languageServerExample',
                // Notify the server about file changes to '.clientrc files contain in the workspace
                fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
            }
        };

        // Create the language client and start the client.
        client = new LanguageClient(
            'languageServerExample',
            'Language Server Example',
            serverOptions,
            clientOptions
        );

        // Start the client. This will also launch the server
        client.start();
    }

    public dispose(): Thenable<void> | undefined {
        if (!client) {
            return undefined;
        }
        return client.stop();
    }
    

}