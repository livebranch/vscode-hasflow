/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import * as Net from 'net';
import { HasflowDebugSession } from './hasflowDebug';
import { 
	workspace,
	commands,
	debug,
	ExtensionContext,
	window,
	WorkspaceFolder,
	DebugConfiguration,
	DebugConfigurationProvider,
	ProviderResult,
	CancellationToken,
	DebugAdapterDescriptorFactory,
	DebugSession,
	DebugAdapterExecutable,
	DebugAdapterDescriptor,
	DebugAdapterServer,
	Uri,
} from 'vscode';
import { FileAccessor } from './hasflowRuntime';


export function activate(context: ExtensionContext) {

	var factory = new HasflowDebugAdapterServerDescriptorFactory();

	// debug adapters can be run in different ways by using a vscode.DebugAdapterDescriptorFactory:
	window.showInformationMessage("Activating Hasflow!");

	// register a configuration provider for 'hasflow' debug type
	const provider = new HasflowConfigurationProvider();
	context.subscriptions.push(debug.registerDebugConfigurationProvider('hasflow', provider));

	context.subscriptions.push(debug.registerDebugAdapterDescriptorFactory('hasflow', factory));
	if ('dispose' in factory) {
		context.subscriptions.push(factory);
	}

	context.subscriptions.push(
		commands.registerCommand('hasflow.debug.startSession', (config) => {
			window.showInformationMessage("called hasflow.debug.startSession");
			
			let workspaceFolder;
			if (window.activeTextEditor) {
				workspaceFolder = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri);
			}

			return debug.startDebugging(workspaceFolder, config);
		})
	);

	window.showInformationMessage("Finshed activating Hasflow!");
}

class HasflowConfigurationProvider implements DebugConfigurationProvider {

	/**
	 * Massage a debug configuration just before a debug session is being launched,
	 * e.g. add all missing attributes to the debug configuration.
	 */
	resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {

		window.showInformationMessage("Resolving debug config");
		
		// if launch.json is missing or empty
		if (!config.type && !config.request && !config.name) {
			const editor = window.activeTextEditor;
			if (editor && editor.document.languageId === 'yaml') {
				config.type = 'hasflow';
				config.name = 'Launch';
				config.request = 'launch';
				config.debugger = 'hasflow';
				config.stopOnEntry = true;
			}
		}

		//config.console = "_attach";
		config.debugServer = null;

		window.showInformationMessage("Finished resolving debug config:");
		window.showInformationMessage(JSON.stringify(config));

		return config;
	}
}

class HasflowDebugAdapterServerDescriptorFactory implements DebugAdapterDescriptorFactory {

	private server?: Net.Server;

	createDebugAdapterDescriptor(session: DebugSession, executable: DebugAdapterExecutable | undefined): ProviderResult<DebugAdapterDescriptor> {

		window.showInformationMessage("Starting Hasflow Server!");

		if (!this.server) {
			// start listening on a random port
			this.server = Net.createServer(socket => {
				const session = new HasflowDebugSession(workspaceFileAccessor);
				session.setRunAsServer(true);
				session.start(socket as NodeJS.ReadableStream, socket);
			}).listen(0);
		}

		window.showInformationMessage("Listening on " + (this.server.address() as Net.AddressInfo).port);

		// make VS Code connect to debug server
		return new DebugAdapterServer((this.server.address() as Net.AddressInfo).port);
	}

	dispose() {
		if (this.server) {
			this.server.close();
		}
	}
}

const workspaceFileAccessor: FileAccessor = {
	async readFile(path: string) {
		try {
			const uri = Uri.file(path);
			const bytes = await workspace.fs.readFile(uri);
			const contents = Buffer.from(bytes).toString('utf8');
			return contents;
		} catch(e) {
			try {
				const uri = Uri.parse(path);
				const bytes = await workspace.fs.readFile(uri);
				const contents = Buffer.from(bytes).toString('utf8');
				return contents;
			} catch (e) {
				return `cannot read '${path}'`;
			}
		}
	}
};
