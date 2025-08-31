// --- src/app.js ---

// Simplified: one image and one video avatar, no HTML/SVG character.
let conversation = null; // kept for compatibility with existing calls
let sttStream = null;
let isRecording = false;
let user_input = "";
let currentState = "ready"; // ready, connected, recording, processing
let inputMode = "voice"; // voice or text

// UI State Management
function updatePrimaryButton(state, text = null, icon = null) {
  const button = document.getElementById("primaryActionButton");
  const buttonText = document.getElementById("buttonText");
  const buttonIcon = document.getElementById("buttonIcon");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");

  currentState = state;

  // Remove all state classes
  button.classList.remove("recording", "processing");
  statusDot.classList.remove("connected", "recording", "processing");

  // Update icon
  if (icon) {
    buttonIcon.innerHTML = icon;
  }

  switch (state) {
    case "ready":
      if (!text)
        buttonText.textContent =
          inputMode === "voice" ? "Start Conversation" : "Connect";
      else buttonText.textContent = text;
      statusText.textContent = "Ready to help";
      button.disabled = false;
      buttonIcon.innerHTML = `<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>`;
      break;

    case "connected":
      if (!text)
        buttonText.textContent =
          inputMode === "voice" ? "Start Speaking" : "Connected";
      else buttonText.textContent = text;
      statusText.textContent = "Connected - Ready to listen";
      statusDot.classList.add("connected");
      button.disabled = false;
      if (inputMode === "voice") {
        buttonIcon.innerHTML = `<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line>`;
      }
      break;

    case "recording":
      buttonText.textContent = "Stop Speaking";
      statusText.textContent = "Listening...";
      button.classList.add("recording");
      statusDot.classList.add("recording");
      button.disabled = false;
      buttonIcon.innerHTML = `<rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect>`;
      break;

    case "processing":
      buttonText.textContent = "Processing...";
      statusText.textContent = "Processing your message";
      button.classList.add("processing");
      statusDot.classList.add("processing");
      button.disabled = true;
      buttonIcon.innerHTML = `<line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>`;
      break;
  }
}

function showSecondaryButton(text, action) {
  const button = document.getElementById("secondaryActionButton");
  const buttonText = document.getElementById("secondaryButtonText");

  buttonText.textContent = text;
  button.classList.remove("hidden");

  // Remove old event listeners and add new one
  const newButton = button.cloneNode(true);
  button.parentNode.replaceChild(newButton, button);
  document
    .getElementById("secondaryActionButton")
    .addEventListener("click", action);
}

function hideSecondaryButton() {
  document.getElementById("secondaryActionButton").classList.add("hidden");
}

function switchInputMode(mode) {
  inputMode = mode;
  const voiceBtn = document.getElementById("voiceModeBtn");
  const textBtn = document.getElementById("textModeBtn");
  const textContainer = document.getElementById("textInputContainer");
  const primaryButton = document.getElementById("primaryActionButton");

  if (mode === "voice") {
    voiceBtn.classList.add("active");
    textBtn.classList.remove("active");
    textContainer.classList.add("hidden");
    primaryButton.classList.remove("hidden");
    updatePrimaryButton(currentState);
  } else {
    textBtn.classList.add("active");
    voiceBtn.classList.remove("active");
    textContainer.classList.remove("hidden");
    if (currentState === "connected") {
      primaryButton.classList.add("hidden");
    }
  }
}

// Media Avatar (single image + single video)
let idleImage = null; // shown when not speaking
let speakingVideo = null; // shown during TTS playback
let mediaLoaded = false; // at least image loaded
let imageLoaded = false;
let videoLoaded = false;

// Initialize avatar with video support
async function initializeAvatar() {
  const avatarWrapper = document.getElementById("animatedAvatar");

  await loadMediaAssets();

  // Always build container if we have at least the image
  createMediaAvatar();
}

// Load video assets
async function loadMediaAssets() {
  try {
    // Create video element (TTS speaking)
    speakingVideo = document.createElement('video');

    // Create image element (idle)
    idleImage = document.createElement('img');

    // Video properties (muted to satisfy autoplay policies)
    speakingVideo.autoplay = false;
    speakingVideo.loop = true;
    speakingVideo.muted = true;
    speakingVideo.setAttribute('muted', '');
    speakingVideo.playsInline = true;
    speakingVideo.preload = 'auto';
    speakingVideo.style.width = '100%';
    speakingVideo.style.height = '100%';
    speakingVideo.style.objectFit = 'cover';

    // Image properties
    idleImage.style.width = '100%';
    idleImage.style.height = '100%';
    idleImage.style.objectFit = 'cover';

    // Prefer relative paths that work in dev server and backend
    const imageCandidates = ['assets/images/otter.jpg', '/static/assets/images/otter.jpg'];
    const videoCandidates = ['assets/videos/otter.mp4', '/static/assets/videos/otter.mp4'];

    // Load image with fallback
    imageLoaded = await new Promise((resolve) => {
      let idx = 0;
      const tryNext = () => {
        if (idx >= imageCandidates.length) return resolve(false);
        const src = imageCandidates[idx++];
        idleImage.src = src;
        const onLoad = () => { idleImage.removeEventListener('error', onError); resolve(true); };
        const onError = () => { idleImage.removeEventListener('load', onLoad); tryNext(); };
        idleImage.addEventListener('load', onLoad, { once: true });
        idleImage.addEventListener('error', onError, { once: true });
      };
      tryNext();
    });

    // Load video with fallback
    videoLoaded = await new Promise((resolve) => {
      let idx = 0;
      const tryNext = () => {
        if (idx >= videoCandidates.length) return resolve(false);
        const src = videoCandidates[idx++];
        speakingVideo.src = src;
        const onReady = () => { cleanup(); resolve(true); };
        const onError = () => { cleanup(); tryNext(); };
        const cleanup = () => {
          speakingVideo.removeEventListener('canplaythrough', onReady);
          speakingVideo.removeEventListener('loadeddata', onReady);
          speakingVideo.removeEventListener('error', onError);
        };
        speakingVideo.addEventListener('canplaythrough', onReady, { once: true });
        speakingVideo.addEventListener('loadeddata', onReady, { once: true });
        speakingVideo.addEventListener('error', onError, { once: true });
        speakingVideo.load();
      };
      tryNext();
    });

    mediaLoaded = imageLoaded; // consider loaded if image is ready
  } catch (error) {
    console.log("📝 Media assets not available:", error.message);
    mediaLoaded = imageLoaded;
  }
}

// Create media avatar container (image + video)
function createMediaAvatar() {
  const avatarWrapper = document.getElementById("animatedAvatar");
  
  // Create container for media
  const mediaContainer = document.createElement('div');
  mediaContainer.className = 'video-avatar-container';
  mediaContainer.style.cssText = `
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 15px;
    overflow: hidden;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  `;
  
  // Add idle image (initially visible)
  if (idleImage && imageLoaded) {
    idleImage.className = 'avatar-media user-speaking-image';
    idleImage.style.cssText += `
      position: absolute;
      top: 0;
      left: 0;
      opacity: 1;
      transition: opacity 0.3s ease;
    `;
    mediaContainer.appendChild(idleImage);
  }
  
  // Add speaking video (initially hidden)
  if (speakingVideo && videoLoaded) {
    speakingVideo.className = 'avatar-media speaking-video';
    speakingVideo.style.cssText += `
      position: absolute;
      top: 0;
      left: 0;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    mediaContainer.appendChild(speakingVideo);
  }
  
  // Replace content
  avatarWrapper.innerHTML = '';
  avatarWrapper.appendChild(mediaContainer);
}

// Speaking state helpers (video only)
function startSpeakingVisual() {
  const avatarWrapper = document.getElementById("animatedAvatar");
  if (avatarWrapper) {
    avatarWrapper.classList.add("avatar-speaking");
    const speakingIndicator = document.getElementById("speakingIndicator");
    if (speakingIndicator) speakingIndicator.classList.remove("hidden");
  }
  switchToTTSSpeaking();
}

function stopSpeakingVisual() {
  const avatarWrapper = document.getElementById("animatedAvatar");
  if (avatarWrapper) {
    avatarWrapper.classList.remove("avatar-speaking");
    const speakingIndicator = document.getElementById("speakingIndicator");
    if (speakingIndicator) speakingIndicator.classList.add("hidden");
  }
  switchToIdleState();
}

// Video switching functions
function switchToSpeakingVideo() {
  if (!idleImage) return;
  if (!videoLoaded || !speakingVideo) {
    // No video available, keep showing image
    idleImage.style.opacity = '1';
    return;
  }

  // Hide image, show video
  idleImage.style.opacity = '0';
  speakingVideo.style.opacity = '1';

  // Try robust playback with retries
  const tryPlay = async (attempt = 1) => {
    try {
      speakingVideo.currentTime = 0;
      await speakingVideo.play();
    } catch (e) {
      if (attempt < 3) {
        // Ensure autoplay-friendly flags and retry shortly
        speakingVideo.muted = true;
        speakingVideo.setAttribute('muted', '');
        speakingVideo.playsInline = true;
        setTimeout(() => tryPlay(attempt + 1), 150);
      } else {
        // Give up and show image
        speakingVideo.style.opacity = '0';
        idleImage.style.opacity = '1';
      }
    }
  };
  tryPlay();
}

function switchToIdleState() {
  console.log("[Frontend] Switching to idle state");
  if (!idleImage) return;
  speakingVideo.style.opacity = '0';
  speakingVideo.pause();
  idleImage.style.opacity = '1';
  console.log("[Frontend] Otter video stopped, showing idle image");
}

// New functions for user state management
function switchToUserSpeaking() {
  if (!idleImage) return;
  speakingVideo.style.opacity = '0';
  speakingVideo.pause();
  idleImage.style.opacity = '1';
}

function switchToTTSSpeaking() {
  console.log("[Frontend] Switching to TTS speaking mode");
  if (!idleImage) return;
  if (!videoLoaded || !speakingVideo) {
    console.log("[Frontend] No video available, keeping image");
    idleImage.style.opacity = '1';
    return;
  }
  console.log("[Frontend] Starting otter speaking video");
  idleImage.style.opacity = '0';
  speakingVideo.style.opacity = '1';
  try {
    speakingVideo.currentTime = 0;
    const pp = speakingVideo.play();
    if (pp && typeof pp.catch === 'function') {
      pp.catch(() => {
        console.log("[Frontend] Video autoplay blocked, enabling mute and retry");
        speakingVideo.muted = true;
        speakingVideo.setAttribute('muted', '');
        speakingVideo.play().catch(() => {
          console.log("[Frontend] Video play still failed after mute");
        });
      });
    }
  } catch (error) {
    console.error("[Frontend] Error playing video:", error);
  }
}

async function requestMicrophonePermission() {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    return true;
  } catch (error) {
    console.error("Microphone permission denied:", error);
    return false;
  }
}

async function getSignedUrl() {
  try {
    const url = "/api/signed-url";
    console.log("[Frontend] Fetching signed URL from:", url);
    const response = await fetch(url);
    console.log("[Frontend] Signed URL response status:", response.status);
    if (!response.ok) throw new Error("Failed to get signed URL");
    const data = await response.json();
    console.log("[Frontend] Signed URL data:", data);
    return data.signedUrl;
  } catch (error) {
    console.error("[Frontend] Error getting signed URL:", error);
    throw error;
  }
}

function updateStatus(isConnected) {
  const statusElement = document.getElementById("connectionStatus");
  statusElement.textContent = isConnected ? "Connected" : "Disconnected";
  statusElement.classList.toggle("connected", isConnected);
}

function addMessageToChat(message, sender) {
  const chatMessages = document.getElementById("chatMessages");
  const messageElement = document.createElement("div");
  messageElement.classList.add("message");
  if (sender === "user") {
    messageElement.classList.add("user-message");
  } else {
    messageElement.classList.add("bot-message");
  }
  messageElement.innerHTML = `
       <div class="message-content">${message}</div>
   `;
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showError(message) {
  addMessageToChat(`❌ ${message}`, "bot");
}

function get_context(text) {
  console.log("[Frontend] Processing text through get_context:", text);
  let processedText = text.trim();
  processedText = processedText.replace(/\s+/g, " ");
  console.log("[Frontend] Text after processing:", processedText);
  return processedText;
}

async function startSpeechToText() {
  try {
    isRecording = true;
    console.log("[Frontend] Starting STT recording");

    // Switch to image when user starts speaking
    if (videoLoaded && speakingVideo) {
      switchToUserSpeaking();
    }

    // Request microphone permission
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Check if MediaRecorder is supported
    if (!window.MediaRecorder) {
      throw new Error("MediaRecorder is not supported in this browser");
    }
    
    const mediaRecorder = new MediaRecorder(stream);
    const audioChunks = [];

    sttStream = {
      mediaRecorder,
      stream,
      stop: function () {
        if (mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
        stream.getTracks().forEach((track) => track.stop());
      },
    };

    mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    });

    mediaRecorder.addEventListener("stop", async () => {
      try {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.wav");

        console.log("[Frontend] Sending audio to backend for speech-to-text");
        const response = await fetch("/api/speech-to-text", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(
            `Server returned ${response.status}: ${response.statusText}`
          );
        }

        const result = await response.json();
        if (result && result.text) {
          console.log("[Frontend] Received transcription:", result.text);
          user_input = result.text;

          // Automatically send the transcribed text through RAG system
          addMessageToChat(`💭 "${result.text}"`, "user");
          await sendVoiceMessage(result.text);
        }
      } catch (error) {
        console.error("[Frontend] Error getting transcription:", error);
        showError("Failed to transcribe speech: " + error.message);
        updatePrimaryButton("connected");
      }
    });

    mediaRecorder.start();
    return sttStream;
  } catch (error) {
    console.error("[Frontend] Error starting speech to text:", error);
    showError("Failed to start speech recognition: " + error.message);
    isRecording = false;
    updatePrimaryButton("connected");
    return null;
  }
}

async function stopSpeechToText() {
  if (isRecording) {
    try {
      if (sttStream && typeof sttStream.stop === "function") {
        sttStream.stop();
        console.log("[Frontend] MediaRecorder stopped");
        isRecording = false;
        return "";
      }
    } catch (error) {
      console.error("[Frontend] Error stopping STT stream:", error);
      isRecording = false;
    }
  }
  return "";
}

async function sendProcessedText(text) {
  if (!text) return;

  const processedText = get_context(text);
  console.log(
    "[Frontend] Sending processed text to conversation:",
    processedText
  );

  if (!conversation) {
    console.error("Conversation not initialized");
    showError(
      "Not connected to the agent. Please start the conversation first."
    );
    return;
  }

  // No visual start here. We switch visuals when TTS audio actually plays.

  // Debug: Log available methods on conversation object
  // Debug logs removed

  try {
    if (typeof conversation.sendUserMessage === "function") {
      await conversation.sendUserMessage(processedText);
      console.log("Message sent using sendUserMessage");
    } else {
      console.error("No suitable method found to send text to conversation");
      console.error(
        "🔍 [DEBUG] conversation.sendUserMessage type:",
        typeof conversation.sendUserMessage
      );
      showError("Could not send message - no suitable method found.");
    }
  } catch (error) {
    console.error("[Frontend] Error sending processed text:", error);
    showError("Failed to send your message.");
  }
}

async function sendVoiceMessage(text) {
  if (!text.trim()) return;

  updatePrimaryButton("processing");
  // Visual switches when TTS audio actually starts
  
  // Show loading message immediately
  addMessageToChat("🔄 Processing your question... This may take up to 2 minutes.", "bot");

  try {
    // Send to RAG backend for response
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minute timeout
    
    const response = await fetch('/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: text
          }
        ],
        stream: false
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Handle both OpenAI format (from Node.js proxy) and direct format (from RAG backend)
    let botResponse;
    if (data.choices && data.choices[0] && data.choices[0].message) {
      // OpenAI format from Node.js proxy
      botResponse = data.choices[0].message.content;
    } else if (data.response) {
      // Direct format from RAG backend
      botResponse = data.response;
    } else {
      botResponse = 'Sorry, I could not process your request.';
    }
    
    // Display the text response
    addMessageToChat(botResponse, "bot");
    
    // Convert response to speech (don't let TTS errors affect the main flow)
    try {
      await playTextToSpeech(botResponse);
      // TTS will handle its own visual state changes
    } catch (ttsError) {
      console.error("[Frontend] TTS failed but continuing:", ttsError);
      // Don't show error to user for TTS failures, just continue without audio
      // Stop visual since no audio will play
      stopSpeakingVisual();
    }
    
    updatePrimaryButton("connected");
    
  } catch (error) {
    console.error("[Frontend] Error sending voice message:", error);
    if (error.name === 'AbortError') {
      showError("Request timed out. The system is taking longer than expected to respond.");
    } else {
      showError("Failed to process your voice message.");
    }
    stopSpeakingVisual();
    updatePrimaryButton("connected");
  }
}

async function playTextToSpeech(text) {
  try {
    console.log("[Frontend] Converting text to speech:", text.substring(0, 50) + "...");
    
    const response = await fetch('/api/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        voice_id: "21m00Tcm4TlvDq8ikWAM" // Default ElevenLabs voice
      })
    });

    if (!response.ok) {
      throw new Error(`TTS API returned status: ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    // Enhanced audio event handling for precise video synchronization
    audio.addEventListener('loadeddata', () => {
      console.log("[Frontend] Audio loaded and ready");
    });
    
    // Start video when audio actually begins playing (not just when play() is called)
    audio.addEventListener('playing', () => {
      console.log("[Frontend] Audio started playing - starting otter video");
      startSpeakingVisual();
    });
    
    // Stop video when audio pauses (if user pauses)
    audio.addEventListener('pause', () => {
      console.log("[Frontend] Audio paused - stopping otter video");
      stopSpeakingVisual();
    });
    
    // Stop video when audio ends
    audio.addEventListener('ended', () => {
      console.log("[Frontend] Audio ended - stopping otter video");
      stopSpeakingVisual();
      URL.revokeObjectURL(audioUrl);
    });
    
    // Handle audio errors
    audio.addEventListener('error', () => {
      console.error("[Frontend] Audio error - stopping otter video");
      stopSpeakingVisual();
      URL.revokeObjectURL(audioUrl);
    });

    try {
      console.log("[Frontend] Starting audio playback...");
      await audio.play();
    } catch (playError) {
      console.error("❌ Audio play failed:", playError);
      stopSpeakingVisual();
      URL.revokeObjectURL(audioUrl);
    }
    
  } catch (error) {
    console.error("[Frontend] Error with text-to-speech:", error);
    // Don't show error to user for TTS failures, just continue without audio
  }
}

async function sendTextMessage(text) {
  if (!text.trim()) return;

  addMessageToChat(text, "user");
  updatePrimaryButton("processing");
  // Visual switches when TTS audio actually starts
  
  // Show loading message immediately
  addMessageToChat("🔄 Processing your question... This may take up to 2 minutes.", "bot");

  try {
    // Use RAG backend instead of ElevenLabs for text messages
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minute timeout
    
    const response = await fetch('/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: text
          }
        ],
        stream: false
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Handle both OpenAI format (from Node.js proxy) and direct format (from RAG backend)
    let botResponse;
    if (data.choices && data.choices[0] && data.choices[0].message) {
      // OpenAI format from Node.js proxy
      botResponse = data.choices[0].message.content;
    } else if (data.response) {
      // Direct format from RAG backend
      botResponse = data.response;
    } else {
      botResponse = 'Sorry, I could not process your request.';
    }
    
    addMessageToChat(botResponse, "bot");
  stopSpeakingVisual();
    updatePrimaryButton("connected");
    
  } catch (error) {
    console.error("[Frontend] Error sending text message:", error);
    if (error.name === 'AbortError') {
      showError("Request timed out. The system is taking longer than expected to respond.");
    } else {
      showError("Failed to send your message.");
    }
    stopSpeakingVisual();
    updatePrimaryButton("connected");
  }
}

async function startConversation() {
  try {
    updatePrimaryButton("processing", "Connecting...");

    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      showError("Microphone permission is required for voice features.");
      updatePrimaryButton("ready");
      return;
    }

    // No need to connect to ElevenLabs conversational agent anymore
    // Just update UI to ready state for direct STT/TTS
    console.log("🔗 [CONNECTION] Ready for direct STT/TTS");
    updateStatus(true);
    updatePrimaryButton("connected");
    
  } catch (error) {
    console.error("🚨 [ERROR] Error starting conversation:", error);
    updatePrimaryButton("ready");
    showError("Failed to start conversation. Please try again.");
  }
}

async function endConversation() {
  try {
    if (isRecording) {
      await stopSpeechToText();
    }

    user_input = "";
    isRecording = false;
    conversation = null;
    sttStream = null;

    updatePrimaryButton("ready");
    hideSecondaryButton();
    updateStatus(false);
  stopSpeakingVisual();
  } catch (error) {
    console.error("Error ending conversation:", error);
    showError("Failed to properly end conversation.");
  }
}

async function handlePrimaryAction() {
  switch (currentState) {
    case "ready":
      await startConversation();
      break;
    case "connected":
      if (inputMode === "voice") {
        updatePrimaryButton("recording");
        await startSpeechToText();
      }
      break;
    case "recording":
      updatePrimaryButton("processing");
      await stopSpeechToText();
      break;
  }
}

async function handleSendToAgent() {
  if (!user_input) return;

  hideSecondaryButton();
  updatePrimaryButton("processing");

  try {
    await sendProcessedText(user_input);
    user_input = "";
    updatePrimaryButton("connected");
  } catch (error) {
    console.error("Error sending to agent:", error);
    updatePrimaryButton("connected");
  }
}

// Initialize when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 [INIT] Application starting...");
  updateStatus(false);
  await initializeAvatar();
  updatePrimaryButton("ready");

  // Primary action button
  document
    .getElementById("primaryActionButton")
    .addEventListener("click", handlePrimaryAction);

  // Input mode toggle
  document
    .getElementById("voiceModeBtn")
    .addEventListener("click", () => switchInputMode("voice"));
  document
    .getElementById("textModeBtn")
    .addEventListener("click", () => switchInputMode("text"));

  // Text input handling
  const textInput = document.getElementById("textInput");
  const sendTextButton = document.getElementById("sendTextButton");

  sendTextButton.addEventListener("click", () => {
    const text = textInput.value.trim();
    if (text) {
      console.log("📝 [USER_INPUT] Text message:", text);
      sendTextMessage(text);
      textInput.value = "";
    }
  });

  textInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const text = textInput.value.trim();
      if (text) {
        console.log("📝 [USER_INPUT] Text message (Enter):", text);
        sendTextMessage(text);
        textInput.value = "";
      }
    }
  });

  // Initialize with voice mode
  switchInputMode("voice");
  console.log("✅ [INIT] Application initialized successfully");
});
