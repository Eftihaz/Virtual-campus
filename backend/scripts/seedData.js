// Script to seed database with random test data
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const News = require('../models/News');
const Event = require('../models/Event');
const Room = require('../models/Room');
const ThesisSlot = require('../models/ThesisSlot');

const MONGODB_URI = process.env.MONGODB_URI?.replace('<db_password>', process.env.DB_PASSWORD || '');

const departments = ['CSE', 'EEE', 'ME', 'CE', 'BBA', 'English', 'Mathematics'];
const categories = ['general', 'academic', 'sports', 'cultural', 'announcement'];
const eventTypes = ['seminar', 'workshop', 'conference', 'meeting', 'celebration'];
const buildings = ['Engineering', 'Science', 'Arts', 'Business', 'Library'];
const allergies = ['peanut', 'gluten', 'dairy', 'egg', 'soy', 'none'];

const names = [
  'John Smith', 'Sarah Johnson', 'Michael Brown', 'Emily Davis', 'David Wilson',
  'Jessica Martinez', 'Christopher Lee', 'Amanda Taylor', 'Matthew Anderson', 'Ashley Thomas',
  'Dr. Robert Chen', 'Dr. Maria Garcia', 'Dr. James Rodriguez', 'Dr. Lisa White', 'Dr. William Harris'
];

const menuItems = [
  { name: 'Chicken Burger', price: 8.50, allergies: ['gluten'] },
  { name: 'Veggie Pizza', price: 7.00, allergies: ['gluten', 'dairy'] },
  { name: 'Caesar Salad', price: 6.50, allergies: ['dairy', 'egg'] },
  { name: 'Grilled Salmon', price: 12.00, allergies: [] },
  { name: 'Peanut Butter Sandwich', price: 5.00, allergies: ['peanut', 'gluten'] },
  { name: 'Fruit Bowl', price: 4.50, allergies: [] },
  { name: 'Pasta Carbonara', price: 9.00, allergies: ['gluten', 'dairy', 'egg'] },
  { name: 'Rice Bowl', price: 6.00, allergies: [] },
];

const newsTitles = [
  'New Library Hours Announced',
  'CSE Department Hosts Tech Fair',
  'Sports Day Registration Open',
  'Scholarship Applications Due Soon',
  'Campus WiFi Upgraded',
  'Guest Lecture: AI in Healthcare',
  'Student Council Elections',
  'Holiday Schedule Updated'
];

const eventTitles = [
  'Machine Learning Workshop',
  'Annual Science Fair',
  'Cultural Festival 2024',
  'Career Counseling Session',
  'Hackathon Competition',
  'Alumni Meetup',
  'Research Symposium',
  'Graduation Ceremony'
];

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data (optional - comment out if you want to keep existing data)
    // await User.deleteMany({});
    // await MenuItem.deleteMany({});
    // await News.deleteMany({});
    // await Event.deleteMany({});
    // await Room.deleteMany({});
    // await ThesisSlot.deleteMany({});

    // Seed Users
    console.log('Seeding users...');
    const users = [];
    for (let i = 0; i < 15; i++) {
      const role = i < 10 ? 'student' : i < 13 ? 'faculty' : 'admin';
      const user = new User({
        email: `user${i + 1}@campus.edu`,
        password: 'password123',
        name: names[i] || `User ${i + 1}`,
        role: role,
        department: departments[Math.floor(Math.random() * departments.length)],
        studentId: role === 'student' ? `STU${1000 + i}` : '',
      });
      await user.save();
      users.push(user);
      console.log(`Created user: ${user.email} (${user.role})`);
    }

    // Seed Menu Items
    console.log('Seeding menu items...');
    for (const item of menuItems) {
      const menuItem = new MenuItem({
        ...item,
        available: Math.random() > 0.2, // 80% available
      });
      await menuItem.save();
      console.log(`Created menu item: ${menuItem.name}`);
    }

    // Seed News
    console.log('Seeding news...');
    for (let i = 0; i < 8; i++) {
      const author = users[Math.floor(Math.random() * users.length)];
      const news = new News({
        title: newsTitles[i],
        body: `This is a detailed description of ${newsTitles[i]}. Please read carefully and stay updated with campus news.`,
        category: categories[Math.floor(Math.random() * categories.length)],
        department: departments[Math.floor(Math.random() * departments.length)],
        authorId: author._id,
        authorName: author.name,
        likes: Math.floor(Math.random() * 20),
        likedBy: users.slice(0, Math.floor(Math.random() * 5)).map(u => u._id),
      });
      
      // Add some comments
      const commentCount = Math.floor(Math.random() * 4);
      for (let j = 0; j < commentCount; j++) {
        const commenter = users[Math.floor(Math.random() * users.length)];
        news.comments.push({
          text: `Great news! Looking forward to this.`,
          userId: commenter._id,
          userName: commenter.name,
          userRole: commenter.role,
        });
      }
      
      await news.save();
      console.log(`Created news: ${news.title}`);
    }

    // Seed Events
    console.log('Seeding events...');
    const today = new Date();
    for (let i = 0; i < 8; i++) {
      const author = users[Math.floor(Math.random() * users.length)];
      const eventDate = new Date(today);
      eventDate.setDate(today.getDate() + Math.floor(Math.random() * 30));
      
      const event = new Event({
        title: eventTitles[i],
        description: `Join us for ${eventTitles[i]}. This event promises to be informative and engaging.`,
        department: departments[Math.floor(Math.random() * departments.length)],
        type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
        date: eventDate.toISOString().split('T')[0],
        authorId: author._id,
        authorName: author.name,
        interested: Math.floor(Math.random() * 15),
        interestedBy: users.slice(0, Math.floor(Math.random() * 5)).map(u => u._id),
      });
      await event.save();
      console.log(`Created event: ${event.title}`);
    }

    // Seed Rooms
    console.log('Seeding rooms...');
    for (let i = 1; i <= 15; i++) {
      const room = new Room({
        name: `Room ${i < 10 ? '0' + i : i}`,
        building: buildings[Math.floor(Math.random() * buildings.length)],
        status: Math.random() > 0.5 ? 'Available' : 'Occupied',
        favoriteBy: users.slice(0, Math.floor(Math.random() * 3)).map(u => u._id.toString()),
      });
      await room.save();
      console.log(`Created room: ${room.name} in ${room.building}`);
    }

    // Seed Thesis Slots
    console.log('Seeding thesis slots...');
    const facultyUsers = users.filter(u => u.role === 'faculty');
    for (let i = 0; i < 5; i++) {
      const supervisor = facultyUsers[Math.floor(Math.random() * facultyUsers.length)];
      const slot = new ThesisSlot({
        supervisor: supervisor.name,
        topic: `Research Topic ${i + 1}: Advanced Computing`,
        open: Math.random() > 0.3,
        status: Math.random() > 0.3 ? 'open' : 'closed',
        requests: [],
      });
      
      // Add some requests
      const requestCount = Math.floor(Math.random() * 3);
      for (let j = 0; j < requestCount; j++) {
        const student = users.find(u => u.role === 'student');
        if (student) {
          slot.requests.push({
            studentName: student.name,
            groupMembers: [],
            topic: `Thesis topic proposal ${j + 1}`,
            status: ['pending', 'accepted', 'rejected'][Math.floor(Math.random() * 3)],
          });
        }
      }
      
      await slot.save();
      console.log(`Created thesis slot: ${slot.supervisor}`);
    }

    console.log('\n✅ Database seeded successfully!');
    console.log('\nTest Accounts:');
    console.log('Admin: admin@campus.edu / admin123');
    console.log('Student: user1@campus.edu / password123');
    console.log('Faculty: user11@campus.edu / password123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();

