# QuizMaster Pro - Interactive Online Assessment Platform

A production-ready, accessibility-focused online assessment platform built as an HCI (Human-Computer Interaction) case study. This application demonstrates enterprise-grade functionality while prioritizing usability, accessibility, and cognitive load reduction.

## Features

### For Teachers
- **Create Assessment Rooms** with customizable settings
- **Question Bank Management** with multiple question types (MCQ, True/False, Short Answer, Essay)
- **Custom Registration Forms** for student information collection
- **Real-time Results Analytics** with export capabilities
- **Room Code System** for easy student access

### For Students
- **Join Rooms** with simple 6-character codes
- **Take Exams** with timer and auto-save functionality
- **Scratchpad** for rough notes during exams
- **Flag Questions** for review
- **View Results** with detailed feedback

### Accessibility Features
- Full keyboard navigation support
- Screen reader compatibility with ARIA labels
- Text-to-Speech for questions and instructions
- High contrast mode support
- Focus indicators and skip links
- Reduced motion support
- Minimum 44x44px touch targets

### HCI Principles Implemented
- **Visibility of System Status**: Progress bars, timers, auto-save indicators
- **Error Prevention**: Form validation, confirmation dialogs, auto-save
- **Clear Feedback Loops**: Toast notifications, visual feedback
- **Consistency**: Standard UI patterns throughout
- **Recognition over Recall**: Recent rooms, visible room codes
- **Minimal Cognitive Load**: Progressive disclosure, chunked information
- **Forgiving UI**: Can navigate between questions, edit before submit

## Tech Stack

### Backend
- **Node.js** with Express
- **SQLite** database
- **JWT** authentication
- **bcrypt** password hashing

### Frontend
- **Vanilla JavaScript** (no frameworks)
- **CSS3** with custom properties
- **Semantic HTML5**
- **Web Speech API** for TTS

## Installation

### Prerequisites
- Node.js 16+ installed
- npm or yarn package manager

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd assessment-platform
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Seed the database** (optional - creates test data)
   ```bash
   npm run seed
   ```

## Running the Application

### Development Mode (Concurrent)
```bash
npm run dev
```
This starts both the backend server (port 3000) and frontend dev server (port 5500).

### Backend Only
```bash
npm run dev:backend
```

### Frontend Only
```bash
npm run dev:frontend
```

### Production Mode
```bash
npm start
```

## Test Accounts

After seeding the database, you can use these accounts:

| Role | Email | Password |
|------|-------|----------|
| Teacher | teacher@school.edu | Teacher123! |
| Student | student1@school.edu | Student123! |
| Student | student2@school.edu | Student123! |
| Student | student3@school.edu | Student123! |
| Student | student4@school.edu | Student123! |

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Room Endpoints
- `POST /api/rooms` - Create room (teacher only)
- `GET /api/rooms/teacher` - Get teacher's rooms
- `GET /api/rooms/:roomCode` - Get room details
- `PUT /api/rooms/:roomCode` - Update room
- `DELETE /api/rooms/:roomCode` - Delete room
- `POST /api/rooms/join` - Validate room code
- `GET /api/rooms/:roomCode/results` - Get room results

### Question Endpoints
- `POST /api/rooms/:roomCode/questions` - Add question
- `GET /api/rooms/:roomCode/questions` - Get questions
- `PUT /api/rooms/:roomCode/questions/:questionId` - Update question
- `DELETE /api/rooms/:roomCode/questions/:questionId` - Delete question

### Exam Endpoints
- `POST /api/rooms/:roomCode/register` - Register for exam
- `GET /api/rooms/:roomCode/exam` - Get exam questions
- `POST /api/rooms/:roomCode/auto-save` - Auto-save progress
- `POST /api/rooms/:roomCode/submit` - Submit exam
- `GET /api/rooms/:roomCode/results/:submissionId` - Get results

## Project Structure

```
assessment-platform/
├── backend/
│   ├── controllers/     # Route controllers
│   ├── database/        # Database schema and seeding
│   ├── middleware/      # Auth, validation, error handling
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── server.js        # Main server file
│   └── package.json
├── frontend/
│   ├── scripts/         # JavaScript files
│   │   └── pages/       # Page-specific scripts
│   ├── styles/          # CSS files
│   │   └── pages/       # Page-specific styles
│   ├── assets/          # Images and static files
│   ├── *.html           # HTML pages
│   └── index.html
├── package.json         # Root package.json
└── README.md
```

## Accessibility Testing

### Keyboard Navigation
- Tab through all interactive elements
- Use Enter/Space to activate buttons
- Use Arrow keys for navigation
- Test Escape key for modals

### Screen Reader Testing
- Test with NVDA (Windows) or VoiceOver (Mac)
- Verify all content is announced correctly
- Check ARIA labels and roles

### Visual Testing
- Check color contrast ratios (minimum 4.5:1)
- Test at 200% zoom
- Verify focus indicators are visible

## Deployment

### Local Deployment
```bash
npm run dev
```

### Production Deployment (Render/Railway)
1. Set environment variables:
   - `NODE_ENV=production`
   - `JWT_SECRET=your-secret-key`
   - `PORT=3000`

2. Deploy backend service

3. Configure CORS_ORIGIN to match your frontend URL

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test accessibility
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

This project was built as an HCI case study demonstrating:
- Accessibility-first design
- Vanilla JavaScript implementation
- RESTful API architecture
- Mobile-first responsive design
