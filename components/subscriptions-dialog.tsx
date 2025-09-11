"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { 
  CalendarIcon, 
  Trash2, 
  Plus, 
  Settings, 
  Zap, 
  Play, 
  Music, 
  Tv, 
  Smartphone, 
  Wifi, 
  Car, 
  Home, 
  Gamepad2,
  Building,
  DollarSign,
  TrendingUp,
  Clock,
  CreditCard,
  AlertTriangle,
  CheckCircle
} from "lucide-react"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { cn, formatTRY } from "@/lib/utils"
import { auth } from "@/lib/firebase"
import { upsertSubscription, removeSubscription, watchSubscriptions, listCards } from "@/lib/db"
import type { Subscription } from "@/lib/types"

const subscriptionSchema = z.object({
  name: z.string().min(1, "Abonelik adı gerekli."),
  price: z.coerce.number().positive("Fiyat pozitif bir sayı olmalı."),
  nextBillingDate: z.date({ required_error: "Fatura tarihi gerekli." }),
  cancellationReminderDate: z.date().optional(),
})

type SubscriptionFormValues = z.infer<typeof subscriptionSchema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Subscription categories with icons
const subscriptionCategories = {
  entertainment: { 
    label: 'Eğlence', 
    icon: Play, 
    color: 'purple',
    examples: ['Netflix', 'Disney+', 'Amazon Prime', 'YouTube Premium']
  },
  music: { 
    label: 'Müzik', 
    icon: Music, 
    color: 'green',
    examples: ['Spotify', 'Apple Music', 'Fizy', 'Muud']
  },
  technology: { 
    label: 'Teknoloji', 
    icon: Smartphone, 
    color: 'blue',
    examples: ['iCloud', 'Google One', 'Dropbox', 'Adobe']
  },
  utilities: { 
    label: 'Altyapı', 
    icon: Zap, 
    color: 'yellow',
    examples: ['İnternet', 'Elektrik', 'Su', 'Doğalgaz']
  },
  transportation: { 
    label: 'Ulaşım', 
    icon: Car, 
    color: 'orange',
    examples: ['Uber', 'BiTaksi', 'Metro Kart']
  },
  gaming: { 
    label: 'Oyun', 
    icon: Gamepad2, 
    color: 'red',
    examples: ['PlayStation Plus', 'Xbox Game Pass', 'Steam']
  },
  other: { 
    label: 'Diğer', 
    icon: Building, 
    color: 'gray',
    examples: ['Gym', 'Insurance', 'VPN']
  }
}

export function SubscriptionsDialog({ open, onOpenChange }: Props) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [editingSub, setEditingSub] = useState<Subscription | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const userId = auth?.currentUser?.uid || ""
  const [cards, setCards] = useState<{ id: string; name: string; bankName?: string }[]>([])

  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      name: "",
      price: 0,
    },
  })

  useEffect(() => {
    if (!userId || !open) return
    const unsub = watchSubscriptions(userId, setSubscriptions)
    listCards(userId).then(cs => setCards(cs.map(c => ({ 
      id: c.id, 
      name: c.nickname || c.bankName,
      bankName: c.bankName 
    }))))
    return () => unsub?.()
  }, [userId, open])

  useEffect(() => {
    if (editingSub) {
      form.reset({
        name: editingSub.name,
        price: editingSub.price,
        nextBillingDate: new Date(editingSub.nextBillingDate),
        cancellationReminderDate: editingSub.cancellationReminderDate
          ? new Date(editingSub.cancellationReminderDate)
          : undefined,
      })
      setSelectedCategory(editingSub.category || '')
    } else {
      form.reset({ name: "", price: 0, nextBillingDate: new Date() })
      setSelectedCategory('')
    }
  }, [editingSub, form])

  // Calculate subscription analytics
  const subscriptionAnalytics = {
    totalMonthly: subscriptions.reduce((sum, sub) => sum + sub.price, 0),
    totalYearly: subscriptions.reduce((sum, sub) => sum + sub.price * 12, 0),
    avgPerSub: subscriptions.length > 0 ? subscriptions.reduce((sum, sub) => sum + sub.price, 0) / subscriptions.length : 0,
    dueThisWeek: subscriptions.filter(sub => {
      const dueDate = new Date(sub.nextBillingDate)
      const weekFromNow = new Date()
      weekFromNow.setDate(weekFromNow.getDate() + 7)
      return dueDate <= weekFromNow
    }).length
  }

  const onSubmit = async (values: SubscriptionFormValues) => {
    if (!userId) return
    const cardId = (document.getElementById("subscription-card-select") as HTMLSelectElement | null)?.value || undefined
    const payload = {
      ...values,
      nextBillingDate: values.nextBillingDate.toISOString(),
      cancellationReminderDate: values.cancellationReminderDate?.toISOString(),
      category: selectedCategory,
      cardId,
    }
    await upsertSubscription(userId, { id: editingSub?.id, ...payload })
    setEditingSub(null)
    setSelectedCategory('')
    form.reset({ 
      name: "", 
      price: 0, 
      nextBillingDate: new Date(),
      cancellationReminderDate: undefined
    })
  }

  const handleDelete = async (id: string) => {
    if (!userId) return
    if (confirm('Bu aboneliği silmek istediğinizden emin misiniz?')) {
      await removeSubscription(userId, id)
    }
  }

  const quickFillSubscription = (name: string, price: number) => {
    form.setValue('name', name)
    form.setValue('price', price)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Abonelik Yönetimi
          </DialogTitle>
          <DialogDescription>
            Aylık yinelenen aboneliklerinizi yönetin ve harcamalarınızı takip edin.
          </DialogDescription>
        </DialogHeader>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aylık Toplam</p>
                  <p className="text-xl font-bold">{formatTRY(subscriptionAnalytics.totalMonthly)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Yıllık Toplam</p>
                  <p className="text-xl font-bold">{formatTRY(subscriptionAnalytics.totalYearly)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bu Hafta</p>
                  <p className="text-xl font-bold">{subscriptionAnalytics.dueThisWeek}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Building className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Toplam Abonelik</p>
                  <p className="text-xl font-bold">{subscriptions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">
                {editingSub ? "Aboneliği Düzenle" : "Yeni Abonelik Ekle"}
              </h3>
              {editingSub && (
                <Button variant="outline" size="sm" onClick={() => {
                  setEditingSub(null)
                  setSelectedCategory('')
                  form.reset({ 
                    name: "", 
                    price: 0, 
                    nextBillingDate: new Date(),
                    cancellationReminderDate: undefined 
                  })
                }}>
                  İptal
                </Button>
              )}
            </div>

            {/* Category Selection */}
            <div className="space-y-3">
              <Label>Kategori Seçin</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(subscriptionCategories).map(([key, category]) => {
                  const IconComponent = category.icon
                  return (
                    <Button
                      key={key}
                      variant={selectedCategory === key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(key)}
                      className="justify-start h-auto p-3"
                    >
                      <IconComponent className="h-4 w-4 mr-2" />
                      {category.label}
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* Quick Fill Options */}
            {selectedCategory && (
              <div className="space-y-3">
                <Label>Popüler Seçenekler</Label>
                <div className="grid grid-cols-1 gap-2">
                  {subscriptionCategories[selectedCategory as keyof typeof subscriptionCategories].examples.map((example, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      onClick={() => quickFillSubscription(example, 0)}
                      className="justify-start text-left"
                    >
                      {example}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Abonelik Adı</FormLabel>
                      <FormControl>
                        <Input placeholder="örn: Netflix Premium" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Aylık Ücret (₺)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="nextBillingDate"
                  render={({ field }: { field: any }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Sonraki Fatura Tarihi</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd MMMM yyyy", { locale: tr })
                              ) : (
                                <span>Tarih seçin</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cancellationReminderDate"
                  render={({ field }: { field: any }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>İptal Etme Hatırlatıcısı (opsiyonel)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd MMMM yyyy", { locale: tr })
                              ) : (
                                <span>Hatırlatıcı tarihi seçin</span>
                              )}
                              <AlertTriangle className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Bu tarihte aboneliği iptal etmeyi hatırlatacağız
                      </p>
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <Label>Bağlı Kart (opsiyonel)</Label>
                  <select 
                    id="subscription-card-select" 
                    defaultValue={editingSub?.cardId || ""} 
                    className="w-full border rounded-md px-3 py-2 bg-background text-sm"
                  >
                    <option value="">Kart seçme</option>
                    {cards.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <DialogFooter className="gap-2">
                  <Button type="submit" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    {editingSub ? "Güncelle" : "Abonelik Ekle"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>

          {/* List Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Mevcut Abonelikler ({subscriptions.length})</h3>
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {subscriptions.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h4 className="font-semibold mb-2">Henüz abonelik eklenmemiş</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      İlk aboneliğinizi ekleyerek aylık harcamalarınızı takip etmeye başlayın.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                subscriptions.map((sub) => {
                  const category = subscriptionCategories[sub.category as keyof typeof subscriptionCategories] || subscriptionCategories.other
                  const IconComponent = category.icon
                  const nextBilling = new Date(sub.nextBillingDate)
                  const daysUntilBilling = Math.ceil((nextBilling.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  const isOverdue = daysUntilBilling < 0
                  const isDueSoon = daysUntilBilling <= 7 && daysUntilBilling >= 0
                  
                  return (
                    <Card key={sub.id} className={cn(
                      "transition-all hover:shadow-md",
                      isOverdue && "border-red-200 bg-red-50/50",
                      isDueSoon && "border-orange-200 bg-orange-50/50"
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={cn(
                              "p-2 rounded-lg",
                              category.color === 'purple' ? 'bg-purple-500/20' :
                              category.color === 'green' ? 'bg-green-500/20' :
                              category.color === 'blue' ? 'bg-blue-500/20' :
                              category.color === 'yellow' ? 'bg-yellow-500/20' :
                              category.color === 'orange' ? 'bg-orange-500/20' :
                              category.color === 'red' ? 'bg-red-500/20' :
                              'bg-gray-500/20'
                            )}>
                              <IconComponent className={cn(
                                "h-5 w-5",
                                category.color === 'purple' ? 'text-purple-600' :
                                category.color === 'green' ? 'text-green-600' :
                                category.color === 'blue' ? 'text-blue-600' :
                                category.color === 'yellow' ? 'text-yellow-600' :
                                category.color === 'orange' ? 'text-orange-600' :
                                category.color === 'red' ? 'text-red-600' :
                                'text-gray-600'
                              )} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold">{sub.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {category.label}
                                </Badge>
                                {isOverdue && (
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Gecikmiş
                                  </Badge>
                                )}
                                {isDueSoon && !isOverdue && (
                                  <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Yakında
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-2 space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Aylık</span>
                                  <span className="font-semibold">{formatTRY(sub.price)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Sonraki fatura</span>
                                  <span className={cn(
                                    "font-medium",
                                    isOverdue && "text-red-600",
                                    isDueSoon && "text-orange-600"
                                  )}>
                                    {format(nextBilling, "dd MMM yyyy", { locale: tr })}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Yıllık maliyet</span>
                                  <span className="font-medium">{formatTRY(sub.price * 12)}</span>
                                </div>
                                {sub.cancellationReminderDate && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">İptal hatırlatıcısı</span>
                                    <span className="font-medium text-orange-600 flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      {format(new Date(sub.cancellationReminderDate), "dd MMM yyyy", { locale: tr })}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setEditingSub(sub)}
                              className="h-8 px-2"
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              Düzenle
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDelete(sub.id)}
                              className="h-8 px-2 border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Sil
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
