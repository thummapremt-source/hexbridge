import './globals.css'

export const metadata = {
  title: 'HexBridge - Bridge. Build. Bid.',
  description: 'Connect with interior designers and contractors',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}