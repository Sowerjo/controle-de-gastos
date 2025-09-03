import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/v1/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$connect();
    res.json({ 
      status: 'ok', 
      db: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      db: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Goals endpoints
app.get('/api/v1/goals', async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
      include: {
        user: { select: { name: true, email: true } },
        account: { select: { name: true } },
        category: { select: { name: true, type: true } }
      }
    });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch goals' 
    });
  }
});

app.post('/api/v1/goals', async (req, res) => {
  try {
    const { name, targetValue, targetDate, userId, accountId, categoryId } = req.body;
    
    const goal = await prisma.goal.create({
      data: {
        name,
        targetValue: parseFloat(targetValue),
        targetDate: new Date(targetDate),
        userId: parseInt(userId),
        accountId: parseInt(accountId),
        categoryId: categoryId ? parseInt(categoryId) : null
      },
      include: {
        user: { select: { name: true, email: true } },
        account: { select: { name: true } },
        category: { select: { name: true, type: true } }
      }
    });
    
    res.status(201).json(goal);
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create goal' 
    });
  }
});

// Users endpoints (basic)
app.get('/api/v1/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, createdAt: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch users' 
    });
  }
});

// Accounts endpoints (basic)
app.get('/api/v1/accounts', async (req, res) => {
  try {
    const accounts = await prisma.account.findMany({
      include: {
        user: { select: { name: true, email: true } }
      }
    });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch accounts' 
    });
  }
});

// Categories endpoints (basic)
app.get('/api/v1/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        user: { select: { name: true, email: true } }
      }
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch categories' 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});