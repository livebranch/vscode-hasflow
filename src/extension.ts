/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import * as Net from 'net';
import * as os from 'os';
// import * as crypto from 'crypto';
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
	// Task,
	// tasks,
	// ShellExecution,
	// TaskScope,
	// TaskRevealKind,
	TextDocument,
	Position,
	CompletionContext,
	CompletionItem,
	// SnippetString,
	// MarkdownString,
	// CompletionItemKind,
	languages,

} from 'vscode';
import { FileAccessor } from './hasflowRuntime';


export function activate(context: ExtensionContext) {

	var factory = new HasflowDebugAdapterServerDescriptorFactory();

	// register a configuration provider for 'hasflow' debug type
	const provider = new HasflowConfigurationProvider();
	context.subscriptions.push(debug.registerDebugConfigurationProvider('hasflow', provider));

	context.subscriptions.push(debug.registerDebugAdapterDescriptorFactory('hasflow', factory));
	if ('dispose' in factory) {
		context.subscriptions.push(factory);
	}

	context.subscriptions.push(
		commands.registerCommand('hasflow.debug.startSession', (config) => {
			window.showInformationMessage("Called hasflow.debug.startSession");
			
			let workspaceFolder;
			if (window.activeTextEditor) {
				workspaceFolder = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri);
			}

			return debug.startDebugging(workspaceFolder, config);
		})
	);

	// Function autocompletion
	// console.log('Activated! :-D')

	const completionProvider = languages.registerCompletionItemProvider('yaml', {
		provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext) {


			var completionItems = Array<CompletionItem>()

			// a simple completion item which inserts `Hello World!`
			// const simpleCompletion = new CompletionItem('Hello World!');

			if (document.fileName.endsWith('process') || document.fileName.endsWith('process.yml') || document.fileName.endsWith('process.yaml')) {
				const httpPostCompletion = new CompletionItem('Sample HTTP Process');
				var httpPostText =
					'aux:\n' +
					'  url: URLParams(./url.iface)\n' +
					'  query: URLQuery(./query.iface)\n' +
					'  body: OneJSONPath(./body.iface)\n' +
					'isOne: ./item(query, body)\n' +
					'query:\n' +
					'  where: meta.id\n' +
					'  :equals: url.id\n' +
					'output:\n' +
					'  result:\n' +
					'    //http/data.process' +
					'  error:\n' +
					'    //http/error.process'

				httpPostCompletion.insertText = httpPostText
				completionItems.push(httpPostCompletion)
			}

			// a completion item that inserts its text as snippet,
			// the `insertText`-property is a `SnippetString` which will be
			// honored by the editor.
			// const snippetCompletion = new CompletionItem('Good part of the day');
			// snippetCompletion.insertText = new SnippetString('Good ${1|morning,afternoon,evening|}. It is ${1}, right?'  + context.triggerCharacter + ':::' + context.triggerKind.toString() + document.getText());
			// const docs: any = new MarkdownString("Inserts a snippet that lets you select [link](x.ts).");
			// snippetCompletion.documentation = docs;
			// docs.baseUri = Uri.parse('http://example.com/a/b/c/');

			// // a completion item that can be accepted by a commit character,
			// // the `commitCharacters`-property is set which means that the completion will
			// // be inserted and then the character will be typed.
			// const commitCharacterCompletion = new CompletionItem('console');
			// commitCharacterCompletion.commitCharacters = ['.'];
			// commitCharacterCompletion.documentation = new MarkdownString('Press `.` to get `console.`');

			// // a completion item that retriggers IntelliSense when being accepted,
			// // the `command`-property is set which the editor will execute after 
			// // completion has been inserted. Also, the `insertText` is set so that 
			// // a space is inserted after `new`
			// const commandCompletion = new CompletionItem('new');
			// commandCompletion.kind = CompletionItemKind.Keyword;
			// commandCompletion.insertText = 'new ';
			// commandCompletion.command = { command: 'editor.action.triggerSuggest', title: 'Re-trigger completions...' };

			// return all completion items as array
			return completionItems;
		}
	});
	context.subscriptions.push(completionProvider);
	// commands.executeCommand("identifier.hasflow");
}

class HasflowConfigurationProvider implements DebugConfigurationProvider {

	/**
	 * Massage a debug configuration just before a debug session is being launched,
	 * e.g. add all missing attributes to the debug configuration.
	 */
	resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {

		if (!config.bundlePath) {
			config.bundlePath = ''
			config.program = folder?.uri.path

			// var zipcmd = `zip -FSr ${config.bundlePath} *`
			// if (os.platform() == "win32") {
			// 	zipcmd = `Compress-Archive -Path * -DestinationPath ${config.bundlePath}`
			// }

			// var prelaunchTask = new Task(
			// 	{ type: 'shell', task: 'package', isBackground: true, },
			// 	TaskScope.Global,
			// 	"Hasflow Package",
			// 	"hasflow",
			// 	new ShellExecution(zipcmd)
			// );
			// if (!prelaunchTask.presentationOptions) {
			// 	prelaunchTask.presentationOptions = {}
			// }
			// prelaunchTask.presentationOptions.focus = false
			// prelaunchTask.presentationOptions.reveal = TaskRevealKind.Silent

			// tasks.executeTask(prelaunchTask)

			// Focus the debug window
			commands.executeCommand('workbench.debug.action.focusRepl')
			
			// if launch.json is missing or empty
			if (!config.type && !config.request && !config.name) {
				const editor = window.activeTextEditor;
				if (editor && editor.document.languageId === 'yaml') {
					config.type = 'hasflow';
					config.name = 'Launch';
					config.request = 'launch';
 					if (os.platform() == "win32") {
 						config.debugger = 'hasflow.exe';
						// Remove leading '/' from program path
						config.program = folder?.uri.path.replace(/^\//g, '')
 					} else {
 						config.debugger = 'hasflow';
 					}
 					config.seeders = [];
					// Ideally we would register the task and call it as a prelaunch task
					// config.preLaunchTask = prelaunchTask.name;
				}
			}
		}
		config.debugServer = null;

		return config;
	}
}

class HasflowDebugAdapterServerDescriptorFactory implements DebugAdapterDescriptorFactory {

	private server?: Net.Server;

	createDebugAdapterDescriptor(session: DebugSession, executable: DebugAdapterExecutable | undefined): ProviderResult<DebugAdapterDescriptor> {

		if (!this.server) {
			// start listening on a random port
			this.server = Net.createServer(socket => {
				const session = new HasflowDebugSession(workspaceFileAccessor);
				session.setRunAsServer(true);
				session.start(socket as NodeJS.ReadableStream, socket);
			}).listen(0);
		} else {
			// window.showInformationMessage("Server already running");
		}

		var server = this.server

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
