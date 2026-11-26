// Shared page layout with a back link and selector for the active profile.
import { type ReactNode } from 'react'
import Link from './Link'
import { useCurrentUser } from '../contexts/CurrentUserContext'
import { navigate } from '../utils/navigation'

type PageProps = {
  title: string
  backTo?: string
  children?: ReactNode
}

function Page({ title, backTo, children }: PageProps) {
  const {
    profiles,
    profilesLoading,
    profilesError,
    currentUserId,
    setCurrentUserId,
  } = useCurrentUser()

  return (
    <main className="page">
      <div className="page-controls">
        {backTo
          ? <Link to={backTo} className="back-link">← Back</Link>
          : <span />}
        <label className="profile-picker">
          who might u be?:
          <select
            value={currentUserId}
            disabled={profilesLoading}
            onChange={(event) => {
              const selectedUser = profiles.find((user) => user.id === event.target.value)
              if (!selectedUser) return
              setCurrentUserId(selectedUser.id)
              if (backTo) navigate('/')
            }}
          >
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.display_name}
            </option>
          ))}
          </select>
        </label>
      </div>
      {profilesError && <p role="alert">Could not load profiles: {profilesError}</p>}
      <h1>{title}</h1>
      {children}
    </main>
  )
}

export default Page
