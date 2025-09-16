import UserDetailClient from '@/components/admin/user-detail-client'

export const dynamic = 'force-static'

export default function UserDetailStaticPage({ searchParams }: { searchParams: { userId?: string } }) {
  const userId = searchParams?.userId || ''
  return <UserDetailClient userId={userId} />
}
