import express from "express";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { MCPChatbot } from "./mcp-client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// Create MCP chatbot instance
const chatbot = new MCPChatbot();

// WebSocket connection handling
wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === "connect") {
        // Connect to MCP server
        await chatbot.connect();
        ws.send(
          JSON.stringify({
            type: "connected",
            message: "Connected to MCP server successfully!",
          })
        );

        // Send available tools
        const tools = await chatbot.listTools();
        ws.send(
          JSON.stringify({
            type: "tools",
            tools: tools,
          })
        );
      } else if (data.type === "message") {
        // Handle chat message
        const response = await chatbot.processMessage(data.message);
        ws.send(
          JSON.stringify({
            type: "response",
            message: response.message,
            mcpOperation: response.mcpOperation,
          })
        );
      } else if (data.type === "disconnect") {
        // Disconnect from MCP server
        await chatbot.disconnect();
        ws.send(
          JSON.stringify({
            type: "disconnected",
            message: "Disconnected from MCP server",
          })
        );
      }
    } catch (error) {
      console.error("Error handling message:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: error.message,
        })
      );
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Chatbot server running on http://localhost:${PORT}`);
  console.log("Open your browser to start chatting!");
});
