class MCPChatbotUI {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.messageHistory = [];

    this.initializeElements();
    this.attachEventListeners();
    this.initializeWebSocket();
  }

  initializeElements() {
    // Main elements
    this.messageInput = document.getElementById("messageInput");
    this.sendButton = document.getElementById("sendButton");
    this.messagesContainer = document.getElementById("messages");
    this.statusIndicator = document.getElementById("statusIndicator");
    this.statusText = document.getElementById("statusText");
    this.toolsList = document.getElementById("toolsList");

    // Action buttons
    this.connectButton = document.getElementById("connectButton");
    this.disconnectButton = document.getElementById("disconnectButton");
    this.clearButton = document.getElementById("clearButton");
  }

  attachEventListeners() {
    // Send message events
    this.sendButton.addEventListener("click", () => this.sendMessage());
    this.messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Connection events
    this.connectButton.addEventListener("click", () => this.connect());
    this.disconnectButton.addEventListener("click", () => this.disconnect());
    this.clearButton.addEventListener("click", () => this.clearChat());

    // Auto-resize textarea
    this.messageInput.addEventListener("input", () => this.autoResizeInput());
  }

  initializeWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      this.ws = new WebSocket(wsUrl);
      this.setupWebSocketEventListeners();
    } catch (error) {
      this.showError("Failed to initialize WebSocket connection");
      console.error("WebSocket initialization error:", error);
    }
  }

  setupWebSocketEventListeners() {
    this.ws.onopen = () => {
      console.log("✅ WebSocket connected");
      this.updateConnectionStatus("WebSocket Connected", false);
    };

    this.ws.onclose = () => {
      console.log("❌ WebSocket disconnected");
      this.updateConnectionStatus("Disconnected", false);
      this.isConnected = false;
      this.updateUIState();

      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (!this.isConnected && !this.isConnecting) {
          this.initializeWebSocket();
        }
      }, 3000);
    };

    this.ws.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
      this.showError("WebSocket connection error");
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleServerMessage(data);
      } catch (error) {
        console.error("❌ Error parsing server message:", error);
        this.showError("Error parsing server response");
      }
    };
  }

  handleServerMessage(data) {
    console.log("📨 Received:", data);

    switch (data.type) {
      case "connected":
        this.isConnected = true;
        this.isConnecting = false;
        this.updateConnectionStatus("Connected to MCP", true);
        this.addSystemMessage(data.message, "success");
        this.updateUIState();
        break;

      case "disconnected":
        this.isConnected = false;
        this.updateConnectionStatus("Disconnected", false);
        this.addSystemMessage(data.message, "info");
        this.updateUIState();
        this.clearTools();
        break;

      case "tools":
        this.updateToolsList(data.tools);
        break;

      case "response":
        this.addMessage("assistant", data.message, data.mcpOperation);
        break;

      case "error":
        this.showError(data.message);
        this.isConnecting = false;
        this.updateUIState();
        break;

      default:
        console.warn("Unknown message type:", data.type);
    }
  }

  connect() {
    if (this.isConnecting || this.isConnected) return;

    this.isConnecting = true;
    this.updateConnectionStatus("Connecting...", false);
    this.updateUIState();

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendToServer({ type: "connect" });
    } else {
      this.showError("WebSocket not connected. Please refresh the page.");
      this.isConnecting = false;
      this.updateUIState();
    }
  }

  disconnect() {
    if (!this.isConnected) return;

    this.sendToServer({ type: "disconnect" });
  }

  sendMessage() {
    const message = this.messageInput.value.trim();
    if (!message || !this.isConnected) return;

    // Add user message to UI
    this.addMessage("user", message, null);

    // Send to server
    this.sendToServer({
      type: "message",
      message: message,
    });

    // Clear input
    this.messageInput.value = "";
    this.autoResizeInput();

    // Show loading indicator
    this.showLoadingMessage();
  }

  sendToServer(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      this.showError("Connection lost. Please reconnect.");
    }
  }

  addMessage(role, content, mcpOperation) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${role}`;

    const timestamp = new Date().toLocaleTimeString();

    // Create MCP operation indicator if present
    let mcpIndicatorHTML = "";
    if (mcpOperation) {
      const icon = mcpOperation.type === "tool" ? "🔧" : "📄";
      const operationName =
        mcpOperation.type === "tool" ? mcpOperation.name : mcpOperation.uri;
      const operationDetails =
        mcpOperation.type === "tool"
          ? `Arguments: ${JSON.stringify(mcpOperation.arguments)}`
          : `Resource: ${mcpOperation.uri}`;

      mcpIndicatorHTML = `
        <div class="mcp-operation ${mcpOperation.type}">
          <span class="mcp-operation-icon">${icon}</span>
          <span class="mcp-operation-type">${mcpOperation.type}</span>
          <span class="mcp-operation-name">${operationName}</span>
          <div class="mcp-operation-details">${operationDetails}</div>
        </div>
      `;
    }

    messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-role ${role}">
                    ${role === "user" ? "👤 You" : "🤖 Assistant"}
                </span>
                <span class="message-time">${timestamp}</span>
            </div>
            ${mcpIndicatorHTML}
            <div class="message-content">${this.formatMessage(content)}</div>
        `;

    // Remove loading message if it exists
    this.removeLoadingMessage();

    // Remove welcome message on first user message
    if (role === "user") {
      const welcomeMessage =
        this.messagesContainer.querySelector(".welcome-message");
      if (welcomeMessage) {
        welcomeMessage.remove();
      }
    }

    this.messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();

    // Store in history
    this.messageHistory.push({ role, content, timestamp, mcpOperation });
  }

  addSystemMessage(content, type = "info") {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message system ${type}`;

    const timestamp = new Date().toLocaleTimeString();
    const icon = type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️";

    messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-role system">
                    ${icon} System
                </span>
                <span class="message-time">${timestamp}</span>
            </div>
            <div class="message-content">${content}</div>
        `;

    this.removeLoadingMessage();
    this.messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();
  }

  showLoadingMessage() {
    this.removeLoadingMessage(); // Remove any existing loading message

    const loadingDiv = document.createElement("div");
    loadingDiv.className = "message assistant loading-message";
    loadingDiv.innerHTML = `
            <div class="message-header">
                <span class="message-role assistant">🤖 Assistant</span>
                <span class="message-time">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="message-content">
                <div class="loading">
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                </div>
                Thinking...
            </div>
        `;

    this.messagesContainer.appendChild(loadingDiv);
    this.scrollToBottom();
  }

  removeLoadingMessage() {
    const loadingMessage =
      this.messagesContainer.querySelector(".loading-message");
    if (loadingMessage) {
      loadingMessage.remove();
    }
  }

  formatMessage(content) {
    // Convert markdown-style formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br>");
  }

  updateConnectionStatus(text, connected) {
    this.statusText.textContent = text;
    this.statusIndicator.classList.toggle("connected", connected);
  }

  updateUIState() {
    const canSend = this.isConnected && !this.isConnecting;
    const canConnect = !this.isConnected && !this.isConnecting;

    // Update input controls
    this.messageInput.disabled = !canSend;
    this.sendButton.disabled = !canSend;

    // Update action buttons
    this.connectButton.disabled = !canConnect;
    this.disconnectButton.disabled = !this.isConnected;

    // Update placeholder text
    if (this.isConnecting) {
      this.messageInput.placeholder = "Connecting to MCP server...";
    } else if (this.isConnected) {
      this.messageInput.placeholder =
        "Type your message here... (try 'add 5 and 3')";
    } else {
      this.messageInput.placeholder = "Connect to MCP server to start chatting";
    }

    // Update button text
    this.connectButton.textContent = this.isConnecting
      ? "Connecting..."
      : "Connect to MCP";
  }

  updateToolsList(tools) {
    this.toolsList.innerHTML = "";

    if (!tools || tools.length === 0) {
      this.toolsList.innerHTML =
        '<p class="tools-placeholder">No tools available</p>';
      return;
    }

    tools.forEach((tool) => {
      const toolDiv = document.createElement("div");
      toolDiv.className = "tool-item";
      toolDiv.innerHTML = `
                <div class="tool-name">${tool.name}</div>
                <div class="tool-description">${
                  tool.description || "No description available"
                }</div>
            `;
      this.toolsList.appendChild(toolDiv);
    });
  }

  clearTools() {
    this.toolsList.innerHTML =
      '<p class="tools-placeholder">Connect to see available tools</p>';
  }

  clearChat() {
    // Keep welcome message
    const welcomeMessage =
      this.messagesContainer.querySelector(".welcome-message");
    this.messagesContainer.innerHTML = "";

    if (welcomeMessage) {
      this.messagesContainer.appendChild(welcomeMessage);
    } else {
      // Recreate welcome message if it doesn't exist
      this.messagesContainer.innerHTML = `
                <div class="welcome-message">
                    <div class="welcome-content">
                        <h2>👋 Welcome to MCP Chatbot!</h2>
                        <p>This chatbot connects to an MCP (Model Context Protocol) server and can help you with:</p>
                        <ul>
                            <li>🧮 <strong>Math operations</strong> - Try "add 5 and 3" or "10 - 2"</li>
                            <li>👋 <strong>Personalized greetings</strong> - Try "greeting://YourName"</li>
                            <li>🔧 <strong>Tool exploration</strong> - Type "tools" to see available functions</li>
                        </ul>
                        <p>Watch for MCP operation indicators: 🔧 when tools are used, 📄 when resources are accessed!</p>
                        <p>Click "Connect" to start chatting!</p>
                    </div>
                </div>
            `;
    }

    this.messageHistory = [];
  }

  showError(message) {
    this.addSystemMessage(message, "error");
    console.error("Error:", message);
  }

  autoResizeInput() {
    this.messageInput.style.height = "auto";
    this.messageInput.style.height =
      Math.min(this.messageInput.scrollHeight, 120) + "px";
  }

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }
}

// Initialize the chatbot UI when the page loads
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Initializing MCP Chatbot UI");
  window.mcpChatbot = new MCPChatbotUI();
});
