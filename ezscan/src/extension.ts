// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { WorkspaceScanner } from './scanner';
import { GenAIParser } from './parser';

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

		webviewView.webview.onDidReceiveMessage(async data => {
			switch (data.command) {
				case 'runScan':
					vscode.window.showInformationMessage('Scanning repository...');
					
					// Initialize Phase 1 Scanner
					const scanner = new WorkspaceScanner();
					const results = await scanner.scanWorkspace();
					
					// Calculate totals for UI (using layerHierarchy to parse total files)
					let totalFiles = 0;
					results.layerHierarchy.forEach(files => totalFiles += files.length);

					// Initialize Phase 2: GenAI Contract Extraction
					vscode.window.showInformationMessage(`Phase 1 Complete. Initiating Phase 2: AI Contract Extraction on target files...`);
					const parser = new GenAIParser();
					const contracts = await parser.extractContracts(results);
					
					vscode.window.showInformationMessage(`Analysis complete! Found ${contracts.length} API Contracts.`);
					
					// Send the categorized results back to the Webview UI to render
					webviewView.webview.postMessage({
						command: 'scanResults',
						data: {
							layers: Array.from(results.layerHierarchy.entries()),
							languages: Array.from(results.languageHierarchy.entries()),
							contracts: contracts
						},
						total: totalFiles
					});
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
    <div id="results" style="margin-top: 15px;"></div>

    <script>
        const vscode = acquireVsCodeApi();
        
        document.getElementById('scanBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'runScan' });
            document.getElementById('scanBtn').innerText = 'Scanning...';
            document.getElementById('results').innerHTML = '<p>Searching workspace files...</p>';
        });

        // Listen for messages from the extension backend
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'scanResults') {
                // Reset button
                document.getElementById('scanBtn').innerText = 'Run Analysis';
                
                // Render results
                const results = message.data;
                let html = '<h3>Scan Results</h3>';
                html += '<p>Identified <b>' + message.total + '</b> total files.</p>';
                
                // 1. Architecture Layers
                html += '<h4>Architecture Layers</h4><ul>';
                for (const [category, files] of results.layers) {
                    if (files.length > 0) {
                        html += '<li><strong>' + category.toUpperCase() + '</strong>: ' + files.length + ' files</li>';
                    }
                }
                html += '</ul>';

                // 2. Languages / Extensions
                html += '<h4>Languages Found</h4><ul>';
                // Sort languages by file count descending
                const sortedLanguages = results.languages.sort((a, b) => b[1].length - a[1].length);
                for (const [ext, files] of sortedLanguages) {
                    if (files.length > 0) {
                        // Uppercase the extension, default 'unknown' handling
                        const extName = ext === 'unknown' ? 'NO EXTENSION' : '.' + ext.toUpperCase();
                        html += '<li><strong>' + extName + '</strong>: ' + files.length + ' files</li>';
                    }
                }
                html += '</ul>';

                // 3. Extracted Contracts (Phase 2 Output)
                html += '<h4>Extracted API Boundaries (Phase 2)</h4>';
                if (results.contracts && results.contracts.length > 0) {
                    html += '<ul style="list-style-type: none; padding-left: 0;">';
                    results.contracts.forEach(contract => {
                        const isExposed = contract.type === 'exposed';
                        const color = isExposed ? '#4CAF50' : '#2196F3'; // Green for backend, Blue for frontend
                        const badge = '<span style="background-color: ' + color + '; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-right: 5px;">' + contract.method + '</span>';
                        
                        // Extract filename from the full path for cleaner display
                        const fileName = contract.file.split(/[\\\\/]/).pop() || 'Unknown File';

                        html += '<li style="margin-bottom: 8px; border-left: 3px solid ' + color + '; padding-left: 8px;">';
                        html += badge + ' <strong>' + contract.endpoint + '</strong><br/>';
                        html += '<span style="font-size: 11px; opacity: 0.8;">' + (isExposed ? 'Exposed in ' : 'Consumed by ') + fileName + '</span>';
                        html += '</li>';
                    });
                    html += '</ul>';
                } else {
                    html += '<p style="font-style: italic; opacity: 0.8;">No major API contracts found in common API/Controller directories.</p>';
                }
                
                document.getElementById('results').innerHTML = html;
            }
        });
    </script>
</body>
</html>`;
}

// This method is called when your extension is deactivated
export function deactivate() {}
