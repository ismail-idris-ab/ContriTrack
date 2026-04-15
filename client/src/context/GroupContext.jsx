import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const GroupContext = createContext(null);

export function GroupProvider({ children }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('activeGroup')) || null;
    } catch {
      return null;
    }
  });
  const [loadingGroups, setLoadingGroups] = useState(false);

  const loadGroups = useCallback(async () => {
    if (!user) return;
    setLoadingGroups(true);
    try {
      const { data } = await api.get('/groups/mine');
      setGroups(data);
      // If activeGroup is stale (deleted/left), clear it
      if (activeGroup && !data.find(g => g._id === activeGroup._id)) {
        selectGroup(null);
      }
    } catch (err) {
      console.error('Failed to load groups', err);
    } finally {
      setLoadingGroups(false);
    }
  }, [user]);

  // Load groups when user logs in
  useEffect(() => {
    if (user) loadGroups();
    else {
      setGroups([]);
      setActiveGroup(null);
    }
  }, [user]);

  const selectGroup = (group) => {
    setActiveGroup(group);
    if (group) {
      localStorage.setItem('activeGroup', JSON.stringify(group));
    } else {
      localStorage.removeItem('activeGroup');
    }
  };

  return (
    <GroupContext.Provider value={{ groups, activeGroup, selectGroup, loadGroups, loadingGroups }}>
      {children}
    </GroupContext.Provider>
  );
}

export const useGroup = () => useContext(GroupContext);
