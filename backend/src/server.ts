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

// In-memory storage for payment confirmations
const paymentConfirmations = new Map<number, { confirmedAt: Date, lastRun: string }>();

// Recurring endpoints (mock data for testing)
app.get('/api/v1/recurring', async (req, res) => {
  try {
    // Mock data simulating recurring rules with payment_status
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const mockRecurringRules = [
      {
        id: 1,
        description: 'Aluguel',
        amount: 1200.00,
        type: 'DESPESA',
        account_id: 1,
        category_id: 1,
        next_run: '2024-01-05',
        last_run: '2023-12-05',
        interval_unit: 'month',
        interval_count: 1,
        payment_status: 'atrasado'
      },
      {
        id: 2,
        description: 'Internet',
        amount: 89.90,
        type: 'DESPESA',
        account_id: 1,
        category_id: 2,
        next_run: '2024-01-15',
        last_run: null,
        interval_unit: 'month',
        interval_count: 1,
        payment_status: 'pendente'
      },
      {
        id: 3,
        description: 'Salário',
        amount: 5000.00,
        type: 'RECEITA',
        account_id: 1,
        category_id: 3,
        next_run: '2024-01-01',
        last_run: '2024-01-01',
        interval_unit: 'month',
        interval_count: 1,
        payment_status: 'pago'
      }
    ];

    // Apply payment confirmations and calculate payment_status based on dates
    mockRecurringRules.forEach(rule => {
      const confirmation = paymentConfirmations.get(rule.id);
      
      // If there's a confirmation, update last_run
      if (confirmation) {
        rule.last_run = confirmation.lastRun;
      }
      
      const nextRun = new Date(rule.next_run);
      const lastRun = rule.last_run ? new Date(rule.last_run) : null;
      
      // Check if paid this month
      const paidThisMonth = lastRun && lastRun >= monthStart && lastRun <= monthEnd;
      
      if (paidThisMonth) {
        rule.payment_status = 'pago';
      } else {
        // For overdue items, check if they have been paid recently (within last 30 days)
        const recentlyPaid = lastRun && (today.getTime() - lastRun.getTime()) <= (30 * 24 * 60 * 60 * 1000);
        
        if (recentlyPaid) {
          rule.payment_status = 'pago';
        } else if (nextRun < today) {
          rule.payment_status = 'atrasado';
        } else {
          rule.payment_status = 'pendente';
        }
      }
    });

    res.json({ data: mockRecurringRules });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch recurring rules' 
    });
  }
});

app.get('/api/v1/recurring/upcoming', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 3;
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + days);
    
    // Mock upcoming expenses grouped by date
    const mockUpcoming = {
      '2024-01-05': [
        {
          id: 1,
          description: 'Aluguel',
          amount: 1200.00,
          type: 'DESPESA',
          account_id: 1,
          category_id: 1,
          next_run: '2024-01-05',
          payment_status: 'atrasado'
        }
      ],
      '2024-01-15': [
        {
          id: 2,
          description: 'Internet',
          amount: 89.90,
          type: 'DESPESA',
          account_id: 1,
          category_id: 2,
          next_run: '2024-01-15',
          payment_status: 'pendente'
        }
      ]
    };

    res.json({ data: mockUpcoming });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch upcoming expenses' 
    });
  }
});

app.post('/api/v1/fixed-expenses/confirm', async (req, res) => {
  try {
    const { id } = req.body;
    
    if (!id) {
      return res.status(422).json({ 
        error: { message: 'ID requerido' } 
      });
    }

    // Store payment confirmation with current date
    const now = new Date();
    const currentDateString = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    paymentConfirmations.set(parseInt(id), {
      confirmedAt: now,
      lastRun: currentDateString
    });

    console.log(`Payment confirmed for expense ID ${id} at ${now.toISOString()}`);
    
    return res.json({ data: { ok: true, confirmedAt: now.toISOString() } });
  } catch (error) {
    console.error('Error confirming payment:', error);
    return res.status(500).json({ 
      error: { message: 'Erro ao confirmar pagamento' }
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