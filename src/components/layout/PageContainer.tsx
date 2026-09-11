import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { Navbar } from '@/components/layout/Navbar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import React, { ReactNode } from 'react'

interface PageContainerProps {
  children?: ReactNode
  title?: string
}

export const PageContainer: React.FC<PageContainerProps> = ({ children, title }) => {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <Navbar title={title} />
        <div className="flex-1 overflow-x-hidden p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
