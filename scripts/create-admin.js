#!/usr/bin/env node

/**
 * Script to create an admin user for the Kenya Accountability system
 *
 * Usage: npm run create-admin
 *
 * This script will prompt for:
 * - Admin name
 * - Admin email
 * - Admin password
 *
 * And create a user with the 'admin' role
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const { promisify } = require('util');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
const question = promisify(rl.question).bind(rl);

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ke-accountability';

// User schema (simplified version of the actual model)
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 60,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
  },
  role: {
    type: String,
    enum: ['admin', 'verifier', 'uploader'],
    default: 'uploader',
  },
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Create the User model
const User = mongoose.model('User', userSchema);

async function createAdminUser() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get admin details
    console.log('\nCreate Admin User');
    console.log('=================\n');

    const name = await question('Admin Name: ');
    const email = await question('Admin Email: ');
    const password = await question('Admin Password (min 8 characters): ');

    // Validate input
    if (!name || !email || !password) {
      console.error('Error: All fields are required');
      process.exit(1);
    }

    if (password.length < 8) {
      console.error('Error: Password must be at least 8 characters');
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.error(`Error: User with email ${email} already exists`);
      process.exit(1);
    }

    // Create admin user
    const adminUser = new User({
      name,
      email,
      password,
      role: 'admin',
    });

    await adminUser.save();

    console.log('\nAdmin user created successfully!');
    console.log(`Name: ${name}`);
    console.log(`Email: ${email}`);
    console.log(`Role: admin`);

  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  } finally {
    // Close MongoDB connection and readline interface
    await mongoose.connection.close();
    rl.close();
  }
}

// Run the script
createAdminUser();
