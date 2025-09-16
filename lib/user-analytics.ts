import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, orderBy, startAfter, limit } from 'firebase/firestore'

export interface TransactionData {
  id: string
  userId: string
  amount: number
  category: string
  description: string
  type: 'income' | 'expense'
  date: Date
  createdAt: Date
}

export interface CategoryTotal {
  name: string
  value: number
  color: string
  count: number
}

export interface MonthlyData {
  month: string
  income: number
  expense: number
  net: number
}

export interface FinancialSummary {
  totalIncome: number
  totalExpense: number
  netWorth: number
  averageMonthlyIncome: number
  averageMonthlyExpense: number
  topCategories: CategoryTotal[]
  monthlyTrends: MonthlyData[]
  transactionCount: number
  largestTransaction: TransactionData | null
  mostFrequentCategory: string
}

export class UserAnalytics {
  private userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  // Firebase Timestamp'ları güvenli bir şekilde Date'e çeviren helper fonksiyon
  private safeToDate(timestamp: any): Date {
    try {
      if (!timestamp) return new Date()
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return timestamp.toDate()
      }
      if (timestamp instanceof Date) {
        return timestamp
      }
      if (typeof timestamp === 'string') {
        return new Date(timestamp)
      }
      if (typeof timestamp === 'number') {
        return new Date(timestamp)
      }
      return new Date()
    } catch (error) {
      console.warn('Error converting timestamp:', timestamp, error)
      return new Date()
    }
  }

  async getTransactions(limitCount: number = 100): Promise<TransactionData[]> {
    try {
      const q = query(
        collection(db!, 'transactions'),
        where('userId', '==', this.userId),
        orderBy('date', 'desc'),
        limit(limitCount)
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: this.safeToDate(doc.data().date),
        createdAt: this.safeToDate(doc.data().createdAt)
      })) as TransactionData[]
    } catch (error) {
      console.error('Error fetching transactions:', error)
      return []
    }
  }

  async getFinancialSummary(): Promise<FinancialSummary> {
    const transactions = await this.getTransactions(1000) // Get more for better analytics

    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const netWorth = totalIncome - totalExpense

    // Calculate category totals
    const categoryTotals = new Map<string, { total: number; count: number }>()
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00c49f', '#ffbb28', '#ff8042']

    transactions.forEach(transaction => {
      const category = transaction.category || 'Diğer'
      const current = categoryTotals.get(category) || { total: 0, count: 0 }
      categoryTotals.set(category, {
        total: current.total + Math.abs(transaction.amount),
        count: current.count + 1
      })
    })

    const topCategories: CategoryTotal[] = Array.from(categoryTotals.entries())
      .map(([name, data], index) => ({
        name,
        value: data.total,
        color: colors[index % colors.length],
        count: data.count
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)

    // Calculate monthly trends (last 6 months)
    const monthlyData = new Map<string, { income: number; expense: number }>()
    const now = new Date()
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = date.toLocaleString('tr-TR', { month: 'short' })
      monthlyData.set(monthKey, { income: 0, expense: 0 })
    }

    transactions.forEach(transaction => {
      const monthKey = transaction.date.toLocaleString('tr-TR', { month: 'short' })
      const current = monthlyData.get(monthKey)
      if (current) {
        if (transaction.type === 'income') {
          current.income += transaction.amount
        } else {
          current.expense += Math.abs(transaction.amount)
        }
      }
    })

    const monthlyTrends: MonthlyData[] = Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      income: data.income,
      expense: data.expense,
      net: data.income - data.expense
    }))

    // Find largest transaction
    const largestTransaction = transactions.reduce((largest, current) => {
      if (!largest || Math.abs(current.amount) > Math.abs(largest.amount)) {
        return current
      }
      return largest
    }, null as TransactionData | null)

    // Most frequent category
    const mostFrequentCategory = topCategories.length > 0 ? topCategories[0].name : 'Bilinmiyor'

    // Calculate averages
    const monthsCount = Math.max(1, monthlyTrends.length)
    const averageMonthlyIncome = monthlyTrends.reduce((sum, m) => sum + m.income, 0) / monthsCount
    const averageMonthlyExpense = monthlyTrends.reduce((sum, m) => sum + m.expense, 0) / monthsCount

    return {
      totalIncome,
      totalExpense,
      netWorth,
      averageMonthlyIncome,
      averageMonthlyExpense,
      topCategories,
      monthlyTrends,
      transactionCount: transactions.length,
      largestTransaction,
      mostFrequentCategory
    }
  }

  async getBudgetAnalysis() {
    try {
      const q = query(
        collection(db!, 'budgets'),
        where('userId', '==', this.userId)
      )

      const snapshot = await getDocs(q)
      const budgets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[]

      return budgets.map(budget => ({
        category: budget.category || 'Bilinmiyor',
        budgetAmount: budget.amount || 0,
        spentAmount: budget.spent || 0,
        percentage: budget.amount ? Math.min(100, (budget.spent / budget.amount) * 100) : 0,
        remaining: Math.max(0, (budget.amount || 0) - (budget.spent || 0)),
        status: this.getBudgetStatus(budget.spent || 0, budget.amount || 0)
      }))
    } catch (error) {
      console.error('Error fetching budget analysis:', error)
      return []
    }
  }

  private getBudgetStatus(spent: number, budget: number): 'safe' | 'warning' | 'exceeded' {
    if (!budget) return 'safe'
    const percentage = (spent / budget) * 100
    if (percentage >= 100) return 'exceeded'
    if (percentage >= 80) return 'warning'
    return 'safe'
  }

  async getSpendingPatterns() {
    const transactions = await this.getTransactions(500)
    const expenses = transactions.filter(t => t.type === 'expense')

    // Day of week analysis
    const dayOfWeekSpending = new Array(7).fill(0)
    expenses.forEach(expense => {
      dayOfWeekSpending[expense.date.getDay()] += Math.abs(expense.amount)
    })

    const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
    const weeklyPattern = dayOfWeekSpending.map((amount, index) => ({
      day: dayNames[index],
      amount
    }))

    // Hour of day analysis
    const hourlySpending = new Array(24).fill(0)
    expenses.forEach(expense => {
      hourlySpending[expense.date.getHours()] += Math.abs(expense.amount)
    })

    // Find peak spending times
    const peakHour = hourlySpending.indexOf(Math.max(...hourlySpending))
    const peakDay = weeklyPattern.reduce((max, current) => 
      current.amount > max.amount ? current : max
    )

    return {
      weeklyPattern,
      hourlySpending,
      peakHour,
      peakDay: peakDay.day,
      totalExpenses: expenses.length,
      averageTransactionAmount: expenses.length > 0 
        ? expenses.reduce((sum, e) => sum + Math.abs(e.amount), 0) / expenses.length 
        : 0
    }
  }

  async getFinancialHealth(): Promise<{
    score: number
    factors: Array<{ name: string; value: number; impact: 'positive' | 'negative' | 'neutral' }>
    recommendations: string[]
  }> {
    const summary = await this.getFinancialSummary()
    const budgets = await this.getBudgetAnalysis()
    
    let score = 50 // Base score
    const factors: Array<{ name: string; value: number; impact: 'positive' | 'negative' | 'neutral' }> = []
    const recommendations: string[] = []

    // Income vs Expense ratio
    const incomeExpenseRatio = summary.totalIncome > 0 ? summary.totalExpense / summary.totalIncome : 1
    if (incomeExpenseRatio < 0.7) {
      score += 20
      factors.push({ name: 'Gelir/Gider Oranı', value: incomeExpenseRatio, impact: 'positive' })
    } else if (incomeExpenseRatio > 0.9) {
      score -= 15
      factors.push({ name: 'Gelir/Gider Oranı', value: incomeExpenseRatio, impact: 'negative' })
      recommendations.push('Harcamalarınızı azaltmaya veya gelir kaynaklarınızı artırmaya odaklanın')
    }

    // Budget adherence
    const budgetViolations = budgets.filter(b => b.status === 'exceeded').length
    if (budgetViolations === 0 && budgets.length > 0) {
      score += 15
      factors.push({ name: 'Bütçe Uyumu', value: 100, impact: 'positive' })
    } else if (budgetViolations > budgets.length / 2) {
      score -= 20
      factors.push({ name: 'Bütçe Uyumu', value: budgetViolations, impact: 'negative' })
      recommendations.push('Bütçe limitlerini aşmamaya dikkat edin')
    }

    // Transaction consistency
    if (summary.transactionCount > 50) {
      score += 10
      factors.push({ name: 'Kayıt Tutarlılığı', value: summary.transactionCount, impact: 'positive' })
    } else {
      recommendations.push('Daha düzenli işlem kaydı tutmaya çalışın')
    }

    // Net worth trend
    if (summary.netWorth > 0) {
      score += 15
      factors.push({ name: 'Net Değer', value: summary.netWorth, impact: 'positive' })
    } else {
      score -= 10
      factors.push({ name: 'Net Değer', value: summary.netWorth, impact: 'negative' })
      recommendations.push('Tasarruf yapmaya ve borçlarınızı azaltmaya odaklanın')
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      factors,
      recommendations
    }
  }
}