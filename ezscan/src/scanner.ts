import * as vscode from 'vscode';

export interface ScanResults {
    layerHierarchy: Map<string, string[]>;
    languageHierarchy: Map<string, string[]>;
}

export class WorkspaceScanner {
    /**
     * Phase 1: Scan all files in the workspace and categorize them by architecture layer and language.
     */
    public async scanWorkspace(): Promise<ScanResults> {
        // We will categorize files to help us know what parsers to run in Phase 2
        const layerHierarchy = new Map<string, string[]>();
        layerHierarchy.set('backend', []);
        layerHierarchy.set('frontend', []);
        layerHierarchy.set('database', []);
        layerHierarchy.set('other', []);

        const languageHierarchy = new Map<string, string[]>();

        // Find all relevant files. 
        // 1st Arg: Include pattern (all files)
        // 2nd Arg: Exclude pattern (ignore heavy folders like node_modules, compiled output)
        const files = await vscode.workspace.findFiles(
            '**/*.*', 
            '**/{node_modules,.git,out,dist,build,coverage,venv,.venv}/**' 
        );

        for (const file of files) {
            const path = file.path.toLowerCase();
            const extensionMatch = path.match(/\.([^.]+)$/);
            const extension = extensionMatch ? extensionMatch[1] : 'unknown';

            // Populate Language Hierarchy
            if (!languageHierarchy.has(extension)) {
                languageHierarchy.set(extension, []);
            }
            languageHierarchy.get(extension)?.push(file.fsPath);
            
            // Phase 1 Categorization Logic (Architecture Layers)
            if (path.endsWith('.sql') || path.includes('/prisma/') || path.includes('/migrations/')) {
                layerHierarchy.get('database')?.push(file.fsPath);
            } else if (path.endsWith('.py') || path.endsWith('.java') || path.endsWith('.go') || path.endsWith('.cs') || path.endsWith('.rb')) {
                layerHierarchy.get('backend')?.push(file.fsPath);
            } else if (path.endsWith('.html') || path.endsWith('.css') || path.endsWith('.scss')) {
                layerHierarchy.get('frontend')?.push(file.fsPath);
            } else if (path.endsWith('.ts') || path.endsWith('.tsx') || path.endsWith('.jsx') || path.endsWith('.js')) {
                // If it's JS/TS, guess based on folder name whether it's backend or frontend
                if (path.includes('/backend/') || path.includes('/server/') || path.includes('/api/')) {
                    layerHierarchy.get('backend')?.push(file.fsPath);
                } else if (path.includes('/frontend/') || path.includes('/client/') || path.includes('/components/') || path.endsWith('.tsx') || path.endsWith('.jsx')) {
                    layerHierarchy.get('frontend')?.push(file.fsPath);
                } else {
                    // Default to backend for now, or could be 'other'
                    layerHierarchy.get('frontend')?.push(file.fsPath); 
                }
            } else {
                layerHierarchy.get('other')?.push(file.fsPath);
            }
        }

        return { layerHierarchy, languageHierarchy };
    }
}
