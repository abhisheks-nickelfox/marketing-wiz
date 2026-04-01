import { createContext, useContext, useState, useEffect } from 'react'
import { authApi, getToken, setToken, clearToken } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount: restore session from stored token
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    authApi
      .me()
      .then((res) => setUser(res.data))
      .catch((err) => {
        console.error('[AuthContext] Session restore failed:', err)
        clearToken()
      })
      .finally(() => setLoading(false))
  }, [])

  /**
   * Login: calls POST /api/auth/login, stores token + user.
   * Returns the user object so callers can redirect by role.
   */
  const login = async (email, password) => {
    const res = await authApi.login(email, password)
    setToken(res.data.token)
    setUser(res.data.user)
    return res.data.user
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore server errors on logout
    }
    clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
