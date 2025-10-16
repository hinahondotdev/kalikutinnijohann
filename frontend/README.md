# 🧠 Hinahon - Mental Health Booking App

A comprehensive mental health consultation platform with video call integration, built with React (Vite) frontend and Node.js backend.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Setup](#environment-setup)
- [Running the Application](#running-the-application)
- [User Roles](#user-roles)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

### For Students
- 🎭 Select your current emotion
- 📅 Book consultations with counselors
- 📖 Read mental health articles based on emotions
- 🎥 Join video consultations via Daily.co
- 👤 View consultation history

### For Counselors
- 📋 View pending consultation requests
- ✅ Accept/reject consultations
- 🎥 Automatic video room creation via Daily.co
- 📊 Track accepted and rejected consultations
- 🔔 Real-time updates on new requests

### For Admins
- 👥 Manage users (students, counselors, admins)
- 📝 Manage mental health articles
- 🔐 Role assignment and permissions

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first styling
- **Supabase Client** - Authentication and database

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Supabase** - Database and authentication
- **Daily.co** - Video conferencing

### Database
- **PostgreSQL** (via Supabase)
- Row Level Security (RLS) policies

---

## 📁 Project Structure

```
hinahon-project/
│
├── backend/                          # Node.js Backend
│   ├── middleware/
│   │   └── auth.js                  # JWT authentication middleware
│   ├── routes/
│   │   └── daily.js                 # Daily.co API routes
│   ├── .env                         # Backend environment variables
│   ├── .gitignore
│   ├── package.json
│   └── server.js                    # Express server entry point
│
└── frontend/                         # React Frontend
    ├── public/
    │   └── vite.svg
    ├── src/
    │   ├── assets/
    │   │   └── react.svg
    │   ├── components/
    │   │   └── GuestRedirect.jsx   # Guest handling component
    │   ├── pages/
    │   │   ├── AdminPage.jsx        # Admin dashboard
    │   │   ├── ArticlesPage.jsx     # Articles listing/filtering
    │   │   ├── BookingPage.jsx      # Consultation booking
    │   │   ├── CounselorPage.jsx    # Counselor dashboard
    │   │   ├── LandingPage.jsx      # Main student page
    │   │   └── LoginPage.jsx        # Authentication page
    │   ├── utils/
    │   │   └── dailyApi.js          # Daily.co API helpers
    │   ├── App.css
    │   ├── App.jsx                  # Main app with routing
    │   ├── AuthProvider.jsx         # Auth context provider
    │   ├── index.css
    │   ├── main.jsx                 # React entry point
    │   ├── ProtectedRoute.jsx       # Route protection HOC
    │   ├── styles.css               # Custom styles
    │   └── supabaseClient.js        # Supabase configuration
    ├── .env                         # Frontend environment variables
    ├── .gitignore
    ├── eslint.config.js
    ├── index.html
    ├── package.json
    ├── README.md
    └── vite.config.js
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 16+ and npm
- **Supabase account** (free tier works)
- **Daily.co account** (free tier works)
- **Google OAuth credentials** (for login)

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd hinahon-project
```

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

---

## 🔐 Environment Setup

### Backend Environment (`.env`)

Create `backend/.env`:

```env
PORT=3001
SUPABASE_URL=https://qqksytpofkppluxjrywk.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
DAILY_API_KEY=8c30fda489568919101625dd66ad7f3faf823f4ec06b991578be04dc841b7faa
```

**⚠️ Get Your Supabase Service Key:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Settings → API
4. Copy the `service_role` key (NOT the `anon` key)

### Frontend Environment (`.env`)

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001
```

---

## 🏃 Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
✅ Backend running on `http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
✅ Frontend running on `http://localhost:5173`

### Production Build

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

---

## 👥 User Roles

### Student
- Default role for new users
- Can book consultations
- Can read articles
- Can join video calls

### Counselor
- Accept/reject consultation requests
- Manage availability
- Conduct video consultations
- View consultation history

### Admin
- Manage all users
- Create/edit/delete articles
- Assign roles
- Full system access

### Setting User Roles

**Method 1: SQL (Recommended)**
```sql
UPDATE users 
SET role = 'counselor' 
WHERE email = 'counselor@example.com';
```

**Method 2: Hardcoded in App.jsx**
```javascript
const counselorEmails = ['counselor@example.com'];
```

---

## 📡 API Documentation

### Base URL
```
http://localhost:3001/api
```

### Endpoints

#### Health Check
```http
GET /health
```
**Response:**
```json
{
  "status": "OK",
  "message": "Hinahon Backend API is running"
}
```

#### Create Video Room
```http
POST /api/daily/create-room
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "consultationId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "roomUrl": "https://hinahon.daily.co/room-name",
  "roomName": "room-name",
  "expiresAt": "2025-10-01T12:00:00Z"
}
```

#### Get Room Details
```http
GET /api/daily/room/:consultationId
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "success": true,
  "roomUrl": "https://hinahon.daily.co/room-name",
  "status": "accepted"
}
```

#### Delete Room
```http
DELETE /api/daily/room/:consultationId
Authorization: Bearer {jwt_token}
```

---

## 🚀 Deployment

### Backend Deployment

**Option 1: Railway.app**
```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

**Option 2: Render.com**
1. Connect GitHub repository
2. Select "Web Service"
3. Build: `cd backend && npm install`
4. Start: `cd backend && npm start`
5. Add environment variables in dashboard

**Option 3: Heroku**
```bash
heroku create hinahon-backend
git subtree push --prefix backend heroku main
```

### Frontend Deployment

**Vercel (Recommended)**
```bash
cd frontend
npm run build

# Deploy
vercel
```

Update production `.env`:
```env
VITE_API_URL=https://your-backend-url.com
```

**Netlify**
```bash
npm run build
netlify deploy --prod --dir=dist
```

---

## 🐛 Troubleshooting

### Backend Issues

**❌ Port already in use**
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <process_id> /F

# Mac/Linux
lsof -i :3001
kill -9 <process_id>
```

**❌ Module not found**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Frontend Issues

**❌ CORS Error**
Update `backend/server.js`:
```javascript
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
```

**❌ Environment variables not loading**
- Restart Vite after changing `.env`
- Ensure variables start with `VITE_`
- Check file is named exactly `.env`

### Database Issues

**❌ RLS Policy Errors**
```sql
-- Check current policies
SELECT * FROM pg_policies WHERE tablename = 'consultations';

-- Disable RLS temporarily for testing
ALTER TABLE consultations DISABLE ROW LEVEL SECURITY;
```

### Daily.co Issues

**❌ Room creation fails**
- Verify API key in `backend/.env`
- Check Daily.co dashboard for rate limits
- Ensure room name is unique

---

## 📝 Database Schema

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  name TEXT,
  role TEXT CHECK (role IN ('student', 'counselor', 'admin'))
);

-- Consultations
CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id),
  counselor_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  time TIME NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')),
  video_link TEXT,
  rejection_reason TEXT
);

-- Articles
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  emotion_tag TEXT NOT NULL
);

-- Availability
CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id UUID REFERENCES users(id),
  day TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);
```

---

## 🔒 Security

- ✅ JWT authentication on all API endpoints
- ✅ Role-based access control
- ✅ Row Level Security (RLS) in Supabase
- ✅ API keys stored securely in backend
- ✅ CORS configured for specific origins
- ✅ Input validation and sanitization

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👏 Credits

- **Daily.co** - Video conferencing
- **Supabase** - Backend as a Service
- **Tailwind CSS** - Styling
- **React** - Frontend framework

---

## 📧 Contact

Team Hinahon - your-email@example.com

Project Link: [https://github.com/yourusername/hinahon](https://github.com/yourusername/hinahon)