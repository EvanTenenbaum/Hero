/**
 * Unit tests for Semantic Chunker
 */

import { describe, it, expect } from "vitest";
import { SemanticChunker, isTypeScriptFile } from "./chunker";

describe("SemanticChunker", () => {
  const chunker = new SemanticChunker();
  const projectId = 1;
  const fileHash = "test-hash-123";

  describe("isTypeScriptFile", () => {
    it("should identify TypeScript files", () => {
      expect(isTypeScriptFile("file.ts")).toBe(true);
      expect(isTypeScriptFile("file.tsx")).toBe(true);
      expect(isTypeScriptFile("path/to/file.ts")).toBe(true);
    });

    it("should identify JavaScript files", () => {
      expect(isTypeScriptFile("file.js")).toBe(true);
      expect(isTypeScriptFile("file.jsx")).toBe(true);
    });

    it("should reject non-JS/TS files", () => {
      expect(isTypeScriptFile("file.py")).toBe(false);
      expect(isTypeScriptFile("file.css")).toBe(false);
      expect(isTypeScriptFile("file.json")).toBe(false);
      expect(isTypeScriptFile("file.md")).toBe(false);
    });
  });

  describe("estimateTokens", () => {
    it("should estimate tokens for code", () => {
      const code = "function hello() { return 'world'; }";
      const chunks = chunker.chunkFile(code, "test.ts", projectId, fileHash);
      const funcChunk = chunks.find(c => c.name === "hello");
      expect(funcChunk?.tokenCount).toBeGreaterThan(0);
      expect(funcChunk?.tokenCount).toBeLessThan(100);
    });

    it("should handle empty strings", () => {
      const chunks = chunker.chunkFile("", "empty.ts", projectId, fileHash);
      // File summary chunk is created even for empty files
      expect(chunks.length).toBe(1);
      expect(chunks[0].tokenCount).toBe(0);
    });
  });

  describe("chunkFile - Functions", () => {
    it("should extract function declarations", () => {
      const code = `
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
`;
      const chunks = chunker.chunkFile(code, "test.ts", projectId, fileHash);
      
      expect(chunks.length).toBeGreaterThan(0);
      const funcChunk = chunks.find(c => c.chunkType === "function" && c.name === "greet");
      expect(funcChunk).toBeDefined();
      expect(funcChunk?.content).toContain("function greet");
    });

    it("should extract arrow functions", () => {
      const code = `
const add = (a: number, b: number): number => a + b;

const multiply = (a: number, b: number) => {
  return a * b;
};
`;
      const chunks = chunker.chunkFile(code, "test.ts", projectId, fileHash);
      
      const addChunk = chunks.find(c => c.name === "add");
      const multiplyChunk = chunks.find(c => c.name === "multiply");
      
      expect(addChunk).toBeDefined();
      expect(multiplyChunk).toBeDefined();
    });

    it("should extract async functions", () => {
      const code = `
async function fetchData(url: string): Promise<any> {
  const response = await fetch(url);
  return response.json();
}
`;
      const chunks = chunker.chunkFile(code, "test.ts", projectId, fileHash);
      
      const asyncChunk = chunks.find(c => c.name === "fetchData");
      expect(asyncChunk).toBeDefined();
      expect(asyncChunk?.content).toContain("async");
    });
  });

  describe("chunkFile - Classes", () => {
    it("should extract class declarations", () => {
      const code = `
class UserService {
  private users: User[] = [];
  
  constructor() {}
  
  addUser(user: User): void {
    this.users.push(user);
  }
  
  getUser(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }
}
`;
      const chunks = chunker.chunkFile(code, "test.ts", projectId, fileHash);
      
      const classChunk = chunks.find(c => c.chunkType === "class" && c.name === "UserService");
      expect(classChunk).toBeDefined();
      expect(classChunk?.content).toContain("class UserService");
    });
  });

  describe("chunkFile - Interfaces and Types", () => {
    it("should extract interface declarations", () => {
      const code = `
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}
`;
      const chunks = chunker.chunkFile(code, "test.ts", projectId, fileHash);
      
      const interfaceChunk = chunks.find(c => c.chunkType === "interface" && c.name === "User");
      expect(interfaceChunk).toBeDefined();
    });

    it("should extract type aliases", () => {
      const code = `
type Status = "pending" | "active" | "completed";

type UserWithStatus = User & { status: Status };
`;
      const chunks = chunker.chunkFile(code, "test.ts", projectId, fileHash);
      
      const statusChunk = chunks.find(c => c.chunkType === "type" && c.name === "Status");
      const userWithStatusChunk = chunks.find(c => c.name === "UserWithStatus");
      
      expect(statusChunk).toBeDefined();
      expect(userWithStatusChunk).toBeDefined();
    });
  });

  describe("chunkFile - React Components", () => {
    it("should extract React function components", () => {
      const code = `
import React from 'react';

function Button({ onClick, children }: ButtonProps) {
  return (
    <button onClick={onClick} className="btn">
      {children}
    </button>
  );
}

export default Button;
`;
      const chunks = chunker.chunkFile(code, "Button.tsx", projectId, fileHash);
      
      const componentChunk = chunks.find(c => c.chunkType === "component" && c.name === "Button");
      expect(componentChunk).toBeDefined();
    });

    it("should extract arrow function components", () => {
      const code = `
const Card: React.FC<CardProps> = ({ title, content }) => {
  return (
    <div className="card">
      <h2>{title}</h2>
      <p>{content}</p>
    </div>
  );
};
`;
      const chunks = chunker.chunkFile(code, "Card.tsx", projectId, fileHash);
      
      const componentChunk = chunks.find(c => c.chunkType === "component" && c.name === "Card");
      expect(componentChunk).toBeDefined();
    });
  });

  describe("chunkFile - React Hooks", () => {
    it("should extract custom hooks", () => {
      const code = `
function useCounter(initialValue: number = 0) {
  const [count, setCount] = useState(initialValue);
  
  const increment = () => setCount(c => c + 1);
  const decrement = () => setCount(c => c - 1);
  const reset = () => setCount(initialValue);
  
  return { count, increment, decrement, reset };
}
`;
      const chunks = chunker.chunkFile(code, "useCounter.ts", projectId, fileHash);
      
      const hookChunk = chunks.find(c => c.chunkType === "hook" && c.name === "useCounter");
      expect(hookChunk).toBeDefined();
    });

    it("should extract arrow function hooks", () => {
      const code = `
const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });
  
  return [value, setValue] as const;
};
`;
      const chunks = chunker.chunkFile(code, "useLocalStorage.ts", projectId, fileHash);
      
      const hookChunk = chunks.find(c => c.chunkType === "hook" && c.name === "useLocalStorage");
      expect(hookChunk).toBeDefined();
    });
  });

  describe("chunkFile - Constants", () => {
    it("should extract exported constants", () => {
      const code = `
export const API_URL = "https://api.example.com";
export const MAX_RETRIES = 3;
export const DEFAULT_CONFIG = {
  timeout: 5000,
  retries: MAX_RETRIES,
};
`;
      const chunks = chunker.chunkFile(code, "constants.ts", projectId, fileHash);
      
      const apiUrlChunk = chunks.find(c => c.name === "API_URL");
      const configChunk = chunks.find(c => c.name === "DEFAULT_CONFIG");
      
      expect(apiUrlChunk).toBeDefined();
      expect(configChunk).toBeDefined();
    });
  });

  describe("chunkFile - Metadata", () => {
    it("should include correct file path", () => {
      const code = `function test() {}`;
      const chunks = chunker.chunkFile(code, "src/utils/test.ts", projectId, fileHash);
      
      expect(chunks[0]?.filePath).toBe("src/utils/test.ts");
    });

    it("should include project ID", () => {
      const code = `function test() {}`;
      const chunks = chunker.chunkFile(code, "test.ts", 42, fileHash);
      
      expect(chunks[0]?.projectId).toBe(42);
    });

    it("should include file hash", () => {
      const code = `function test() {}`;
      const chunks = chunker.chunkFile(code, "test.ts", projectId, "abc123");
      
      expect(chunks[0]?.fileHash).toBe("abc123");
    });

    it("should include line numbers", () => {
      const code = `
function first() {}

function second() {}
`;
      const chunks = chunker.chunkFile(code, "test.ts", projectId, fileHash);
      
      const firstChunk = chunks.find(c => c.name === "first");
      const secondChunk = chunks.find(c => c.name === "second");
      
      expect(firstChunk?.startLine).toBeDefined();
      expect(secondChunk?.startLine).toBeDefined();
      expect(secondChunk!.startLine).toBeGreaterThan(firstChunk!.startLine);
    });

    it("should extract keywords", () => {
      const code = `
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
`;
      const chunks = chunker.chunkFile(code, "test.ts", projectId, fileHash);
      
      const chunk = chunks.find(c => c.name === "calculateTotal");
      expect(chunk?.keywords).toBeDefined();
      expect(chunk?.keywords).toContain("calculateTotal");
    });
  });

  describe("chunkFile - Edge Cases", () => {
    it("should handle empty files", () => {
      const chunks = chunker.chunkFile("", "empty.ts", projectId, fileHash);
      // File summary chunk is created even for empty files
      expect(chunks.length).toBe(1);
      expect(chunks[0].chunkType).toBe("file_summary");
    });

    it("should handle files with only comments", () => {
      const code = `
// This is a comment
/* Multi-line
   comment */
`;
      const chunks = chunker.chunkFile(code, "comments.ts", projectId, fileHash);
      // File summary chunk is created
      expect(chunks.length).toBe(1);
      expect(chunks[0].chunkType).toBe("file_summary");
    });

    it("should handle syntax errors gracefully", () => {
      const code = `
function broken( {
  // Missing closing paren and brace
`;
      // Should not throw
      expect(() => chunker.chunkFile(code, "broken.ts", projectId, fileHash)).not.toThrow();
    });

    it("should handle very long files", () => {
      // Generate a file with many functions
      let code = "";
      for (let i = 0; i < 100; i++) {
        code += `function func${i}() { return ${i}; }\n`;
      }
      
      const chunks = chunker.chunkFile(code, "large.ts", projectId, fileHash);
      // 100 functions + 1 file summary
      expect(chunks.length).toBe(101);
    });
  });
});
