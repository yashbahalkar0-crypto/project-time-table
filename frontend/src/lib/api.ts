const API_BASE = '/api';

async function request(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: any = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'API Error');
  }
  return res.json();
}

export const api = {
  // Auth
  login: (data: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/auth/me'),

  // Departments
  getDepartments: () => request('/departments'),
  createDepartment: (data: any) => request('/departments', { method: 'POST', body: JSON.stringify(data) }),
  updateDepartment: (id: string, data: any) => request(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDepartment: (id: string) => request(`/departments/${id}`, { method: 'DELETE' }),

  // Semesters
  getSemesters: () => request('/semesters'),
  createSemester: (data: any) => request('/semesters', { method: 'POST', body: JSON.stringify(data) }),
  updateSemester: (id: string, data: any) => request(`/semesters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSemester: (id: string) => request(`/semesters/${id}`, { method: 'DELETE' }),

  // Teachers
  getTeachers: (params?: any) => request(`/teachers${params?.departmentId ? `?departmentId=${params.departmentId}` : ''}`),
  createTeacher: (data: any) => request('/teachers', { method: 'POST', body: JSON.stringify(data) }),
  updateTeacher: (id: string, data: any) => request(`/teachers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTeacher: (id: string) => request(`/teachers/${id}`, { method: 'DELETE' }),

  // Subjects
  getSubjects: (params?: any) => {
    const q = new URLSearchParams();
    if (params?.departmentId) q.set('departmentId', params.departmentId);
    if (params?.semesterId) q.set('semesterId', params.semesterId);
    const qs = q.toString();
    return request(`/subjects${qs ? `?${qs}` : ''}`);
  },
  createSubject: (data: any) => request('/subjects', { method: 'POST', body: JSON.stringify(data) }),
  updateSubject: (id: string, data: any) => request(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSubject: (id: string) => request(`/subjects/${id}`, { method: 'DELETE' }),

  // Rooms
  getRooms: (params?: any) => {
    const q = new URLSearchParams();
    if (params?.type) q.set('type', params.type);
    if (params?.departmentId) q.set('departmentId', params.departmentId);
    const qs = q.toString();
    return request(`/rooms${qs ? `?${qs}` : ''}`);
  },
  createRoom: (data: any) => request('/rooms', { method: 'POST', body: JSON.stringify(data) }),
  updateRoom: (id: string, data: any) => request(`/rooms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRoom: (id: string) => request(`/rooms/${id}`, { method: 'DELETE' }),

  // Batches
  getBatches: (params?: any) => {
    const q = new URLSearchParams();
    if (params?.departmentId) q.set('departmentId', params.departmentId);
    if (params?.semesterId) q.set('semesterId', params.semesterId);
    const qs = q.toString();
    return request(`/batches${qs ? `?${qs}` : ''}`);
  },
  createBatch: (data: any) => request('/batches', { method: 'POST', body: JSON.stringify(data) }),
  updateBatch: (id: string, data: any) => request(`/batches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBatch: (id: string) => request(`/batches/${id}`, { method: 'DELETE' }),

  // Time Slots
  getTimeSlots: () => request('/time-slots'),
  createTimeSlot: (data: any) => request('/time-slots', { method: 'POST', body: JSON.stringify(data) }),
  bulkCreateTimeSlots: (slots: any[]) => request('/time-slots/bulk', { method: 'POST', body: JSON.stringify({ slots }) }),

  // Constraints
  getConstraints: (params?: any) => {
    const q = new URLSearchParams();
    if (params?.type) q.set('type', params.type);
    if (params?.teacherId) q.set('teacherId', params.teacherId);
    const qs = q.toString();
    return request(`/constraints${qs ? `?${qs}` : ''}`);
  },
  createConstraint: (data: any) => request('/constraints', { method: 'POST', body: JSON.stringify(data) }),
  updateConstraint: (id: string, data: any) => request(`/constraints/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteConstraint: (id: string) => request(`/constraints/${id}`, { method: 'DELETE' }),

  // Schedules
  getSchedules: (params?: any) => {
    const q = new URLSearchParams();
    if (params?.semesterId) q.set('semesterId', params.semesterId);
    const qs = q.toString();
    return request(`/schedules${qs ? `?${qs}` : ''}`);
  },
  getSchedule: (id: string) => request(`/schedules/${id}`),
  getScheduleByBatch: (scheduleId: string, batchId: string) => request(`/schedules/${scheduleId}/batch/${batchId}`),
  getScheduleByTeacher: (scheduleId: string, teacherId: string) => request(`/schedules/${scheduleId}/teacher/${teacherId}`),
  getScheduleByRoom: (scheduleId: string, roomId: string) => request(`/schedules/${scheduleId}/room/${roomId}`),
  generateSchedule: (data: any) => request('/schedules/generate', { method: 'POST', body: JSON.stringify(data) }),
  updateScheduleEntry: (entryId: string, data: any) => request(`/schedules/entry/${entryId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteScheduleEntry: (entryId: string) => request(`/schedules/entry/${entryId}`, { method: 'DELETE' }),
  deleteSchedule: (id: string) => request(`/schedules/${id}`, { method: 'DELETE' }),
  updateScheduleStatus: (id: string, status: string) => request(`/schedules/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  createScheduleEntry: (scheduleId: string, data: any) => request(`/schedules/${scheduleId}/entries`, { method: 'POST', body: JSON.stringify(data) }),

  // Resource Availability & Validation
  getResourceAvailability: (scheduleId: string, timeslotId: string, resourceType: string, excludeEntryId?: string) => {
    const q = new URLSearchParams({ timeslotId, resourceType });
    if (excludeEntryId) q.set('excludeEntryId', excludeEntryId);
    return request(`/schedules/${scheduleId}/availability?${q.toString()}`);
  },
  validateEntry: (scheduleId: string, data: any) => request(`/schedules/${scheduleId}/validate-entry`, { method: 'POST', body: JSON.stringify(data) }),

  // Analytics
  getAnalytics: (scheduleId?: string) => request(`/analytics${scheduleId ? `?scheduleId=${scheduleId}` : ''}`),
};
