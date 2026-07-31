\# Social Media Platform (Fuse)



A mini social media web application built as part of the CodeAlpha Full Stack Development Internship. Users can create profiles, share posts, comment, and follow/like other users.



\## Features

\- User registration and authentication

\- User profiles

\- Create, view, and delete posts (with auto-expiring stories)

\- Comment on posts

\- Like and follow system

\- Direct messaging between users

\- Feed view of posts from followed users



\## Tech Stack

\- \*\*Frontend:\*\* HTML, CSS, JavaScript (vanilla)

\- \*\*Backend:\*\* Node.js / Express.js

\- \*\*Database:\*\* \[add your DB here, e.g. MongoDB]

\- \*\*Deployment:\*\* Vercel



\## Project Structure

SocialMediaPlatform/

├── frontend/

│   ├── js/

│   │   ├── auth.js         # Login \& registration logic

│   │   ├── feed.js         # Feed rendering \& post interactions

│   │   ├── messages.js     # Messaging functionality

│   │   ├── profile.js      # Profile page logic

│   │   └── ui-helpers.js   # Shared UI utilities

│   ├── messages.html

│   ├── profile.html

│   └── ...

├── backend/

│   └── ...

└── README.md



\## Setup \& Installation



1\. Clone the repository

&#x20;  git clone https://github.com/alyhkcodes/fuse.git

&#x20;  cd fuse



2\. Install backend dependencies

&#x20;  cd backend

&#x20;  npm install



3\. Add environment variables (create a .env file in backend/)

&#x20;  PORT=5000

&#x20;  DATABASE\_URL=your\_database\_connection\_string

&#x20;  JWT\_SECRET=your\_jwt\_secret



4\. Run the backend server

&#x20;  npm start



5\. Open frontend/index.html in your browser, or serve it with a local static server.



\## Live Demo

🔗 https://fuse-backend.vercel.app



\## Author

\*\*Aly Husain Khan\*\*

CodeAlpha Full Stack Development Internship

