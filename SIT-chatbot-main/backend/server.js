const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const FormData = require("form-data");
const axios = require("axios");

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

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

// Endpoint for speech-to-text using ElevenLabs Speech-to-Text API
app.post("/api/speech-to-text", upload.single("audio"), async (req, res) => {
  try {
    console.log("🎤 Received audio file for speech-to-text:", req.file);
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    console.log("📊 File details - Size:", req.file.size, "bytes, Type:", req.file.mimetype);
    
    // Debug: Check API key
    console.log("🔑 API Key check:", process.env.ELEVENLABS_API_KEY ? `Loaded (${process.env.ELEVENLABS_API_KEY.substring(0, 8)}...)` : 'NOT FOUND');
    
    // Create FormData using form-data library (much better for Node.js)
    const formData = new FormData();
    formData.append('model_id', 'scribe_v1');
    formData.append('file', fs.createReadStream(req.file.path), {
      filename: req.file.originalname || 'audio.wav',
      contentType: req.file.mimetype || 'audio/wav'
    });

    console.log("🔄 Sending request to ElevenLabs STT API using axios...");
    
    // Use axios which handles multipart form data properly
    const response = await axios.post('https://api.elevenlabs.io/v1/speech-to-text', formData, {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        ...formData.getHeaders() // This adds the correct content-type boundary
      },
      timeout: 30000 // 30 second timeout
    });

    console.log("📡 ElevenLabs STT response status:", response.status);
    
    // Clean up uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (err) {
      console.error("Error deleting temporary file:", err);
    }

    console.log("✅ Speech-to-text result:", response.data);
    
    // ElevenLabs returns the transcription in the 'text' field
    const transcribedText = response.data.text;
    
    if (!transcribedText) {
      console.error("❌ No transcription found in response:", response.data);
      throw new Error("No transcription text found in API response");
    }
    
    res.json({ text: transcribedText });
  } catch (error) {
    console.error("❌ Error in speech-to-text:", error);
    
    // Clean up uploaded file in case of error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupErr) {
        console.error("Error deleting temporary file during cleanup:", cleanupErr);
      }
    }
    
    // Check if it's an axios error with response
    if (error.response) {
      console.error("❌ ElevenLabs STT API error:", error.response.status, error.response.data);
      res.status(500).json({ 
        error: "Speech-to-text failed", 
        details: `ElevenLabs API returned ${error.response.status}: ${JSON.stringify(error.response.data)}`
      });
    } else {
      res.status(500).json({ error: "Speech-to-text failed", details: error.message });
    }
  }
});

// Endpoint for text-to-speech using ElevenLabs TTS API
app.post("/api/text-to-speech", async (req, res) => {
  try {
    const { text, voice_id } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    console.log("🔊 Converting text to speech:", text.substring(0, 100) + "...");
    console.log("🔑 API Key check for TTS:", process.env.ELEVENLABS_API_KEY ? `Loaded (${process.env.ELEVENLABS_API_KEY.substring(0, 8)}...)` : 'NOT FOUND');

    const voiceId = voice_id || "21m00Tcm4TlvDq8ikWAM"; // Default voice ID
    
    // Use axios for consistent API handling (same as STT)
    const response = await axios.post(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      text: text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5
      }
    }, {
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
      responseType: 'arraybuffer', // This ensures we get binary data
      timeout: 30000 // 30 second timeout
    });

    console.log("📡 ElevenLabs TTS response status:", response.status);
    console.log("📦 Audio data size:", response.data.byteLength, "bytes");

    // Convert ArrayBuffer to Buffer for Express response
    const audioBuffer = Buffer.from(response.data);
    
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length
    });
    
    console.log("✅ Text-to-speech audio generated successfully");
    res.send(audioBuffer);
    
  } catch (error) {
    console.error("❌ Error in text-to-speech:", error);
    
    // Check if it's an axios error with response
    if (error.response) {
      console.error("❌ ElevenLabs TTS API error:", error.response.status, error.response.data);
      res.status(500).json({ 
        error: "Text-to-speech failed", 
        details: `ElevenLabs API returned ${error.response.status}: ${JSON.stringify(error.response.data)}`
      });
    } else {
      res.status(500).json({ error: "Text-to-speech failed", details: error.message });
    }
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