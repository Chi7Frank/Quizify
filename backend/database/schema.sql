-- Assessment Platform Database Schema
-- HCI Principles Applied: Data Integrity, Error Prevention

-- Users Table - Stores authenticated users (teachers and students)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT CHECK(role IN ('student', 'teacher')) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Rooms Table - Stores assessment rooms created by teachers
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_code TEXT UNIQUE NOT NULL,
  room_name TEXT NOT NULL,
  creator_id INTEGER NOT NULL,
  max_participants INTEGER,
  is_unlimited BOOLEAN DEFAULT 1,
  start_time DATETIME,
  end_time DATETIME,
  auto_submit BOOLEAN DEFAULT 1,
  show_scores BOOLEAN DEFAULT 1,
  show_answers BOOLEAN DEFAULT 0,
  show_grades BOOLEAN DEFAULT 1,
  instructions TEXT,
  registration_fields TEXT, -- JSON array of field definitions
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'closed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Questions Table - Stores questions for each room
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  question_type TEXT CHECK(question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay')) NOT NULL,
  question_text TEXT NOT NULL,
  points INTEGER DEFAULT 1,
  options TEXT, -- JSON array for multiple choice options
  correct_answer TEXT, -- JSON for complex answers
  media_url TEXT,
  order_index INTEGER NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- Submissions Table - Stores student exam submissions
CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  user_id INTEGER,
  registration_data TEXT, -- JSON of form responses
  answers TEXT, -- JSON of question answers
  score INTEGER,
  percentage DECIMAL(5,2),
  time_taken INTEGER, -- seconds
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  auto_submitted BOOLEAN DEFAULT 0,
  status TEXT DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed', 'abandoned')),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(room_id, user_id)
);

-- Auto-save Table - Stores temporary progress for error prevention
CREATE TABLE IF NOT EXISTS auto_saves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL,
  answers TEXT NOT NULL, -- JSON of current answers
  saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooms_creator ON rooms(creator_id);
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_questions_room ON questions(room_id);
CREATE INDEX IF NOT EXISTS idx_submissions_room ON submissions(room_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
