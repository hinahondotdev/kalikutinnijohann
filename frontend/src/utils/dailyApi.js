// frontend/src/utils/dailyApi.js
// Helper functions to interact with Node.js backend for Daily.co

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
 * Creates a Daily.co video room for a consultation
 * @param {string} consultationId - The UUID of the consultation
 * @returns {Promise<{success: boolean, roomUrl?: string, error?: string}>}
 */
export async function createDailyRoom(consultationId) {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/daily/create-room`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ consultationId })
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
      roomUrl: data.roomUrl,
      roomName: data.roomName,
      expiresAt: data.expiresAt
    };

  } catch (err) {
    console.error('Error creating Daily room:', err);
    return { 
      success: false, 
      error: err.message || 'Network error' 
    };
  }
}

/**
 * Get existing room details for a consultation
 * @param {string} consultationId - The UUID of the consultation
 * @returns {Promise<{success: boolean, roomUrl?: string, error?: string}>}
 */
export async function getRoomDetails(consultationId) {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/daily/room/${consultationId}`, {
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
      roomUrl: data.roomUrl,
      status: data.status
    };

  } catch (err) {
    console.error('Error fetching room details:', err);
    return { 
      success: false, 
      error: err.message || 'Network error' 
    };
  }
}

/**
 * Accepts a consultation and creates a Daily.co room
 * @param {string} consultationId - The UUID of the consultation
 * @returns {Promise<{success: boolean, roomUrl?: string, error?: string}>}
 */
export async function acceptConsultationWithRoom(consultationId) {
  try {
    // First, update consultation status to 'accepted'
    const { error: updateError } = await supabase
      .from('consultations')
      .update({ status: 'accepted' })
      .eq('id', consultationId);

    if (updateError) {
      throw new Error(`Failed to accept consultation: ${updateError.message}`);
    }

    // Then create the Daily.co room via backend
    const result = await createDailyRoom(consultationId);

    if (!result.success) {
      // Rollback the acceptance if room creation fails
      await supabase
        .from('consultations')
        .update({ status: 'pending' })
        .eq('id', consultationId);
      
      throw new Error(result.error);
    }

    return result;

  } catch (err) {
    console.error('Error accepting consultation:', err);
    return { 
      success: false, 
      error: err.message 
    };
  }
}

/**
 * Rejects a consultation
 * @param {string} consultationId - The UUID of the consultation
 * @param {string} reason - Optional rejection reason
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function rejectConsultation(consultationId, reason = '') {
  try {
    const updateData = { 
      status: 'rejected',
      video_link: null, // Clear any existing video link
      ...(reason && { rejection_reason: reason })
    };

    const { error } = await supabase
      .from('consultations')
      .update(updateData)
      .eq('id', consultationId);

    if (error) {
      throw new Error(`Failed to reject consultation: ${error.message}`);
    }

    return { success: true };

  } catch (err) {
    console.error('Error rejecting consultation:', err);
    return { 
      success: false, 
      error: err.message 
    };
  }
}

/**
 * Gets consultation details with video link
 * @param {string} consultationId - The UUID of the consultation
 * @returns {Promise<object|null>}
 */
export async function getConsultationDetails(consultationId) {
  try {
    const { data, error } = await supabase
      .from('consultations')
      .select(`
        *,
        student:student_id(name, email),
        counselor:counselor_id(name, email)
      `)
      .eq('id', consultationId)
      .single();

    if (error) {
      console.error('Error fetching consultation:', error);
      return null;
    }

    return data;

  } catch (err) {
    console.error('Error getting consultation details:', err);
    return null;
  }
}

/**
 * Delete a Daily.co room (cleanup)
 * @param {string} consultationId - The UUID of the consultation
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteRoom(consultationId) {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/daily/room/${consultationId}`, {
      method: 'DELETE',
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

    return { success: true };

  } catch (err) {
    console.error('Error deleting room:', err);
    return { 
      success: false, 
      error: err.message 
    };
  }
}