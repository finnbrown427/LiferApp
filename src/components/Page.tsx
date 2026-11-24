import type { ReactNode } from 'react'
import Link from './Link'

type PageProps = {
  title: string
  backTo?: string
  children?: ReactNode
}

function Page({ title, backTo, children }: PageProps) {
  return (
    <main className="page">
      {backTo && <Link to={backTo} className="back-link">← Back</Link>}
      <h1>{title}</h1>
      {children}
    </main>
  )
}

export default Page
