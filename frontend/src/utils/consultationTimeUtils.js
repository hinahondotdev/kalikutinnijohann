// frontend/src/utils/consultationTimeUtils.js
// Helper functions for time-based video link access control

/**
 * Check if consultation video link is accessible
 * Rules:
 * - Can only access when scheduled time has started
 * - Expires 1 hour after scheduled time
 * 
 * @param {string} consultationDate - Date string (YYYY-MM-DD)
 * @param {string} consultationTime - Time string (HH:MM:SS)
 * @returns {object} { canAccess: boolean, reason: string, timeUntilStart: number|null, timeUntilExpiry: number|null }
 */
export function checkVideoLinkAccess(consultationDate, consultationTime) {
  try {
    // Combine date and time into a single Date object
    const scheduledDateTime = new Date(`${consultationDate}T${consultationTime}`);
    const now = new Date();
    
    // Calculate 1 hour after scheduled time (in milliseconds)
    // FIX: Add * 1000 to convert to milliseconds
    const expiryTime = new Date(scheduledDateTime.getTime() + (3600 * 1000));
    
    // Check if consultation has started
    if (now < scheduledDateTime) {
      const timeUntilStart = scheduledDateTime - now;
      const minutesUntilStart = Math.ceil(timeUntilStart / (1000 * 60));
      
      return {
        canAccess: false,
        reason: 'not_started',
        message: `Consultation hasn't started yet. Starts in ${formatTimeUntil(timeUntilStart)}.`,
        timeUntilStart: minutesUntilStart,
        timeUntilExpiry: null
      };
    }
    
    // Check if consultation has expired (more than 1 hour after scheduled time)
    if (now > expiryTime) {
      return {
        canAccess: false,
        reason: 'expired',
        message: 'This consultation link has expired (1 hour after scheduled time).',
        timeUntilStart: null,
        timeUntilExpiry: 0
      };
    }
    
    // Link is accessible
    const timeUntilExpiry = expiryTime - now;
    const minutesUntilExpiry = Math.ceil(timeUntilExpiry / (1000 * 60));
    
    return {
      canAccess: true,
      reason: 'active',
      message: `Link expires in ${formatTimeUntil(timeUntilExpiry)}.`,
      timeUntilStart: 0,
      timeUntilExpiry: minutesUntilExpiry
    };
    
  } catch (error) {
    console.error('Error checking video link access:', error);
    return {
      canAccess: false,
      reason: 'error',
      message: 'Unable to verify consultation time.',
      timeUntilStart: null,
      timeUntilExpiry: null
    };
  }
}

/**
 * Format time difference into human-readable string
 * @param {number} milliseconds - Time difference in milliseconds
 * @returns {string} Formatted time string
 */
function formatTimeUntil(milliseconds) {
  const totalMinutes = Math.ceil(milliseconds / (1000 * 60));
  
  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (minutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

/**
 * Check if consultation is happening soon (within 15 minutes)
 * @param {string} consultationDate - Date string (YYYY-MM-DD)
 * @param {string} consultationTime - Time string (HH:MM:SS)
 * @returns {boolean}
 */
export function isConsultationSoon(consultationDate, consultationTime) {
  try {
    const scheduledDateTime = new Date(`${consultationDate}T${consultationTime}`);
    const now = new Date();
    const timeDiff = scheduledDateTime - now;
    const minutesUntil = timeDiff / (1000 * 60);
    
    return minutesUntil > 0 && minutesUntil <= 15;
  } catch (error) {
    return false;
  }
}

/**
 * Check if consultation is currently active (started but not expired)
 * @param {string} consultationDate - Date string (YYYY-MM-DD)
 * @param {string} consultationTime - Time string (HH:MM:SS)
 * @returns {boolean}
 */
export function isConsultationActive(consultationDate, consultationTime) {
  const accessInfo = checkVideoLinkAccess(consultationDate, consultationTime);
  return accessInfo.canAccess;
}

/**
 * Get status badge info based on consultation time and status
 * @param {string} status - Consultation status (pending, accepted, rejected)
 * @param {string} consultationDate - Date string (YYYY-MM-DD)
 * @param {string} consultationTime - Time string (HH:MM:SS)
 * @returns {object} { text: string, color: string, bg: string }
 */
export function getConsultationStatusBadge(status, consultationDate, consultationTime) {
  if (status === 'pending') {
    return {
      text: 'Pending',
      color: '#856404',
      bg: '#fff3cd'
    };
  }
  
  if (status === 'rejected') {
    return {
      text: 'Rejected',
      color: '#721c24',
      bg: '#f8d7da'
    };
  }
  
  if (status === 'accepted') {
    const accessInfo = checkVideoLinkAccess(consultationDate, consultationTime);
    
    if (accessInfo.reason === 'not_started') {
      return {
        text: 'Scheduled',
        color: '#004085',
        bg: '#cce5ff'
      };
    }
    
    if (accessInfo.reason === 'active') {
      return {
        text: 'Active Now',
        color: '#155724',
        bg: '#d4edda'
      };
    }
    
    if (accessInfo.reason === 'expired') {
      return {
        text: 'Expired',
        color: '#6c757d',
        bg: '#e2e3e5'
      };
    }
    
    return {
      text: 'Accepted',
      color: '#155724',
      bg: '#d4edda'
    };
  }
  
  return {
    text: status,
    color: '#6c757d',
    bg: '#f8f9fa'
  };
}

/**
 * Checks if a consultation request has exceeded the 10-minute grace period
 * Returns true if the consultation time + 10 minutes has passed
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} time - Time in HH:MM format (24-hour)
 * @returns {boolean} True if the request is expired (past scheduled time + 10 min)
 */
export function isConsultationRequestExpired(date, time) {
  const now = new Date();
  const consultationDateTime = new Date(`${date}T${time}`);
  const gracePeriodEnd = new Date(consultationDateTime.getTime() + (10 * 60 * 1000)); // +10 minutes
  
  return now > gracePeriodEnd;
}