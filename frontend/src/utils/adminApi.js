// frontend/src/utils/adminApi.js
// Helper functions to interact with admin backend endpoints

import { supabase } from '../supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Get authorization token for API requests
 */
async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return session.access_token;
}

/**
 * Create a new user with specified role
 * @param {object} userData - User data { email, password, name, role }
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export async function createUser(userData) {
  try {
    const { email, password, name, role } = userData;

    if (!email || !password) {
      return { 
        success: false, 
        error: 'Email and password are required' 
      };
    }

    if (!['student', 'counselor', 'admin'].includes(role)) {
      return { 
        success: false, 
        error: 'Invalid role specified' 
      };
    }

    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/admin/create-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ email, password, name, role })
    });

    const data = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        error: data.error || data.message || `HTTP ${response.status}` 
      };
    }

    return {
      success: true,
      user: data.user,
      message: data.message
    };

  } catch (err) {
    console.error('Error creating user:', err);
    return { 
      success: false, 
      error: err.message || 'Network error' 
    };
  }
}

/**
 * Delete a user completely (auth + profile)
 * @param {string} userId - The UUID of the user to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteUser(userId) {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/admin/delete-user/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        error: data.error || data.message || `HTTP ${response.status}` 
      };
    }

    return {
      success: true,
      message: data.message
    };

  } catch (err) {
    console.error('Error deleting user:', err);
    return { 
      success: false, 
      error: err.message || 'Network error' 
    };
  }
}

/**
 * Update a user's role
 * @param {string} userId - The UUID of the user
 * @param {string} role - New role (student, counselor, admin)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateUserRole(userId, role) {
  try {
    if (!['student', 'counselor', 'admin'].includes(role)) {
      return { 
        success: false, 
        error: 'Invalid role specified' 
      };
    }

    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/admin/update-user-role/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ role })
    });

    const data = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        error: data.error || data.message || `HTTP ${response.status}` 
      };
    }

    return {
      success: true,
      message: data.message
    };

  } catch (err) {
    console.error('Error updating user role:', err);
    return { 
      success: false, 
      error: err.message || 'Network error' 
    };
  }
}

/**
 * Get all users (admin only)
 * @returns {Promise<{success: boolean, users?: array, error?: string}>}
 */
export async function getAllUsers() {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/admin/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        error: data.error || `HTTP ${response.status}` 
      };
    }

    return {
      success: true,
      users: data.users
    };

  } catch (err) {
    console.error('Error fetching users:', err);
    return { 
      success: false, 
      error: err.message || 'Network error' 
    };
  }
}

/**
 * Get all consultations (admin only)
 * @returns {Promise<{success: boolean, consultations?: array, error?: string}>}
 */
export async function getAllConsultations() {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/admin/consultations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        error: data.error || `HTTP ${response.status}` 
      };
    }

    return {
      success: true,
      consultations: data.consultations
    };

  } catch (err) {
    console.error('Error fetching consultations:', err);
    return { 
      success: false, 
      error: err.message || 'Network error' 
    };
  }
}

/**
 * Update user details (admin only)
 * @param {string} userId - User ID
 * @param {object} userData - Updated user data
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateUser(userId, userData) {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/admin/update-user/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(userData)
    });

    const data = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        error: data.error || `HTTP ${response.status}` 
      };
    }

    return {
      success: true,
      message: data.message
    };

  } catch (err) {
    console.error('Error updating user:', err);
    return { 
      success: false, 
      error: err.message || 'Network error' 
    };
  }
}