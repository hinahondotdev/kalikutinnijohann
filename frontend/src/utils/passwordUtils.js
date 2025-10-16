// src/utils/passwordUtils.js
// Password utility functions for enhanced password security and UX

/**
 * Calculate password strength score (0-4)
 * 0 = Very Weak, 1 = Weak, 2 = Fair, 3 = Good, 4 = Strong
 */
export function calculatePasswordStrength(password) {
  let score = 0;
  
  if (!password) return 0;
  
  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  
  // Character variety
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++; // Special characters
  
  return Math.min(score, 4);
}

/**
 * Get password strength label and color
 */
export function getPasswordStrengthInfo(password) {
  const score = calculatePasswordStrength(password);
  
  const strengthMap = {
    0: { label: 'Very Weak', color: '#d32f2f', percentage: 0 },
    1: { label: 'Weak', color: '#f57c00', percentage: 25 },
    2: { label: 'Fair', color: '#fbc02d', percentage: 50 },
    3: { label: 'Good', color: '#689f38', percentage: 75 },
    4: { label: 'Strong', color: '#388e3c', percentage: 100 }
  };
  
  return strengthMap[score];
}

/**
 * Validate password with detailed feedback
 * Requirements: 8+ characters, uppercase, number, special character
 */
export function validatePasswordWithFeedback(password) {
  const requirements = {
    minLength: { 
      test: password.length >= 8, 
      message: 'At least 8 characters' 
    },
    uppercase: { 
      test: /[A-Z]/.test(password), 
      message: 'One uppercase letter' 
    },
    number: { 
      test: /[0-9]/.test(password), 
      message: 'One number' 
    },
    special: { 
      test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password), 
      message: 'One special character' 
    }
  };
  
  const failed = Object.entries(requirements)
    .filter(([_, req]) => !req.test)
    .map(([_, req]) => req.message);
  
  return {
    isValid: failed.length === 0,
    requirements,
    failedRequirements: failed
  };
}

/**
 * Check if password is commonly used (basic check)
 */
export function isCommonPassword(password) {
  const commonPasswords = [
    'password', '123456', '12345678', 'qwerty', 'abc123',
    'monkey', '1234567', 'letmein', 'trustno1', 'dragon',
    'baseball', 'iloveyou', 'master', 'sunshine', 'ashley',
    'bailey', 'passw0rd', 'shadow', '123123', '654321',
    'superman', 'qazwsx', 'michael', 'football', 'welcome',
    'jesus', 'ninja', 'mustang', 'password1', 'admin',
    '123456789', '1234567890', 'password123', 'welcome123',
    'admin123', 'root', 'toor', 'pass', 'test', 'guest',
    'info', 'adm', 'mysql', 'user', 'administrator', 'oracle',
    'ftp', 'pi', 'puppet', 'ansible', 'ec2-user', 'vagrant',
    'azureuser', 'access', 'demo', 'login', 'love', 'money'
  ];
  
  return commonPasswords.includes(password.toLowerCase());
}

/**
 * Generate a random strong password
 */
export function generateStrongPassword(length = 12) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Check for sequential characters
 */
export function hasSequentialChars(password) {
  const sequences = ['abc', '123', 'xyz', '789', 'qwe', 'asd', 'zxc'];
  const passwordLower = password.toLowerCase();
  
  return sequences.some(seq => passwordLower.includes(seq));
}

/**
 * Estimate time to crack password
 */
export function estimateCrackTime(password) {
  const score = calculatePasswordStrength(password);
  
  const timeMap = {
    0: 'Less than 1 second',
    1: 'Few seconds',
    2: 'Few minutes',
    3: 'Few hours to days',
    4: 'Months to years'
  };
  
  return timeMap[score] || 'Unknown';
}

/**
 * Format password requirements as checklist
 * Requirements: 8+ characters, uppercase, number, special character
 */
export function getPasswordChecklist(password) {
  return [
    {
      id: 'length',
      label: 'At least 8 characters',
      met: password.length >= 8,
      icon: password.length >= 8 ? '✅' : '⭕'
    },
    {
      id: 'uppercase',
      label: 'One uppercase letter (A-Z)',
      met: /[A-Z]/.test(password),
      icon: /[A-Z]/.test(password) ? '✅' : '⭕'
    },
    {
      id: 'number',
      label: 'One number (0-9)',
      met: /[0-9]/.test(password),
      icon: /[0-9]/.test(password) ? '✅' : '⭕'
    },
    {
      id: 'special',
      label: 'One special character (!@#$)',
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      icon: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? '✅' : '⭕'
    }
  ];
}