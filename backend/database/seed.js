/**
 * Database Seeding Script
 * Creates sample data for testing the assessment platform
 * HCI Principle: Recognition over Recall - provides recognizable sample data
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const DB_PATH = path.join(__dirname, 'assessment.db');

// Sample data for seeding
const seedData = {
  users: [
    {
      email: 'teacher@school.edu',
      password: 'Teacher123!',
      full_name: 'Ms. Sarah Smith',
      role: 'teacher'
    },
    {
      email: 'student1@school.edu',
      password: 'Student123!',
      full_name: 'Sarah Johnson',
      role: 'student'
    },
    {
      email: 'student2@school.edu',
      password: 'Student123!',
      full_name: 'Michael Kim',
      role: 'student'
    },
    {
      email: 'student3@school.edu',
      password: 'Student123!',
      full_name: 'David Chen',
      role: 'student'
    },
    {
      email: 'student4@school.edu',
      password: 'Student123!',
      full_name: 'Emily Adams',
      role: 'student'
    }
  ],
  rooms: [
    {
      room_code: '8392-AB',
      room_name: 'Physics 101 - Midterm',
      max_participants: 50,
      is_unlimited: 0,
      start_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      status: 'active',
      instructions: 'Read each question carefully. You have 2 hours to complete this exam.',
      registration_fields: JSON.stringify([
        { id: 'full_name', label: 'Full Name', type: 'text', required: true, locked: true },
        { id: 'email', label: 'Email Address', type: 'email', required: true, locked: true },
        { id: 'student_id', label: 'Student ID', type: 'text', required: true, locked: false }
      ])
    },
    {
      room_code: '1120-XC',
      room_name: 'History - World War II',
      max_participants: 40,
      is_unlimited: 0,
      start_time: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
      end_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      status: 'closed',
      instructions: 'Answer all questions. Essay questions should be at least 200 words.',
      registration_fields: JSON.stringify([
        { id: 'full_name', label: 'Full Name', type: 'text', required: true, locked: true },
        { id: 'email', label: 'Email Address', type: 'email', required: true, locked: true }
      ])
    },
    {
      room_code: '9921-ZZ',
      room_name: 'Calculus Quiz',
      max_participants: 30,
      is_unlimited: 0,
      start_time: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), // 3 days ago
      end_time: new Date(Date.now() - 70 * 60 * 60 * 1000).toISOString(), // 2 hours later
      status: 'closed',
      instructions: 'Show all your work for full credit. Calculators are allowed.',
      registration_fields: JSON.stringify([
        { id: 'full_name', label: 'Full Name', type: 'text', required: true, locked: true },
        { id: 'email', label: 'Email Address', type: 'email', required: true, locked: true }
      ])
    }
  ],
  questions: {
    '8392-AB': [
      {
        question_type: 'multiple_choice',
        question_text: 'Which organelle is known as the powerhouse of the cell?',
        points: 1,
        options: JSON.stringify(['Mitochondria', 'Nucleus', 'Ribosome', 'Chloroplast']),
        correct_answer: JSON.stringify({ index: 0, text: 'Mitochondria' }),
        order_index: 1
      },
      {
        question_type: 'multiple_choice',
        question_text: 'What is the speed of light in a vacuum?',
        points: 2,
        options: JSON.stringify(['3.00 x 10^8 m/s', '3.00 x 10^6 m/s', '3.00 x 10^10 m/s', '3.00 x 10^4 m/s']),
        correct_answer: JSON.stringify({ index: 0, text: '3.00 x 10^8 m/s' }),
        order_index: 2
      },
      {
        question_type: 'true_false',
        question_text: 'Newton\'s Third Law states that for every action, there is an equal and opposite reaction.',
        points: 1,
        options: JSON.stringify(['True', 'False']),
        correct_answer: JSON.stringify({ index: 0, text: 'True' }),
        order_index: 3
      },
      {
        question_type: 'short_answer',
        question_text: 'Define the term "velocity" in your own words.',
        points: 3,
        correct_answer: JSON.stringify({ keywords: ['speed', 'direction', 'vector', 'displacement', 'time'] }),
        order_index: 4
      }
    ],
    '1120-XC': [
      {
        question_type: 'multiple_choice',
        question_text: 'In which year did World War II begin?',
        points: 1,
        options: JSON.stringify(['1939', '1941', '1945', '1935']),
        correct_answer: JSON.stringify({ index: 0, text: '1939' }),
        order_index: 1
      },
      {
        question_type: 'essay',
        question_text: 'Explain the major causes of World War II and how they led to the conflict.',
        points: 10,
        correct_answer: JSON.stringify({ rubric: ['Treaty of Versailles', 'Rise of Fascism', 'Economic Depression', 'Appeasement Policy'] }),
        order_index: 2
      }
    ],
    '9921-ZZ': [
      {
        question_type: 'multiple_choice',
        question_text: 'What is the derivative of x^2?',
        points: 1,
        options: JSON.stringify(['2x', 'x^2', 'x', '2']),
        correct_answer: JSON.stringify({ index: 0, text: '2x' }),
        order_index: 1
      },
      {
        question_type: 'multiple_choice',
        question_text: 'Evaluate the integral of 2x dx.',
        points: 2,
        options: JSON.stringify(['x^2 + C', '2x^2 + C', 'x + C', '2 + C']),
        correct_answer: JSON.stringify({ index: 0, text: 'x^2 + C' }),
        order_index: 2
      }
    ]
  }
};

async function seedDatabase() {
  const db = new sqlite3.Database(DB_PATH);
  
  console.log('Starting database seeding...');
  
  try {
    // Insert users
    console.log('Creating users...');
    for (const user of seedData.users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT OR IGNORE INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)`,
          [user.email, hashedPassword, user.full_name, user.role],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
    }
    
    // Get teacher ID
    const teacherId = await new Promise((resolve, reject) => {
      db.get(`SELECT id FROM users WHERE email = ?`, ['teacher@school.edu'], (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.id : null);
      });
    });
    
    if (!teacherId) {
      throw new Error('Teacher user not found');
    }
    
    // Insert rooms
    console.log('Creating rooms...');
    const roomIds = {};
    for (const room of seedData.rooms) {
      const roomId = await new Promise((resolve, reject) => {
        db.run(
          `INSERT OR IGNORE INTO rooms (room_code, room_name, creator_id, max_participants, is_unlimited, start_time, end_time, status, instructions, registration_fields) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [room.room_code, room.room_name, teacherId, room.max_participants, room.is_unlimited, room.start_time, room.end_time, room.status, room.instructions, room.registration_fields],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
      
      // Get room ID if inserted or existing
      const existingRoom = await new Promise((resolve, reject) => {
        db.get(`SELECT id FROM rooms WHERE room_code = ?`, [room.room_code], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (existingRoom) {
        roomIds[room.room_code] = existingRoom.id;
      }
    }
    
    // Insert questions
    console.log('Creating questions...');
    for (const [roomCode, questions] of Object.entries(seedData.questions)) {
      const roomId = roomIds[roomCode];
      if (!roomId) continue;
      
      for (const question of questions) {
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT OR IGNORE INTO questions (room_id, question_type, question_text, points, options, correct_answer, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [roomId, question.question_type, question.question_text, question.points, question.options, question.correct_answer, question.order_index],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });
      }
    }
    
    // Create sample submissions for closed rooms
    console.log('Creating sample submissions...');
    const studentIds = await new Promise((resolve, reject) => {
      db.all(`SELECT id FROM users WHERE role = 'student'`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(r => r.id));
      });
    });
    
    // Create submissions for History room (1120-XC)
    const historyRoomId = roomIds['1120-XC'];
    if (historyRoomId && studentIds.length > 0) {
      for (let i = 0; i < Math.min(3, studentIds.length); i++) {
        const score = [92, 78, 88][i];
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT OR IGNORE INTO submissions (room_id, user_id, answers, score, percentage, time_taken, status, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              historyRoomId,
              studentIds[i],
              JSON.stringify({ 1: '1939', 2: 'Sample essay answer...' }),
              score,
              score,
              3600 + i * 300,
              'completed',
              new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()
            ],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });
      }
    }
    
    console.log('Database seeding completed successfully!');
    console.log('\nTest Accounts:');
    console.log('Teacher: teacher@school.edu / Teacher123!');
    console.log('Student: student1@school.edu / Student123!');
    console.log('Student: student2@school.edu / Student123!');
    console.log('Student: student3@school.edu / Student123!');
    console.log('Student: student4@school.edu / Student123!');
    
  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    db.close();
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
