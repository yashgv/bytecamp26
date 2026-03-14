import * as vscode from 'vscode';
import { ScanResults } from './scanner';

export interface CodeContract {
    file: string;
    type: 'exposed' | 'consumed';
    method: string;
    endpoint: string;
    payloadSchema?: string;
}

export class GenAIParser {
    /**
     * Phase 2: Read the categorized files and use GenAI to extract Cross-Language Contracts.
     */
    public async extractContracts(scanResults: ScanResults): Promise<CodeContract[]> {
        const allContracts: CodeContract[] = [];

        // For a Hackathon MVP, we shouldn't send EVERY file to the LLM (takes too long & costs $$).
        // A smart heuristic is to only send files we suspect contain APIs (controllers, routers, api/ fetchers).
        const targetBackendFiles = scanResults.layerHierarchy.get('backend') || [];
        const targetFrontendFiles = scanResults.layerHierarchy.get('frontend') || [];

        // 1. Process Backend Files (Exposed APIs)
        for (const filePath of targetBackendFiles) {
            const codeContent = await this.readFileContent(filePath);
            if (codeContent) {
                const contracts = await this.analyzeWithGenAI(filePath, codeContent, 'backend');
                allContracts.push(...contracts);
            }
        }

        // 2. Process Frontend Files (Consumed APIs)
        for (const filePath of targetFrontendFiles) {
            const codeContent = await this.readFileContent(filePath);
            if (codeContent) {
                const contracts = await this.analyzeWithGenAI(filePath, codeContent, 'frontend');
                allContracts.push(...contracts);
            }
        }

        return allContracts;
    }

    private async readFileContent(filePath: string): Promise<string | null> {
        try {
            const uri = vscode.Uri.file(filePath);
            const uint8Array = await vscode.workspace.fs.readFile(uri);
            return new TextDecoder().decode(uint8Array);
        } catch (error) {
            console.error(`Failed to read file: ${filePath}`, error);
            return null;
        }
    }

    /**
     * The core GenAI extraction method. 
     * We prepare the prompt and ask the LLM to return strict JSON.
     */
    private async analyzeWithGenAI(filePath: string, code: string, layer: 'backend' | 'frontend'): Promise<CodeContract[]> {
        // NOTE: In a real implementation, you will replace this with an actual API call 
        // to Gemini, OpenAI, or Anthropic.

        const systemPrompt = `You are a polyglot microservices dependency analyzer.
Analyze the following code snippet. 
If it is a backend file, extract any EXPOSED API routes (e.g. @app.get('/users')).
If it is a frontend file, extract any CONSUMED API routes (e.g. fetch('/users')).

Return EXACTLY a JSON array of objects with this structure, and nothing else:
[
  {
    "type": "${layer === 'backend' ? 'exposed' : 'consumed'}",
    "method": "HTTP Method (GET/POST/etc)",
    "endpoint": "The URL path",
    "payloadSchema": "Any expected JSON body structure (leave empty if none)"
  }
]`;

        // -------------------------------------------------------------
        // TODO: MOCK AI BEHAVIOR FOR NOW UNTIL WE ADD A REAL API KEY.
        // Replace this block with your actual `fetch(...)` to the AI provider.
        // -------------------------------------------------------------
        
        console.log(`Sending ${filePath} to LLM...`);
        // We will temporarily use basic Regex to simulate finding endpoints in the code,
        // so that the names and paths are actually captured accurately for your testing.
        const mockResponse: CodeContract[] = [];
        
        if (layer === 'backend') {
            // Simulates finding endpoints like app.get('/api/users') or @router.post("/auth")
            const backendRegex = /(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`](.+?)['"`]/gi;
            let match;
            while ((match = backendRegex.exec(code)) !== null) {
                mockResponse.push({
                    file: filePath,
                    type: 'exposed',
                    method: match[1].toUpperCase(),
                    endpoint: match[2]
                });
            }
        } else if (layer === 'frontend') {
            // Simulates finding API calls like fetch('/api/users') or axios.get('/api/users')
            const frontendRegex = /(?:fetch|axios(?:\.(get|post|put|delete|patch))?)\s*\(\s*['"`](.+?)['"`]/gi;
            let match;
            while ((match = frontendRegex.exec(code)) !== null) {
                mockResponse.push({
                    file: filePath,
                    type: 'consumed',
                    // If using fetch(), default to GET. If axios.post(), capture POST.
                    method: match[1] ? match[1].toUpperCase() : 'GET', 
                    endpoint: match[2]
                });
            }
        }
        
        return mockResponse;
    }
}
