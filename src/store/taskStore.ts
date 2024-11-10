import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Task, TaskStatus, DelayOption } from '../types/task';
import { addDays } from 'date-fns';
import { createTask, syncTask } from '../services/airtable';
import toast from 'react-hot-toast';

interface TaskState {
  tasks: Task[];
  selectedTaskId: string | null;
  setTasks: (tasks: Task[]) => void;
  appendTasks: (tasks: Task[]) => void;
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id'>>) => Promise<void>;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  delayTask: (id: string, days: DelayOption) => Promise<void>;
  setSelectedTaskId: (id: string | null) => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      selectedTaskId: null,
      setTasks: (tasks) => set({ tasks }),
      appendTasks: (newTasks) => set(state => ({
        tasks: [...state.tasks, ...newTasks]
      })),
      addTask: async (taskData) => {
        try {
          const id = await createTask(taskData);
          if (!id) throw new Error('Failed to create task');

          const task = { ...taskData, id };
          set(state => ({
            tasks: [...state.tasks, task]
          }));
          toast.success('Task created successfully');
        } catch (error) {
          toast.error('Failed to create task');
          throw error;
        }
      },
      updateTask: async (id, updates) => {
        try {
          const state = get();
          const task = state.tasks.find(t => t.id === id);
          if (!task) return;

          const updatedTask = { ...task, ...updates };
          await syncTask(updatedTask);

          set(state => ({
            tasks: state.tasks.map(t => t.id === id ? updatedTask : t)
          }));
          toast.success('Task updated successfully');
        } catch (error) {
          toast.error('Failed to update task');
          throw error;
        }
      },
      updateTaskStatus: async (id, status) => {
        try {
          const state = get();
          const task = state.tasks.find(t => t.id === id);
          if (!task) return;

          const updates = {
            status,
            ...(status === 'Done' ? { completedDate: new Date() } : {})
          };

          const updatedTask = { ...task, ...updates };
          await syncTask(updatedTask);

          set(state => ({
            tasks: state.tasks.map(t => t.id === id ? updatedTask : t)
          }));
          toast.success(`Task marked as ${status}`);
        } catch (error) {
          toast.error('Failed to update task status');
          throw error;
        }
      },
      delayTask: async (id, days) => {
        try {
          const state = get();
          const task = state.tasks.find(t => t.id === id);
          if (!task) return;

          const newDueDate = addDays(task.dueDate, days);
          const updatedTask = { ...task, dueDate: newDueDate };
          await syncTask(updatedTask);

          set(state => ({
            tasks: state.tasks.map(t => t.id === id ? updatedTask : t)
          }));
          toast.success(`Task delayed by ${days} day${days > 1 ? 's' : ''}`);
        } catch (error) {
          toast.error('Failed to delay task');
          throw error;
        }
      },
      setSelectedTaskId: (id) => set({ selectedTaskId: id }),
    }),
    {
      name: 'task-storage',
      partialize: (state) => ({
        tasks: state.tasks.map(task => ({
          ...task,
          dueDate: task.dueDate.toISOString(),
          completedDate: task.completedDate?.toISOString(),
        })),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.tasks = state.tasks.map(task => ({
            ...task,
            dueDate: new Date(task.dueDate),
            completedDate: task.completedDate ? new Date(task.completedDate) : undefined,
          }));
        }
      },
    }
  )
);