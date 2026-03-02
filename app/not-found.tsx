import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <h2>404 - Page Not Found</h2>
      <p>The resource you are looking for could not be found.</p>
      <Link href="/" style={{ marginTop: '1rem', textDecoration: 'underline' }}>
        Return Home
      </Link>
    </div>
  )
}