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
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Bütçe Yönetimi</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Aylık harcama limitlerini takip edin ve kontrol altında tutun</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            Yeni Bütçe
          </Button>
        </div>

        <div className="grid gap-3 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => {
            const percentage = (budget.spent / budget.monthlyLimit) * 100
            const remaining = budget.monthlyLimit - budget.spent
            
            return (
              <Card key={budget.id} className="border-border/50 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6 pt-3 sm:pt-6">
                  <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${budget.color}`} />
                      <span className="text-sm sm:text-base">{budget.category}</span>
                    </div>
                    {getStatusIcon(budget.spent, budget.monthlyLimit)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Harcanan</span>
                      <span className="font-medium">₺{budget.spent.toLocaleString('tr-TR')}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Limit</span>
                      <span className="font-medium">₺{budget.monthlyLimit.toLocaleString('tr-TR')}</span>
                    </div>
                    <Progress 
                      value={Math.min(percentage, 100)} 
                      className="h-1.5 sm:h-2"
                    />
                    <div className="flex justify-between text-[10px] sm:text-xs">
                      <span className="text-muted-foreground">%{percentage.toFixed(1)}</span>
                      <span className={remaining >= 0 ? "text-green-600" : "text-red-600"}>
                        {remaining >= 0 ? "+" : ""}₺{remaining.toLocaleString('tr-TR')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Badge 
                      variant={percentage >= 100 ? "destructive" : percentage >= 80 ? "secondary" : "default"}
                      className="w-full justify-center text-xs"
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
            <CardContent className="flex flex-col items-center justify-center h-full py-8 sm:py-12 px-3 sm:px-6">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-muted flex items-center justify-center mb-3 sm:mb-4">
                <Plus className="h-4 w-4 sm:h-6 sm:w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-2 text-sm sm:text-base">Yeni Bütçe Ekle</h3>
              <p className="text-xs sm:text-sm text-muted-foreground text-center">
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
