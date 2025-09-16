import { AdminGuard } from "@/components/admin-guard"

export default function AdminLayout({
  children,
}: {
  children: any
}) {
  return (
    <AdminGuard>
      {children}
    </AdminGuard>
  )
}