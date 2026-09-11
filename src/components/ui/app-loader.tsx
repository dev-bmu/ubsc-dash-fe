import React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface AppLoaderProps {
  /**
   * Ukuran logo dan teks.
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Teks yang akan ditampilkan di bawah logo.
   */
  text?: string
  /**
   * ClassName tambahan untuk kustomisasi.
   */
  className?: string
}

export const AppLoader = ({ size = 'md', text, className }: AppLoaderProps) => {
  const sizeClasses = {
    sm: { container: 'gap-2', logo: 40, text: 'text-xs' },
    md: { container: 'gap-3', logo: 60, text: 'text-sm' },
    lg: { container: 'gap-4', logo: 80, text: 'text-base' }
  }

  const selectedSize = sizeClasses[size]

  return (
    <div className={cn('flex flex-col items-center justify-center', selectedSize.container, className)}>
      <div className="animate-spin">
        <Image src="/img/SidebarLogosWhite.svg" alt="Loading Logo" width={selectedSize.logo} height={selectedSize.logo} />
      </div>
      {text && <p className={cn('text-muted-foreground', selectedSize.text)}>{text}</p>}
    </div>
  )
}
