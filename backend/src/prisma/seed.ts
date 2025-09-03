import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword123' // In real app, this should be properly hashed
    }
  });

  // Create test account
  const account = await prisma.account.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Conta Corrente',
      balance: 1000.00,
      userId: user.id
    }
  });

  // Create test categories
  const expenseCategory = await prisma.category.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Alimentação',
      type: 'expense',
      userId: user.id
    }
  });

  const incomeCategory = await prisma.category.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Salário',
      type: 'income',
      userId: user.id
    }
  });

  console.log('Seed data created:', {
    user,
    account,
    expenseCategory,
    incomeCategory
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });