# Project Management Tool

A Trello/Asana-style collaborative project management tool built as part of the CodeAlpha Full Stack Development Internship. Users can create projects, assign tasks, and communicate within task cards.

## Features
- User authentication (login/register)
- Create and manage group projects
- Create project boards with task cards
- Assign tasks to team members
- Comment on tasks for collaboration
- Real-time updates (if implemented)

## Tech Stack
- **Frontend:** [e.g. React / TypeScript]
- **Backend:** [e.g. Node.js / Express.js]
- **Database:** [add your DB here, e.g. MongoDB]

## Project Structure
ProjectManagementTool/
├── client/          # Frontend application
├── server/          # Backend API and server logic
├── .gitignore
└── README.md

## Setup & Installation

1. Clone the repository
   git clone https://github.com/alyhkcodes/CodeAlpha_ProjectManagementTool.git
   cd CodeAlpha_ProjectManagementTool

2. Install client dependencies
   cd client
   npm install

3. Install server dependencies
   cd ../server
   npm install

4. Add environment variables (create a .env file in server/)
   PORT=5000
   DATABASE_URL=your_database_connection_string
   JWT_SECRET=your_jwt_secret

5. Run the backend server
   cd server
   npm start

6. Run the frontend
   cd client
   npm start

## Author
**Aly Husain Khan**
CodeAlpha Full Stack Development Internship