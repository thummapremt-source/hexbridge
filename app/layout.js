import './globals.css'

export const metadata = {
  title: 'HexBridge - Connecting Homes & Designers',
  description: 'Connect with interior designers and contractors',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}