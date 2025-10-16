// backend/routes/admin.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateUser, requireRole } = require('../middleware/auth');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * POST /api/admin/create-user
 * Creates a new user with specified role
 * Requires: admin role
 */
router.post('/create-user', authenticateUser, requireRole('admin'), async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!['student', 'counselor', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: name || email.split('@')[0]
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      return res.status(400).json({ 
        error: 'Failed to create user',
        message: authError.message 
      });
    }

    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update the user profile with the correct role and name
    // (The trigger creates it with default role 'student')
    const { error: updateError } = await supabase
      .from('users')
      .update({
        name: name || email.split('@')[0],
        role: role
      })
      .eq('id', authData.user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      
      // Rollback: delete the auth user if update fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      
      return res.status(500).json({ 
        error: 'Failed to update user profile',
        message: updateError.message 
      });
    }

    console.log(`✅ User created: ${email} (${role})`);

    return res.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: authData.user.id,
        email: email,
        name: name || email.split('@')[0],
        role: role
      }
    });

  } catch (err) {
    console.error('Error creating user:', err);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: err.message 
    });
  }
});

/**
 * DELETE /api/admin/delete-user/:userId
 * Deletes a user completely (auth + profile)
 * Requires: admin role
 */
router.delete('/delete-user/:userId', authenticateUser, requireRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;

    // Delete from auth (this will cascade to users table due to ON DELETE CASCADE)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Auth deletion error:', authError);
      return res.status(400).json({ 
        error: 'Failed to delete user',
        message: authError.message 
      });
    }

    console.log(`✅ User deleted: ${userId}`);

    return res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (err) {
    console.error('Error deleting user:', err);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: err.message 
    });
  }
});

/**
 * PUT /api/admin/update-user-role/:userId
 * Updates a user's role
 * Requires: admin role
 */
router.put('/update-user-role/:userId', authenticateUser, requireRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['student', 'counselor', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    const { error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId);

    if (error) {
      console.error('Role update error:', error);
      return res.status(400).json({ 
        error: 'Failed to update role',
        message: error.message 
      });
    }

    console.log(`✅ User role updated: ${userId} -> ${role}`);

    return res.json({
      success: true,
      message: 'Role updated successfully'
    });

  } catch (err) {
    console.error('Error updating role:', err);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: err.message 
    });
  }
});

/**
 * GET /api/admin/users
 * Get all users (admin only)
 * NOW INCLUDES: department, program, year_level, photo_url, license
 */
router.get('/users', authenticateUser, requireRole('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role, name, student_id, birthday, department, program, year_level, profile_completed, photo_url, license')
      .order('email');

    if (error) throw error;

    return res.json({
      success: true,
      users: data || []
    });

  } catch (err) {
    console.error('Error fetching users:', err);
    return res.status(500).json({ 
      error: 'Failed to fetch users',
      message: err.message 
    });
  }
});

/**
 * GET /api/admin/consultations
 * Get all consultations (admin only)
 */
router.get('/consultations', authenticateUser, requireRole('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('consultations')
      .select(`
        id,
        date,
        time,
        status,
        reason,
        rejection_reason,
        counselor_notes,
        student:student_id(name, email, department),
        counselor:counselor_id(name, email)
      `)
      .order('date', { ascending: false });

    if (error) throw error;

    return res.json({
      success: true,
      consultations: data || []
    });

  } catch (err) {
    console.error('Error fetching consultations:', err);
    return res.status(500).json({ 
      error: 'Failed to fetch consultations',
      message: err.message 
    });
  }
});

/**
 * PUT /api/admin/update-user/:userId
 * Update user details (admin only)
 * NOW HANDLES: department, program, year_level for students
 * AND: photo_url, license for counselors
 */
router.put('/update-user/:userId', authenticateUser, requireRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      name, 
      email, 
      student_id, 
      birthday, 
      department, 
      program, 
      year_level, 
      role,
      photo_url,    // ADD THIS
      license       // ADD THIS
    } = req.body;

    console.log('=== UPDATE USER REQUEST ===');
    console.log('User ID:', userId);
    console.log('Request body:', req.body);

    // Build update object
    const updateData = {
      name,
      email,
      role
    };

    // Student-specific fields
    if (role === 'student') {
      updateData.student_id = student_id || null;
      updateData.birthday = birthday || null;
      updateData.department = department || null;
      updateData.program = program || null;
      updateData.year_level = year_level ? parseInt(year_level) : null;
      // Clear counselor-only fields
      updateData.photo_url = null;
      updateData.license = null;
    } 
    // Counselor-specific fields
    else if (role === 'counselor') {
      updateData.department = department || null;
      updateData.photo_url = photo_url !== undefined ? photo_url : null;  // ADD THIS
      updateData.license = license !== undefined ? license : null;        // ADD THIS
      // Clear student-only fields
      updateData.student_id = null;
      updateData.birthday = null;
      updateData.program = null;
      updateData.year_level = null;
    }
    // Admin - clear all optional fields
    else {
      updateData.student_id = null;
      updateData.birthday = null;
      updateData.department = null;
      updateData.program = null;
      updateData.year_level = null;
      updateData.photo_url = null;
      updateData.license = null;
    }

    console.log('Update data being sent to database:', updateData);

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('User update error:', error);
      return res.status(400).json({ 
        error: 'Failed to update user',
        message: error.message 
      });
    }

    console.log('✅ User updated successfully:', updatedUser);

    return res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });

  } catch (err) {
    console.error('Error updating user:', err);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: err.message 
    });
  }
});

module.exports = router;