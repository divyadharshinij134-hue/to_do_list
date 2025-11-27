# Sparkling-Times - Todo List Application

A full-stack todo list application built with Node.js, Express, MongoDB, and Bootstrap.

<img width="1193" height="530" alt="image" src="https://github.com/user-attachments/assets/f5a1958f-f96b-4dca-adb5-9816aaca5c00" />

## Features

- ✨ Add, edit, and delete tasks
- ✅ Mark tasks as complete/incomplete
- 📅 Set due dates for tasks
- 🎯 Priority levels (low, medium, high)
- 🔍 Sort tasks by created date, due date, priority, or title
- 👤 User-scoped tasks (userId-based, ready for auth integration)
- 💾 Persistent storage with MongoDB
- 📱 Responsive Bootstrap design

## Project Structure

```
todo-app/
├── server.js          # Express server with ES modules
├── package.json       # Dependencies and scripts (ES modules enabled)
├── .env               # Environment variables (MONGODB_URI, PORT)
├── models/
│   └── Task.js        # Mongoose Task model (userId, title, dueDate, priority)
├── routes/
│   └── tasks.js       # API routes with userId scoping
└── public/
    └── index.html     # Bootstrap-based frontend (all-in-one)
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - The `.env` file is already created. Update if needed:
   ```
   MONGODB_URI=mongodb://localhost:27017/todoapp
   PORT=3000
   ```
   - For MongoDB Atlas, use your connection string:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/todoapp
   ```

3. Start MongoDB:
   - If using local MongoDB, make sure MongoDB is running
   - For MongoDB Atlas, ensure your connection string is correct

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

5. Open your browser and navigate to:
```
http://localhost:3000
```

## API Endpoints

All endpoints require a `userId` parameter (query string or `x-user-id` header).

- `GET /api/tasks?userId=<userId>&sortBy=<field>&order=<asc|desc>` - Get all tasks for a user
- `POST /api/tasks?userId=<userId>` - Create a new task
- `PATCH /api/tasks/:id?userId=<userId>` - Update a task (title, dueDate, priority, completed)
- `DELETE /api/tasks/:id?userId=<userId>` - Delete a task
- `GET /health` - Health check endpoint

### Task Schema

```javascript
{
  userId: String (required, indexed),
  title: String (required),
  dueDate: Date (optional),
  priority: "low" | "medium" | "high" (default: "medium"),
  completed: Boolean (default: false),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

## Technologies Used

- **Backend**: Node.js, Express.js (ES modules)
- **Database**: MongoDB with Mongoose
- **Frontend**: Bootstrap 5.3.3, vanilla JavaScript
- **Environment**: dotenv

## User Authentication

Currently uses a simple `userId` parameter for user scoping. The default demo user is `"demo-user"`. Replace with real authentication (JWT, sessions, etc.) in production.


