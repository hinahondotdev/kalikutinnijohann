/**
 * Utility functions for handling counselor availability
 * Place this file in: src/utils/availabilityUtils.js
 */

/**
 * Converts time string (HH:MM AM/PM) to minutes since midnight
 * @param {string} timeStr - Time in format "7:00 AM" or "14:00"
 * @returns {number} Minutes since midnight
 */
export function timeToMinutes(timeStr) {
  // Handle 24-hour format
  if (!timeStr.includes('AM') && !timeStr.includes('PM')) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  // Handle 12-hour format
  const [time, period] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return hours * 60 + minutes;
}

/**
 * Converts minutes since midnight to time string
 * @param {number} minutes - Minutes since midnight
 * @param {boolean} use24Hour - Use 24-hour format
 * @returns {string} Time string
 */
export function minutesToTime(minutes, use24Hour = false) {
  let hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (use24Hour) {
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }
  
  const period = hours >= 12 ? 'PM' : 'AM';
  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;
  
  return `${hours}:${String(mins).padStart(2, '0')} ${period}`;
}

/**
 * Gets the current time in minutes since midnight
 * @returns {number} Current time in minutes
 */
export function getCurrentTimeInMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Rounds up to the nearest 30-minute interval
 * @param {number} minutes - Minutes since midnight
 * @returns {number} Rounded up minutes
 */
export function roundUpToNearest30(minutes) {
  return Math.ceil(minutes / 30) * 30;
}

/**
 * Gets the next available 30-minute slot from current time
 * @returns {number} Next available slot in minutes since midnight
 */
export function getNextAvailableSlot() {
  const currentMinutes = getCurrentTimeInMinutes();
  return roundUpToNearest30(currentMinutes);
}

/**
 * Adjusts start time to be at least the next available slot if it's in the past
 * @param {string} startTime - Original start time
 * @returns {{adjustedMinutes: number, wasAdjusted: boolean, originalMinutes: number}}
 */
export function adjustStartTimeIfPast(startTime) {
  const originalMinutes = timeToMinutes(startTime);
  const nextAvailableMinutes = getNextAvailableSlot();
  
  // If the selected start time is in the past or too close to current time
  if (originalMinutes < nextAvailableMinutes) {
    return {
      adjustedMinutes: nextAvailableMinutes,
      wasAdjusted: true,
      originalMinutes: originalMinutes
    };
  }
  
  return {
    adjustedMinutes: originalMinutes,
    wasAdjusted: false,
    originalMinutes: originalMinutes
  };
}

/**
 * Generates time slots based on start and end time
 * Each consultation is 1 hour, with 30-minute breaks in between
 * Automatically adjusts start time if it's in the past
 * 
 * @param {string} startTime - Start time (e.g., "8:00 AM")
 * @param {string} endTime - End time (e.g., "3:00 PM")
 * @returns {Array<{start: string, end: string}>} Array of time slot objects
 */
export function generateTimeSlots(startTime, endTime) {
  const endMinutes = timeToMinutes(endTime);
  
  // Adjust start time if it's in the past
  const startAdjustment = adjustStartTimeIfPast(startTime);
  const actualStartMinutes = startAdjustment.adjustedMinutes;
  
  // Validate that end time is still after adjusted start time
  if (actualStartMinutes >= endMinutes) {
    throw new Error('End time must be after the current/selected start time');
  }
  
  // Ensure times are on 30-minute boundaries
  if (actualStartMinutes % 30 !== 0 || endMinutes % 30 !== 0) {
    throw new Error('Times must be on 30-minute boundaries (e.g., 7:00, 7:30, 8:00)');
  }
  
  const slots = [];
  let currentMinutes = actualStartMinutes;
  
  while (currentMinutes + 60 <= endMinutes) {
    const slotStart = currentMinutes;
    const slotEnd = currentMinutes + 60; // 1 hour consultation
    
    slots.push({
      start: minutesToTime(slotStart, true), // Store in 24-hour format for database
      end: minutesToTime(slotEnd, true),
      startDisplay: minutesToTime(slotStart, false), // For display
      endDisplay: minutesToTime(slotEnd, false)
    });
    
    // Move to next slot: 1 hour consultation + 30 minutes break = 90 minutes
    currentMinutes += 90;
  }
  
  return {
    slots,
    wasAdjusted: startAdjustment.wasAdjusted,
    originalStart: minutesToTime(startAdjustment.originalMinutes, false),
    adjustedStart: minutesToTime(actualStartMinutes, false)
  };
}

/**
 * Generates all possible 30-minute interval times for a day
 * @returns {Array<string>} Array of time strings
 */
export function generateTimeOptions() {
  const times = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += 30) {
    times.push(minutesToTime(minutes, false));
  }
  return times;
}

/**
 * Validates if a time range can generate valid slots
 * @param {string} startTime 
 * @param {string} endTime 
 * @returns {{valid: boolean, message: string, slots: Array, wasAdjusted: boolean, adjustedStart: string}}
 */
export function validateTimeRange(startTime, endTime) {
  try {
    const result = generateTimeSlots(startTime, endTime);
    
    if (result.slots.length === 0) {
      return {
        valid: false,
        message: 'Time range too short. Minimum 1 hour needed for one consultation slot.',
        slots: [],
        wasAdjusted: false,
        adjustedStart: null
      };
    }
    
    let message = `Will create ${result.slots.length} consultation slot(s)`;
    
    if (result.wasAdjusted) {
      message = `Start time adjusted from ${result.originalStart} to ${result.adjustedStart} (next available slot). Will create ${result.slots.length} slot(s).`;
    }
    
    return {
      valid: true,
      message: message,
      slots: result.slots,
      wasAdjusted: result.wasAdjusted,
      adjustedStart: result.adjustedStart
    };
  } catch (error) {
    return {
      valid: false,
      message: error.message,
      slots: [],
      wasAdjusted: false,
      adjustedStart: null
    };
  }
}

/**
 * Formats date to YYYY-MM-DD
 * @param {Date} date 
 * @returns {string}
 */
export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets today's date in YYYY-MM-DD format
 * @returns {string}
 */
export function getTodayDate() {
  return formatDate(new Date());
}

/**
 * Checks if a time slot has already passed
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} startTime - Time in HH:MM format (24-hour)
 * @returns {boolean} True if the slot has passed
 */
export function isSlotExpired(date, startTime) {
  const now = new Date();
  const slotDateTime = new Date(`${date}T${startTime}`);
  return slotDateTime < now;
}

/**
 * Checks if a time slot is currently active (within 10 minutes before start time)
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} startTime - Time in HH:MM format (24-hour)
 * @returns {boolean} True if the slot is active or starting soon
 */
export function isSlotActive(date, startTime) {
  const now = new Date();
  const slotDateTime = new Date(`${date}T${startTime}`);
  const tenMinutesBefore = new Date(slotDateTime.getTime() - (10 * 60 * 1000));
  
  return now >= tenMinutesBefore && now <= slotDateTime;
}

/**
 * Filters out expired slots from an array of availability slots
 * @param {Array} slots - Array of slot objects with date and start_time
 * @returns {Array} Filtered array with only future/active slots
 */
export function filterExpiredSlots(slots) {
  return slots.filter(slot => !isSlotExpired(slot.date, slot.start_time));
}