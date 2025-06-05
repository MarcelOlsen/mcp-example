# MCP Chatbot Client

A beautiful, modern web-based chatbot client that connects to an MCP (Model Context Protocol) server via stdio. This client provides a real-time chat interface with your MCP server's tools and resources.

## 🌟 Features

- **Modern Web Interface**: Beautiful, responsive design with dark theme
- **Real-time Communication**: WebSocket-based connection for instant messaging
- **MCP Integration**: Full support for MCP tools and resources via stdio transport
- **Interactive UI**:
  - Live connection status indicator
  - Available tools sidebar
  - Quick help panel
  - Message history with timestamps
  - Loading animations
  - **MCP operation indicators** - Visual badges showing when tools (🔧) or resources (📄) are used
- **Smart Message Parsing**: Supports math operations, greetings, and command recognition
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Your MCP server running (the one in the `../server` directory)
- Bun (for running the MCP server)

### Installation

1. **Install dependencies**:

   ```bash
   cd client
   npm install
   ```

2. **Start the chatbot server**:

   ```bash
   npm start
   ```

3. **Open your browser**:
   Navigate to `http://localhost:3000`

4. **Connect to MCP**:
   Click "Connect to MCP" to establish connection with your MCP server

## 🎯 Usage

### Available Commands

The chatbot supports several types of interactions:

#### Math Operations

- `add 5 and 3` or `5 + 3`
- `subtract 2 from 10` or `10 - 2`

#### Greetings

- `greeting://YourName` (e.g., `greeting://Alice`)

#### Information Commands

- `help` - Show help message
- `tools` - List available MCP tools

### Example Conversations

```
You: add 15 and 27
🤖 Assistant: 🧮 15 + 27 = 42

You: greeting://Alice
🤖 Assistant: 👋 Hello, Alice!

You: tools
🤖 Assistant: 🔧 Available MCP Tools:
• add: Addition tool
• subtract: Subtraction tool
```

## 🏗️ Architecture

### Components

1. **Web Server** (`src/server.js`)

   - Express.js server serving the web interface
   - WebSocket server for real-time communication
   - Handles client connections and message routing

2. **MCP Client** (`src/mcp-client.js`)

   - Connects to MCP server via stdio transport
   - Manages tool calls and resource requests
   - Handles message parsing and response formatting

3. **Web Interface** (`public/`)
   - Modern HTML/CSS/JavaScript frontend
   - Real-time WebSocket communication
   - Responsive design with beautiful UI

### Connection Flow

```
Browser ↔ WebSocket ↔ Web Server ↔ MCP Client ↔ stdio ↔ MCP Server
```

## 🎨 UI Features

### Connection Status

- **Red indicator**: Disconnected
- **Green indicator**: Connected to MCP server
- **Pulsing animation**: Connecting/processing

### Message Types

- **User messages**: Blue accent, right-aligned feel
- **Assistant responses**: Green accent, formatted content
- **System messages**: Different colors for success/error/info

### Sidebar Panels

- **Available Tools**: Shows MCP server tools with descriptions
- **Quick Help**: Reference for common commands and syntax

### Responsive Behavior

- **Desktop**: Two-column layout with sidebar
- **Tablet**: Sidebar moves to top, horizontal layout
- **Mobile**: Single column, optimized for touch

### MCP Operation Indicators

The chatbot now shows visual indicators when MCP operations are performed:

- **🔧 Tool Indicators**: Green badges appear when MCP tools are called (e.g., `add`, `subtract`)
- **📄 Resource Indicators**: Orange badges appear when MCP resources are accessed (e.g., `greeting://name`)

Each indicator shows:

- Operation type (TOOL or RESOURCE)
- Function/resource name
- Arguments or URI details

This helps users understand when the chatbot is actively using the MCP server versus providing direct responses.

## 🛠️ Development

### Development Mode

Run with auto-reload:

```bash
npm run dev
```

### Project Structure

```
client/
├── src/
│   ├── server.js       # Express server + WebSocket handling
│   └── mcp-client.js   # MCP client implementation
├── public/
│   ├── index.html      # Main web interface
│   ├── styles.css      # Modern CSS with dark theme
│   └── script.js       # Client-side JavaScript
├── package.json        # Dependencies and scripts
└── README.md          # This file
```

### Key Technologies

- **Backend**: Node.js, Express.js, WebSocket (ws)
- **Frontend**: Vanilla JavaScript, CSS Grid/Flexbox, WebSocket API
- **MCP**: Model Context Protocol TypeScript SDK
- **Transport**: Stdio transport for MCP server communication

## 🔧 Configuration

### Environment Variables

- `PORT`: Server port (default: 3000)

### MCP Server Configuration

The client is configured to connect to the MCP server using:

- **Command**: `bun`
- **Args**: `['run', 'index.ts']`
- **Working Directory**: `../server`

You can modify this in `src/mcp-client.js` if your server setup is different.

## 🐛 Troubleshooting

### Common Issues

1. **"WebSocket not connected"**

   - Refresh the page to re-establish WebSocket connection
   - Check if the server is running on the correct port

2. **"Failed to connect to MCP server"**

   - Ensure the MCP server is working: `cd ../server && bun run index.ts`
   - Check that Bun is installed and available
   - Verify the server path in `mcp-client.js`

3. **Tools not showing**
   - Disconnect and reconnect to refresh the tools list
   - Check MCP server logs for any errors

### Debug Mode

Open browser developer tools to see detailed logs:

- WebSocket connection status
- MCP client operations
- Server response handling

## 📝 License

This project is part of the MCP demo and follows the same licensing terms.

## 🤝 Contributing

Feel free to submit issues and enhancement requests! This is a demonstration client that can be extended with additional features like:

- Message persistence
- Export chat history
- Custom themes
- Voice input/output
- File upload support
- Multiple MCP server connections
