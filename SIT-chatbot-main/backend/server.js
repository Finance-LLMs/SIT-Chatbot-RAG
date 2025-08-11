const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const FormData = require("form-data");
const axios = require("axios");

// Load environment variables from current backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

const RAG_BASE_URL = process.env.RAG_BASE_URL || 'http://127.0.0.1:8000';

console.log('Environment check:');
console.log('ELEVENLABS_API_KEY:', process.env.ELEVENLABS_API_KEY ? 'Set' : 'Not set');
// console.log('ELEVENLABS_AGENT_ID:', process.env.ELEVENLABS_AGENT_ID ? 'Set' : 'Not set');
// console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Not set');
console.log('RAG_BASE_URL:', RAG_BASE_URL);

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
    
    // Optimize audio format using ffmpeg (16kHz, mono, PCM)
    const optimizedAudioPath = req.file.path + '_optimized.wav';
    console.log("🔧 Optimizing audio format with ffmpeg...");
    
    const ffmpegCommand = `ffmpeg -i "${req.file.path}" -ar 16000 -ac 1 -c:a pcm_s16le "${optimizedAudioPath}" -y`;
    console.log("📝 FFmpeg command:", ffmpegCommand);
    
    try {
      await new Promise((resolve, reject) => {
        exec(ffmpegCommand, (error, stdout, stderr) => {
          if (error) {
            console.error("❌ FFmpeg error:", error);
            reject(error);
          } else {
            console.log("✅ Audio optimized successfully");
            console.log("📊 FFmpeg output:", stdout);
            if (stderr) console.log("📊 FFmpeg stderr:", stderr);
            resolve(stdout);
          }
        });
      });
    } catch (ffmpegError) {
      console.error("❌ Audio optimization failed, using original file:", ffmpegError);
      // Fall back to original file if ffmpeg fails
      fs.copyFileSync(req.file.path, optimizedAudioPath);
    }
    
    // Create FormData using form-data library with optimized audio
    const formData = new FormData();
    formData.append('model_id', 'scribe_v1');
    formData.append('language', 'en');
    formData.append('file', fs.createReadStream(optimizedAudioPath), {
      filename: 'audio_optimized.wav',
      contentType: 'audio/wav',
      knownLength: fs.statSync(optimizedAudioPath).size
    });

    console.log("🔄 Sending request to ElevenLabs STT API using axios...");
    console.log("📝 Request parameters: model_id=scribe_v1, language=en");
    
    // Use axios which handles multipart form data properly
    const response = await axios.post('https://api.elevenlabs.io/v1/speech-to-text', formData, {
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Accept': 'application/json',
      'Content-Type': 'multipart/form-data',
      ...formData.getHeaders()
    },
      timeout: 30000 // 30 second timeout
    });

    console.log("📡 ElevenLabs STT response status:", response.status);
    
    // Clean up uploaded files
    try {
      fs.unlinkSync(req.file.path); // Original file
      if (fs.existsSync(optimizedAudioPath)) {
        fs.unlinkSync(optimizedAudioPath); // Optimized file
      }
    } catch (err) {
      console.error("Error deleting temporary files:", err);
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
    
    // Clean up uploaded files in case of error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path); // Original file
        const optimizedAudioPath = req.file.path + '_optimized.wav';
        if (fs.existsSync(optimizedAudioPath)) {
          fs.unlinkSync(optimizedAudioPath); // Optimized file
        }
      } catch (cleanupErr) {
        console.error("Error deleting temporary files during cleanup:", cleanupErr);
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

// app.get("/api/signed-url", async (req, res) => {
//   try {
//     let agentId = process.env.ELEVENLABS_AGENT_ID; // Changed from AGENT_ID
//     console.log("Requesting signed URL for agentId:", agentId);
//     const response = await fetch(
//       `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
//       {
//         method: "GET",
//         headers: {
//           "xi-api-key": process.env.ELEVENLABS_API_KEY, // Changed from XI_API_KEY
//         },
//       }
//     );
//     console.log("Received response status:", response.status);
//     if (!response.ok) {
//       throw new Error("Failed to get signed URL");
//     }
//     const data = await response.json();
//     console.log("Signed URL data:", data);
//     res.json({ signedUrl: data.signed_url });
//   } catch (error) {
//     console.error("Error in /api/signed-url:", error);
//     res.status(500).json({ error: "Failed to get signed URL" });
//   }
// });

// //API route for getting Agent ID, used for public agents
// app.get("/api/getAgentId", (req, res) => {
//   const agentId = process.env.ELEVENLABS_AGENT_ID; // Changed from AGENT_ID
//   console.log("Returning agentId:", agentId);
//   res.json({
//     agentId: `${agentId}`,
//   });
// });

// Test backend connectivity on startup
async function testBackendConnection() {
  try {
    console.log('🔗 Testing connection to RAG backend...');
    const response = await fetch(`${RAG_BASE_URL}/health`, {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ RAG backend is responding:', data);
      return true;
    } else {
      console.log('❌ RAG backend returned status:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Failed to connect to RAG backend:', error.message);
    return false;
  }
}

// Proxy route for chat completions
app.post('/api/chat', async (req, res) => {
  console.log('🔍 [CHAT API] Received request to /api/chat');
  console.log('🔍 [CHAT API] Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    console.log('🔍 [CHAT API] Forwarding to RAG backend at', RAG_BASE_URL + '...');
    
    // Should forward to the configured RAG backend URL
    const response = await fetch(`${RAG_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
      timeout: 30000 // 30 second timeout
    });
    
    console.log('🔍 [CHAT API] RAG backend response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('🔍 [CHAT API] RAG backend error response:', errorText);
      throw new Error(`RAG backend returned status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('🔍 [CHAT API] RAG backend response:', JSON.stringify(data, null, 2));
    
    res.json(data);
  } catch (error) {
    console.error('❌ [CHAT API] Error:', error);
    res.status(500).json({ 
      error: 'Failed to get response from RAG backend', 
      details: error.message,
      backend_url: RAG_BASE_URL
    });
  }
});

// Serve index.html for all other routes
app.get("*", (req, res) => {
  console.log("Serving index.html for route:", req.url);
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';

// Test backend connection and start server
async function startServer() {
  const backendOnline = await testBackendConnection();
  if (!backendOnline) {
    console.log('⚠️  Warning: RAG backend is not responding. Frontend will still start but chat functionality may not work.');
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server running on ${HOST}:${PORT}`);
    console.log(`Frontend accessible at: http://${HOST}:${PORT}`);
    console.log(`RAG Backend URL: ${RAG_BASE_URL}`);
  });
}

startServer();