import './globals.css'
import { Toaster } from "@/components/ui/sonner"

export const metadata = {
  title: 'Civic Reporter - Report Civic Issues',
  description: 'Crowdsourced civic issue reporting platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="min-h-screen bg-background">
        {children}
        <Toaster />
      </body>
    </html>
  )
}