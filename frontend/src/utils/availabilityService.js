import { supabase } from '../supabaseClient';
import { filterExpiredSlots, getTodayDate } from './availabilityUtils';

/**
 * Get all available (non-booked, non-expired) slots for booking
 * This should be used by students when viewing available consultation times
 * @param {string} counselorId - Optional: filter by specific counselor
 * @returns {Promise<{success: boolean, data: Array, error: any}>}
 */
export async function getAvailableSlotsForBooking(counselorId = null) {
  try {
    const todayDate = getTodayDate();
    
    let query = supabase
      .from('availability')
      .select(`
        *,
        counselor:users!availability_counselor_id_fkey(id, name, email)
      `)
      .gte('date', todayDate) // Get today and future dates
      .eq('is_booked', false)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });
    
    if (counselorId) {
      query = query.eq('counselor_id', counselorId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Filter out expired slots (past times for today)
    const activeSlots = filterExpiredSlots(data || []);
    
    return {
      success: true,
      data: activeSlots,
      error: null
    };
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return {
      success: false,
      data: [],
      error
    };
  }
}

/**
 * Get counselor's availability for a specific date (with expired slots filtered)
 * @param {string} counselorId 
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<{success: boolean, data: Array, error: any}>}
 */
export async function getCounselorAvailabilityByDate(counselorId, date) {
  try {
    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .eq('counselor_id', counselorId)
      .eq('date', date)
      .order('start_time', { ascending: true });
    
    if (error) throw error;
    
    // Filter out expired slots
    const activeSlots = filterExpiredSlots(data || []);
    
    return {
      success: true,
      data: activeSlots,
      error: null
    };
  } catch (error) {
    console.error('Error fetching counselor availability:', error);
    return {
      success: false,
      data: [],
      error
    };
  }
}

/**
 * Book a specific availability slot
 * This should be called when creating a consultation
 * @param {string} slotId - The availability slot ID
 * @param {string} consultationId - The consultation ID
 * @returns {Promise<{success: boolean, error: any}>}
 */
export async function bookAvailabilitySlot(slotId, consultationId) {
  try {
    // First check if slot still exists and is not booked
    const { data: slot, error: fetchError } = await supabase
      .from('availability')
      .select('*')
      .eq('id', slotId)
      .single();

    if (fetchError) throw fetchError;

    if (!slot) {
      throw new Error('Availability slot not found');
    }

    if (slot.is_booked) {
      throw new Error('This time slot has already been booked by another student');
    }

    // Check if slot has expired
    const slotDateTime = new Date(`${slot.date}T${slot.start_time}`);
    const now = new Date();
    
    if (slotDateTime < now) {
      throw new Error('This time slot has expired and is no longer available');
    }

    // Book the slot
    const { error: updateError } = await supabase
      .from('availability')
      .update({
        is_booked: true,
        consultation_id: consultationId
      })
      .eq('id', slotId)
      .eq('is_booked', false); // Double-check it's still not booked

    if (updateError) throw updateError;

    return {
      success: true,
      error: null
    };
  } catch (error) {
    console.error('Error booking slot:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check if a specific slot is still available for booking
 * @param {string} slotId 
 * @returns {Promise<{available: boolean, reason: string}>}
 */
export async function checkSlotAvailability(slotId) {
  try {
    const { data: slot, error } = await supabase
      .from('availability')
      .select('*')
      .eq('id', slotId)
      .single();

    if (error || !slot) {
      return {
        available: false,
        reason: 'Slot not found'
      };
    }

    if (slot.is_booked) {
      return {
        available: false,
        reason: 'Already booked'
      };
    }

    // Check if expired
    const slotDateTime = new Date(`${slot.date}T${slot.start_time}`);
    const now = new Date();
    
    if (slotDateTime < now) {
      return {
        available: false,
        reason: 'Time slot has passed'
      };
    }

    return {
      available: true,
      reason: 'Available'
    };
  } catch (error) {
    console.error('Error checking slot availability:', error);
    return {
      available: false,
      reason: 'Error checking availability'
    };
  }
}