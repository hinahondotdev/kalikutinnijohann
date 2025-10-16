import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Footer from '../components/Footer';
import { acceptConsultationWithRoom, rejectConsultation } from "../utils/dailyApi";
import logomark from "../assets/hinahon2.png";
import { isConsultationRequestExpired, getConsultationStatusBadge } from "../utils/consultationTimeUtils";
import {
  generateTimeOptions,
  validateTimeRange,
  minutesToTime,
  getTodayDate,
  filterExpiredSlots,
  isSlotExpired
} from "../utils/availabilityUtils";
import "../styles.css";

export default function CounselorPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("requests");
  const [consultations, setConsultations] = useState([]);
  const [history, setHistory] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [user, setUser] = useState(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [counselorNotes, setCounselorNotes] = useState("");
  const [autoRejectionCount, setAutoRejectionCount] = useState(0);

  // Filter states for history table
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [yearLevelFilter, setYearLevelFilter] = useState("all");
  const [studentNameSearch, setStudentNameSearch] = useState("");

  // NEW: Updated availability state - no date selection needed
  const [startTime, setStartTime] = useState("8:00 AM");
  const [endTime, setEndTime] = useState("5:00 PM");
  const [previewSlots, setPreviewSlots] = useState([]);
  const [availabilityMessage, setAvailabilityMessage] = useState({ type: '', text: '' });

  const timeOptions = generateTimeOptions();
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  useEffect(() => {
    getCurrentUser();
    fetchConsultations();
    fetchHistory();
    fetchAvailability();

    const intervalId = setInterval(() => {
        checkAndRejectExpiredRequests();
      }, 60000); // Check every 60 seconds

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (consultations.length > 0) {
      checkAndRejectExpiredRequests();
    }
  }, [consultations.length]);

  // NEW: Update preview when times change - filter out past slots
  useEffect(() => {
    const validation = validateTimeRange(startTime, endTime);
    if (validation.valid) {
      const todayDate = getTodayDate();
      const now = new Date();
      
      // Filter out slots that have already passed
      const futureSlots = validation.slots.filter(slot => {
        const slotDateTime = new Date(`${todayDate}T${slot.start}`);
        return slotDateTime > now;
      });
      
      setPreviewSlots(futureSlots);
      
      if (futureSlots.length === 0) {
        setAvailabilityMessage({ 
          type: 'error', 
          text: 'All time slots in this range have already passed. Please select a future time range.' 
        });
      } else if (futureSlots.length < validation.slots.length) {
        const skippedCount = validation.slots.length - futureSlots.length;
        setAvailabilityMessage({ 
          type: 'info', 
          text: `Will create ${futureSlots.length} slot(s). ${skippedCount} past slot(s) will be skipped.` 
        });
      } else {
        setAvailabilityMessage({ 
          type: 'info', 
          text: validation.message 
        });
      }
    } else {
      setPreviewSlots([]);
      setAvailabilityMessage({ type: 'error', text: validation.message });
    }
  }, [startTime, endTime]);

    const checkAndRejectExpiredRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all pending consultations for this counselor
      const { data: pendingConsultations, error } = await supabase
        .from("consultations")
        .select("id, date, time, student_id, student:student_id(name, email)")
        .eq("counselor_id", user.id)
        .eq("status", "pending");

      if (error) {
        console.error("Error fetching pending consultations:", error);
        return;
      }

      if (!pendingConsultations || pendingConsultations.length === 0) {
        return;
      }

      // Find expired requests
      const expiredRequests = pendingConsultations.filter(consultation => 
        isConsultationRequestExpired(consultation.date, consultation.time)
      );

      if (expiredRequests.length === 0) {
        return;
      }

      console.log(`🔴 Found ${expiredRequests.length} expired consultation request(s)`);

      // Auto-reject each expired request
      const rejectionReason = "This consultation request has expired. The scheduled time has passed and the counselor did not respond within the 10-minute grace period.";

      const rejectionPromises = expiredRequests.map(async (consultation) => {
        try {
          const { error: updateError } = await supabase
            .from('consultations')
            .update({ 
              status: 'rejected',
              rejection_reason: rejectionReason,
              video_link: null
            })
            .eq('id', consultation.id);

          if (updateError) {
            console.error(`Failed to auto-reject consultation ${consultation.id}:`, updateError);
            return { success: false, id: consultation.id };
          }

          console.log(`✅ Auto-rejected expired consultation ${consultation.id}`);
          return { success: true, id: consultation.id };
        } catch (err) {
          console.error(`Error auto-rejecting consultation ${consultation.id}:`, err);
          return { success: false, id: consultation.id };
        }
      });

      const results = await Promise.all(rejectionPromises);
      const successCount = results.filter(r => r.success).length;

      if (successCount > 0) {
        // Update the counter to show notification banner
        setAutoRejectionCount(prev => prev + successCount);
        
        // Refresh the data to remove expired requests from the list
        await fetchConsultations();
        await fetchHistory();

        // Show notification to user in console
        console.log(`🔔 Auto-rejected ${successCount} expired consultation request(s)`);
      }

    } catch (err) {
      console.error("Error in checkAndRejectExpiredRequests:", err);
    }
  };

  const getEmotionDisplay = (reason) => {
    const emotionMap = {
      happy: { label: "Happy", icon: "🙂", color: "#4CAF50", bg: "#e8f5e9" },
      sad: { label: "Sad", icon: "😢", color: "#2196F3", bg: "#e3f2fd" },
      angry: { label: "Angry", icon: "😡", color: "#f44336", bg: "#ffebee" },
      scared: { label: "Scared", icon: "😨", color: "#9C27B0", bg: "#f3e5f5" },
      worried: { label: "Worried", icon: "😟", color: "#FF9800", bg: "#fff3e0" },
      tired: { label: "Tired", icon: "😴", color: "#607D8B", bg: "#eceff1" },
      disgusted: { label: "Disgusted", icon: "🤢", color: "#8BC34A", bg: "#f1f8e9" },
      overwhelmed: { label: "Overwhelmed", icon: "😵", color: "#FF5722", bg: "#fbe9e7" },
      general: { label: "General Concern", icon: "💬", color: "#757575", bg: "#f5f5f5" }
    };

    return emotionMap[reason?.toLowerCase()] || emotionMap.general;
  };

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setLoading(false);
  };

  const fetchConsultations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("consultations")
        .select(`
          id,
          date,
          time,
          status,
          video_link,
          student_id,
          availability_id,
          reason,
          counselor_notes,
          meeting_ended
        `)
        .eq("counselor_id", user.id)
        .eq("status", "pending")
        .order("date", { ascending: true });

      if (error) throw error;

      const studentIds = [...new Set((data || []).map(c => c.student_id))];

      const { data: studentsData, error: studentsError } = await supabase
        .from("users")
        .select("id, name, email, department, program, year_level")
        .in("id", studentIds);

      if (studentsError) {
        console.error("Error fetching students (RLS policy issue?):", studentsError);
      }

      const studentMap = {};
      (studentsData || []).forEach(student => {
        studentMap[student.id] = {
          name: student.name || student.email?.split('@')[0] || 'Student',
          email: student.email || 'No email',
          department: student.department,
          program: student.program,
          year_level: student.year_level
        };
      });

      const consultationsWithStudents = (data || []).map(consultation => ({
        ...consultation,
        student: studentMap[consultation.student_id] || {
          name: 'Student',
          email: 'Email hidden',
          department: null,
          program: null,
          year_level: null
        }
      }));
      
      setConsultations(consultationsWithStudents);
    } catch (err) {
      console.error("Error fetching consultations:", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("consultations")
        .select(`
          id,
          date,
          time,
          status,
          video_link,
          student_id,
          availability_id,
          reason,
          rejection_reason,
          counselor_notes,
          meeting_ended
        `)
        .eq("counselor_id", user.id)
        .in("status", ["accepted", "rejected", "completed"])
        .order("date", { ascending: false });

      if (error) throw error;

      const studentIds = [...new Set((data || []).map(c => c.student_id))];

      const { data: studentsData, error: studentsError } = await supabase
        .from("users")
        .select("id, name, email, department, program, year_level")
        .in("id", studentIds);

      if (studentsError) {
        console.error("Error fetching students:", studentsError);
      }

      const studentMap = {};
      (studentsData || []).forEach(student => {
        studentMap[student.id] = {
          name: student.name || student.email?.split('@')[0] || 'Student',
          email: student.email || 'No email',
          department: student.department,
          program: student.program,
          year_level: student.year_level
        };
      });

      const historyWithStudents = (data || []).map(consultation => ({
        ...consultation,
        student: studentMap[consultation.student_id] || {
          name: 'Student',
          email: 'Email hidden',
          department: null,
          program: null,
          year_level: null
        }
      }));
      
      setHistory(historyWithStudents);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  const fetchAvailability = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const todayDate = getTodayDate();

      const { data, error } = await supabase
        .from("availability")
        .select("*")
        .eq("counselor_id", user.id)
        .eq("date", todayDate)
        .order("start_time", { ascending: true });

      if (error) throw error;
      
      // Filter out expired slots
      const activeSlots = filterExpiredSlots(data || []);
      setAvailability(activeSlots);
    } catch (err) {
      console.error("Error fetching availability:", err);
    }
  };

  // NEW: Updated addAvailability function with automatic slot generation and time validation
  const addAvailability = async (e) => {
    e.preventDefault();
    
    const validation = validateTimeRange(startTime, endTime);
    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const todayDate = getTodayDate();
      const slots = validation.slots;

      // NEW: Filter out slots that have already passed
      const now = new Date();
      const activeSlots = slots.filter(slot => {
        const slotDateTime = new Date(`${todayDate}T${slot.start}`);
        return slotDateTime > now;
      });

      if (activeSlots.length === 0) {
        setAvailabilityMessage({
          type: 'error',
          text: 'All time slots in this range have already passed. Please select a future time range.'
        });
        return;
      }

      // Show warning if some slots were filtered out
      if (activeSlots.length < slots.length) {
        const skippedCount = slots.length - activeSlots.length;
        console.log(`⚠️ Skipped ${skippedCount} past time slot(s)`);
      }

      // Prepare data for insertion
      const availabilityData = activeSlots.map(slot => ({
        counselor_id: user.id,
        date: todayDate,
        start_time: slot.start,
        end_time: slot.end,
        is_booked: false
      }));

      const { error } = await supabase
        .from("availability")
        .insert(availabilityData);

      if (error) {
        if (error.code === '23505') {
          alert("One or more time slots already exist.");
          return;
        }
        throw error;
      }

      const message = activeSlots.length < slots.length
        ? `Successfully added ${activeSlots.length} availability slot(s)! (${slots.length - activeSlots.length} past slot(s) were skipped)`
        : `Successfully added ${activeSlots.length} availability slot(s)!`;

      setAvailabilityMessage({
        type: 'success',
        text: message
      });
      setPreviewSlots([]);
      fetchAvailability();
      
      // Reset message after 5 seconds
      setTimeout(() => {
        setAvailabilityMessage({ type: '', text: '' });
      }, 5000);
      
    } catch (err) {
      console.error("Error adding availability:", err);
      alert("Failed to add availability: " + err.message);
    }
  };

  const deleteAvailabilitySlot = async (slotId) => {
    if (!window.confirm("Are you sure you want to delete this time slot?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("availability")
        .delete()
        .eq("id", slotId)
        .eq("is_booked", false);

      if (error) throw error;
      fetchAvailability();
      alert("Time slot deleted successfully!");
    } catch (err) {
      console.error("Error deleting availability:", err);
      alert("Failed to delete time slot.");
    }
  };

  // NEW: Clear all unbooked slots for today
  const clearAllUnbookedSlots = async () => {
    if (!window.confirm("Are you sure you want to clear all unbooked slots for today?")) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const todayDate = getTodayDate();

      const { error } = await supabase
        .from("availability")
        .delete()
        .eq("counselor_id", user.id)
        .eq("date", todayDate)
        .eq("is_booked", false);

      if (error) throw error;
      
      setAvailabilityMessage({
        type: 'success',
        text: 'All unbooked slots cleared successfully!'
      });
      fetchAvailability();

      setTimeout(() => {
        setAvailabilityMessage({ type: '', text: '' });
      }, 5000);
    } catch (err) {
      console.error("Error clearing availability:", err);
      alert("Failed to clear slots: " + err.message);
    }
  };

  const handleAccept = async (consultationId) => {
    if (!window.confirm('Accept this consultation and create video room?')) {
      return;
    }

    setProcessingId(consultationId);
    
    try {
      const { data: currentConsultation, error: fetchError } = await supabase
        .from('consultations')
        .select('id, date, time, counselor_id, availability_id')
        .eq('id', consultationId)
        .single();

      if (fetchError || !currentConsultation) {
        throw new Error('Failed to fetch consultation details');
      }

      console.log('📅 Accepting consultation:', currentConsultation);

      const { data: overlappingConsultations, error: overlapError } = await supabase
        .from('consultations')
        .select('id, student_id, student:student_id(name, email)')
        .eq('counselor_id', currentConsultation.counselor_id)
        .eq('date', currentConsultation.date)
        .eq('time', currentConsultation.time)
        .eq('status', 'pending')
        .neq('id', consultationId);

      if (overlapError) {
        console.error('Error finding overlapping consultations:', overlapError);
      }

      console.log(`Found ${overlappingConsultations?.length || 0} overlapping consultations to reject`);

      const result = await acceptConsultationWithRoom(consultationId);
      
      if (!result.success) {
        alert(`❌ Error: ${result.error}`);
        setProcessingId(null);
        return;
      }

      console.log('✅ Consultation accepted and room created');

      if (currentConsultation.availability_id) {
        const { error: availabilityError } = await supabase
          .from('availability')
          .update({ is_booked: true })
          .eq('id', currentConsultation.availability_id);

        if (availabilityError) {
          console.error('⚠️ Warning: Failed to mark slot as booked:', availabilityError);
        } else {
          console.log('✅ Availability slot marked as booked');
        }
      }

      if (overlappingConsultations && overlappingConsultations.length > 0) {
        console.log(`🔄 Rejecting ${overlappingConsultations.length} overlapping bookings...`);

        const rejectionReason = `This time slot has been booked by another student. The counselor has already accepted a consultation for ${currentConsultation.date} at ${currentConsultation.time}.`;

        const { error: bulkRejectError } = await supabase
          .from('consultations')
          .update({ 
            status: 'rejected',
            rejection_reason: rejectionReason,
            video_link: null
          })
          .in('id', overlappingConsultations.map(c => c.id));

        if (bulkRejectError) {
          console.error('⚠️ Warning: Failed to auto-reject overlapping consultations:', bulkRejectError);
        } else {
          console.log(`✅ Successfully rejected ${overlappingConsultations.length} overlapping consultations`);
        }
      }

      await fetchConsultations();
      await fetchHistory();
      await fetchAvailability();

      alert(`✅ Consultation accepted!\n\nVideo room created: ${result.roomUrl}\n\nThe student will receive this link via email.${overlappingConsultations?.length > 0 ? `\n\n${overlappingConsultations.length} overlapping booking(s) have been automatically rejected.` : ''}`);

    } catch (err) {
      console.error('❌ Error accepting consultation:', err);
      alert('Failed to accept consultation: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (consultationId) => {
    const reason = window.prompt('Enter rejection reason (optional):');
    
    if (reason === null) return;

    setProcessingId(consultationId);
    
    try {
      const result = await rejectConsultation(consultationId, reason);
      
      if (result.success) {
        alert('✅ Consultation rejected');
        await fetchConsultations();
        await fetchHistory();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (err) {
      console.error('Error rejecting consultation:', err);
      alert('Failed to reject consultation');
    } finally {
      setProcessingId(null);
    }
  };

  // NEW FUNCTION: Bulk reject all pending consultations
  const handleBulkRejectAll = async () => {
    if (consultations.length === 0) return;

    const confirmMessage = `Are you sure you want to reject all ${consultations.length} pending consultation request(s)?\n\nReason: Unable to accommodate consultations due to unforeseen circumstances.\n\nThis action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setProcessingId('bulk-reject'); // Use a special ID to disable all buttons
    
    try {
      const rejectionReason = "We regret to inform you that the counselor is currently unable to accommodate consultation requests due to unforeseen circumstances. We apologize for any inconvenience and encourage you to book with another available counselor or try again at a later time.";

      console.log(`🔄 Bulk rejecting ${consultations.length} consultation(s)...`);

      // Reject all consultations
      const rejectionPromises = consultations.map(async (consultation) => {
        try {
          const result = await rejectConsultation(consultation.id, rejectionReason);
          
          if (result.success) {
            console.log(`✅ Rejected consultation ${consultation.id}`);
            return { success: true, id: consultation.id };
          } else {
            console.error(`❌ Failed to reject consultation ${consultation.id}:`, result.error);
            return { success: false, id: consultation.id, error: result.error };
          }
        } catch (err) {
          console.error(`❌ Error rejecting consultation ${consultation.id}:`, err);
          return { success: false, id: consultation.id, error: err.message };
        }
      });

      const results = await Promise.all(rejectionPromises);
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      // Refresh data
      await fetchConsultations();
      await fetchHistory();

      if (failureCount === 0) {
        alert(`✅ Successfully rejected all ${successCount} consultation request(s)!\n\nStudents have been notified via email.`);
      } else {
        alert(`⚠️ Bulk rejection completed:\n\n✅ ${successCount} rejected successfully\n❌ ${failureCount} failed\n\nPlease check the remaining requests.`);
      }

    } catch (err) {
      console.error('❌ Error in bulk rejection:', err);
      alert('Failed to reject consultations: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };


  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleEndMeeting = async (consultationId) => {
    if (!window.confirm('Are you sure you want to end this meeting? This will close the video room for both you and the student.')) {
      return;
    }

    setProcessingId(consultationId);
    
    try {
      const { error: updateError } = await supabase
        .from('consultations')
        .update({ 
          status: 'completed',
          meeting_ended: true,
          video_link: null
        })
        .eq('id', consultationId);

      if (updateError) {
        throw updateError;
      }

      alert('✅ Meeting ended successfully!');
      await fetchConsultations();
      await fetchHistory();
    } catch (err) {
      console.error('❌ Error ending meeting:', err);
      alert('Failed to end meeting: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const openNotesModal = (consultation) => {
    setSelectedConsultation(consultation);
    setCounselorNotes(consultation.counselor_notes || '');
    setShowNotesModal(true);
  };

  const closeNotesModal = () => {
    setShowNotesModal(false);
    setSelectedConsultation(null);
    setCounselorNotes('');
  };

  const handleSaveNotes = async () => {
    if (!selectedConsultation) return;

    try {
      const { error } = await supabase
        .from('consultations')
        .update({ 
          counselor_notes: counselorNotes
        })
        .eq('id', selectedConsultation.id);

      if (error) throw error;

      alert('✅ Notes saved successfully!');
      closeNotesModal();
      await fetchConsultations();
      await fetchHistory();
    } catch (err) {
      console.error('Error saving notes:', err);
      alert('Failed to save notes: ' + err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return minutesToTime(hours * 60 + minutes, false);
  };

  const getStatusBadgeStyle = (status, date, time) => {
    const badgeInfo = getConsultationStatusBadge(status, date, time);
    return {
      padding: "4px 12px",
      borderRadius: "12px",
      fontSize: "12px",
      fontWeight: "600",
      textTransform: "uppercase",
      backgroundColor: badgeInfo.bg,
      color: badgeInfo.color
    };
  };

  // Filter and separate history
  const filteredHistory = history.filter(consultation => {
    const matchesDepartment = departmentFilter === 'all' || consultation.student?.department === departmentFilter;
    const matchesYearLevel = yearLevelFilter === 'all' || consultation.student?.year_level === parseInt(yearLevelFilter);
    const matchesName = studentNameSearch === '' || 
      (consultation.student?.name && consultation.student.name.toLowerCase().includes(studentNameSearch.toLowerCase())) ||
      (consultation.student?.email && consultation.student.email.toLowerCase().includes(studentNameSearch.toLowerCase()));
    return matchesDepartment && matchesYearLevel && matchesName;
  });

  const isConsultationActive = (consultation) => {
    if (consultation.meeting_ended) return false;
    if (!consultation.video_link) return false;
    
    const consultationDateTime = new Date(`${consultation.date}T${consultation.time}`);
    const now = new Date();
    
    const endTime = new Date(consultationDateTime.getTime() + (1 * 60 * 60 * 1000));
    const startBuffer = new Date(consultationDateTime.getTime() - (10 * 60 * 1000));
    
    return now >= startBuffer && now <= endTime;
  };

  const isConsultationScheduled = (consultation) => {
    if (consultation.meeting_ended) return false;
    if (!consultation.video_link) return false;
    
    const consultationDateTime = new Date(`${consultation.date}T${consultation.time}`);
    const now = new Date();
    
    const startBuffer = new Date(consultationDateTime.getTime() - (10 * 60 * 1000));
    
    return now < startBuffer;
  };

  const isConsultationExpired = (consultation) => {
    if (consultation.meeting_ended) return true;
    if (!consultation.video_link) return true;
    
    const consultationDateTime = new Date(`${consultation.date}T${consultation.time}`);
    const now = new Date();
    
    const endTime = new Date(consultationDateTime.getTime() + (1 * 60 * 60 * 1000));
    
    return now > endTime;
  };

  const ongoingConsultations = filteredHistory.filter(c => {
    if (c.status !== 'accepted') return false;
    return !isConsultationExpired(c);
  });
  
  const completedRejectedConsultations = filteredHistory
  .filter(c => {
    if (c.status === 'completed' || c.status === 'rejected') return true;
    if (c.status === 'accepted') {
      return isConsultationExpired(c);
    }
    return false;
  })
  .sort((a, b) => {
    // Sort by date and time (most recent first)
    const dateA = new Date(`${a.date}T${a.time}`);
    const dateB = new Date(`${b.date}T${b.time}`);
    return dateB - dateA; // Descending order (newest first)
  });

  const departments = [...new Set(history.map(c => c.student?.department).filter(Boolean))];
  const yearLevels = [...new Set(history.map(c => c.student?.year_level).filter(Boolean))];

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div className="text-center">
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid var(--pink)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="landing-root">
      <header className="landing-header">
   <div
      className="header-left"
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: "10px",
      }}
    >
    <img
      src={logomark}
      alt="Hinahon Logo"
      style={{
        height: "45px",
        width: "45px",
        objectFit: "contain",
        display: "inline-block",
        verticalAlign: "middle",
      }}
    />
  
  <div style={{ lineHeight: "1.2" }}>
    <div
      style={{
        fontWeight: "700",
        fontSize: "22px",
        color: "#e91e63",
        margin: 0,
        padding: 0,
      }}
    >
      Hinahon
    </div>
    <div
      style={{
        fontSize: "13px",
        color: "#666",
        margin: 0,
        padding: 0,
      }}
    >
      Thank you for your Service!
    </div>
  </div>
</div>
        <div className="header-right">
          <span style={{ color: "#666", fontSize: "14px", marginRight: "16px" }}>
            {user?.email}
          </span>
          <button className="btn-logout" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </header>

      <main style={{ padding: "40px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        {/* NEW: Auto-rejection notification banner */}
        {autoRejectionCount > 0 && (
          <div style={{
            backgroundColor: "#fff3cd",
            border: "1px solid #ffc107",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <span style={{ fontSize: "24px" }}>⏰</span>
            <div>
              <strong style={{ color: "#856404" }}>Expired Requests Auto-Rejected</strong>
              <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#856404" }}>
                {autoRejectionCount} consultation request(s) were automatically rejected because the scheduled time had passed without a response.
              </p>
            </div>
            <button
              onClick={() => setAutoRejectionCount(0)}
              style={{
                marginLeft: "auto",
                padding: "6px 12px",
                backgroundColor: "transparent",
                border: "1px solid #856404",
                borderRadius: "4px",
                color: "#856404",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600"
              }}
            >
              Dismiss
            </button>
          </div>
        )}
        
        <div style={{ 
          display: "flex", 
          marginBottom: "32px", 
          borderBottom: "1px solid #e0e0e0" 
        }}>
          <button
            onClick={() => setActiveTab("requests")}
            style={{
              padding: "12px 24px",
              border: "none",
              background: "none",
              cursor: "pointer",
              borderBottom: activeTab === "requests" ? "3px solid var(--teal)" : "none",
              color: activeTab === "requests" ? "var(--teal)" : "#666",
              fontWeight: activeTab === "requests" ? "600" : "400",
              fontSize: "16px"
            }}
          >
            Consultation Requests
            {consultations.length > 0 && (
              <span style={{
                marginLeft: "8px",
                backgroundColor: "var(--pink)",
                color: "white",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "700"
              }}>
                {consultations.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            style={{
              padding: "12px 24px",
              border: "none",
              background: "none",
              cursor: "pointer",
              borderBottom: activeTab === "history" ? "3px solid var(--teal)" : "none",
              color: activeTab === "history" ? "var(--teal)" : "#666",
              fontWeight: activeTab === "history" ? "600" : "400",
              fontSize: "16px"
            }}
          >
            Consultation History
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            style={{
              padding: "12px 24px",
              border: "none",
              background: "none",
              cursor: "pointer",
              borderBottom: activeTab === "calendar" ? "3px solid var(--teal)" : "none",
              color: activeTab === "calendar" ? "var(--teal)" : "#666",
              fontWeight: activeTab === "calendar" ? "600" : "400",
              fontSize: "16px"
            }}
          >
            Calendar & Availability
          </button>
        </div>

        {/* REQUESTS TAB */}
        {activeTab === "requests" && (
          <div>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              marginBottom: "24px" 
            }}>
              <h2 style={{ color: "var(--pink)", margin: 0 }}>
                Pending Consultation Requests
              </h2>
              
              {/* NEW: Bulk Reject Button */}
              {consultations.length > 0 && (
                <button
                  onClick={handleBulkRejectAll}
                  disabled={processingId !== null}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#ff6b6b",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: processingId !== null ? "not-allowed" : "pointer",
                    fontWeight: "600",
                    fontSize: "14px",
                    opacity: processingId !== null ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  <span>🚫</span>
                  <span>Reject All Requests</span>
                </button>
              )}
            </div>
            
            {consultations.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                padding: "40px", 
                backgroundColor: "#f9f9f9", 
                borderRadius: "12px" 
              }}>
                <p style={{ color: "#666", fontSize: "16px" }}>
                  No pending consultation requests.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "16px" }}>
                {consultations.map((consultation) => {
                  // NEW: Check if this request is expired
                  const isExpired = isConsultationRequestExpired(consultation.date, consultation.time);
                  
                  return (
                    <div
                      key={consultation.id}
                      style={{
                        backgroundColor: "white",
                        padding: "24px",
                        borderRadius: "12px",
                        boxShadow: "var(--card-shadow)",
                        border: "1px solid #f0f0f0",
                        borderLeft: isExpired ? "4px solid #ff6b6b" : "4px solid var(--teal)",
                        opacity: isExpired ? 0.7 : 1
                      }}
                    >
                      {/* NEW: Expired warning banner */}
                      {isExpired && (
                        <div style={{
                          backgroundColor: "#ffebee",
                          border: "1px solid #ef5350",
                          borderRadius: "6px",
                          padding: "10px 12px",
                          marginBottom: "16px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px"
                        }}>
                          <span style={{ fontSize: "18px" }}>⏰</span>
                          <span style={{ fontSize: "13px", fontWeight: "600", color: "#c62828" }}>
                            This request has expired. It will be automatically rejected shortly.
                          </span>
                        </div>
                      )}

                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "16px"
                      }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: "0 0 8px 0", color: "var(--text)" }}>
                            👤 {consultation.student?.name || "Student"}
                          </h3>
                          <p style={{ margin: "0 0 12px 0", color: "#888", fontSize: "13px" }}>
                            {consultation.student?.email}
                          </p>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                            <p style={{ margin: "0", color: "#666" }}>
                              📅 {formatDate(consultation.date)}
                            </p>
                            <p style={{ margin: "0", color: "#666" }}>
                              🕐 {formatTime(consultation.time)}
                            </p>
                          </div>
                          <div style={{
                            backgroundColor: "#f8f9fa",
                            padding: "12px",
                            borderRadius: "8px",
                            marginBottom: "12px"
                          }}>
                            <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", fontWeight: "600", color: "#555" }}>
                              Student Information
                            </h4>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                              <div>
                                <p style={{ margin: "0 0 4px 0", fontSize: "11px", color: "#888" }}>Department</p>
                                <p style={{ margin: "0", fontSize: "14px", fontWeight: "600", color: "#333" }}>
                                  {consultation.student?.department || 'Not specified'}
                                </p>
                              </div>
                              <div>
                                <p style={{ margin: "0 0 4px 0", fontSize: "11px", color: "#888" }}>Program</p>
                                <p style={{ margin: "0", fontSize: "14px", fontWeight: "600", color: "#333" }}>
                                  {consultation.student?.program || 'Not specified'}
                                </p>
                              </div>
                              <div>
                                <p style={{ margin: "0 0 4px 0", fontSize: "11px", color: "#888" }}>Year Level</p>
                                <p style={{ margin: "0", fontSize: "14px", fontWeight: "600", color: "#333" }}>
                                  {consultation.student?.year_level || 'Not specified'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {consultation.reason && (
                            <div style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "10px 16px",
                              backgroundColor: getEmotionDisplay(consultation.reason).bg,
                              borderRadius: "8px",
                              marginBottom: "16px"
                            }}>
                              <span style={{ fontSize: "24px" }}>{getEmotionDisplay(consultation.reason).icon}</span>
                              <div>
                                <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}>
                                  Reason
                                </div>
                                <div style={{ fontSize: "15px", fontWeight: "700" }}>
                                  {getEmotionDisplay(consultation.reason).label}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div style={getStatusBadgeStyle(consultation.status, consultation.date, consultation.time)}>
                          {getConsultationStatusBadge(consultation.status, consultation.date, consultation.time).text}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                        <button
                          onClick={() => handleAccept(consultation.id)}
                          disabled={processingId === consultation.id || isExpired}
                          className="btn-action accept"
                          style={{
                            opacity: (processingId === consultation.id || isExpired) ? 0.6 : 1,
                            cursor: (processingId === consultation.id || isExpired) ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {processingId === consultation.id ? '⏳ Processing...' : '✓ Accept'}
                        </button>
                        <button
                          onClick={() => handleReject(consultation.id)}
                          disabled={processingId === consultation.id || isExpired}
                          className="btn-action reject"
                          style={{
                            cursor: (processingId === consultation.id || isExpired) ? 'not-allowed' : 'pointer',
                            opacity: (processingId === consultation.id || isExpired) ? 0.6 : 1
                          }}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div>
            <h2 style={{ color: "var(--pink)", marginBottom: "24px" }}>
              Consultation History
            </h2>

            {history.length > 0 && (
              <div style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "12px",
                boxShadow: "var(--card-shadow)",
                marginBottom: "24px"
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px" }}>
                      Search by Student Name
                    </label>
                    <input
                      type="text"
                      value={studentNameSearch}
                      onChange={(e) => setStudentNameSearch(e.target.value)}
                      placeholder="Type student name or email..."
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1px solid #e0e0e0",
                        fontSize: "14px"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px" }}>
                      Filter by Department
                    </label>
                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #e0e0e0",
                        fontSize: "14px"
                      }}
                    >
                      <option value="all">All Departments</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px" }}>
                      Filter by Year Level
                    </label>
                    <select
                      value={yearLevelFilter}
                      onChange={(e) => setYearLevelFilter(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #e0e0e0",
                        fontSize: "14px"
                      }}
                    >
                      <option value="all">All Year Levels</option>
                      {yearLevels.map(year => (
                        <option key={year} value={year}>
                          {year === 1 ? '1st Year' : 
                           year === 2 ? '2nd Year' : 
                           year === 3 ? '3rd Year' : 
                           year === 4 ? '4th Year' : 
                           year === 5 ? '5th Year' : 
                           'Graduate Level'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {(studentNameSearch || departmentFilter !== 'all' || yearLevelFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setStudentNameSearch('');
                      setDepartmentFilter('all');
                      setYearLevelFilter('all');
                    }}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#f0f0f0",
                      color: "#666",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "600"
                    }}
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            )}

            {filteredHistory.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                padding: "40px", 
                backgroundColor: "#f9f9f9", 
                borderRadius: "12px" 
              }}>
                <p style={{ color: "#666", fontSize: "16px" }}>
                  No consultation history matching your filters.
                </p>
              </div>
            ) : (
              <>
                {ongoingConsultations.length > 0 && (
                  <div style={{ marginBottom: "40px" }}>
                    <h3 style={{ marginBottom: "16px", color: "var(--text)", fontSize: "20px", fontWeight: "600" }}>
                      🟢 Ongoing / Scheduled Consultations
                    </h3>
                    <div style={{ display: "grid", gap: "16px" }}>
                      {ongoingConsultations.map((consultation) => (
                        <div
                          key={consultation.id}
                          style={{
                            backgroundColor: "white",
                            padding: "24px",
                            borderRadius: "12px",
                            boxShadow: "var(--card-shadow)",
                            border: "1px solid #f0f0f0",
                            borderLeft: "4px solid #28a745"
                          }}
                        >
                          <div style={{ 
                            display: "flex", 
                            justifyContent: "space-between", 
                            alignItems: "flex-start",
                            marginBottom: "16px"
                          }}>
                            <div style={{ flex: 1 }}>
                              <h3 style={{ margin: "0 0 8px 0", color: "var(--text)" }}>
                                👤 {consultation.student?.name || "Student"}
                              </h3>
                              <p style={{ margin: "0 0 12px 0", color: "#888", fontSize: "13px" }}>
                                {consultation.student?.email}
                              </p>
                              
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                                <p style={{ margin: "0", color: "#666" }}>
                                  📅 {formatDate(consultation.date)}
                                </p>
                                <p style={{ margin: "0", color: "#666" }}>
                                  🕐 {formatTime(consultation.time)}
                                </p>
                              </div>

                              <div style={{
                                backgroundColor: "#f8f9fa",
                                padding: "12px",
                                borderRadius: "8px",
                                marginBottom: "12px"
                              }}>
                                <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", fontWeight: "600", color: "#555" }}>
                                  Student Information
                                </h4>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                                  <div>
                                    <p style={{ margin: "0 0 4px 0", fontSize: "11px", color: "#888" }}>Department</p>
                                    <p style={{ margin: "0", fontSize: "14px", fontWeight: "600", color: "#333" }}>
                                      {consultation.student?.department || 'Not specified'}
                                    </p>
                                  </div>
                                  <div>
                                    <p style={{ margin: "0 0 4px 0", fontSize: "11px", color: "#888" }}>Program</p>
                                    <p style={{ margin: "0", fontSize: "14px", fontWeight: "600", color: "#333" }}>
                                      {consultation.student?.program || 'Not specified'}
                                    </p>
                                  </div>
                                  <div>
                                    <p style={{ margin: "0 0 4px 0", fontSize: "11px", color: "#888" }}>Year Level</p>
                                    <p style={{ margin: "0", fontSize: "14px", fontWeight: "600", color: "#333" }}>
                                      {consultation.student?.year_level || 'Not specified'}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {consultation.reason && (
                                <div style={{
                                  backgroundColor: "#fff9e6",
                                  padding: "12px",
                                  borderRadius: "8px",
                                  marginBottom: "12px"
                                }}>
                                  <p style={{ margin: "0 0 4px 0", fontSize: "13px", fontWeight: "600", color: "#555" }}>
                                    Reason for Consultation:
                                  </p>
                                  <p style={{ margin: "0", fontSize: "14px", color: "#666" }}>
                                    {consultation.reason}
                                  </p>
                                </div>
                              )}

                              {consultation.counselor_notes && (
                                <div style={{
                                  backgroundColor: "#e8f5e9",
                                  padding: "12px",
                                  borderRadius: "8px",
                                  marginBottom: "12px"
                                }}>
                                  <p style={{ margin: "0 0 4px 0", fontSize: "13px", fontWeight: "600", color: "#2e7d32" }}>
                                    📝 Counselor Notes:
                                  </p>
                                  <p style={{ margin: "0", fontSize: "14px", color: "#666", whiteSpace: "pre-wrap" }}>
                                    {consultation.counselor_notes}
                                  </p>
                                </div>
                              )}
                              
                              {consultation.video_link && !consultation.meeting_ended && (
                                <div style={{ marginTop: "12px" }}>
                                  {isConsultationActive(consultation) ? (
                                    <>
                                      <a 
                                        href={consultation.video_link} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        style={{ 
                                          color: "var(--teal)", 
                                          textDecoration: "underline",
                                          fontWeight: "600",
                                          display: "inline-block"
                                        }}
                                      >
                                        🎥 Join Video Session
                                      </a>
                                      <p style={{ 
                                        margin: "4px 0 0 0", 
                                        fontSize: "12px", 
                                        color: "#28a745",
                                        fontStyle: "italic"
                                      }}>
                                        Session is now available
                                      </p>
                                    </>
                                  ) : isConsultationScheduled(consultation) ? (
                                    <>
                                      <span style={{ 
                                        color: "#856404",
                                        fontSize: "14px",
                                        fontStyle: "italic",
                                        fontWeight: "600"
                                      }}>
                                        📅 Scheduled Session
                                      </span>
                                      <p style={{ 
                                        margin: "4px 0 0 0", 
                                        fontSize: "12px", 
                                        color: "#856404",
                                        fontStyle: "italic"
                                      }}>
                                        Video link will be available 10 minutes before scheduled time
                                      </p>
                                    </>
                                  ) : (
                                    <>
                                      <span style={{ 
                                        color: "#999",
                                        fontSize: "14px",
                                        fontStyle: "italic"
                                      }}>
                                        🎥 Video link unavailable
                                      </span>
                                      <p style={{ 
                                        margin: "4px 0 0 0", 
                                        fontSize: "12px", 
                                        color: "#856404",
                                        fontStyle: "italic"
                                      }}>
                                        Session time has passed
                                      </p>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                            <div style={getStatusBadgeStyle(consultation.status, consultation.date, consultation.time)}>
                              {getConsultationStatusBadge(consultation.status, consultation.date, consultation.time).text}
                            </div>
                          </div>

                          {consultation.video_link && !consultation.meeting_ended && isConsultationActive(consultation) && (
                            <div style={{ display: "flex", gap: "12px", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #f0f0f0" }}>
                              <button
                                onClick={() => handleEndMeeting(consultation.id)}
                                disabled={processingId === consultation.id}
                                style={{
                                  flex: 1,
                                  padding: "10px 16px",
                                  backgroundColor: "#ff6b6b",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: processingId === consultation.id ? 'not-allowed' : 'pointer',
                                  fontWeight: "600",
                                  opacity: processingId === consultation.id ? 0.6 : 1,
                                  fontSize: "14px"
                                }}
                              >
                                {processingId === consultation.id ? '⏳ Ending...' : '🔴 End Meeting'}
                              </button>
                              <button
                                onClick={() => openNotesModal(consultation)}
                                style={{
                                  flex: 1,
                                  padding: "10px 16px",
                                  backgroundColor: "#4CAF50",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  fontWeight: "600",
                                  fontSize: "14px"
                                }}
                              >
                                📝 {consultation.counselor_notes ? 'Edit Notes' : 'Add Notes'}
                              </button>
                            </div>
                          )}

                          {consultation.video_link && !consultation.meeting_ended && isConsultationScheduled(consultation) && (
                            <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #f0f0f0" }}>
                              <button
                                onClick={() => openNotesModal(consultation)}
                                style={{
                                  padding: "10px 16px",
                                  backgroundColor: "#4CAF50",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  fontWeight: "600",
                                  fontSize: "14px"
                                }}
                              >
                                📝 {consultation.counselor_notes ? 'Edit Notes' : 'Add Notes'}
                              </button>
                            </div>
                          )}

                          {(!consultation.video_link || consultation.meeting_ended) && (
                            <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #f0f0f0" }}>
                              <button
                                onClick={() => openNotesModal(consultation)}
                                style={{
                                  padding: "10px 16px",
                                  backgroundColor: "#4CAF50",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  fontWeight: "600",
                                  fontSize: "14px"
                                }}
                              >
                                📝 {consultation.counselor_notes ? 'Edit Notes' : 'Add Notes'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {completedRejectedConsultations.length > 0 && (
                  <div>
                    <h3 style={{ marginBottom: "16px", color: "var(--text)", fontSize: "20px", fontWeight: "600" }}>
                      📋 Completed & Rejected Consultations
                    </h3>
                    <div style={{
                      backgroundColor: "white",
                      borderRadius: "12px",
                      boxShadow: "var(--card-shadow)",
                      overflow: "hidden"
                    }}>
                      <div style={{ 
                        overflowY: "auto", 
                        maxHeight: "500px"
                      }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead style={{ 
                            backgroundColor: "#f8f9fa",
                            position: "sticky",
                            top: 0,
                            zIndex: 10
                          }}>
                            <tr>
                              <th style={{ 
                                padding: "16px", 
                                textAlign: "left", 
                                fontSize: "12px", 
                                fontWeight: "700", 
                                color: "#666",
                                textTransform: "uppercase",
                                borderBottom: "2px solid #e0e0e0"
                              }}>
                                Student Name
                              </th>
                              <th style={{ 
                                padding: "16px", 
                                textAlign: "left", 
                                fontSize: "12px", 
                                fontWeight: "700", 
                                color: "#666",
                                textTransform: "uppercase",
                                borderBottom: "2px solid #e0e0e0"
                              }}>
                                Department
                              </th>
                              <th style={{ 
                                padding: "16px", 
                                textAlign: "left", 
                                fontSize: "12px", 
                                fontWeight: "700", 
                                color: "#666",
                                textTransform: "uppercase",
                                borderBottom: "2px solid #e0e0e0"
                              }}>
                                Year Level
                              </th>
                              <th style={{ 
                                padding: "16px", 
                                textAlign: "left", 
                                fontSize: "12px", 
                                fontWeight: "700", 
                                color: "#666",
                                textTransform: "uppercase",
                                borderBottom: "2px solid #e0e0e0"
                              }}>
                                Date & Time
                              </th>
                              <th style={{ 
                                padding: "16px", 
                                textAlign: "center", 
                                fontSize: "12px", 
                                fontWeight: "700", 
                                color: "#666",
                                textTransform: "uppercase",
                                borderBottom: "2px solid #e0e0e0"
                              }}>
                                Reason
                              </th>
                              <th style={{ 
                                padding: "16px", 
                                textAlign: "center", 
                                fontSize: "12px", 
                                fontWeight: "700", 
                                color: "#666",
                                textTransform: "uppercase",
                                borderBottom: "2px solid #e0e0e0"
                              }}>
                                Status
                              </th>
                              <th style={{ 
                                padding: "16px", 
                                textAlign: "left", 
                                fontSize: "12px", 
                                fontWeight: "700", 
                                color: "#666",
                                textTransform: "uppercase",
                                borderBottom: "2px solid #e0e0e0"
                              }}>
                                Remark / Note
                              </th>
                              <th style={{ 
                                padding: "16px", 
                                textAlign: "center", 
                                fontSize: "12px", 
                                fontWeight: "700", 
                                color: "#666",
                                textTransform: "uppercase",
                                borderBottom: "2px solid #e0e0e0"
                              }}>
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {completedRejectedConsultations.map((consultation) => {
                              const emotionData = getEmotionDisplay(consultation.reason);
                              
                              return (
                                <tr 
                                  key={consultation.id} 
                                  style={{ 
                                    borderBottom: "1px solid #f0f0f0",
                                    transition: "background-color 0.2s"
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
                                >
                                  <td style={{ padding: "16px" }}>
                                    <div>
                                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#333", marginBottom: "4px" }}>
                                        {consultation.student?.name || "Student"}
                                      </div>
                                      <div style={{ fontSize: "13px", color: "#888" }}>
                                        {consultation.student?.email}
                                      </div>
                                    </div>
                                  </td>
                                  
                                  <td style={{ padding: "16px", fontSize: "14px", color: "#333" }}>
                                    {consultation.student?.department || 'Not specified'}
                                  </td>
                                  
                                  <td style={{ padding: "16px", fontSize: "14px", color: "#333" }}>
                                    {consultation.student?.year_level || 'Not specified'}
                                  </td>
                                  
                                  <td style={{ padding: "16px" }}>
                                    <div style={{ fontSize: "14px", color: "#333", marginBottom: "2px" }}>
                                      {formatDate(consultation.date)}
                                    </div>
                                    <div style={{ fontSize: "13px", color: "#888" }}>
                                      {formatTime(consultation.time)}
                                    </div>
                                  </td>
                                  
                                  <td style={{ padding: "16px", textAlign: "center" }}>
                                    {consultation.reason ? (
                                      <div style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "6px 12px",
                                        backgroundColor: emotionData.bg,
                                        borderRadius: "20px",
                                        border: `1px solid ${emotionData.color}30`
                                      }}>
                                        <span style={{ fontSize: "18px" }}>
                                          {emotionData.icon}
                                        </span>
                                        <span style={{ 
                                          fontSize: "13px", 
                                          fontWeight: "600",
                                          color: emotionData.color
                                        }}>
                                          {emotionData.label}
                                        </span>
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: "13px", color: "#999", fontStyle: "italic" }}>
                                        No reason
                                      </span>
                                    )}
                                  </td>
                                  
                                  <td style={{ padding: "16px", textAlign: "center" }}>
                                    <span style={{
                                      padding: "6px 12px",
                                      borderRadius: "12px",
                                      fontSize: "11px",
                                      fontWeight: "700",
                                      textTransform: "uppercase",
                                      backgroundColor: consultation.status === 'rejected' ? '#ffebee' : '#e3f2fd',
                                      color: consultation.status === 'rejected' ? '#c62828' : '#1976d2',
                                      display: "inline-block"
                                    }}>
                                      {consultation.status === 'rejected' ? '✕ Rejected' : '✓ Completed'}
                                    </span>
                                  </td>
                                  
                                  <td style={{ padding: "16px", fontSize: "14px", color: "#666", maxWidth: "300px" }}>
                                    {consultation.status === 'rejected' && consultation.rejection_reason ? (
                                      <div>
                                        <span style={{ fontWeight: "600", color: "#c62828" }}>Rejection: </span>
                                        {consultation.rejection_reason}
                                      </div>
                                    ) : consultation.counselor_notes ? (
                                      <div>
                                        <span style={{ fontWeight: "600", color: "#2e7d32" }}>Notes: </span>
                                        {consultation.counselor_notes.length > 100 
                                          ? consultation.counselor_notes.substring(0, 100) + '...' 
                                          : consultation.counselor_notes}
                                      </div>
                                    ) : (
                                      <span style={{ fontStyle: "italic", color: "#999" }}>No remarks</span>
                                    )}
                                  </td>
                                  
                                  <td style={{ padding: "16px", textAlign: "center" }}>
                                    <button
                                      onClick={() => openNotesModal(consultation)}
                                      style={{
                                        padding: "8px 16px",
                                        backgroundColor: "#4CAF50",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        fontWeight: "600",
                                        fontSize: "13px"
                                      }}
                                    >
                                      📝 {consultation.counselor_notes ? 'Edit' : 'Add'} Notes
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {completedRejectedConsultations.length > 5 && (
                        <div style={{
                          padding: "12px",
                          backgroundColor: "#f8f9fa",
                          textAlign: "center",
                          fontSize: "13px",
                          color: "#666",
                          borderTop: "1px solid #e0e0e0"
                        }}>
                          Showing {completedRejectedConsultations.length} consultation{completedRejectedConsultations.length !== 1 ? 's' : ''} • Scroll to view more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* CALENDAR TAB - NEW LOGIC */}
        {activeTab === "calendar" && (
          <div>
            <h2 style={{ color: "var(--pink)", marginBottom: "24px" }}>
              Calendar & Availability Management
            </h2>

            <div style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "var(--card-shadow)",
              marginBottom: "32px"
            }}>
              <h3 style={{ marginTop: "0", marginBottom: "8px", color: "var(--text)" }}>
                Set Your Availability for Today
              </h3>
              <p style={{ margin: "0 0 20px 0", color: "#666", fontSize: "14px" }}>
                <strong>{today}</strong>
              </p>

              {availabilityMessage.text && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "8px",
                    marginBottom: "20px",
                    fontSize: "14px",
                    fontWeight: "500",
                    backgroundColor: availabilityMessage.type === 'success' ? '#d4edda' : 
                                    availabilityMessage.type === 'error' ? '#f8d7da' : '#d1ecf1',
                    color: availabilityMessage.type === 'success' ? '#155724' : 
                           availabilityMessage.type === 'error' ? '#721c24' : '#0c5460',
                    border: `1px solid ${availabilityMessage.type === 'success' ? '#c3e6cb' : 
                                         availabilityMessage.type === 'error' ? '#f5c6cb' : '#bee5eb'}`
                  }}
                >
                  {availabilityMessage.text}
                </div>
              )}

              <form onSubmit={addAvailability}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "16px", alignItems: "end", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                      Start Time
                    </label>
                    <select
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid #e0e0e0",
                        fontSize: "14px"
                      }}
                    >
                      {timeOptions.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                      End Time
                    </label>
                    <select
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid #e0e0e0",
                        fontSize: "14px"
                      }}
                    >
                      {timeOptions.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={previewSlots.length === 0}
                    className="btn-action primary"
                    style={{ 
                      whiteSpace: "nowrap",
                      opacity: previewSlots.length === 0 ? 0.5 : 1,
                      cursor: previewSlots.length === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Add Availability
                  </button>
                </div>

                {/* Preview Slots */}
                {previewSlots.length > 0 && (
                  <div style={{
                    backgroundColor: "#e3f2fd",
                    border: "1px solid #90caf9",
                    borderRadius: "8px",
                    padding: "16px"
                  }}>
                    <h4 style={{ margin: "0 0 12px 0", color: "#1976d2", fontSize: "14px", fontWeight: "600" }}>
                      Preview: {previewSlots.length} slot(s) will be created
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "8px" }}>
                      {previewSlots.map((slot, index) => (
                        <div
                          key={index}
                          style={{
                            backgroundColor: "white",
                            padding: "8px 12px",
                            borderRadius: "6px",
                            textAlign: "center",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#333"
                          }}
                        >
                          {slot.startDisplay} - {slot.endDisplay}
                        </div>
                      ))}
                    </div>
                    <p style={{ margin: "12px 0 0 0", fontSize: "12px", color: "#1565c0", fontStyle: "italic" }}>
                      * Each slot is 1 hour with 30-minute breaks in between
                    </p>
                  </div>
                )}
              </form>
            </div>

            <div style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "var(--card-shadow)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3 style={{ margin: 0, color: "var(--text)" }}>
                  Today's Availability ({availability.length} slot{availability.length !== 1 ? 's' : ''})
                </h3>
                {availability.some(slot => !slot.is_booked) && (
                  <button
                    onClick={clearAllUnbookedSlots}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "13px"
                    }}
                  >
                    Clear All Unbooked
                  </button>
                )}
              </div>
              
              {availability.length === 0 ? (
                <div style={{ 
                  textAlign: "center", 
                  padding: "40px", 
                  backgroundColor: "#f9f9f9", 
                  borderRadius: "8px" 
                }}>
                  <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>
                    No availability slots set for today. Add some above to get started!
                  </p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
                  {availability.map((slot) => {
                    const expired = isSlotExpired(slot.date, slot.start_time);
                    
                    return (
                      <div
                        key={slot.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px 16px",
                          backgroundColor: expired ? "#f5f5f5" : slot.is_booked ? "#ffebee" : "#e8f5e9",
                          borderRadius: "8px",
                          border: expired ? "1px solid #e0e0e0" : slot.is_booked ? "1px solid #ef9a9a" : "1px solid #a5d6a7",
                          opacity: expired ? 0.6 : 1
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: "600", color: "#333", marginBottom: "4px" }}>
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </div>
                          <div style={{ 
                            fontSize: "12px", 
                            color: expired ? "#757575" : slot.is_booked ? "#c62828" : "#2e7d32" 
                          }}>
                            {expired ? "⏰ Expired" : slot.is_booked ? "🔒 Booked" : "✓ Available"}
                          </div>
                        </div>
                        {!slot.is_booked && !expired && (
                          <button
                            onClick={() => deleteAvailabilitySlot(slot.id)}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#dc3545",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "600"
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Notes Modal */}
      {showNotesModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "32px",
            maxWidth: "600px",
            width: "90%",
            maxHeight: "80vh",
            overflow: "auto",
            boxShadow: "0 10px 40px rgba(0,0,0,0.3)"
          }}>
            <h3 style={{ marginTop: 0, marginBottom: "8px", color: "var(--text)" }}>
              📝 Counselor Notes
            </h3>
            <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#666" }}>
              <strong>Student:</strong> {selectedConsultation?.student?.name}
            </p>
            <p style={{ margin: "0 0 20px 0", fontSize: "14px", color: "#666" }}>
              <strong>Date:</strong> {selectedConsultation ? formatDate(selectedConsultation.date) : ''} at {selectedConsultation ? formatTime(selectedConsultation.time) : ''}
            </p>

            <textarea
              value={counselorNotes}
              onChange={(e) => setCounselorNotes(e.target.value)}
              placeholder="Enter your notes, observations, and recommendations here..."
              style={{
                width: "100%",
                minHeight: "200px",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #e0e0e0",
                fontSize: "14px",
                fontFamily: "inherit",
                resize: "vertical",
                marginBottom: "20px",
                boxSizing: "border-box"
              }}
            />

            <p style={{ 
              margin: "0 0 20px 0", 
              fontSize: "12px", 
              color: "#888",
              fontStyle: "italic"
            }}>
              These notes are private and only visible to counselors and admins.
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={closeNotesModal}
                style={{
                  padding: "10px 24px",
                  backgroundColor: "#f0f0f0",
                  color: "#333",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                style={{
                  padding: "10px 24px",
                  backgroundColor: "var(--teal)",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px"
                }}
              >
                💾 Save Notes
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <Footer />
    </div>
  );
}