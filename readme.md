# 🚀Hi-Meet-APP: Real-Time Communication Platform

Hi-Meet-APP is a full-featured, real-time messaging and video application built using Python (Flask) and Socket.IO. It features a modern Glassmorphism UI, direct messaging, file sharing, and integrated accessibility tools (Live Captions, Text-to-Speech).

## ✨ Features

- **Real-Time Messaging:** Flask-SocketIO backend.
- **Rich Media:** Image/File sharing and iOS-style Emojis.
- **Calling:** WebRTC-powered 1-on-1 Video and Voice calls.
- **Accessibility:** Live Speech-to-Text Captions and Text-to-Speech (TTS).
- **Persistence:** User authentication and message history managed by SQLAlchemy (SQLite/PostgreSQL ready).
- **UX:** Online status indicators, Typing indicators, Toast notifications, and a responsive Glassmorphism design.

## 📸 Screenshot

Here's a glimpse of Liquid Chat in action:

![Hi-Meet-APP UI Screenshot](/static/images/website_preview.jpg) 

## 🛠️ Local Setup and Installation

Follow these steps to get your project running locally:

### 1. Clone the Repository
```bash
git clone [https://github.com/krissshnaverrrma/Hi-Meet-APP](https://github.com/krissshnaverrrma/Hi-Meet-APP)
cd Hi-Meeting-APP
```

### 2\. Create Virtual Environment

```bash
python -m venv .venv
# Activate:
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
```

### 3\. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4\. Configuration

Create a file named **`.env`** in the project root directory and add your secret keys and email credentials.

```ini 
### 5\. Run the Application

The `run.py` script automatically initializes the database (`chat.db`) if it doesn't exist.

```bash
python run.py
```

The application will run on `http://127.0.0.1:5000/`.

-----

## ☁️ Deployment Notes (Critical)

For the best experience, this application must be deployed on a platform that supports **Persistent Workers** and **WebSockets**, such as **Render** or **Railway**.

| Component | Dev Setup | Production Requirement |
| :--- | :--- | :--- |
| **Real-time** | `Flask-SocketIO` + `Eventlet` | Persistent server (Render Web Service). Avoid Vercel. |
| **Database** | `SQLite (chat.db)` | **MUST** upgrade to PostgreSQL to prevent data loss. |
| **Entry Point** | `Procfile` points to `gunicorn -k eventlet` | Ensures correct async handling. |
---

## 🙋 Contact
Development
For questions or feedback, please reach out to:
* **Developer:** Krishna Verma
* **GitHub:** [https://github.com/krissshnaverrrma]
* **Linkedin** [https://www.linkedin.com/in/krishna-verma-43aa85315/]
* **Email:** [krishnav24-cs@sanskar.org]
---
