# 💬 Baithak — Real-Time Chat Application

A modern, production-ready real-time chat application built with React, Node.js, MongoDB, and Socket.IO. Inspired by WhatsApp and Discord with a sleek dark theme.

![Baithak Preview](https://via.placeholder.com/800x450/0f172a/14b8a6?text=Baithak+Chat)

---

## ✨ Features

- **Real-time messaging** powered by Socket.IO
- **JWT Authentication** — register, login, protected routes
- **User search** — find and start conversations with any user
- **Typing indicators** — see when the other person is typing
- **Read receipts** — know when your message has been seen
- **Online/offline status** — green dot + last seen
- **Unread message count** per conversation
- **Emoji picker** — react-emoji-picker integration
- **Delete messages** — soft delete with indicator
- **Optimistic UI** — instant message feel
- **Responsive** — works on mobile and desktop
- **Dark mode** — deep slate theme throughout

---

## 🗂️ Project Structure

```
baithak/
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── api/             # Axios API calls
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # AuthContext, SocketContext
│   │   ├── pages/           # Login, Register, Chat
│   │   └── routes/          # ProtectedRoute
│   ├── .env.example
│   └── vercel.json
│
└── server/                  # Node.js + Express backend
    ├── controllers/         # Business logic
    ├── middleware/          # JWT auth middleware
    ├── models/              # Mongoose schemas
    ├── routes/              # Express routes
    ├── socket/              # Socket.IO event handlers
    ├── .env.example
    └── render.yaml
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- npm or yarn

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/baithak.git
cd baithak

# Install root deps
npm install

# Install all (server + client)
npm run install:all
```

### 2. Configure Environment Variables

**Backend** — `server/.env`:
```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/baithak
JWT_SECRET=your_super_secret_key_here_make_it_long
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

**Frontend** — `client/.env`:
```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Run

```bash
# Run both frontend and backend concurrently
npm run dev
```

Or separately:
```bash
# Backend (port 5000)
cd server && npm run dev

# Frontend (port 5173)
cd client && npm run dev
```

Visit: `https://localhost:5173`

---

## 🔒 HTTPS / SSL Setup (Required for Video Calls)

Browsers require a secure context (HTTPS) to access the camera and microphone for WebRTC. To test video calling locally:

1. **Generate Certificates**:
   Run the following command in the root directory:
   ```bash
   npm run gen-certs
   ```
   This creates `certs/key.pem` and `certs/cert.pem`. These are self-signed and ignored by git.

2. **Accept Security Warning**:
   When you first visit `https://localhost:5173`, your browser will show a security warning. Click **Advanced** and then **Proceed to localhost (unsafe)**.

3. **Mobile Testing**:
   To test on a phone, use your computer's local IP address (e.g., `https://192.168.1.5:5173`). Both devices must be on the same network. You will also need to accept the certificate warning on your phone's browser.

---

## 🌐 Deployment

### MongoDB Atlas

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Create a database user and whitelist `0.0.0.0/0` (Allow all IPs)
4. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/baithak`

---

### Backend → Render

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo, set root directory to `server/`
4. Build Command: `npm install`
5. Start Command: `node index.js`
6. Add environment variables:
   - `MONGO_URI` = your Atlas URI
   - `JWT_SECRET` = a long random secret
   - `CLIENT_URL` = your Vercel frontend URL
   - `NODE_ENV` = `production`
7. Deploy!

Your backend URL: `https://baithak-server.onrender.com`

---

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your repo, set root directory to `client/`
3. Framework: Vite
4. Add environment variables:
   - `VITE_API_URL` = your Render backend URL
   - `VITE_SOCKET_URL` = your Render backend URL
5. Deploy!

Your app URL: `https://baithak.vercel.app`

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout, set offline |

### Conversations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/conversations` | Create or get conversation |
| GET | `/api/conversations/:userId` | Get all conversations |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/messages` | Send a message |
| GET | `/api/messages/:conversationId` | Get messages |
| DELETE | `/api/messages/:messageId` | Delete message |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/search?q=query` | Search users |
| GET | `/api/users/:id` | Get user by ID |

---

## ⚡ Socket.IO Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `addUser` | `userId` | Register user as online |
| `sendMessage` | `{senderId, receiverId, message}` | Send a message |
| `typing` | `{senderId, receiverId}` | Start typing |
| `stopTyping` | `{senderId, receiverId}` | Stop typing |
| `messageSeen` | `{conversationId, userId, receiverId}` | Mark messages seen |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `getMessage` | message object | Receive new message |
| `getOnlineUsers` | `userId[]` | Updated online users list |
| `typing` | `{senderId}` | Someone is typing |
| `stopTyping` | `{senderId}` | Someone stopped typing |
| `messageSeen` | `{conversationId}` | Messages marked as seen |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Routing | React Router v6 |
| State | React Context API |
| HTTP | Axios |
| Real-time | Socket.IO Client |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Real-time | Socket.IO Server |
| Deploy FE | Vercel |
| Deploy BE | Render |
| DB Host | MongoDB Atlas |

---

## 📄 License

MIT © 2024 Baithak
