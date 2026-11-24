import type { ReactNode } from 'react'
import { navigate } from '../utils/navigation'

type LinkProps = {
  to: string
  children: ReactNode
  className?: string
}

function Link({ to, children, className }: LinkProps) {
  return (
    <a
      href={to}
      className={className}
      onClick={(event) => {
        event.preventDefault()
        navigate(to)
      }}
    >
      {children}
    </a>
  )
}

export default Link
