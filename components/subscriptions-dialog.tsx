"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { cn } from "@/lib/utils"
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

export function SubscriptionsDialog({ open, onOpenChange }: Props) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [editingSub, setEditingSub] = useState<Subscription | null>(null)
  const userId = auth?.currentUser?.uid || ""
  const [cards, setCards] = useState<{ id: string; name: string }[]>([])

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
  listCards(userId).then(cs => setCards(cs.map(c => ({ id: c.id, name: c.nickname || c.bankName }))))
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
    } else {
      form.reset({ name: "", price: 0, nextBillingDate: new Date() })
    }
  }, [editingSub, form])

  const onSubmit = async (values: SubscriptionFormValues) => {
    if (!userId) return
    const cardId = (document.getElementById("subscription-card-select") as HTMLSelectElement | null)?.value || undefined
    const payload = {
      ...values,
      nextBillingDate: values.nextBillingDate.toISOString(),
      cancellationReminderDate: values.cancellationReminderDate?.toISOString(),
      cardId,
    }
    await upsertSubscription(userId, { id: editingSub?.id, ...payload })
    setEditingSub(null)
    form.reset({ name: "", price: 0, nextBillingDate: new Date() })
  }

  const handleDelete = async (id: string) => {
    if (!userId) return
    await removeSubscription(userId, id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Abonelikler</DialogTitle>
          <DialogDescription>
            Aylık yinelenen aboneliklerinizi yönetin. Sistem, fatura tarihinde otomatik olarak gider ekleyecektir.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Form Section */}
          <div className="space-y-4">
            <h3 className="font-semibold">{editingSub ? "Aboneliği Düzenle" : "Yeni Abonelik Ekle"}</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Abonelik Adı</FormLabel>
                      <FormControl>
                        <Input placeholder="örn: Netflix" {...field} />
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
                      <FormLabel>Aylık Ücret</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
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
                                format(field.value, "PPP", { locale: tr })
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
                      <FormLabel>İptal Hatırlatma Tarihi (İsteğe bağlı)</FormLabel>
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
                                format(field.value, "PPP", { locale: tr })
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
                <div className="space-y-2">
                  <FormLabel>Bağlı Kart (opsiyonel)</FormLabel>
                  <select id="subscription-card-select" defaultValue={editingSub?.cardId || ""} className="w-full border rounded-md px-3 py-2 bg-background">
                    <option value="">Kart seçme</option>
                    {cards.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <DialogFooter>
                  {editingSub && (
                    <Button type="button" variant="ghost" onClick={() => setEditingSub(null)}>
                      İptal
                    </Button>
                  )}
                  <Button type="submit">{editingSub ? "Güncelle" : "Ekle"}</Button>
                </DialogFooter>
              </form>
            </Form>
          </div>

          {/* List Section */}
          <div className="space-y-4">
            <h3 className="font-semibold">Mevcut Abonelikler</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {subscriptions.length === 0 && (
                <p className="text-sm text-muted-foreground">Henüz abonelik eklenmemiş.</p>
              )}
              {subscriptions.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-2 border rounded-md">
                  <div>
                    <p className="font-medium">{sub.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {sub.price} TL - Sonraki Fatura: {format(new Date(sub.nextBillingDate), "dd MMM yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingSub(sub)}>
                      Düzenle
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDelete(sub.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
