'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

import { routes } from '@/config/routes'
import { cn } from '@/lib/utils'
import { setAccessToken } from '@/lib/axios'
import { useLogin } from '@/hooks/api/useAuth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { LoginValidation, type LoginFormValues } from '../validation/LoginValidation'

export function LoginForm({ className, ...props }: React.ComponentProps<'form'>) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl')
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginValidation),
    defaultValues: { email: '', password: '' }
  })

  const { mutateAsync: loginUser, isPending, error } = useLogin()

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const data = await loginUser(values)
      setAccessToken(data.accessToken)
      toast.success('Login berhasil!')

      // returnUrl hanya diterima jika path internal — cegah open redirect.
      const target = returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : routes.dashboard()
      // returnUrl baru diketahui saat runtime, jadi mustahil dipersempit ke union typedRoutes.
      // Tipe tujuan diambil dari parameter router.replace itu sendiri — bukan `Route` dari 'next',
      // yang baru ada setelah .next/types ditulis dan akan menggagalkan tsc di clone yang bersih.
      router.replace(target as Parameters<typeof router.replace>[0])
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login gagal, silakan coba lagi.')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn('flex flex-col gap-6', className)} {...props}>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Login ke Akun</h1>
          <p className="text-sm text-balance text-muted-foreground">Masukkan email dan password Anda</p>
        </div>

        <div className="grid gap-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="grid gap-3">
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="nama@bmu.id" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="grid gap-3">
                <div className="flex items-center">
                  <FormLabel>Password</FormLabel>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button type="button" className="ml-auto text-sm underline-offset-4 hover:underline">
                        Lupa password?
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Lupa Password</DialogTitle>
                        <DialogDescription>
                          Jika Anda lupa password, silakan menghubungi administrator <strong>BMU</strong> untuk reset akun.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <p>Brawijaya Multi Usaha</p>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <FormControl>
                  <div className="relative">
                    <Input type={showPassword ? 'text' : 'password'} autoComplete="current-password" {...field} />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {error && <p className="text-sm font-medium text-destructive">{error.message}</p>}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Memproses...' : 'Login'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
