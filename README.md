# SIT Chatbot RAG System

A comprehensive Retrieval-Augmented Generation (RAG) chatbot system for Singapore Institute of Technology (SIT), featuring hybrid search capabilities with FAISS vector similarity and BM25 keyword matching, powered by OpenAI GPT and ElevenLabs voice integration.

## Features

- **Intelligent RAG System**: Hybrid search combining FAISS vector similarity and BM25 keyword matching
- **Voice Integration**: Speech-to-Text and Text-to-Speech using ElevenLabs APIs
- **Interactive Frontend**: React-based chat interface with animated otter mascot
- **Dual Input Modes**: Support for both text and voice interactions
- **Real-time Processing**: Fast query processing with optimized vector database
- **SIT-Specific Knowledge**: Trained on SIT course information and institutional data

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend        │    │   RAG System   │
│   (React/JS)    │◄──►│   (Node.js)      │◄──►│   (Python)      │
│   Port 3000     │    │   Port 3000      │    │   Port 8000     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Voice APIs    │    │   File Upload    │    │   Vector DB     │
│   (ElevenLabs)  │    │   (Multer)       │    │   (LanceDB)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Prerequisites

Before running the system, ensure you have the following installed:

- **Node.js** (v16 or higher)
- **Python** (v3.8 or higher)
- **FFmpeg** (for audio processing)

### API Keys Required

- **OpenAI API Key**: For GPT-based response generation
- **ElevenLabs API Key**: For speech-to-text and text-to-speech functionality

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Finance-LLMs/SIT-Chatbot-RAG.git
cd SIT-Chatbot-RAG
```

### 2. Download Vector Database

⚠️ **Important**: The LanceDB database is not included in the repository due to Git LFS limits.

1. Download the database from Google Drive: [LanceDB Database](https://drive.google.com/file/d/1mOScn4vvaiyRjgmbBI7cXpUuTE47lU_h/view?usp=sharing)
2. Extract the zip file
3. Copy the `data` folder from the extracted files
4. Place it in the root directory

Your structure should look like:
```
SIT-Chatbot-RAG/
├── data/
│   └── vector-index-lancedb/
│       ├── bm25_index.lance/
│       └── faiss_index.lance/
├── SIT-chatbot-main/
│   ├── backend/
│   ├── src/
│   └── ...
├── SITCHATBOTLLM/
│   ├── server.py
│   ├── requirements.txt
│   └── ...
└── ...
```

### 3. Backend Setup (RAG System)

```bash
cd SITCHATBOTLLM

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env  # Create if doesn't exist
# Edit .env and add your OpenAI API key
```

### 4. Frontend/API Server Setup

```bash
cd SIT-chatbot-main

# Install Node.js dependencies
npm install

# Set up environment variables
cd backend
cp .env.example .env  # Create if doesn't exist
# Edit .env and add your API keys
```

### 5. Environment Configuration

Create `.env` files with the following structure:

#### Backend (.env in `SIT-chatbot-main/backend/`)
```env
OPENAI_API_KEY=your_openai_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

#### RAG System (.env in `SITCHATBOTLLM/`)
```env
OPENAI_API_KEY=your_openai_api_key_here
```

## Running the System

The system requires three components to run simultaneously:

### 1. Start the RAG Backend (Python)

```bash
cd SITCHATBOTLLM
python server.py
```
- Runs on: `http://localhost:8000`
- Provides: Chat completions endpoint with RAG functionality

### 2. Start the API Server (Node.js)

```bash
cd SIT-chatbot-main/backend
node server.js
```
- Runs on: `http://localhost:3000`
- Provides: Frontend serving, API proxy, voice processing

### 3. Build Frontend (if needed)

```bash
cd SIT-chatbot-main
npm run build  # Build the frontend
```

### 4. Access the Application

Open your browser and navigate to: `http://localhost:3000`

## Usage

### Text Mode
1. Type your question in the chat input
2. Click "Send" or press Enter
3. Receive AI-powered responses based on SIT knowledge base

### Voice Mode
1. Click the microphone icon to start recording
2. Speak your question clearly
3. The system will transcribe, process, and respond with both text and voice

### Example Queries
- "What courses does SIT offer in cloud computing?"
- "Tell me about the admission requirements"
- "What are the fees for the DevOps program?"
- "How long is the Cloud Computing course?"

## Technical Details

### Vector Database
- **Storage**: LanceDB with 4,076+ indexed documents
- **Search**: Hybrid FAISS + BM25 for optimal retrieval
- **Content**: SIT course catalogs, program information, policies

### Voice Processing
- **STT Model**: ElevenLabs Scribe v1 with English language optimization
- **TTS Model**: ElevenLabs Turbo v2.5 for natural speech synthesis
- **Audio Optimization**: 16kHz, mono, PCM format using FFmpeg

### API Endpoints
- `POST /api/chat` - Chat completions (proxy to RAG system)
- `POST /api/speech-to-text` - Convert audio to text
- `POST /api/text-to-speech` - Convert text to audio

## Project Structure

```
SIT-Chatbot-RAG/
├── README.md                          # This file
├── SIT-chatbot-main/                  # Frontend & API Server
│   ├── backend/
│   │   ├── server.js                  # Node.js Express server
│   │   ├── .env                       # API keys
│   │   └── uploads/                   # Temporary audio files
│   ├── src/
│   │   ├── app.js                     # React frontend logic
│   │   ├── index.html                 # Main HTML file
│   │   └── styles.css                 # Styling
│   ├── dist/                          # Built frontend files
│   ├── package.json                   # Node.js dependencies
│   └── webpack.config.js              # Build configuration
├── SITCHATBOTLLM/                     # RAG Backend
│   ├── data/                          # Vector database (download separately)
│   ├── server.py                      # FastAPI RAG server
│   ├── bm25_chunk_search.py           # Search implementation
│   ├── requirements.txt               # Python dependencies
│   └── .env                           # OpenAI API key
└── data/                              # Additional data files
    └── vector-index-lancedb/          # LanceDB storage
```


## 📄 License

This project is licensed under the [MIT License](LICENSE).