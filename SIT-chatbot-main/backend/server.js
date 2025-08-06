const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

console.log('Environment check:');
console.log('ELEVENLABS_API_KEY:', process.env.ELEVENLABS_API_KEY ? 'Set' : 'Not set');
console.log('ELEVENLABS_AGENT_ID:', process.env.ELEVENLABS_AGENT_ID ? 'Set' : 'Not set');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Not set');

const app = express();
app.use(cors());
app.use(express.json());
app.use("/static", express.static(path.join(__dirname, "../dist")));
app.use(express.static(path.join(__dirname, "../dist")));

// Add debugging logs for incoming requests and outgoing responses
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Incoming request: ${req.method} ${req.url}`);
  next();
});

// Add file upload middleware for multipart/form-data
const multer = require("multer");
const fs = require("fs");
const { exec, spawn } = require("child_process");
const upload = multer({ dest: "uploads/" });

// Endpoint for speech-to-text transcription using ElevenLabs API
app.post("/api/transcribe", upload.single("file"), async (req, res) => {
  try {
    console.log("Received file for transcription:", req.file);
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const language = req.body.language || "en";

    // Run the Python script for transcription
    const pythonProcess = spawn("python", [
      "stt_elevenlabs.py",
      filePath,
      language
    ]);

    let transcript = "";
    let errorOutput = "";

    pythonProcess.stdout.on("data", (data) => {
      transcript += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on("close", (code) => {
      // Delete the temporary file
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Error deleting temporary file:", err);
      }

      if (code !== 0 || errorOutput) {
        console.error("Error in Python transcription process:", errorOutput);
        return res.status(500).json({ error: "Transcription failed", details: errorOutput });
      }

      // Clean up the transcript (remove any extra newlines)
      transcript = transcript.trim();
      console.log("Transcription result:", transcript);
      res.json({ text: transcript });
    });
  } catch (error) {
    console.error("Error during transcription:", error);
    res.status(500).json({ error: "Transcription failed", details: error.message });
  }
});

app.get("/api/signed-url", async (req, res) => {
  try {
    let agentId = process.env.ELEVENLABS_AGENT_ID; // Changed from AGENT_ID
    console.log("Requesting signed URL for agentId:", agentId);
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY, // Changed from XI_API_KEY
        },
      }
    );
    console.log("Received response status:", response.status);
    if (!response.ok) {
      throw new Error("Failed to get signed URL");
    }
    const data = await response.json();
    console.log("Signed URL data:", data);
    res.json({ signedUrl: data.signed_url });
  } catch (error) {
    console.error("Error in /api/signed-url:", error);
    res.status(500).json({ error: "Failed to get signed URL" });
  }
});

//API route for getting Agent ID, used for public agents
app.get("/api/getAgentId", (req, res) => {
  const agentId = process.env.ELEVENLABS_AGENT_ID; // Changed from AGENT_ID
  console.log("Returning agentId:", agentId);
  res.json({
    agentId: `${agentId}`,
  });
});

// Proxy route for chat completions
app.post('/api/chat', async (req, res) => {
  console.log('🔍 [CHAT API] Received request to /api/chat');
  console.log('🔍 [CHAT API] Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    console.log('🔍 [CHAT API] Forwarding to RAG backend at localhost:8000...');
    
    // Should forward to http://localhost:8000/v1/chat/completions
    const response = await fetch('http://localhost:8000/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    
    console.log('🔍 [CHAT API] RAG backend response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`RAG backend returned status ${response.status}`);
    }
    
    const data = await response.json();
    console.log('🔍 [CHAT API] RAG backend response:', JSON.stringify(data, null, 2));
    
    res.json(data);
  } catch (error) {
    console.error('❌ [CHAT API] Error:', error);
    res.status(500).json({ error: 'Failed to get response from RAG backend', details: error.message });
  }
});

// Serve index.html for all other routes
app.get("*", (req, res) => {
  console.log("Serving index.html for route:", req.url);
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}: http://localhost:${PORT}`);
});