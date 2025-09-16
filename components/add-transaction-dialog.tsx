"use client"

import { useState } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { toast } from "@/components/ui/use-toast"

export type TransactionType = "gelir" | "gider"

import { Transaction } from "@/lib/types"

const schema = z.object({
  type: z.enum(["gelir", "gider"], { required_error: "Tür seçin" }),
  amount: z
    .string()
    .min(1, "Tutar zorunlu")
    .refine((v) => !Number.isNaN(Number(v.replace(",", "."))) && Number(v.replace(",", ".")) > 0, "Geçerli bir tutar girin"),
  description: z.string().min(2, "En az 2 karakter"),
  category: z.string().min(1, "Kategori zorunlu"),
  date: z.string().min(1, "Tarih zorunlu"),
  recur: z.boolean().optional(),
})

const INCOME_CATEGORIES = ["Maaş", "Serbest", "Yatırım", "Diğer"] as const
const EXPENSE_CATEGORIES = ["Yemek", "Ulaşım", "Fatura", "Eğlence", "Sağlık", "Diğer"] as const

export function AddTransactionDialog({
  open,
  onOpenChange,
  onAdd,
  onUpdate,
  editing,
  defaultType = "gelir",
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onAdd: (t: Transaction) => void
  onUpdate?: (t: Transaction) => void
  editing?: Transaction | null
  defaultType?: TransactionType
}) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: editing
      ? {
          type: editing.type,
          amount: String(editing.amount || ""),
          description: editing.description || "",
          category: editing.category || "",
          date: editing.date || "",
          recur: false, // Ensure recur has a default value in edit mode
        }
    : {
          type: defaultType,
          amount: "",
          description: "",
          category: defaultType === "gelir" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0],
          date: new Date().toISOString().slice(0, 10),
      recur: false,
        },
  })

  // Update category list when type changes
  const typeWatch = form.watch("type")
  const categories = typeWatch === "gelir" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const submit = (values: z.infer<typeof schema>) => {
    console.log("Submit values:", values) // Debug log
    const amount = Number(values.amount.replace(",", "."))
    const txn: Transaction = {
      id: editing?.id ?? crypto.randomUUID(),
      type: values.type,
      amount,
      description: values.description.trim(),
      category: values.category,
      date: values.date,
    }
    if (editing && onUpdate) {
      onUpdate(txn)
      toast({ title: "İşlem güncellendi", description: "Değişiklikler kaydedildi." })
    } else {
      // Gelir için tekrar seçildiyse metadata olarak işaret gönder
      const anyTxn: any = { ...txn }
      if (values.type === "gelir" && values.recur) {
        console.log("Adding recurring income flag") // Debug log
        anyTxn.__recurMonthly = true
      }
      onAdd(anyTxn)
      toast({ title: "İşlem eklendi", description: `${values.type === "gelir" ? "Gelir" : "Gider"} başarıyla kaydedildi.` })
    }
    onOpenChange(false)
    form.reset({
      type: defaultType,
      amount: "",
      description: "",
      category: defaultType === "gelir" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0],
  date: new Date().toISOString().slice(0, 10),
  recur: false,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "İşlemi Düzenle" : "Yeni İşlem"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tür</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Tür" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="gelir">Gelir</SelectItem>
                      <SelectItem value="gider">Gider</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tutar (₺)</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tarih</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Kategori" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>{typeWatch === "gelir" ? "Gelir kategorisi" : "Gider kategorisi"}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Açıklama</FormLabel>
                  <FormControl>
                    <Input placeholder="Açıklama" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Aylık tekrar (sadece gelir için) */}
            {typeWatch === "gelir" && (
              <div className="flex items-center justify-between border rounded-md px-3 py-2">
                <div>
                  <div className="text-sm font-medium">Aylık tekrar</div>
                  <div className="text-xs text-muted-foreground">Her ay aynı gün otomatik gelir ekle</div>
                </div>
                <FormField
                  control={form.control}
                  name="recur"
                  render={({ field }) => (
                    <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                İptal
              </Button>
              <Button type="submit">Kaydet</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
