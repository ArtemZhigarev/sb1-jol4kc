import Airtable from 'airtable';
import { useSettingsStore } from '../store/settingsStore';
import { Task, TaskStatus } from '../types/task';

export const fetchBases = async (token: string) => {
  try {
    const response = await fetch('https://api.airtable.com/v0/meta/bases', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch bases');
    }

    const data = await response.json();
    return data.bases.map((base: any) => ({
      id: base.id,
      name: base.name,
    }));
  } catch (error) {
    console.error('Error fetching bases:', error);
    throw error;
  }
};

export const fetchTables = async (token: string, baseId: string) => {
  try {
    const response = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch tables');
    }

    const data = await response.json();
    return data.tables.map((table: any) => ({
      id: table.id,
      name: table.name,
    }));
  } catch (error) {
    console.error('Error fetching tables:', error);
    throw error;
  }
};

export const initAirtable = () => {
  const { airtableToken, airtableBase, airtableTable } = useSettingsStore.getState();
  
  if (!airtableToken || !airtableBase || !airtableTable) {
    throw new Error('Airtable configuration is missing');
  }

  const base = new Airtable({ apiKey: airtableToken }).base(airtableBase);
  return base(airtableTable);
};

interface LoadTasksOptions {
  offset?: string;
  pageSize?: number;
}

interface LoadTasksResult {
  tasks: Task[];
  offset?: string;
  hasMore: boolean;
}

export const loadTasks = async ({ offset, pageSize = 25 }: LoadTasksOptions = {}): Promise<LoadTasksResult> => {
  try {
    const table = initAirtable();
    const query: Airtable.SelectOptions = {
      pageSize,
      sort: [{ field: 'To Do Date', direction: 'asc' }]
    };

    if (offset) {
      query.offset = offset;
    }

    const result = await table.select(query).firstPage();
    
    const tasks = result.map(record => ({
      id: record.id,
      title: record.get('Task') as string,
      description: record.get('Notes') as string || '',
      status: record.get('Status') as TaskStatus,
      dueDate: new Date(record.get('To Do Date') as string),
      completedDate: record.get('Completed Date') ? new Date(record.get('Completed Date') as string) : undefined,
      priority: 'medium',
      images: ((record.get('Photos') as any[]) || []).map(photo => photo.url),
      assigneeId: null
    }));

    return {
      tasks,
      offset: result.length === pageSize ? result[result.length - 1].id : undefined,
      hasMore: result.length === pageSize
    };
  } catch (error) {
    console.error('Failed to load tasks:', error);
    return { tasks: [], hasMore: false };
  }
};

export const syncTask = async (task: Task): Promise<void> => {
  try {
    const table = initAirtable();
    
    const fields = {
      'Task': task.title,
      'Notes': task.description,
      'Status': task.status,
      'To Do Date': task.dueDate.toISOString().split('T')[0],
      ...(task.completedDate && {
        'Completed Date': task.completedDate.toISOString().split('T')[0]
      }),
      'Photos': task.images.map(url => ({ url }))
    };

    await table.update(task.id, fields);
  } catch (error) {
    console.error('Failed to sync with Airtable:', error);
    throw error;
  }
};

export const createTask = async (task: Omit<Task, 'id'>): Promise<string | null> => {
  try {
    const table = initAirtable();
    
    const fields = {
      'Task': task.title,
      'Notes': task.description,
      'Status': task.status,
      'To Do Date': task.dueDate.toISOString().split('T')[0],
      ...(task.completedDate && {
        'Completed Date': task.completedDate.toISOString().split('T')[0]
      }),
      'Photos': task.images.map(url => ({ url }))
    };

    const record = await table.create(fields);
    return record.id;
  } catch (error) {
    console.error('Failed to create task in Airtable:', error);
    return null;
  }
};

export const uploadImage = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    // Upload to a temporary storage service (you'll need to implement this)
    const response = await fetch('YOUR_UPLOAD_ENDPOINT', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error('Failed to upload image');
  }
};