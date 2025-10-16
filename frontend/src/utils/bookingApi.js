// frontend/src/utils/bookingApi.js
// Helper functions for booking-related API calls with email notifications

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
 * Send booking confirmation emails (to student and counselor)
 * Call this after creating a new consultation booking
 * 
 * @param {string} consultationId - The UUID of the consultation
 * @returns {Promise<{success: boolean, results?: object, error?: string}>}
 */
export async function sendBookingNotifications(consultationId) {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/bookings/notify`, {
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
      results: data.results,
      message: data.message
    };

  } catch (err) {
    console.error('Error sending booking notifications:', err);
    return { 
      success: false, 
      error: err.message || 'Network error' 
    };
  }
}

/**
 * Send acceptance notification with video link
 * Call this after counselor accepts and room is created
 * 
 * @param {string} consultationId - The UUID of the consultation
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendAcceptanceEmail(consultationId) {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/bookings/notify-acceptance`, {
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
      message: data.message
    };

  } catch (err) {
    console.error('Error sending acceptance email:', err);
    return { 
      success: false, 
      error: err.message || 'Network error' 
    };
  }
}

/**
 * Send rejection notification
 * Call this after counselor rejects consultation
 * 
 * @param {string} consultationId - The UUID of the consultation
 * @param {string} reason - Optional rejection reason
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendRejectionEmail(consultationId, reason = '') {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/bookings/notify-rejection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ consultationId, reason })
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
    console.error('Error sending rejection email:', err);
    return { 
      success: false, 
      error: err.message || 'Network error' 
    };
  }
}