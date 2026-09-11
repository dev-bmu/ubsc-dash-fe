'use client'

import React from 'react'
import Image from 'next/image'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

//================================================================================
// 1. Komponen AppLoader (Diletakkan di sini untuk kelengkapan)
//================================================================================
interface AppLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

/**
 * Komponen loader terpusat dengan animasi putar dan teks opsional.
 */
const AppLoader = ({ size = 'md', text, className }: AppLoaderProps) => {
  const sizeClasses = {
    sm: { container: 'gap-2', logo: 40, text: 'text-xs' },
    md: { container: 'gap-3', logo: 60, text: 'text-sm' },
    lg: { container: 'gap-4', logo: 80, text: 'text-base' }
  }
  const selectedSize = sizeClasses[size]

  return (
    <div className={cn('flex flex-col items-center justify-center', selectedSize.container, className)}>
      <div className="animate-spin">
        {/* Pastikan path logo Anda benar */}
        <Image src="/img/SidebarLogosWhite.svg" alt="Loading Logo" width={selectedSize.logo} height={selectedSize.logo} />
      </div>
      {text && <p className={cn('mt-4 text-muted-foreground', selectedSize.text)}>{text}</p>}
    </div>
  )
}

//================================================================================
// 2. Komponen DynamicSkeleton (Diperbarui dengan varian baru)
//================================================================================
interface DynamicSkeletonProps {
  /**
   * Tipe skeleton yang akan ditampilkan.
   * 'pageForm': Untuk form di halaman utama.
   * 'table': Untuk placeholder data tabel.
   * 'dialogForm': Untuk form di dalam modal/dialog.
   * 'fullPageLoader': Untuk loading satu halaman penuh (digunakan di AuthGuard).
   */
  variant: 'pageForm' | 'table' | 'dialogForm' | 'fullPageLoader'
  itemCount?: number
  className?: string
  titleWidth?: string
  /**
   * Teks yang akan ditampilkan pada variant 'fullPageLoader'.
   */
  loaderText?: string
}

/**
 * Komponen global untuk menampilkan berbagai jenis skeleton loading.
 */
export const DynamicSkeleton = ({ variant, itemCount = 5, className, titleWidth = 'w-1/3', loaderText }: DynamicSkeletonProps) => {
  const renderSkeleton = () => {
    switch (variant) {
      // --- VARIAN BARU UNTUK LOADING HALAMAN PENUH ---
      case 'fullPageLoader':
        return (
          <div className={cn('fixed inset-0 z-50 flex items-center justify-center bg-background', className)}>
            <AppLoader size="lg" text={loaderText} />
          </div>
        )

      // --- SKELETON UNTUK FORM DI HALAMAN UTAMA ---
      case 'pageForm':
        return (
          <div className={cn('mx-auto w-full max-w-3xl space-y-4 rounded-lg border p-4', className)}>
            <Skeleton className={cn('h-10', titleWidth)} />
            <div className="grid grid-cols-1 gap-6 pt-4 md:grid-cols-2">
              {Array.from({ length: itemCount }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-1/4" /> {/* Label skeleton */}
                  <Skeleton className="h-10 w-full" /> {/* Input skeleton */}
                </div>
              ))}
            </div>
          </div>
        )

      // --- SKELETON UNTUK TABEL ---
      case 'table':
        return (
          <div className={cn('w-full space-y-4 rounded-lg border p-4', className)}>
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-1/2 md:w-1/3" />
              <Skeleton className="h-10 w-28" />
            </div>
            <div className="space-y-3 pt-2">
              {Array.from({ length: itemCount }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          </div>
        )

      // --- SKELETON UNTUK FORM DI DIALOG/MODAL ---
      case 'dialogForm':
        return (
          <div className={cn('w-full space-y-6', className)}>
            <div className="space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="space-y-4 pt-2">
              {Array.from({ length: itemCount }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return renderSkeleton()
}
