import type { ReactNode } from 'react'

function navigate(path: string) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

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
