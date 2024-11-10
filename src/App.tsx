import React, { useState, useEffect } from 'react';
import { TaskList } from './components/TaskList';
import { TaskDetail } from './components/TaskDetail';
import { Settings } from './components/Settings';
import { useTaskStore } from './store/taskStore';
import { useSettingsStore } from './store/settingsStore';
import { Plus, Settings as SettingsIcon, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { loadTasks } from './services/airtable';
import { Toaster } from 'react-hot-toast';

export default function App() {
  const { selectedTaskId, tasks, setTasks, appendTasks } = useTaskStore();
  const { isConfigured } = useSettingsStore();
  const [showSettings, setShowSettings] = useState(!isConfigured);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);
  const [currentOffset, setCurrentOffset] = useState<string>();
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadMoreTasks = async () => {
    if (!isConfigured || !isOnline || isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const result = await loadTasks({ offset: currentOffset });
      if (currentOffset) {
        appendTasks(result.tasks);
      } else {
        setTasks(result.tasks);
      }
      setCurrentOffset(result.offset);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConfigured && isOnline) {
      loadMoreTasks();
    }
  }, [isConfigured, isOnline]);

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100 &&
        !isLoading &&
        hasMore
      ) {
        loadMoreTasks();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoading, hasMore, currentOffset]);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
            {isLoading ? (
              <RefreshCw className="w-5 h-5 text-gray-500 animate-spin" />
            ) : isOnline ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded-full"
              title="Settings"
            >
              <SettingsIcon className="w-6 h-6" />
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <Plus className="w-5 h-5 mr-2" />
              Add Task
            </button>
          </div>
        </div>

        {!isConfigured && !showSettings && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Please configure your Airtable connection in settings to sync your tasks.
                </p>
              </div>
            </div>
          </div>
        )}

        {!isOnline && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  You're currently offline. Changes will be synced when you're back online.
                </p>
              </div>
            </div>
          </div>
        )}

        <TaskList />
        {selectedTaskId && <TaskDetail />}
        {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      </div>
      <Toaster position="bottom-center" />
    </div>
  );
}