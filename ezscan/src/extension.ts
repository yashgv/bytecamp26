// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "ezscan" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('ezscan.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from EzScan!');
	});

	const provider = new EzScanSidebarProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(EzScanSidebarProvider.viewType, provider)
	);

	context.subscriptions.push(disposable);
}

class EzScanSidebarProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'ezscan.sidebarView';

	constructor(private readonly _extensionUri: vscode.Uri) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri]
		};

		webviewView.webview.html = getWebviewContent();

		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.command) {
				case 'runScan':
					vscode.window.showInformationMessage('Starting Analysis through left Activity Bar...');
					break;
			}
		});
	}
}

function getWebviewContent() {
	return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EzScan</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 15px;
        }
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 12px;
            cursor: pointer;
            width: 100%;
            margin-top: 20px;
            font-size: 14px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <h2>EzScan Status</h2>
    <p>Ready to analyze the repository.</p>
    <button id="scanBtn">Run Analysis</button>

    <script>
        const vscode = acquireVsCodeApi();
        
        document.getElementById('scanBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'runScan' });
        });
    </script>
</body>
</html>`;
}

// This method is called when your extension is deactivated
export function deactivate() {}
