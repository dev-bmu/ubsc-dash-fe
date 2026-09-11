'use client'

import Image from 'next/image'
import { Suspense } from 'react'
import { LoginForm } from '../components/forms/LoginForm'

export default function LoginPage() {
  return (
    <div className="relative grid min-h-svh lg:grid-cols-2">
      <div className="absolute top-4 right-0 z-10 hidden lg:block">
        <div className="hidden items-center rounded-l-4xl bg-white/80 p-4 font-medium backdrop-blur-sm lg:flex">
          <Image src="/img/LoginLogos.svg" width={150} height={150} alt="Logo BMU" />
        </div>
      </div>

      <div className="relative flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>

      <div className="relative hidden bg-muted lg:block">
        <Image
          width={1000}
          height={1000}
          src="/img/LoginImage2.jpg"
          alt="Brawijaya Multi Usaha"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.7]"
          priority
        />
      </div>
    </div>
  )
}
