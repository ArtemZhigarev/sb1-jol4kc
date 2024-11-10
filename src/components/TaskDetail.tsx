import React, { useState } from 'react';
import { format } from 'date-fns';
import { X, Clock, CheckCircle, Edit2, Save, User } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { useEmployeeStore } from '../store/employeeStore';
import { motion } from 'framer-motion';
import { Task, TaskStatus } from '../types/task';
import { ImageUpload } from './ImageUpload';

export const TaskDetail: React.FC = () => {
  const { tasks, selectedTaskId, setSelectedTaskId, updateTask, updateTaskStatus } = useTaskStore();
  const { employees } = useEmployeeStore();
  const task = tasks.find((t) => t.id === selectedTaskId);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Partial<Task> | null>(null);

  if (!task) return null;

  const assignee = employees.find(emp => emp.id === task.assigneeId);

  const handleEdit = () => {
    setEditedTask(task);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (editedTask && selectedTaskId) {
      try {
        await updateTask(selectedTaskId, editedTask);
        setIsEditing(false);
        setEditedTask(null);
      } catch (error) {
        // Error handling is done in the store
      }
    }
  };

  const handleComplete = async () => {
    if (selectedTaskId) {
      try {
        await updateTaskStatus(selectedTaskId, 'Done');
        setSelectedTaskId(null);
      } catch (error) {
        // Error handling is done in the store
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedTask(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditedTask((prev) => {
      if (!prev) return null;
      if (name === 'dueDate') {
        return {
          ...prev,
          [name]: new Date(value),
        };
      }
      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const handleImagesChange = (images: string[]) => {
    setEditedTask(prev => {
      if (!prev) return null;
      return {
        ...prev,
        images,
      };
    });
  };

  const currentTask = editedTask || task;

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      className="fixed inset-0 bg-white z-50 overflow-y-auto"
    >
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          {isEditing ? (
            <input
              type="text"
              name="title"
              value={currentTask.title}
              onChange={handleInputChange}
              className="text-2xl font-bold bg-gray-50 border border-gray-300 rounded px-2 py-1 w-full"
            />
          ) : (
            <h2 className="text-2xl font-bold">{currentTask.title}</h2>
          )}
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="p-2 hover:bg-green-100 rounded-full text-green-600"
                >
                  <Save className="w-6 h-6" />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-6 h-6" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEdit}
                  className="p-2 hover:bg-blue-100 rounded-full text-blue-600"
                >
                  <Edit2 className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setSelectedTaskId(null)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <ImageUpload
            images={currentTask.images}
            onImagesChange={handleImagesChange}
            disabled={!isEditing}
          />

          <div className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Due Date
                  </label>
                  <input
                    type="date"
                    name="dueDate"
                    value={format(currentTask.dueDate, 'yyyy-MM-dd')}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    name="status"
                    value={currentTask.status}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="To do">To do</option>
                    <option value="In progress">In progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={currentTask.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-700">
                      Due {format(currentTask.dueDate, 'MMMM d, yyyy')}
                    </span>
                  </div>
                  {assignee && (
                    <div className="flex items-center gap-2">
                      <img
                        src={assignee.avatar}
                        alt={assignee.name}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-gray-600">{assignee.name}</span>
                    </div>
                  )}
                </div>
                <p className="text-gray-600 leading-relaxed">
                  {currentTask.description}
                </p>
              </>
            )}

            {!isEditing && task.status !== 'Done' && (
              <button
                onClick={handleComplete}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                <CheckCircle className="w-5 h-5" />
                Mark as Complete
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};