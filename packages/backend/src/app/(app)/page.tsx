import Link from 'next/link'

export default function HomePage() {
  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>BS-Commerce Backend</h1>
      <p>
        The Payload CMS admin panel is available at{' '}
        <Link href="/admin">/admin</Link>.
      </p>
      <p>
        REST API is available at <Link href="/api">/api</Link>.
      </p>
    </main>
  )
}
