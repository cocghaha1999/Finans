'use client'

import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Target, Plus, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react"

export default function BudgetsPage() {
  // Bütçe verileri - gerçek uygulamada Firebase'den gelir
  const budgets: any[] = []

  const getProgressColor = (spent: number, limit: number) => {
    const percentage = (spent / limit) * 100
    if (percentage >= 100) return 'bg-red-500'
    if (percentage >= 80) return 'bg-orange-500'
    return 'bg-green-500'
  }

  const getStatusIcon = (spent: number, limit: number) => {
    const percentage = (spent / limit) * 100
    if (percentage >= 100) return <AlertTriangle className="h-4 w-4 text-red-500" />
    if (percentage >= 80) return <TrendingUp className="h-4 w-4 text-orange-500" />
    return <TrendingDown className="h-4 w-4 text-green-500" />
  }

  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Bütçe Yönetimi</h1>
            <p className="text-muted-foreground">Aylık harcama limitlerini takip edin ve kontrol altında tutun</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Bütçe
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => {
            const percentage = (budget.spent / budget.monthlyLimit) * 100
            const remaining = budget.monthlyLimit - budget.spent
            
            return (
              <Card key={budget.id} className="border-border/50 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${budget.color}`} />
                      {budget.category}
                    </div>
                    {getStatusIcon(budget.spent, budget.monthlyLimit)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Harcanan</span>
                      <span className="font-medium">₺{budget.spent.toLocaleString('tr-TR')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Limit</span>
                      <span className="font-medium">₺{budget.monthlyLimit.toLocaleString('tr-TR')}</span>
                    </div>
                    <Progress 
                      value={Math.min(percentage, 100)} 
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">%{percentage.toFixed(1)}</span>
                      <span className={remaining >= 0 ? "text-green-600" : "text-red-600"}>
                        {remaining >= 0 ? "+" : ""}₺{remaining.toLocaleString('tr-TR')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Badge 
                      variant={percentage >= 100 ? "destructive" : percentage >= 80 ? "secondary" : "default"}
                      className="w-full justify-center"
                    >
                      {percentage >= 100 ? "Limit Aşıldı" : percentage >= 80 ? "Limite Yakın" : "Normal"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          
          {/* Yeni bütçe ekleme kartı */}
          <Card className="border-dashed border-border/50 hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="flex flex-col items-center justify-center h-full py-12">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-2">Yeni Bütçe Ekle</h3>
              <p className="text-sm text-muted-foreground text-center">
                Kategori bazlı harcama limiti belirleyin
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Özet istatistikler */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Toplam Bütçe</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                ₺{budgets.reduce((sum, b) => sum + b.monthlyLimit, 0).toLocaleString('tr-TR')}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium">Toplam Harcama</span>
              </div>
              <p className="text-2xl font-bold mt-2 text-red-600">
                ₺{budgets.reduce((sum, b) => sum + b.spent, 0).toLocaleString('tr-TR')}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">Kalan Bütçe</span>
              </div>
              <p className="text-2xl font-bold mt-2 text-green-600">
                ₺{budgets.reduce((sum, b) => sum + (b.monthlyLimit - b.spent), 0).toLocaleString('tr-TR')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}
