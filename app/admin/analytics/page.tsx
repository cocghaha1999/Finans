"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts"
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  CreditCard, 
  Activity,
  Calendar,
  Download,
  Filter,
  Eye,
  BarChart3
} from "lucide-react"

// Mock veriler - gerçek projede API'den gelecek
const monthlyData = [
  { month: "Oca", users: 65, transactions: 1200, revenue: 45000, expenses: 32000 },
  { month: "Şub", users: 78, transactions: 1450, revenue: 52000, expenses: 38000 },
  { month: "Mar", users: 92, transactions: 1680, revenue: 58000, expenses: 41000 },
  { month: "Nis", users: 105, transactions: 1920, revenue: 67000, expenses: 45000 },
  { month: "May", users: 118, transactions: 2150, revenue: 74000, expenses: 48000 },
  { month: "Haz", users: 135, transactions: 2380, revenue: 82000, expenses: 52000 }
]

const categoryData = [
  { name: "Gıda", value: 35, color: "#0088FE" },
  { name: "Ulaşım", value: 25, color: "#00C49F" },
  { name: "Eğlence", value: 20, color: "#FFBB28" },
  { name: "Sağlık", value: 15, color: "#FF8042" },
  { name: "Diğer", value: 5, color: "#8884D8" }
]

const recentTransactions = [
  { id: 1, user: "John Doe", amount: 1250, type: "gider", category: "Gıda", date: "2024-03-10" },
  { id: 2, user: "Jane Smith", amount: 3500, type: "gelir", category: "Maaş", date: "2024-03-10" },
  { id: 3, user: "Mike Johnson", amount: 850, type: "gider", category: "Ulaşım", date: "2024-03-09" },
  { id: 4, user: "Sarah Wilson", amount: 2200, type: "gider", category: "Alışveriş", date: "2024-03-09" },
  { id: 5, user: "Alex Brown", amount: 1750, type: "gelir", category: "Freelance", date: "2024-03-08" }
]

const userGrowthData = [
  { month: "Oca", yeni: 45, aktif: 320, toplam: 1100 },
  { month: "Şub", yeni: 52, aktif: 380, toplam: 1152 },
  { month: "Mar", yeni: 48, aktif: 425, toplam: 1200 },
  { month: "Nis", yeni: 61, aktif: 470, toplam: 1261 },
  { month: "May", yeni: 55, aktif: 510, toplam: 1316 },
  { month: "Haz", yeni: 68, aktif: 585, toplam: 1384 }
]

export default function AnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("6months")
  const [activeTab, setActiveTab] = useState("overview")

  // Toplam istatistikler
  const totalStats = {
    totalRevenue: monthlyData.reduce((acc, curr) => acc + curr.revenue, 0),
    totalExpenses: monthlyData.reduce((acc, curr) => acc + curr.expenses, 0),
    totalTransactions: monthlyData.reduce((acc, curr) => acc + curr.transactions, 0),
    totalUsers: userGrowthData[userGrowthData.length - 1].toplam,
    avgTransactionValue: monthlyData.reduce((acc, curr) => acc + curr.revenue, 0) / monthlyData.reduce((acc, curr) => acc + curr.transactions, 0)
  }

  const growthRate = {
    revenue: ((monthlyData[monthlyData.length - 1].revenue - monthlyData[0].revenue) / monthlyData[0].revenue * 100).toFixed(1),
    users: ((userGrowthData[userGrowthData.length - 1].toplam - userGrowthData[0].toplam) / userGrowthData[0].toplam * 100).toFixed(1),
    transactions: ((monthlyData[monthlyData.length - 1].transactions - monthlyData[0].transactions) / monthlyData[0].transactions * 100).toFixed(1)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analitik Dashboard</h1>
          <p className="text-muted-foreground">
            Detaylı istatistikler ve finans analizi
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Son 1 Ay</SelectItem>
              <SelectItem value="3months">Son 3 Ay</SelectItem>
              <SelectItem value="6months">Son 6 Ay</SelectItem>
              <SelectItem value="1year">Son 1 Yıl</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Rapor İndir
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Gelir</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₺{totalStats.totalRevenue.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +{growthRate.revenue}% bu dönem
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam İşlem</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalTransactions.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +{growthRate.transactions}% bu dönem
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Kullanıcı</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalUsers.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +{growthRate.users}% bu dönem
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ortalama İşlem</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₺{Math.round(totalStats.avgTransactionValue).toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span>İşlem başına</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="financial">Finansal</TabsTrigger>
          <TabsTrigger value="users">Kullanıcılar</TabsTrigger>
          <TabsTrigger value="transactions">İşlemler</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Gelir Trendi</CardTitle>
                <CardDescription>Son 6 aylık gelir ve gider analizi</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any) => [`₺${Number(value).toLocaleString()}`, '']}
                      labelFormatter={(label: any) => `Ay: ${label}`}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" stackId="1" stroke="#0088FE" fill="#0088FE" fillOpacity={0.6} name="Gelir" />
                    <Area type="monotone" dataKey="expenses" stackId="2" stroke="#FF8042" fill="#FF8042" fillOpacity={0.6} name="Gider" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Kategori Dağılımı</CardTitle>
                <CardDescription>Harcama kategorilerine göre dağılım</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) => `${name} %${(percent * 100).toFixed(0)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            {/* Financial Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Finansal Performans</CardTitle>
                <CardDescription>Aylık gelir, gider ve net kâr analizi</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any) => [`₺${Number(value).toLocaleString()}`, '']}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="#0088FE" name="Gelir" />
                    <Bar dataKey="expenses" fill="#FF8042" name="Gider" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent High-Value Transactions */}
            <Card>
              <CardHeader>
                <CardTitle>Son Büyük İşlemler</CardTitle>
                <CardDescription>Yüksek tutarlı son işlemler</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${transaction.type === 'gelir' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div>
                          <div className="font-medium">{transaction.user}</div>
                          <div className="text-sm text-muted-foreground">{transaction.category}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${transaction.type === 'gelir' ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.type === 'gelir' ? '+' : '-'}₺{transaction.amount.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">{transaction.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Kullanıcı Büyümesi</CardTitle>
              <CardDescription>Aylık kullanıcı artışı ve aktivite</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="yeni" stroke="#0088FE" strokeWidth={2} name="Yeni Kullanıcı" />
                  <Line type="monotone" dataKey="aktif" stroke="#00C49F" strokeWidth={2} name="Aktif Kullanıcı" />
                  <Line type="monotone" dataKey="toplam" stroke="#FF8042" strokeWidth={2} name="Toplam Kullanıcı" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>İşlem Hacmi</CardTitle>
              <CardDescription>Aylık işlem sayısı ve hacmi</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any, name: any) => [
                      name === 'transactions' ? `${Number(value).toLocaleString()} işlem` : `₺${Number(value).toLocaleString()}`,
                      name === 'transactions' ? 'İşlem Sayısı' : 'İşlem Hacmi'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="transactions" fill="#0088FE" name="İşlem Sayısı" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}