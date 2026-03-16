import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { v4 as uuid } from 'uuid';
import type { User } from '../types/user';

const USERS_KEY = 'sparorez-users';
const ACTIVE_USER_KEY = 'sparorez-active-user';

// Migrate legacy data (pre-user-management) to a "Petr" user
function migrateLegacyData() {
  const existingUsers = localStorage.getItem(USERS_KEY);
  if (existingUsers) return; // already migrated

  const legacyRooms = localStorage.getItem('sparorez-rooms');
  const legacyPurchased = localStorage.getItem('sparorez-purchased');
  if (!legacyRooms && !legacyPurchased) return; // no legacy data

  const petrId = crypto.randomUUID();
  const petrUser: User = { id: petrId, name: 'Petr', createdAt: new Date().toISOString() };

  localStorage.setItem(USERS_KEY, JSON.stringify([petrUser]));
  localStorage.setItem(ACTIVE_USER_KEY, petrId);

  if (legacyRooms) {
    localStorage.setItem(`sparorez-rooms-${petrId}`, legacyRooms);
    localStorage.removeItem('sparorez-rooms');
  }
  if (legacyPurchased) {
    localStorage.setItem(`sparorez-purchased-${petrId}`, legacyPurchased);
    localStorage.removeItem('sparorez-purchased');
  }
}

// Run migration on module load
migrateLegacyData();

function loadUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

function saveUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function loadActiveUserId(): string | null {
  return localStorage.getItem(ACTIVE_USER_KEY);
}

function saveActiveUserId(id: string) {
  localStorage.setItem(ACTIVE_USER_KEY, id);
}

interface UserContextValue {
  users: User[];
  activeUser: User | null;
  createUser: (name: string) => User;
  switchUser: (id: string) => void;
  deleteUser: (id: string) => void;
  renameUser: (id: string, name: string) => void;
  logout: () => void;
  storageKey: (base: string) => string;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(loadUsers);
  const [activeUserId, setActiveUserId] = useState<string | null>(loadActiveUserId);

  const activeUser = users.find(u => u.id === activeUserId) ?? null;

  const createUser = useCallback((name: string) => {
    const user: User = { id: uuid(), name, createdAt: new Date().toISOString() };
    const updated = [...loadUsers(), user];
    saveUsers(updated);
    setUsers(updated);
    saveActiveUserId(user.id);
    setActiveUserId(user.id);
    return user;
  }, []);

  const switchUser = useCallback((id: string) => {
    saveActiveUserId(id);
    setActiveUserId(id);
  }, []);

  const deleteUser = useCallback((id: string) => {
    // Remove user data
    localStorage.removeItem(`sparorez-rooms-${id}`);
    localStorage.removeItem(`sparorez-purchased-${id}`);
    const updated = loadUsers().filter(u => u.id !== id);
    saveUsers(updated);
    setUsers(updated);
    if (activeUserId === id) {
      const next = updated.length > 0 ? updated[0].id : null;
      if (next) {
        saveActiveUserId(next);
      } else {
        localStorage.removeItem(ACTIVE_USER_KEY);
      }
      setActiveUserId(next);
    }
  }, [activeUserId]);

  const renameUser = useCallback((id: string, name: string) => {
    const updated = loadUsers().map(u => u.id === id ? { ...u, name } : u);
    saveUsers(updated);
    setUsers(updated);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ACTIVE_USER_KEY);
    setActiveUserId(null);
  }, []);

  const storageKey = useCallback((base: string) => {
    return activeUserId ? `${base}-${activeUserId}` : base;
  }, [activeUserId]);

  return (
    <UserContext.Provider value={{ users, activeUser, createUser, switchUser, deleteUser, renameUser, logout, storageKey }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
