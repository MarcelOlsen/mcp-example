import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MCPChatbot {
  constructor() {
    this.client = null;
    this.transport = null;
    this.isConnected = false;
    this.availableTools = [];
    this.conversationHistory = [];
  }

  async connect() {
    try {
      // Create transport to connect to our MCP server via stdio
      const serverPath = path.resolve(__dirname, "../../server/index.ts");

      this.transport = new StdioClientTransport({
        command: "bun",
        args: ["run", serverPath],
        // Use current working directory as the server directory
        cwd: path.resolve(__dirname, "../../server"),
      });

      // Create client
      this.client = new Client({
        name: "mcp-chatbot-client",
        version: "1.0.0",
      });

      // Connect to server
      await this.client.connect(this.transport);
      this.isConnected = true;

      // Get available tools
      await this.loadTools();

      console.log("✅ Connected to MCP server");
      return true;
    } catch (error) {
      console.error("❌ Failed to connect to MCP server:", error);
      this.isConnected = false;
      throw new Error(`Failed to connect to MCP server: ${error.message}`);
    }
  }

  async disconnect() {
    if (this.transport) {
      try {
        await this.transport.close();
        this.isConnected = false;
        this.client = null;
        this.transport = null;
        console.log("✅ Disconnected from MCP server");
      } catch (error) {
        console.error("❌ Error disconnecting:", error);
      }
    }
  }

  async loadTools() {
    if (!this.client) {
      throw new Error("Client not connected");
    }

    try {
      const toolsResponse = await this.client.listTools();
      this.availableTools = toolsResponse.tools || [];
      console.log(
        `📋 Loaded ${this.availableTools.length} tools:`,
        this.availableTools.map((t) => t.name).join(", ")
      );
    } catch (error) {
      console.error("❌ Failed to load tools:", error);
      this.availableTools = [];
    }
  }

  async listTools() {
    return this.availableTools;
  }

  async processMessage(userMessage) {
    if (!this.isConnected || !this.client) {
      throw new Error("Not connected to MCP server");
    }

    try {
      // Add user message to conversation history
      this.conversationHistory.push({
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      });

      // Simple command parsing for demonstration
      const response = await this.handleUserInput(userMessage);

      // Extract message and MCP operation info
      const messageContent =
        typeof response === "string" ? response : response.message;
      const mcpOperation =
        typeof response === "object" ? response.mcpOperation : null;

      // Add assistant response to conversation history
      this.conversationHistory.push({
        role: "assistant",
        content: messageContent,
        timestamp: new Date(),
        mcpOperation: mcpOperation,
      });

      return { message: messageContent, mcpOperation: mcpOperation };
    } catch (error) {
      console.error("❌ Error processing message:", error);
      return { message: `Sorry, I encountered an error: ${error.message}` };
    }
  }

  async handleUserInput(input) {
    const trimmedInput = input.trim().toLowerCase();

    // Handle special commands
    if (trimmedInput === "help" || trimmedInput === "/help") {
      return this.getHelpMessage();
    }

    if (trimmedInput === "tools" || trimmedInput === "/tools") {
      return this.getToolsMessage();
    }

    if (trimmedInput.startsWith("greeting:")) {
      return await this.handleGreeting(input);
    }

    // Try to parse as a math operation
    if (this.isMathOperation(trimmedInput)) {
      return await this.handleMathOperation(trimmedInput);
    }

    // Default response with suggestions
    return this.getDefaultResponse(input);
  }

  isMathOperation(input) {
    // Check if input looks like a math operation
    const mathPatterns = [
      /add\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)/i,
      /(\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)/,
      /subtract\s+(\d+(?:\.\d+)?)\s+from\s+(\d+(?:\.\d+)?)/i,
      /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/,
    ];

    return mathPatterns.some((pattern) => pattern.test(input));
  }

  async handleMathOperation(input) {
    try {
      // Parse addition
      let match =
        input.match(/add\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)/i) ||
        input.match(/(\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)/);

      if (match) {
        const a = parseFloat(match[1]);
        const b = parseFloat(match[2]);
        const result = await this.client.callTool({
          name: "add",
          arguments: { a, b },
        });
        return {
          message: `🧮 ${a} + ${b} = ${result.content[0].text}`,
          mcpOperation: {
            type: "tool",
            name: "add",
            arguments: { a, b },
            result: result.content[0].text,
          },
        };
      }

      // Parse subtraction
      match =
        input.match(/subtract\s+(\d+(?:\.\d+)?)\s+from\s+(\d+(?:\.\d+)?)/i) ||
        input.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);

      if (match) {
        const a = parseFloat(match[1]);
        const b = parseFloat(match[2]);
        const result = await this.client.callTool({
          name: "subtract",
          arguments: { a, b },
        });
        return {
          message: `🧮 ${a} - ${b} = ${result.content[0].text}`,
          mcpOperation: {
            type: "tool",
            name: "subtract",
            arguments: { a, b },
            result: result.content[0].text,
          },
        };
      }

      return {
        message:
          "I couldn't parse that math operation. Try something like 'add 5 and 3' or '10 - 4'.",
      };
    } catch (error) {
      console.error("Math operation error:", error);
      return { message: `Error performing math operation: ${error.message}` };
    }
  }

  async handleGreeting(input) {
    try {
      // Extract name from greeting: format
      const nameMatch = input.match(/greeting:\/\/(.+)/i);
      if (!nameMatch) {
        return { message: "Please use the format: greeting://YourName" };
      }

      const name = nameMatch[1];
      const result = await this.client.readResource({
        uri: `greeting://${name}`,
      });

      return {
        message: `👋 ${result.contents[0].text}`,
        mcpOperation: {
          type: "resource",
          uri: `greeting://${name}`,
          result: result.contents[0].text,
        },
      };
    } catch (error) {
      console.error("Greeting error:", error);
      return { message: `Error getting greeting: ${error.message}` };
    }
  }

  getHelpMessage() {
    return {
      message: `🤖 **MCP Chatbot Help**

Available commands:
• **Math Operations**: 
  - "add 5 and 3" or "5 + 3"
  - "subtract 2 from 10" or "10 - 2"
  
• **Greetings**: 
  - "greeting://YourName" (e.g., "greeting://Alice")
  
• **Information**: 
  - "tools" - List available MCP tools
  - "help" - Show this help message

Try asking me to perform calculations or get a personalized greeting!`,
    };
  }

  getToolsMessage() {
    if (this.availableTools.length === 0) {
      return { message: "No tools are currently available." };
    }

    const toolsList = this.availableTools
      .map(
        (tool) =>
          `• **${tool.name}**: ${
            tool.description || "No description available"
          }`
      )
      .join("\n");

    return { message: `🔧 **Available MCP Tools:**\n\n${toolsList}` };
  }

  getDefaultResponse(input) {
    return {
      message: `🤔 I'm not sure how to help with "${input}".

Try one of these:
• Math: "add 5 and 3" or "10 - 2"
• Greeting: "greeting://YourName"
• Type "help" for more options

What would you like me to help you with?`,
    };
  }

  getConversationHistory() {
    return this.conversationHistory;
  }
}
