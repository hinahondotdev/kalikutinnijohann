// backend/routes/daily.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateUser, requireRole } = require('../middleware/auth');
const { sendAcceptanceNotification, sendCounselorAcceptanceNotification, sendRejectionNotification } = require('../utils/emailService');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DAILY_API_KEY = process.env.DAILY_API_KEY;

/**
 * POST /api/daily/create-room
 * Creates a Daily.co video room for a consultation
 * Requires: counselor or admin role
 * Automatically sends acceptance email with video link
 */
router.post('/create-room', authenticateUser, requireRole('counselor', 'admin'), async (req, res) => {
  try {
    const { consultationId } = req.body;

    if (!consultationId) {
      return res.status(400).json({ error: 'Consultation ID is required' });
    }

    // Verify consultation exists and user has access
    const { data: consultation, error: consultationError } = await supabase
      .from('consultations')
      .select(`
        *,
        counselor:counselor_id(name, email),
        student:student_id(name, email)
      `)
      .eq('id', consultationId)
      .single();

    if (consultationError || !consultation) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    // Check if user is authorized (must be the counselor or admin)
    const isAuthorized = 
      req.userRole === 'admin' || 
      consultation.counselor_id === req.user.id;

    if (!isAuthorized) {
      return res.status(403).json({ 
        error: 'Not authorized to create room for this consultation' 
      });
    }

    // Check if room already exists
    if (consultation.video_link) {
      return res.json({
        success: true,
        roomUrl: consultation.video_link,
        message: 'Room already exists'
      });
    }

    // Create unique room name
    const roomName = `hinahon-${consultationId.slice(0, 8)}-${Date.now()}`;

    // Call Daily.co API to create room
    const dailyResponse = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          enable_screenshare: true,
          enable_chat: true,
          start_video_off: false,
          start_audio_off: false,
          max_participants: 2,
          // Room expires 24 hours from now
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
          enable_recording: 'cloud',
          enable_prejoin_ui: true,
        }
      })
    });

    if (!dailyResponse.ok) {
      const errorText = await dailyResponse.text();
      console.error('Daily.co API error:', errorText);
      throw new Error(`Daily.co API error: ${dailyResponse.status}`);
    }

    const roomData = await dailyResponse.json();

    // Update consultation with video link
    const { error: updateError } = await supabase
      .from('consultations')
      .update({ video_link: roomData.url })
      .eq('id', consultationId);

    if (updateError) {
      console.error('Error updating consultation:', updateError);
      throw new Error('Failed to save video link to database');
    }

    console.log(`✅ Created Daily.co room: ${roomData.url}`);

    // Send acceptance emails to BOTH student AND counselor
    const studentName = consultation.student?.name || consultation.student?.email?.split('@')[0] || 'Student';
    const counselorName = consultation.counselor?.name || consultation.counselor?.email?.split('@')[0] || 'Counselor';

    console.log('📧 Sending acceptance emails...');
    console.log('   - Student email:', consultation.student.email);
    console.log('   - Counselor email:', consultation.counselor.email);

    // Send to student first
    try {
      console.log('📤 Sending email to student...');
      const studentEmailResult = await sendAcceptanceNotification(
        consultation.student.email,
        studentName,
        counselorName,
        consultation.date,
        consultation.time,
        roomData.url
      );

      if (studentEmailResult.success) {
        console.log('✅ Student acceptance email sent successfully');
      } else {
        console.error('❌ Failed to send student acceptance email:', studentEmailResult.error);
      }
    } catch (studentErr) {
      console.error('❌ Error sending student email:', studentErr);
    }

    // Wait 2 seconds before sending counselor email to avoid deduplication
    console.log('⏳ Waiting 2 seconds before sending counselor email...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Send to counselor
    try {
      console.log('📤 Sending email to counselor...');
      const counselorEmailResult = await sendCounselorAcceptanceNotification(
        consultation.counselor.email,
        counselorName,
        studentName,
        consultation.student.email,
        consultation.date,
        consultation.time,
        roomData.url
      );

      if (counselorEmailResult.success) {
        console.log('✅ Counselor acceptance email sent successfully');
      } else {
        console.error('❌ Failed to send counselor acceptance email:', counselorEmailResult.error);
      }
    } catch (counselorErr) {
      console.error('❌ Error sending counselor email:', counselorErr);
    }

    console.log('📧 Email sending process completed');

    return res.json({
      success: true,
      roomUrl: roomData.url,
      roomName: roomData.name,
      expiresAt: new Date((Math.floor(Date.now() / 1000) + (24 * 60 * 60)) * 1000).toISOString()
    });

  } catch (err) {
    console.error('Error creating Daily.co room:', err);
    return res.status(500).json({ 
      error: 'Failed to create video room',
      message: err.message 
    });
  }
});

/**
 * POST /api/daily/reject-consultation
 * Reject a consultation and send notification email
 * Requires: counselor or admin role
 */
router.post('/reject-consultation', authenticateUser, requireRole('counselor', 'admin'), async (req, res) => {
  try {
    const { consultationId, reason } = req.body;

    if (!consultationId) {
      return res.status(400).json({ error: 'Consultation ID is required' });
    }

    // Fetch consultation details
    const { data: consultation, error: consultationError } = await supabase
      .from('consultations')
      .select(`
        id,
        date,
        time,
        counselor_id,
        student:student_id(name, email),
        counselor:counselor_id(name, email)
      `)
      .eq('id', consultationId)
      .single();

    if (consultationError || !consultation) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    // Check authorization
    const isAuthorized = 
      req.userRole === 'admin' || 
      consultation.counselor_id === req.user.id;

    if (!isAuthorized) {
      return res.status(403).json({ 
        error: 'Not authorized to reject this consultation' 
      });
    }

    // Update consultation status to rejected
    const { error: updateError } = await supabase
      .from('consultations')
      .update({ 
        status: 'rejected',
        video_link: null 
      })
      .eq('id', consultationId);

    if (updateError) {
      throw new Error('Failed to update consultation status');
    }

    console.log('✅ Consultation rejected:', consultationId);

    // Send rejection email to student
    try {
      const studentName = consultation.student?.name || consultation.student?.email?.split('@')[0] || 'Student';
      const counselorName = consultation.counselor?.name || consultation.counselor?.email?.split('@')[0] || 'Counselor';

      const emailResult = await sendRejectionNotification(
        consultation.student.email,
        studentName,
        counselorName,
        consultation.date,
        consultation.time,
        reason || ''
      );

      if (emailResult.success) {
        console.log('✅ Rejection email sent to student');
      } else {
        console.error('⚠️ Failed to send rejection email:', emailResult.error);
      }
    } catch (emailErr) {
      console.error('⚠️ Email sending error (non-critical):', emailErr);
    }

    return res.json({
      success: true,
      message: 'Consultation rejected and notification sent'
    });

  } catch (err) {
    console.error('Error rejecting consultation:', err);
    return res.status(500).json({ 
      error: 'Failed to reject consultation',
      message: err.message 
    });
  }
});

/**
 * GET /api/daily/room/:consultationId
 * Get existing room details for a consultation
 */
router.get('/room/:consultationId', authenticateUser, async (req, res) => {
  try {
    const { consultationId } = req.params;

    const { data: consultation, error } = await supabase
      .from('consultations')
      .select('id, video_link, student_id, counselor_id, status')
      .eq('id', consultationId)
      .single();

    if (error || !consultation) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    // Check if user has access to this consultation
    const hasAccess = 
      consultation.student_id === req.user.id ||
      consultation.counselor_id === req.user.id ||
      req.userRole === 'admin';

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!consultation.video_link) {
      return res.status(404).json({ error: 'No video room created yet' });
    }

    return res.json({
      success: true,
      roomUrl: consultation.video_link,
      status: consultation.status
    });

  } catch (err) {
    console.error('Error fetching room:', err);
    return res.status(500).json({ 
      error: 'Failed to fetch room details',
      message: err.message 
    });
  }
});

/**
 * DELETE /api/daily/room/:consultationId
 * Delete a Daily.co room (optional cleanup)
 */
router.delete('/room/:consultationId', authenticateUser, requireRole('counselor', 'admin'), async (req, res) => {
  try {
    const { consultationId } = req.params;

    const { data: consultation, error } = await supabase
      .from('consultations')
      .select('video_link, counselor_id')
      .eq('id', consultationId)
      .single();

    if (error || !consultation) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    if (!consultation.video_link) {
      return res.status(404).json({ error: 'No video room to delete' });
    }

    // Extract room name from URL
    const roomName = consultation.video_link.split('/').pop();

    // Delete room from Daily.co
    const dailyResponse = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`
      }
    });

    if (!dailyResponse.ok && dailyResponse.status !== 404) {
      throw new Error('Failed to delete room from Daily.co');
    }

    // Remove link from database
    await supabase
      .from('consultations')
      .update({ video_link: null })
      .eq('id', consultationId);

    return res.json({
      success: true,
      message: 'Room deleted successfully'
    });

  } catch (err) {
    console.error('Error deleting room:', err);
    return res.status(500).json({ 
      error: 'Failed to delete room',
      message: err.message 
    });
  }
});

module.exports = router;