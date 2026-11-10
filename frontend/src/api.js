const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export async function apiRequest(endpoint, method = 'GET', body = null, studentId = '') {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (studentId && studentId.trim().length === 17) {
    headers['X-Student-Id'] = studentId.trim();
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    
    if (res.status === 204) {
      return { success: true };
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.message || `অনুরোধ ব্যর্থ হয়েছে (Status: ${res.status})`);
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError') {
      throw new Error('সার্ভারে যোগাযোগ করা সম্ভব হচ্ছে না! ব্যাকএন্ড কি চালু আছে?');
    }
    throw err;
  }
}