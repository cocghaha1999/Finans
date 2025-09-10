"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth, AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  Edit,
  Trash2,
  Calculator,
  Target,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Car,
  Home,
  Gem,
  Watch,
  Laptop,
  Building,
  Wallet,
} from "lucide-react"
import { formatTRY } from "@/lib/utils"
import { auth } from "@/lib/firebase"
import { useCalendar } from "@/hooks/use-calendar-simple"

interface Investment {
  id: string
  name: string
  symbol: string
  type: 'stock' | 'crypto' | 'bond' | 'fund' | 'gold' | 'foreign_currency'
  quantity: number
  purchasePrice: number
  currentPrice: number
  purchaseDate: string
  description?: string
}

interface Asset {
  id: string
  name: string
  type: 'real_estate' | 'vehicle' | 'jewelry' | 'electronics' | 'other'
  value: number
  purchaseDate: string
  description?: string
}

const investmentTypes = {
  stock: { label: 'Hisse Senedi', icon: TrendingUp, color: 'blue' },
  crypto: { label: 'Kripto Para', icon: Activity, color: 'orange' },
  bond: { label: 'Tahvil', icon: Target, color: 'green' },
  fund: { label: 'Fon', icon: PieChart, color: 'purple' },
  gold: { label: 'Altın', icon: DollarSign, color: 'yellow' },
  foreign_currency: { label: 'Döviz', icon: BarChart3, color: 'teal' }
}

const assetTypes = {
  real_estate: { label: 'Gayrimenkul', icon: Home, color: 'green' },
  vehicle: { label: 'Araç', icon: Car, color: 'blue' },
  jewelry: { label: 'Mücevher', icon: Gem, color: 'purple' },
  electronics: { label: 'Elektronik', icon: Laptop, color: 'orange' },
  other: { label: 'Diğer', icon: Building, color: 'gray' }
}

export default function InvestmentsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { addCalendarEvent } = useCalendar()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isAddAssetDialogOpen, setIsAddAssetDialogOpen] = useState(false)
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [assetSearchTerm, setAssetSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [assetFilterType, setAssetFilterType] = useState<string>("all")
  const [newInvestment, setNewInvestment] = useState({
    name: "",
    symbol: "",
    type: "stock" as Investment['type'],
    quantity: "",
    purchasePrice: "",
    currentPrice: "",
    purchaseDate: new Date().toISOString().split('T')[0],
    description: ""
  })
  const [newAsset, setNewAsset] = useState({
    name: "",
    type: "real_estate" as Asset['type'],
    value: "",
    purchaseDate: new Date().toISOString().split('T')[0],
    description: ""
  })

  // Mock data - Gerçek uygulamada bu veriler Firebase'den gelecek
  useEffect(() => {
    const mockInvestments: Investment[] = []
    setInvestments(mockInvestments)

    const mockAssets: Asset[] = []
    setAssets(mockAssets)
  }, [])

  const filteredInvestments = useMemo(() => {
    return investments.filter(investment => {
      const matchesSearch = investment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           investment.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = filterType === "all" || investment.type === filterType
      return matchesSearch && matchesType
    })
  }, [investments, searchTerm, filterType])

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = asset.name.toLowerCase().includes(assetSearchTerm.toLowerCase())
      const matchesType = assetFilterType === "all" || asset.type === assetFilterType
      return matchesSearch && matchesType
    })
  }, [assets, assetSearchTerm, assetFilterType])

  const portfolioStats = useMemo(() => {
    const totalInvested = investments.reduce((sum, inv) => sum + (inv.quantity * inv.purchasePrice), 0)
    const currentValue = investments.reduce((sum, inv) => sum + (inv.quantity * inv.currentPrice), 0)
    const totalGainLoss = currentValue - totalInvested
    const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0
    
    const totalAssetsValue = assets.reduce((sum, asset) => sum + asset.value, 0)
    const totalNetWorth = currentValue + totalAssetsValue

    return {
      totalInvested,
      currentValue,
      totalGainLoss,
      totalGainLossPercent,
      investmentCount: investments.length,
      totalAssetsValue,
      totalNetWorth,
      assetCount: assets.length
    }
  }, [investments, assets])

  const calculateInvestmentStats = (investment: Investment) => {
    const totalInvested = investment.quantity * investment.purchasePrice
    const currentValue = investment.quantity * investment.currentPrice
    const gainLoss = currentValue - totalInvested
    const gainLossPercent = totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0

    return { totalInvested, currentValue, gainLoss, gainLossPercent }
  }

  const handleAddInvestment = async () => {
    if (!newInvestment.name || !newInvestment.quantity || !newInvestment.purchasePrice || !newInvestment.currentPrice) {
      toast({
        title: "Hata",
        description: "Lütfen zorunlu alanları doldurun.",
        variant: "destructive"
      })
      return
    }

    const investment: Investment = {
      id: crypto.randomUUID(),
      name: newInvestment.name,
      symbol: newInvestment.symbol || newInvestment.name.toUpperCase(),
      type: newInvestment.type,
      quantity: parseFloat(newInvestment.quantity),
      purchasePrice: parseFloat(newInvestment.purchasePrice),
      currentPrice: parseFloat(newInvestment.currentPrice),
      purchaseDate: newInvestment.purchaseDate,
      description: newInvestment.description
    }

    if (editingInvestment) {
      setInvestments(prev => prev.map(inv => inv.id === editingInvestment.id ? { ...investment, id: editingInvestment.id } : inv))
      toast({
        title: "Başarılı",
        description: "Yatırım güncellendi."
      })
    } else {
      setInvestments(prev => [...prev, investment])
      
      // Takvime ekle
      addCalendarEvent({
        date: new Date(investment.purchaseDate),
        type: 'expense',
        description: `${investment.name} yatırımı • ₺${(investment.quantity * investment.purchasePrice).toLocaleString("tr-TR")}`,
        amount: investment.quantity * investment.purchasePrice,
        title: `${investment.name} yatırımı`,
        category: 'Yatırım'
      })
      
      toast({
        title: "Başarılı",
        description: "Yatırım eklendi."
      })
    }

    setIsAddDialogOpen(false)
    setEditingInvestment(null)
    setNewInvestment({
      name: "",
      symbol: "",
      type: "stock",
      quantity: "",
      purchasePrice: "",
      currentPrice: "",
      purchaseDate: new Date().toISOString().split('T')[0],
      description: ""
    })
  }

  const startEditInvestment = (investment: Investment) => {
    setEditingInvestment(investment)
    setNewInvestment({
      name: investment.name,
      symbol: investment.symbol,
      type: investment.type,
      quantity: investment.quantity.toString(),
      purchasePrice: investment.purchasePrice.toString(),
      currentPrice: investment.currentPrice.toString(),
      purchaseDate: investment.purchaseDate,
      description: investment.description || ""
    })
    setIsAddDialogOpen(true)
  }

  const handleDeleteInvestment = async (investmentId: string) => {
    const investment = investments.find(inv => inv.id === investmentId)
    if (!investment) return

    if (confirm(`"${investment.name}" yatırımını silmek istediğinizden emin misiniz?`)) {
      setInvestments(prev => prev.filter(inv => inv.id !== investmentId))
      toast({
        title: "Başarılı",
        description: "Yatırım silindi."
      })
    }
  }

  const handleAddAsset = async () => {
    if (!newAsset.name || !newAsset.value) {
      toast({
        title: "Hata",
        description: "Lütfen zorunlu alanları doldurun.",
        variant: "destructive"
      })
      return
    }

    const asset: Asset = {
      id: crypto.randomUUID(),
      name: newAsset.name,
      type: newAsset.type,
      value: parseFloat(newAsset.value),
      purchaseDate: newAsset.purchaseDate,
      description: newAsset.description
    }

    if (editingAsset) {
      setAssets(prev => prev.map(ast => ast.id === editingAsset.id ? { ...asset, id: editingAsset.id } : ast))
      toast({
        title: "Başarılı",
        description: "Mal varlığı güncellendi."
      })
    } else {
      setAssets(prev => [...prev, asset])
      
      // Takvime ekle
      addCalendarEvent({
        date: new Date(asset.purchaseDate),
        type: 'expense',
        description: `${asset.name} mal varlığı • ₺${asset.value.toLocaleString("tr-TR")}`,
        amount: asset.value,
        title: `${asset.name} mal varlığı`,
        category: 'Mal Varlığı'
      })
      
      toast({
        title: "Başarılı",
        description: "Mal varlığı eklendi."
      })
    }

    setIsAddAssetDialogOpen(false)
    setEditingAsset(null)
    setNewAsset({
      name: "",
      type: "real_estate",
      value: "",
      purchaseDate: new Date().toISOString().split('T')[0],
      description: ""
    })
  }

  const startEditAsset = (asset: Asset) => {
    setEditingAsset(asset)
    setNewAsset({
      name: asset.name,
      type: asset.type,
      value: asset.value.toString(),
      purchaseDate: asset.purchaseDate,
      description: asset.description || ""
    })
    setIsAddAssetDialogOpen(true)
  }

  const handleDeleteAsset = async (assetId: string) => {
    const asset = assets.find(ast => ast.id === assetId)
    if (!asset) return

    if (confirm(`"${asset.name}" mal varlığını silmek istediğinizden emin misiniz?`)) {
      setAssets(prev => prev.filter(ast => ast.id !== assetId))
      toast({
        title: "Başarılı",
        description: "Mal varlığı silindi."
      })
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-primary to-chart-3 text-primary-foreground">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative container mx-auto px-4 py-16">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-primary-foreground bg-clip-text text-transparent">
                Portföyüm & Mal Varlığım
              </h1>
              <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
                Yatırım portföyünüzü ve mal varlığınızı takip edin, net değerinizi analiz edin
              </p>
            </div>
          </div>
        </div>

        <main className="container mx-auto px-1 sm:px-4 py-2 sm:py-8 space-y-4 sm:space-y-8 max-w-full overflow-hidden">
          {/* Portfolio Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-1 sm:gap-3 lg:gap-6 overflow-x-hidden">
            <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Yatırım</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatTRY(portfolioStats.totalInvested)}</div>
                <p className="text-xs text-muted-foreground mt-1">{portfolioStats.investmentCount} yatırım</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-chart-3/20 to-chart-3/5 border-chart-3/30 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Güncel Değer</CardTitle>
                <BarChart3 className="h-4 w-4 text-chart-3" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatTRY(portfolioStats.currentValue)}</div>
                <p className="text-xs text-muted-foreground mt-1">Portföy değeri</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/30 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mal Varlığım</CardTitle>
                <Wallet className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatTRY(portfolioStats.totalAssetsValue)}</div>
                <p className="text-xs text-muted-foreground mt-1">{portfolioStats.assetCount} mal varlığı</p>
              </CardContent>
            </Card>

            <Card className={`bg-gradient-to-br ${portfolioStats.totalGainLoss >= 0 ? 'from-green-500/20 to-green-500/5 border-green-500/30' : 'from-red-500/20 to-red-500/5 border-red-500/30'} hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Kar/Zarar</CardTitle>
                {portfolioStats.totalGainLoss >= 0 ? 
                  <ArrowUpRight className="h-4 w-4 text-green-600" /> :
                  <ArrowDownRight className="h-4 w-4 text-red-600" />
                }
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${portfolioStats.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {portfolioStats.totalGainLoss >= 0 ? '+' : ''}{formatTRY(portfolioStats.totalGainLoss)}
                </div>
                <p className={`text-xs mt-1 ${portfolioStats.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {portfolioStats.totalGainLoss >= 0 ? '+' : ''}{portfolioStats.totalGainLossPercent.toFixed(2)}%
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/30 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Değerim</CardTitle>
                <Target className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatTRY(portfolioStats.totalNetWorth)}</div>
                <p className="text-xs text-muted-foreground mt-1">Toplam değer</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="investments" className="w-full">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
              <TabsList className="grid w-full sm:w-auto grid-cols-2">
                <TabsTrigger value="investments" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Yatırımlarım ({filteredInvestments.length})
                </TabsTrigger>
                <TabsTrigger value="assets" className="flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Mal Varlığım ({filteredAssets.length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Investments Tab */}
            <TabsContent value="investments">
              <div className="space-y-4">
                {/* Investment Controls */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <div className="flex-1 max-w-md space-y-2">
                    <Input
                      placeholder="Yatırım ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Tür filtrele" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tüm Yatırımlar</SelectItem>
                        {Object.entries(investmentTypes).map(([key, type]) => (
                          <SelectItem key={key} value={key}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Yeni Yatırım
                      </Button>
                    </DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingInvestment ? 'Yatırım Düzenle' : 'Yeni Yatırım Ekle'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingInvestment 
                      ? 'Yatırım bilgilerini düzenleyin.'
                      : 'Portföyünüze yeni bir yatırım ekleyin.'
                    }
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Yatırım Adı</Label>
                    <Input
                      id="name"
                      value={newInvestment.name}
                      onChange={(e) => setNewInvestment(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="örn. Türkiye İş Bankası"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="symbol">Sembol (Opsiyonel)</Label>
                    <Input
                      id="symbol"
                      value={newInvestment.symbol}
                      onChange={(e) => setNewInvestment(prev => ({ ...prev, symbol: e.target.value }))}
                      placeholder="örn. ISCTR"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="type">Yatırım Türü</Label>
                    <Select value={newInvestment.type} onValueChange={(value: Investment['type']) => setNewInvestment(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tür seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(investmentTypes).map(([key, type]) => (
                          <SelectItem key={key} value={key}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="quantity">Miktar</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.000001"
                      value={newInvestment.quantity}
                      onChange={(e) => setNewInvestment(prev => ({ ...prev, quantity: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="purchasePrice">Alış Fiyatı (₺)</Label>
                    <Input
                      id="purchasePrice"
                      type="number"
                      step="0.01"
                      value={newInvestment.purchasePrice}
                      onChange={(e) => setNewInvestment(prev => ({ ...prev, purchasePrice: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="currentPrice">Güncel Fiyat (₺)</Label>
                    <Input
                      id="currentPrice"
                      type="number"
                      step="0.01"
                      value={newInvestment.currentPrice}
                      onChange={(e) => setNewInvestment(prev => ({ ...prev, currentPrice: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="purchaseDate">Alış Tarihi</Label>
                    <Input
                      id="purchaseDate"
                      type="date"
                      value={newInvestment.purchaseDate}
                      onChange={(e) => setNewInvestment(prev => ({ ...prev, purchaseDate: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Açıklama (Opsiyonel)</Label>
                    <Input
                      id="description"
                      value={newInvestment.description}
                      onChange={(e) => setNewInvestment(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Yatırım notları..."
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleAddInvestment} className="flex-1">
                    {editingInvestment ? 'Güncelle' : 'Ekle'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsAddDialogOpen(false)
                      setEditingInvestment(null)
                      setNewInvestment({
                        name: "",
                        symbol: "",
                        type: "stock",
                        quantity: "",
                        purchasePrice: "",
                        currentPrice: "",
                        purchaseDate: new Date().toISOString().split('T')[0],
                        description: ""
                      })
                    }}
                  >
                    İptal
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Investments List */}
          <Card>
            <CardHeader>
              <CardTitle>Yatırım Portföyü</CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6 max-w-full overflow-hidden">
              {filteredInvestments.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <PieChart className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm sm:text-base">
                    {searchTerm || filterType !== "all"
                      ? 'Filtrelere uygun yatırım bulunamadı'
                      : 'Henüz yatırım eklenmemiş'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-4 overflow-x-hidden">
                  {filteredInvestments.map((investment) => {
                    const typeInfo = investmentTypes[investment.type]
                    const IconComponent = typeInfo.icon
                    const stats = calculateInvestmentStats(investment)
                    
                    return (
                      <div 
                        key={investment.id}
                        className="p-2 sm:p-4 border rounded-lg transition-all hover:shadow-md max-w-full overflow-hidden"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                              typeInfo.color === 'blue' ? 'bg-primary/20' :
                              typeInfo.color === 'orange' ? 'bg-orange-500/20' :
                              typeInfo.color === 'green' ? 'bg-green-500/20' :
                              typeInfo.color === 'purple' ? 'bg-purple-500/20' :
                              typeInfo.color === 'yellow' ? 'bg-yellow-500/20' :
                              typeInfo.color === 'teal' ? 'bg-teal-500/20' :
                              'bg-muted'
                            }`}>
                              <IconComponent className={`w-4 h-4 sm:w-5 sm:h-5 ${
                                typeInfo.color === 'blue' ? 'text-primary' :
                                typeInfo.color === 'orange' ? 'text-orange-600' :
                                typeInfo.color === 'green' ? 'text-green-600' :
                                typeInfo.color === 'purple' ? 'text-purple-600' :
                                typeInfo.color === 'yellow' ? 'text-yellow-600' :
                                typeInfo.color === 'teal' ? 'text-teal-600' :
                                'text-muted-foreground'
                              }`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium text-sm sm:text-base truncate">{investment.name}</h3>
                              <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                                <span className="truncate">{investment.symbol}</span>
                                <Badge variant="outline" className="text-xs">
                                  {typeInfo.label}
                                </Badge>
                                <span>{investment.quantity} adet</span>
                              </div>
                              {investment.description && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">{investment.description}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right space-y-1 flex-shrink-0">
                            <div className="font-semibold text-sm sm:text-base">{formatTRY(stats.currentValue)}</div>
                            <div className="text-xs sm:text-sm text-muted-foreground">
                              Alış: {formatTRY(stats.totalInvested)}
                            </div>
                            <div className={`text-xs sm:text-sm font-medium ${stats.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {stats.gainLoss >= 0 ? '+' : ''}{formatTRY(stats.gainLoss)} ({stats.gainLoss >= 0 ? '+' : ''}{stats.gainLossPercent.toFixed(2)}%)
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Güncel: {formatTRY(investment.currentPrice)} / {investment.purchaseDate}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 sm:gap-2 sm:ml-4 mt-2 sm:mt-0">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-xs sm:h-8 sm:px-2"
                              onClick={() => startEditInvestment(investment)}
                            >
                              <Edit className="w-3 h-3 sm:mr-1" />
                              <span className="hidden sm:inline">Düzenle</span>
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-xs sm:h-8 sm:px-2 border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteInvestment(investment.id)}
                            >
                              <Trash2 className="w-3 h-3 sm:mr-1" />
                              <span className="hidden sm:inline">Sil</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets">
          <div className="space-y-4">
            {/* Asset Controls */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="flex-1 max-w-md space-y-2">
                <Input
                  placeholder="Mal varlığı ara..."
                  value={assetSearchTerm}
                  onChange={(e) => setAssetSearchTerm(e.target.value)}
                  className="w-full"
                />
                <Select value={assetFilterType} onValueChange={setAssetFilterType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tür filtrele" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Mal Varlıkları</SelectItem>
                    {Object.entries(assetTypes).map(([key, type]) => (
                      <SelectItem key={key} value={key}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Dialog open={isAddAssetDialogOpen} onOpenChange={setIsAddAssetDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Mal Varlığı
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingAsset ? 'Mal Varlığı Düzenle' : 'Yeni Mal Varlığı Ekle'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingAsset 
                        ? 'Mal varlığı bilgilerini düzenleyin.'
                        : 'Portföyünüze yeni bir mal varlığı ekleyin.'
                      }
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="assetName">Mal Varlığı Adı</Label>
                      <Input
                        id="assetName"
                        value={newAsset.name}
                        onChange={(e) => setNewAsset(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="örn. Mercedes C180"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="assetType">Mal Varlığı Türü</Label>
                      <Select value={newAsset.type} onValueChange={(value: Asset['type']) => setNewAsset(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Tür seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(assetTypes).map(([key, type]) => (
                            <SelectItem key={key} value={key}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="assetValue">Değer (₺)</Label>
                      <Input
                        id="assetValue"
                        type="number"
                        step="0.01"
                        value={newAsset.value}
                        onChange={(e) => setNewAsset(prev => ({ ...prev, value: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="assetPurchaseDate">Alış Tarihi</Label>
                      <Input
                        id="assetPurchaseDate"
                        type="date"
                        value={newAsset.purchaseDate}
                        onChange={(e) => setNewAsset(prev => ({ ...prev, purchaseDate: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="assetDescription">Açıklama (Opsiyonel)</Label>
                      <Input
                        id="assetDescription"
                        value={newAsset.description}
                        onChange={(e) => setNewAsset(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Mal varlığı detayları..."
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleAddAsset} className="flex-1">
                      {editingAsset ? 'Güncelle' : 'Ekle'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsAddAssetDialogOpen(false)
                        setEditingAsset(null)
                        setNewAsset({
                          name: "",
                          type: "real_estate",
                          value: "",
                          purchaseDate: new Date().toISOString().split('T')[0],
                          description: ""
                        })
                      }}
                    >
                      İptal
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Assets List */}
            <Card>
              <CardHeader>
                <CardTitle>Mal Varlığım</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredAssets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>
                      {assetSearchTerm || assetFilterType !== "all"
                        ? 'Filtrelere uygun mal varlığı bulunamadı'
                        : 'Henüz mal varlığı eklenmemiş'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredAssets.map((asset) => {
                      const typeInfo = assetTypes[asset.type]
                      const IconComponent = typeInfo.icon
                      
                      return (
                        <div 
                          key={asset.id}
                          className="p-4 border rounded-lg transition-all hover:shadow-md"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                typeInfo.color === 'blue' ? 'bg-primary/20' :
                                typeInfo.color === 'green' ? 'bg-green-500/20' :
                                typeInfo.color === 'purple' ? 'bg-purple-500/20' :
                                typeInfo.color === 'orange' ? 'bg-orange-500/20' :
                                typeInfo.color === 'gray' ? 'bg-gray-500/20' :
                                'bg-muted'
                              }`}>
                                <IconComponent className={`w-5 h-5 ${
                                  typeInfo.color === 'blue' ? 'text-primary' :
                                  typeInfo.color === 'green' ? 'text-green-600' :
                                  typeInfo.color === 'purple' ? 'text-purple-600' :
                                  typeInfo.color === 'orange' ? 'text-orange-600' :
                                  typeInfo.color === 'gray' ? 'text-gray-600' :
                                  'text-muted-foreground'
                                }`} />
                              </div>
                              <div>
                                <h3 className="font-medium">{asset.name}</h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Badge variant="outline" className="text-xs">
                                    {typeInfo.label}
                                  </Badge>
                                  <span>{asset.purchaseDate}</span>
                                </div>
                                {asset.description && (
                                  <p className="text-xs text-muted-foreground mt-1">{asset.description}</p>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-right space-y-1">
                              <div className="font-semibold text-lg">{formatTRY(asset.value)}</div>
                              <div className="text-xs text-muted-foreground">
                                Güncel değer
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={() => startEditAsset(asset)}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Düzenle
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteAsset(asset.id)}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Sil
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      </main>
      </div>
    </AuthGuard>
  )
}
