#!/usr/bin/env node

// Simple build script that compiles only the core functionality
// This avoids MCP server issues for now while demonstrating the voice generation

import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';

const execAsync = promisify(exec);

async function buildCore() {
  console.log('🔨 Building Voice Generation Tool core functionality...');
  
  try {
    // Create a temporary tsconfig that excludes MCP files
    const tsConfig = {
      "compilerOptions": {
        "target": "ES2022",
        "module": "ESNext",
        "moduleResolution": "Node",
        "esModuleInterop": true,
        "allowSyntheticDefaultImports": true,
        "strict": false,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "outDir": "./dist",
        "rootDir": "./src",
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true,
        "resolveJsonModule": true,
        "allowImportingTsExtensions": false,
        "noEmit": false,
        "noImplicitAny": false
      },
      "include": [
        "src/core/**/*",
        "src/providers/**/*", 
        "src/interfaces/**/*",
        "src/utils/**/*",
        "src/index.ts",
        "src/cli.ts"
      ],
      "exclude": ["node_modules", "dist", "tests", "src/mcp", "src/api"]
    };
    
    await fs.writeFile('tsconfig.core.json', JSON.stringify(tsConfig, null, 2));
    
    // Build with the core config
    await execAsync('npx tsc -p tsconfig.core.json');
    
    // Clean up
    await fs.unlink('tsconfig.core.json');
    
    console.log('✅ Core build completed successfully!');
    console.log('🎵 You can now run: npm run generate -- "Hello world" --voice "Deep male voice"');
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

buildCore();