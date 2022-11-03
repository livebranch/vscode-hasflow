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
import {activateHasflowDebug} from './activateHasflowDebug'
import { FileAccessor } from './hasflowRuntime';


export function activate(context: ExtensionContext) {
	window.showInformationMessage("Activating Hasflow");

	activateHasflowDebug(context, new HasflowDebugAdapterServerDescriptorFactory());

	// const factory = new HasflowDebugAdapterServerDescriptorFactory();
	// const provider = new HasflowConfigurationProvider();

	// context.subscriptions.push(debug.registerDebugConfigurationProvider('hasflow', provider));
	// context.subscriptions.push(debug.registerDebugAdapterDescriptorFactory('hasflow', factory));
	// if ('dispose' in factory) {
	// 	context.subscriptions.push(factory);
	// }

	// context.subscriptions.push(
	// 	commands.registerCommand('extension.hasflow.runEditorContents', (config) => {
	// 		window.showInformationMessage("called extension.hasflow.runEditorContents");

	// 		let workspaceFolder;
	// 		if (window.activeTextEditor) {
	// 			workspaceFolder = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri);
	// 		}

	// 		return debug.startDebugging(workspaceFolder, config);
	// 	})
	// );
	
}

// class HasflowConfigurationProvider implements DebugConfigurationProvider {

// 	/**
// 	 * Massage a debug configuration just before a debug session is being launched,
// 	 * e.g. add all missing attributes to the debug configuration.
// 	 */
// 	resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {

// 		if (!config.bundlePath) {
// 			config.bundlePath = ''
// 			config.program = folder?.uri.path

// 			// var zipcmd = `zip -FSr ${config.bundlePath} *`
// 			// if (os.platform() == "win32") {
// 			// 	zipcmd = `Compress-Archive -Path * -DestinationPath ${config.bundlePath}`
// 			// }

// 			// var prelaunchTask = new Task(
// 			// 	{ type: 'shell', task: 'package', isBackground: true,  },
// 			// 	TaskScope.Global,
// 			// 	"Hasflow Package",
// 			// 	"hasflow",
// 			// 	new ShellExecution(zipcmd)
// 			// );
// 			// if (!prelaunchTask.presentationOptions) {
// 			// 	prelaunchTask.presentationOptions = {}
// 			// }
// 			// prelaunchTask.presentationOptions.focus = false
// 			// prelaunchTask.presentationOptions.reveal = TaskRevealKind.Silent

// 			// tasks.executeTask(prelaunchTask)

// 			// Focus the debug window
// 			commands.executeCommand('workbench.debug.action.focusRepl')
			
// 			// if launch.json is missing or empty
// 			if (!config.type && !config.request && !config.name) {
// 				const editor = window.activeTextEditor;
// 				if (editor && editor.document.languageId === 'yaml') {
// 					config.type = 'hasflow';
// 					config.name = 'Launch';
// 					config.request = 'launch';
// 					if (os.platform() == "win32") {
// 						config.debugger = 'hasflow.exe';
// 					} else {
// 						config.debugger = 'hasflow';
// 					}
// 					config.initialSeederTags = [];
// 					// Ideally we would register the task and call it as a prelaunch task
// 					// config.preLaunchTask = prelaunchTask.name;
// 				}
// 			}
// 		}
// 		config.debugServer = null;

// 		return config;
// 	}
// }

class HasflowDebugAdapterServerDescriptorFactory implements DebugAdapterDescriptorFactory {

	private server?: Net.Server;

	createDebugAdapterDescriptor(session: DebugSession, executable: DebugAdapterExecutable | undefined): ProviderResult<DebugAdapterDescriptor> {
		console.error(`starting`);

		if (!this.server) {
			console.error(`setting server`);
			this.server = Net.createServer(socket => {
				const session = new HasflowDebugSession(workspaceFileAccessor);
				session.setRunAsServer(true);
				session.start(socket as NodeJS.ReadableStream, socket);
			}).listen(0);
			console.error(`set server`);
		}

		var server = this.server

		console.error(`started server?`);
		console.error(`yes! Started server at ${server.address()}`);
		
		// make VS Code connect to debug server
		return new DebugAdapterServer((server.address() as Net.AddressInfo).port);
	}

	dispose() {
		if (this.server) {
			this.server.close();
		}
	}
}

const workspaceFileAccessor: FileAccessor = {

	async readFile(path: string) {

		var workspaceFolder : WorkspaceFolder | undefined;
		if (window.activeTextEditor) {
			workspaceFolder = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri);
		}

		try {
			if (workspaceFolder) {
				path = workspaceFolder.uri.path + '/' + path;
			}
			var uri = Uri.file(path);
			var bytes = await workspace.fs.readFile(uri);
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
