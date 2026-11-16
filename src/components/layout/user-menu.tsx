import { useRouter } from '@tanstack/react-router'
import { ChevronsUpDownIcon, LogOutIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { SidebarMenuButton } from '#/components/ui/sidebar'
import { signOut } from '#/server/auth'

export function UserMenu({ email }: { email: string }) {
  const router = useRouter()

  async function onSignOut() {
    await signOut()
    await router.invalidate()
    await router.navigate({ to: '/login', search: { redirect: '/budget' } })
    toast.success('Signed out')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton size="lg" tooltip={email}>
          <span className="truncate text-sm">{email}</span>
          <ChevronsUpDownIcon className="ml-auto" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void onSignOut()}>
          <LogOutIcon /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
