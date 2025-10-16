
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import logomark from "../assets/hinahon2.png";
import Footer from '../components/Footer';
import { 
  createUser, 
  deleteUser as deleteUserAPI, 
  updateUserRole as updateUserRoleAPI,
  getAllUsers,
  getAllConsultations,
  updateUser as updateUserAPI
} from "../utils/adminApi";
import "../styles.css";

export default function AdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [articles, setArticles] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingUserId, setProcessingUserId] = useState(null);
  const [user, setUser] = useState(null);

  // Edit user modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
  name: "",
  email: "",
  student_id: "",
  birthday: "",
  department: "",
  program: "",
  year_level: "",
  role: "student",
  photo_url: "",
  license: ""  
});
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Counselor profile management state
  const [editingCounselorProfile, setEditingCounselorProfile] = useState(null);
  const [counselorProfileForm, setCounselorProfileForm] = useState({
    photo_url: "",
    license: ""
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);

  // Create user form state
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
  email: "",
  password: "",
  name: "",
  role: "student",
  department: "",
  // Student fields
  student_id: "",
  birthday: "",
  program: "",
  year_level: "",
  // Counselor fields
  license: ""
});
  const [createUserError, setCreateUserError] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);

  // Search and Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterYearLevel, setFilterYearLevel] = useState("all");

  // Department options
  const departments = [
    { value: "CCAS", label: "CCAS - College of Computing, Arts and Sciences" },
    { value: "DENT", label: "DENT - College of Dentistry" },
    { value: "CON", label: "CON - College of Nursing" },
    { value: "CITHM", label: "CITHM - College of International Tourism and Hospitality Management" },
    { value: "CBA", label: "CBA - College of Business Administration" },
    { value: "LIMA", label: "LIMA - Lyceum International Maritime Academy" },
    { value: "CAMP", label: "CAMP - College of Allied Medical Professions" },
    { value: "CCJE", label: "CCJE - College of Criminal Justice Education" },
    { value: "SHS", label: "SHS - Senior High School" }
  ];

  const getEmotionColor = (reason) => {
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

  // Article image upload state
  const [articleImageFile, setArticleImageFile] = useState(null);
  const [uploadingArticleImage, setUploadingArticleImage] = useState(false);

  // Article form state
  const [articleForm, setArticleForm] = useState({
    title: "",
    content: "",
    emotion_tag: "",
    image_url: ""
  });
  const [editingArticle, setEditingArticle] = useState(null);

  // Analytics state
  const [analyticsFilter, setAnalyticsFilter] = useState("week");
  const [analytics, setAnalytics] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    byCounselor: {},
    byDate: {}
  });

  const emotions = ["happy", "sad", "angry", "scared", "worried", "tired", "disgusted", "overwhelmed","general concern"];

  useEffect(() => {
    getCurrentUser();
    fetchUsers();
    fetchArticles();
    fetchConsultations();
  }, []);

  useEffect(() => {
    if (consultations.length > 0) {
      const newAnalytics = calculateAnalytics(consultations, analyticsFilter);
      setAnalytics(newAnalytics);
    }
  }, [consultations, analyticsFilter]);


  const handleArticleImageChange = (e) => {
  const file = e.target.files[0];
  if (file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }
    console.log('✅ Image file selected:', file.name, file.size, 'bytes');
    setArticleImageFile(file);
  }
};

const uploadArticleImage = async () => {
  if (!articleImageFile) {
    console.log('⚠️ No image file to upload, returning existing URL');
    return articleForm.image_url || null;
  }

  try {
    const fileExt = articleImageFile.name.split('.').pop();
    const fileName = `article-${Date.now()}.${fileExt}`;

    console.log('📤 UPLOADING IMAGE:', fileName);

    // Delete old image if exists
    const oldImageUrl = articleForm.image_url;
    if (oldImageUrl && oldImageUrl.includes('article-images')) {
      try {
        const oldFileName = oldImageUrl.split('/').pop().split('?')[0];
        console.log('🗑️ Deleting old image:', oldFileName);
        await supabase.storage
          .from('article-images')
          .remove([oldFileName]);
      } catch (err) {
        console.warn('⚠️ Could not delete old image:', err);
      }
    }

    // Upload new image
    const { data, error: uploadError } = await supabase.storage
      .from('article-images')
      .upload(fileName, articleImageFile, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      throw uploadError;
    }

    console.log('✅ Image uploaded:', data);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('article-images')
      .getPublicUrl(fileName);

    console.log('🔗 Public URL generated:', publicUrl);
    
    return publicUrl;
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    alert('Failed to upload image: ' + error.message);
    throw error;
  }
};

const deleteArticleImage = async () => {
  if (!window.confirm('Are you sure you want to delete this image?')) {
    return;
  }

  try {
    // Delete from storage if it's a Supabase storage URL
    if (articleForm.image_url && articleForm.image_url.includes('article-images')) {
      const fileName = articleForm.image_url.split('/').pop().split('?')[0];
      console.log('🗑️ Deleting image:', fileName);
      await supabase.storage
        .from('article-images')
        .remove([fileName]);
    }

    // Update form to remove image URL
    setArticleForm(prev => ({ ...prev, image_url: '' }));
    setArticleImageFile(null);
    alert('✅ Image will be removed when you save changes');
  } catch (err) {
    console.error('❌ Error deleting image:', err);
    alert('❌ Failed to delete image');
  }
};

  const closeCounselorProfileModal = () => {
    setEditingCounselorProfile(null);
    setCounselorProfileForm({ photo_url: "", license: "" });
    setPhotoFile(null);
    setEditError("");
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      setPhotoFile(file);
    }
  };

  const uploadCounselorPhoto = async (userId) => {
  if (!photoFile) return editForm.photo_url;

  try {
    setUploadingPhoto(true);
    
    // Generate unique filename
    const fileExt = photoFile.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;

    console.log('Uploading photo to counselor-photos bucket...');

    // Delete old photo if exists
    const oldPhotoUrl = editForm.photo_url;
    if (oldPhotoUrl) {
      try {
        const oldFileName = oldPhotoUrl.split('/').pop();
        console.log('Deleting old photo:', oldFileName);
        await supabase.storage
          .from('counselor-photos')
          .remove([oldFileName]);
      } catch (err) {
        console.warn('Could not delete old photo:', err);
      }
    }

      // Upload new photo
    const { data, error: uploadError } = await supabase.storage
      .from('counselor-photos')
      .upload(fileName, photoFile, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    console.log('Photo uploaded successfully:', data);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('counselor-photos')
      .getPublicUrl(fileName);

    console.log('Public URL:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Error uploading photo:', error);
    alert('Failed to upload photo: ' + error.message);
    return editForm.photo_url;
  } finally {
    setUploadingPhoto(false);
  }
};

  const handleCounselorProfileSubmit = async (e) => {
    e.preventDefault();
    
    if (!editingCounselorProfile) return;

    setEditLoading(true);
    setEditError("");

    try {
      // Upload photo if new file selected
      const photoUrl = await uploadCounselorPhoto(editingCounselorProfile.id);

      // Update counselor profile via backend API
      const result = await updateUserAPI(editingCounselorProfile.id, {
        photo_url: photoUrl,
        license: counselorProfileForm.license
      });

      if (result.success) {
        alert('✅ Counselor profile updated successfully!');
        closeCounselorProfileModal();
        await fetchUsers();
      } else {
        setEditError(result.error || 'Failed to update counselor profile');
      }
    } catch (err) {
      console.error('Error updating counselor profile:', err);
      setEditError(err.message || 'Failed to update counselor profile');
    } finally {
      setEditLoading(false);
    }
  };

  const deleteCounselorPhoto = async () => {
  if (!window.confirm('Are you sure you want to delete this photo?')) {
    return;
  }

  try {
    // Delete from storage
    if (editForm.photo_url) {
      const fileName = editForm.photo_url.split('/').pop();
      await supabase.storage
        .from('counselor-photos')
        .remove([fileName]);
    }

    // Update form to remove photo URL
    setEditForm(prev => ({ ...prev, photo_url: '' }));
    setPhotoFile(null);
    alert('✅ Photo will be removed when you save changes');
  } catch (err) {
    console.error('Error deleting photo:', err);
    alert('❌ Failed to delete photo');
  }
};

  // Get filtered and sorted users
  const getFilteredUsers = () => {
    if (!users || users.length === 0) return [];

    let filtered = [...users];

    // Search filter (name, email, student_id)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        (user.name && user.name.toLowerCase().includes(query)) ||
        (user.email && user.email.toLowerCase().includes(query)) ||
        (user.student_id && user.student_id.toLowerCase().includes(query))
      );
    }

    // Role filter
    if (filterRole !== "all") {
      filtered = filtered.filter(user => user.role === filterRole);
    }

    // Department filter
    if (filterDepartment !== "all") {
      filtered = filtered.filter(user => user.department === filterDepartment);
    }

    // Year level filter
    if (filterYearLevel !== "all") {
      filtered = filtered.filter(user => user.year_level === parseInt(filterYearLevel));
    }

    // Sort by name by default
    filtered.sort((a, b) => {
      const aName = (a.name || a.email || '').toLowerCase();
      const bName = (b.name || b.email || '').toLowerCase();
      return aName.localeCompare(bName);
    });

    return filtered;
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("");
    setFilterRole("all");
    setFilterDepartment("all");
    setFilterYearLevel("all");
  };

  const calculateAnalytics = (consultations, filter) => {
    const now = new Date();
    let filteredConsultations = consultations;

    if (filter !== "all") {
      const filterDate = new Date();
      
      switch (filter) {
        case "week":
          filterDate.setDate(now.getDate() - 7);
          break;
        case "month":
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case "year":
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filteredConsultations = consultations.filter(c => {
        const consultDate = new Date(c.date);
        return consultDate >= filterDate;
      });
    }

    const stats = {
      total: filteredConsultations.length,
      pending: filteredConsultations.filter(c => c.status === 'pending').length,
      accepted: filteredConsultations.filter(c => c.status === 'accepted').length,
      rejected: filteredConsultations.filter(c => c.status === 'rejected').length,
      byCounselor: {},
      byDate: {}
    };

    filteredConsultations.forEach(c => {
      const counselorName = c.counselor?.name || c.counselor?.email || 'Unknown';
      if (!stats.byCounselor[counselorName]) {
        stats.byCounselor[counselorName] = {
          total: 0,
          pending: 0,
          accepted: 0,
          rejected: 0
        };
      }
      stats.byCounselor[counselorName].total++;
      stats.byCounselor[counselorName][c.status]++;
    });

    filteredConsultations.forEach(c => {
      const dateKey = new Date(c.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      if (!stats.byDate[dateKey]) {
        stats.byDate[dateKey] = 0;
      }
      stats.byDate[dateKey]++;
    });

    return stats;
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Student', 'Department', 'Counselor', 'Reason', 'Status', 'Remarks'];
    const rows = consultations.map(c => {
      const reason = c.reason || 'Not specified';
      const remarks = c.status === 'rejected' 
        ? (c.rejection_reason || 'No reason provided')
        : (c.counselor_notes || 'No remarks');
      
      return [
        c.date || '',
        c.time || '',
        c.student?.name || c.student?.email || 'Unknown',
        c.student?.department || 'Not specified',
        c.counselor?.name || c.counselor?.email || 'Unknown',
        reason,
        c.status || '',
        `"${remarks.replace(/"/g, '""')}"` // Escape quotes in remarks
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consultations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      console.log("Fetching users via backend API...");
      const result = await getAllUsers();

      if (result.success) {
        setUsers(result.users || []);
        console.log("Users fetched:", result.users);
      } else {
        console.error("Failed to fetch users:", result.error);
        alert(`Failed to load users: ${result.error}`);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      alert("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("title");

      if (error) throw error;
      setArticles(data || []);
    } catch (err) {
      console.error("Error fetching articles:", err);
    }
  };

  const fetchConsultations = async () => {
    try {
      console.log("Fetching consultations via backend API...");
      const result = await getAllConsultations();

      if (result.success) {
        setConsultations(result.consultations || []);
        console.log("Consultations fetched:", result.consultations);
      } else {
        console.error("Failed to fetch consultations:", result.error);
        alert(`Failed to load consultations: ${result.error}`);
      }
    } catch (err) {
      console.error("Error fetching consultations:", err);
      alert("Failed to load consultations");
    }
  };

  const handleCreateUser = async (e) => {
  e.preventDefault();
  setCreateUserError("");
  setCreatingUser(true);

  try {
    console.log("=== CREATING USER ===");
    console.log("Form data:", createUserForm);

    // Validate required fields based on role
    if (createUserForm.role === 'counselor' && !createUserForm.department) {
      setCreateUserError("Department is required for counselors");
      setCreatingUser(false);
      return;
    }

    const result = await createUser(createUserForm);

    if (result.success) {
      alert(`✅ User created successfully!\n\nEmail: ${createUserForm.email}\nRole: ${createUserForm.role}`);
      
      // Reset form
      setCreateUserForm({
        email: "",
        password: "",
        name: "",
        role: "student",
        department: "",
        student_id: "",
        birthday: "",
        program: "",
        year_level: "",
        license: ""
      });
      setShowCreateUserForm(false);
      
      await fetchUsers();
    } else {
      setCreateUserError(result.error || "Failed to create user");
    }
  } catch (err) {
    console.error("Error creating user:", err);
    setCreateUserError(err.message || "Failed to create user");
  } finally {
    setCreatingUser(false);
  }
};

  const updateUserRole = async (userId, newRole) => {
    setProcessingUserId(userId);
    
    try {
      const result = await updateUserRoleAPI(userId, newRole);

      if (result.success) {
        alert("✅ User role updated successfully!");
        await fetchUsers();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (err) {
      console.error("Error updating role:", err);
      alert("Failed to update user role.");
    } finally {
      setProcessingUserId(null);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    setProcessingUserId(userId);

    try {
      const result = await deleteUserAPI(userId);

      if (result.success) {
        alert("✅ User deleted successfully!");
        await fetchUsers();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Failed to delete user.");
    } finally {
      setProcessingUserId(null);
    }
  };

  const openEditModal = (user) => {
  setEditingUser(user);
  setEditForm({
    name: user.name || "",
    email: user.email || "",
    student_id: user.student_id || "",
    birthday: user.birthday || "",
    department: user.department || "",
    program: user.program || "",
    year_level: user.year_level ? user.year_level.toString() : "",
    role: user.role || "student",
    photo_url: user.photo_url || "",     
    license: user.license || ""           
  });
  setEditError("");
  setPhotoFile(null); 
  setShowEditModal(true);
};

  const closeEditModal = () => {
  setShowEditModal(false);
  setEditingUser(null);
  setEditForm({
    name: "",
    email: "",
    student_id: "",
    birthday: "",
    department: "",
    program: "",
    year_level: "",
    role: "student",
    photo_url: "",
    license: ""
  });
  setEditError("");
  setPhotoFile(null); 
};

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
    setEditError("");
  };

  const handleEditSubmit = async (e) => {
  e.preventDefault();
  setEditError("");
  setEditLoading(true);

  try {
    console.log("=== STARTING USER UPDATE ===");
    console.log("User ID:", editingUser.id);
    console.log("Current form data:", editForm);

    // Upload photo if new file selected (only for counselors)
    let photoUrl = editForm.photo_url;
    if (editForm.role === 'counselor' && photoFile) {
      console.log("Uploading new photo...");
      photoUrl = await uploadCounselorPhoto(editingUser.id);
      console.log("Photo uploaded, URL:", photoUrl);
    }

    // Prepare update data
    const updateData = {
      name: editForm.name,
      email: editForm.email,
      role: editForm.role
    };

    if (editForm.role === 'student') {
      updateData.student_id = editForm.student_id || null;
      updateData.birthday = editForm.birthday || null;
      updateData.department = editForm.department || null;
      updateData.program = editForm.program || null;
      updateData.year_level = editForm.year_level ? parseInt(editForm.year_level) : null;
    } else if (editForm.role === 'counselor') {
      updateData.department = editForm.department || null;
      updateData.photo_url = photoUrl;  // ADD THIS
      updateData.license = editForm.license || null;  // ADD THIS
    }

    console.log("Update data being sent:", updateData);

    // Update via API
    const result = await updateUserAPI(editingUser.id, updateData);

    console.log("API result:", result);

    if (result.success) {
      alert("✅ User details updated successfully!");
      closeEditModal();
      await fetchUsers();
    } else {
      console.error("Update failed:", result.error);
      setEditError(result.error || "Failed to update user");
    }
  } catch (err) {
    console.error("Error updating user:", err);
    setEditError(err.message || "Failed to update user");
  } finally {
    setEditLoading(false);
  }
};

  const sendPasswordReset = async (userEmail) => {
    if (!window.confirm(`Send password reset email to ${userEmail}?`)) {
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      alert(`✅ Password reset email sent to ${userEmail}!\n\nThe user will receive an email with a link to reset their password.`);
    } catch (err) {
      console.error("Error sending password reset:", err);
      alert(`❌ Failed to send password reset email: ${err.message}`);
    }
  };

  const handleArticleSubmit = async (e) => {
  e.preventDefault();
  
  if (!articleForm.title || !articleForm.content || !articleForm.emotion_tag) {
    alert("Please fill in all required fields");
    return;
  }

  // Prevent double submission
  if (uploadingArticleImage) {
    console.log('⚠️ Already processing, please wait...');
    return;
  }

  try {
    setUploadingArticleImage(true);
    console.log('\n=== 📝 SUBMITTING ARTICLE ===');
    console.log('Title:', articleForm.title);
    console.log('Emotion:', articleForm.emotion_tag);
    console.log('Has new image file:', !!articleImageFile);
    console.log('Existing image URL:', articleForm.image_url);

    // Step 1: Upload image if new file selected
    let finalImageUrl = articleForm.image_url || '';
    
    if (articleImageFile) {
      console.log('\n📤 STEP 1: Uploading new image...');
      const uploadedUrl = await uploadArticleImage();
      
      if (uploadedUrl) {
        finalImageUrl = uploadedUrl;
        console.log('✅ Image uploaded successfully');
        console.log('🔗 Final image URL:', finalImageUrl);
      } else {
        console.warn('⚠️ Upload returned null/undefined');
      }
    } else {
      console.log('\n⏭️ STEP 1: Skipping upload (no new image file)');
    }

    // Step 2: Prepare article data
    const articleData = {
      title: articleForm.title,
      content: articleForm.content,
      emotion_tag: articleForm.emotion_tag,
      image_url: finalImageUrl || null  // Use null instead of empty string
    };

    console.log('\n💾 STEP 2: Saving to database...');
    console.log('Article data:', JSON.stringify(articleData, null, 2));

    // Step 3: Save to database
    if (editingArticle) {
      console.log('Updating article ID:', editingArticle.id);
      
      const { data, error } = await supabase
        .from("articles")
        .update(articleData)
        .eq("id", editingArticle.id)
        .select();

      if (error) {
        console.error('❌ Database update error:', error);
        throw error;
      }
      
      console.log('✅ Article updated successfully:', data);
      alert("✅ Article updated successfully!");
      
    } else {
      console.log('Creating new article...');
      
      const { data, error } = await supabase
        .from("articles")
        .insert([articleData])
        .select();

      if (error) {
        console.error('❌ Database insert error:', error);
        throw error;
      }
      
      console.log('✅ Article created successfully:', data);
      alert("✅ Article created successfully!");
    }

    // Step 4: Reset form and refresh list
    console.log('\n🔄 STEP 3: Cleaning up...');
    setArticleForm({ title: "", content: "", emotion_tag: "", image_url: "" });
    setArticleImageFile(null);
    setEditingArticle(null);
    
    console.log('📥 Fetching updated articles...');
    await fetchArticles();
    console.log('✅ Articles list refreshed\n');
    
  } catch (err) {
    console.error('\n❌ ERROR SAVING ARTICLE:', err);
    console.error('Error details:', err.message);
    alert("Failed to save article: " + err.message);
  } finally {
    setUploadingArticleImage(false);
  }
};


  const editArticle = (article) => {
  console.log('\n✏️ EDITING ARTICLE');
  console.log('Article:', article);
  
  setArticleForm({
    title: article.title || '',
    content: article.content || '',
    emotion_tag: article.emotion_tag || '',
    image_url: article.image_url || ''
  });
  
  setEditingArticle(article);
  setArticleImageFile(null);
  
  // Scroll to form
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

  const deleteArticle = async (articleId) => {
  if (!window.confirm("Are you sure you want to delete this article?")) {
    return;
  }

  try {
    console.log('\n🗑️ DELETING ARTICLE:', articleId);
    
    // Find the article to get its image URL
    const article = articles.find(a => a.id === articleId);
    console.log('Article to delete:', article);
    
    // Delete image from storage if it exists
    if (article?.image_url && article.image_url.includes('article-images')) {
      try {
        const fileName = article.image_url.split('/').pop().split('?')[0];
        console.log('🗑️ Deleting image:', fileName);
        
        await supabase.storage
          .from('article-images')
          .remove([fileName]);
          
        console.log('✅ Image deleted from storage');
      } catch (err) {
        console.warn('⚠️ Could not delete article image:', err);
      }
    }

    // Delete article from database
    const { error } = await supabase
      .from("articles")
      .delete()
      .eq("id", articleId);

    if (error) throw error;
    
    console.log('✅ Article deleted from database');
    await fetchArticles();
    alert("✅ Article deleted successfully!");
    
  } catch (err) {
    console.error('❌ Error deleting article:', err);
    alert("Failed to delete article: " + err.message);
  }
};

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const getStatusBadgeStyle = (status) => {
    const baseStyle = {
      padding: "4px 12px",
      borderRadius: "12px",
      fontSize: "12px",
      fontWeight: "600",
      textTransform: "uppercase"
    };

    switch (status) {
      case "pending":
        return { ...baseStyle, backgroundColor: "#fff3cd", color: "#856404" };
      case "accepted":
        return { ...baseStyle, backgroundColor: "#d4edda", color: "#155724" };
      case "rejected":
        return { ...baseStyle, backgroundColor: "#f8d7da", color: "#721c24" };
      default:
        return baseStyle;
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        Loading dashboard...
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
      Administrator Dashboard
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

      <main style={{ padding: "40px 24px", maxWidth: "1400px", margin: "0 auto" }}>
        {/* Tab Navigation */}
        <div style={{ 
          display: "flex", 
          marginBottom: "32px", 
          borderBottom: "1px solid #e0e0e0" 
        }}>
          <button
            onClick={() => setActiveTab("users")}
            style={{
              padding: "12px 24px",
              border: "none",
              background: "none",
              cursor: "pointer",
              borderBottom: activeTab === "users" ? "3px solid var(--teal)" : "none",
              color: activeTab === "users" ? "var(--teal)" : "#666",
              fontWeight: activeTab === "users" ? "600" : "400",
              fontSize: "16px"
            }}
          >
            Manage Users
          </button>
          <button
            onClick={() => setActiveTab("articles")}
            style={{
              padding: "12px 24px",
              border: "none",
              background: "none",
              cursor: "pointer",
              borderBottom: activeTab === "articles" ? "3px solid var(--teal)" : "none",
              color: activeTab === "articles" ? "var(--teal)" : "#666",
              fontWeight: activeTab === "articles" ? "600" : "400",
              fontSize: "16px"
            }}
          >
            Manage Articles
          </button>
          <button
            onClick={() => setActiveTab("consultations")}
            style={{
              padding: "12px 24px",
              border: "none",
              background: "none",
              cursor: "pointer",
              borderBottom: activeTab === "consultations" ? "3px solid var(--teal)" : "none",
              color: activeTab === "consultations" ? "var(--teal)" : "#666",
              fontWeight: activeTab === "consultations" ? "600" : "400",
              fontSize: "16px"
            }}
          >
            View Consultations
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === "users" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ color: "var(--pink)", margin: 0 }}>
                User Management
              </h2>
              <button
                onClick={() => setShowCreateUserForm(!showCreateUserForm)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: showCreateUserForm ? "#dc3545" : "var(--teal)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600"
                }}
              >
                {showCreateUserForm ? "Cancel" : "+ Create New User"}
              </button>
            </div>

            {/* Search and Filter Controls */}
            {!showCreateUserForm && (
              <div style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "12px",
                boxShadow: "var(--card-shadow)",
                marginBottom: "16px",
                border: "1px solid #f0f0f0"
              }}>
                {/* Search Bar */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "8px", 
                    fontWeight: "600",
                    color: "#333",
                    fontSize: "14px"
                  }}>
                    🔍 Search Users
                  </label>
                  <input
                    type="text"
                    placeholder="Search by name, email, or student ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid #e0e0e0",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "var(--teal)"}
                    onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
                  />
                </div>

                {/* Filters */}
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "12px",
                  marginBottom: "16px"
                }}>
                  {/* Role Filter */}
                  <div>
                    <label style={{ 
                      display: "block", 
                      marginBottom: "6px", 
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#666"
                    }}>
                      Role
                    </label>
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "6px",
                        border: "1px solid #e0e0e0",
                        fontSize: "13px",
                        cursor: "pointer",
                        backgroundColor: filterRole !== "all" ? "#e6fff9" : "white"
                      }}
                    >
                      <option value="all">All Roles</option>
                      <option value="student">Student</option>
                      <option value="counselor">Counselor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {/* Department Filter */}
                  <div>
                    <label style={{ 
                      display: "block", 
                      marginBottom: "6px", 
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#666"
                    }}>
                      Department
                    </label>
                    <select
                      value={filterDepartment}
                      onChange={(e) => setFilterDepartment(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "6px",
                        border: "1px solid #e0e0e0",
                        fontSize: "13px",
                        cursor: "pointer",
                        backgroundColor: filterDepartment !== "all" ? "#e6fff9" : "white"
                      }}
                    >
                      <option value="all">All Departments</option>
                      {departments.map(dept => (
                        <option key={dept.value} value={dept.value}>
                          {dept.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Year Level Filter */}
                  <div>
                    <label style={{ 
                      display: "block", 
                      marginBottom: "6px", 
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#666"
                    }}>
                      Year Level
                    </label>
                    <select
                      value={filterYearLevel}
                      onChange={(e) => setFilterYearLevel(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "6px",
                        border: "1px solid #e0e0e0",
                        fontSize: "13px",
                        cursor: "pointer",
                        backgroundColor: filterYearLevel !== "all" ? "#e6fff9" : "white"
                      }}
                    >
                      <option value="all">All Year Levels</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                      <option value="5">5th Year</option>
                      <option value="6">Graduate Level</option>
                    </select>
                  </div>
                </div>

                {/* Filter Summary and Reset */}
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  paddingTop: "12px",
                  borderTop: "1px solid #f0f0f0"
                }}>
                  <div style={{ fontSize: "13px", color: "#666" }}>
                    Showing <strong style={{ color: "var(--teal)" }}>{getFilteredUsers().length}</strong> of {users.length} user{users.length !== 1 ? 's' : ''}
                    {(searchQuery || filterRole !== "all" || filterDepartment !== "all" || filterYearLevel !== "all") && (
                      <span style={{ color: "#999", marginLeft: "8px" }}>
                        (filtered)
                      </span>
                    )}
                  </div>
                  
                  {(searchQuery || filterRole !== "all" || filterDepartment !== "all" || filterYearLevel !== "all") && (
                    <button
                      onClick={resetFilters}
                      style={{
                        padding: "6px 14px",
                        backgroundColor: "#fff3e0",
                        color: "#ff9800",
                        border: "1px solid #ff9800",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "#ff9800";
                        e.target.style.color = "white";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = "#fff3e0";
                        e.target.style.color = "#ff9800";
                      }}
                    >
                      🔄 Clear Filters
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Create User Form */}
            {showCreateUserForm && (
  <div style={{
    backgroundColor: "white",
    padding: "24px",
    borderRadius: "12px",
    boxShadow: "var(--card-shadow)",
    marginBottom: "24px"
  }}>
    <h3 style={{ marginTop: 0, marginBottom: "20px" }}>
      Create New User
    </h3>
    
    {createUserError && (
      <div style={{
        backgroundColor: "#f8d7da",
        color: "#721c24",
        padding: "12px",
        borderRadius: "8px",
        marginBottom: "16px",
        border: "1px solid #f5c6cb"
      }}>
        {createUserError}
      </div>
    )}

    <form onSubmit={handleCreateUser}>
      <div style={{ display: "grid", gap: "16px" }}>
        {/* Email */}
        <div>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
            Email *
          </label>
          <input
            type="email"
            value={createUserForm.email}
            onChange={(e) => setCreateUserForm(prev => ({ ...prev, email: e.target.value }))}
            required
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #e0e0e0",
              fontSize: "14px",
              boxSizing: "border-box"
            }}
          />
        </div>

        {/* Password */}
        <div>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
            Password *
          </label>
          <input
            type="password"
            value={createUserForm.password}
            onChange={(e) => setCreateUserForm(prev => ({ ...prev, password: e.target.value }))}
            required
            minLength="6"
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #e0e0e0",
              fontSize: "14px",
              boxSizing: "border-box"
            }}
          />
          <small style={{ color: "#666", fontSize: "12px" }}>
            Minimum 8 characters
          </small>
        </div>

        {/* Name */}
        <div>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
            Name
          </label>
          <input
            type="text"
            value={createUserForm.name}
            onChange={(e) => setCreateUserForm(prev => ({ ...prev, name: e.target.value }))}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #e0e0e0",
              fontSize: "14px",
              boxSizing: "border-box"
            }}
          />
        </div>

        {/* Role */}
        <div>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
            Role *
          </label>
          <select
            value={createUserForm.role}
            onChange={(e) => setCreateUserForm(prev => ({ ...prev, role: e.target.value }))}
            required
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #e0e0e0",
              fontSize: "14px"
            }}
          >
            <option value="student">Student</option>
            <option value="counselor">Counselor</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* COUNSELOR-SPECIFIC FIELDS */}
        {createUserForm.role === 'counselor' && (
          <>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                Department *
              </label>
              <select
                value={createUserForm.department}
                onChange={(e) => setCreateUserForm(prev => ({ ...prev, department: e.target.value }))}
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  fontSize: "14px"
                }}
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept.value} value={dept.value}>
                    {dept.label}
                  </option>
                ))}
              </select>
              <small style={{ color: "#666", fontSize: "12px", display: "block", marginTop: "4px" }}>
                Counselors must be assigned to a department
              </small>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                Professional License / Credentials
              </label>
              <input
                type="text"
                value={createUserForm.license}
                onChange={(e) => setCreateUserForm(prev => ({ ...prev, license: e.target.value }))}
                placeholder="e.g., Licensed Psychometrician, PhD in Psychology"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  fontSize: "14px",
                  boxSizing: "border-box"
                }}
              />
              <small style={{ color: "#666", fontSize: "12px", display: "block", marginTop: "4px" }}>
                You can add a profile photo later by editing the user
              </small>
            </div>
          </>
        )}

        {/* STUDENT-SPECIFIC FIELDS */}
        {createUserForm.role === 'student' && (
          <>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                Student ID
              </label>
              <input
                type="text"
                value={createUserForm.student_id}
                onChange={(e) => setCreateUserForm(prev => ({ ...prev, student_id: e.target.value }))}
                placeholder="e.g., 2024-00001"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  fontSize: "14px",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                Birthday
              </label>
              <input
                type="date"
                value={createUserForm.birthday}
                onChange={(e) => setCreateUserForm(prev => ({ ...prev, birthday: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  fontSize: "14px",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                Department
              </label>
              <select
                value={createUserForm.department}
                onChange={(e) => setCreateUserForm(prev => ({ ...prev, department: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  fontSize: "14px"
                }}
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept.value} value={dept.value}>
                    {dept.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                Program
              </label>
              <input
                type="text"
                value={createUserForm.program}
                onChange={(e) => setCreateUserForm(prev => ({ ...prev, program: e.target.value }))}
                placeholder="e.g., BSIT"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  fontSize: "14px",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                Year Level
              </label>
              <select
                value={createUserForm.year_level}
                onChange={(e) => setCreateUserForm(prev => ({ ...prev, year_level: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  fontSize: "14px"
                }}
              >
                <option value="">Select Year Level</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
                <option value="5">5th Year</option>
                <option value="6">Graduate Level</option>
              </select>
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={creatingUser}
          style={{
            padding: "12px",
            backgroundColor: creatingUser ? "#ccc" : "var(--teal)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: creatingUser ? "not-allowed" : "pointer",
            fontWeight: "600",
            fontSize: "16px"
          }}
        >
          {creatingUser ? "Creating User..." : "Create User"}
        </button>
      </div>
    </form>
  </div>
)}
            
            {/* Users Table */}
            <div style={{
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "var(--card-shadow)",
              overflow: "hidden"
            }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8f9fa" }}>
                      <th style={{ padding: "16px", textAlign: "left", borderBottom: "1px solid #e0e0e0" }}>
                        Name
                      </th>
                      <th style={{ padding: "16px", textAlign: "left", borderBottom: "1px solid #e0e0e0" }}>
                        Email
                      </th>
                      <th style={{ padding: "16px", textAlign: "left", borderBottom: "1px solid #e0e0e0" }}>
                        Student ID
                      </th>
                      <th style={{ padding: "16px", textAlign: "left", borderBottom: "1px solid #e0e0e0" }}>
                        Department
                      </th>
                      <th style={{ padding: "16px", textAlign: "left", borderBottom: "1px solid #e0e0e0" }}>
                        Year Level
                      </th>
                      <th style={{ padding: "16px", textAlign: "left", borderBottom: "1px solid #e0e0e0" }}>
                        Role
                      </th>
                      <th style={{ padding: "16px", textAlign: "center", borderBottom: "1px solid #e0e0e0" }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredUsers().length > 0 ? (
                      getFilteredUsers().map((user) => (
                        <tr key={user.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                          <td style={{ padding: "16px" }}>
                            {user.name || "—"}
                          </td>
                          <td style={{ padding: "16px" }}>
                            {user.email}
                          </td>
                          <td style={{ padding: "16px" }}>
                            {user.student_id || "—"}
                          </td>
                          <td style={{ padding: "16px", fontSize: "13px" }}>
                            {user.department ? (
                              <span title={user.department}>
                                {user.department.length > 30 
                                  ? user.department.substring(0, 30) + '...' 
                                  : user.department}
                              </span>
                            ) : "—"}
                          </td>
                          <td style={{ padding: "16px" }}>
                            {user.year_level ? (
                              <span style={{
                                padding: "4px 8px",
                                backgroundColor: "#e3f2fd",
                                color: "#1976d2",
                                borderRadius: "4px",
                                fontSize: "12px",
                                fontWeight: "600"
                              }}>
                                {user.year_level === 6 ? 'Grad' : `Year ${user.year_level}`}
                              </span>
                            ) : "—"}
                          </td>
                          <td style={{ padding: "16px" }}>
                            <select
                              value={user.role}
                              onChange={(e) => updateUserRole(user.id, e.target.value)}
                              disabled={processingUserId === user.id}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "6px",
                                border: "1px solid #e0e0e0",
                                fontSize: "14px",
                                cursor: processingUserId === user.id ? "not-allowed" : "pointer",
                                opacity: processingUserId === user.id ? 0.6 : 1
                              }}
                            >
                              <option value="student">Student</option>
                              <option value="counselor">Counselor</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td style={{ padding: "16px", textAlign: "center" }}>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                              <button
                                onClick={() => openEditModal(user)}
                                disabled={processingUserId === user.id}
                                style={{
                                  padding: "6px 12px",
                                  backgroundColor: "var(--teal)",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: processingUserId === user.id ? "not-allowed" : "pointer",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  opacity: processingUserId === user.id ? 0.6 : 1
                                }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => sendPasswordReset(user.email)}
                                disabled={processingUserId === user.id}
                                style={{
                                  padding: "6px 12px",
                                  backgroundColor: "#ff9800",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: processingUserId === user.id ? "not-allowed" : "pointer",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  opacity: processingUserId === user.id ? 0.6 : 1
                                }}
                                title="Send password reset email"
                              >
                                Reset PW
                              </button>
                              <button
                                onClick={() => deleteUser(user.id)}
                                disabled={processingUserId === user.id}
                                style={{
                                  padding: "6px 12px",
                                  backgroundColor: "#dc3545",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: processingUserId === user.id ? "not-allowed" : "pointer",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  opacity: processingUserId === user.id ? 0.6 : 1
                                }}
                              >
                                {processingUserId === user.id ? "..." : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" style={{ padding: "40px", textAlign: "center", color: "#666" }}>
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Edit User Modal */}
            {showEditModal && (
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
                padding: "24px",
                borderRadius: "12px",
                width: "90%",
                maxWidth: "600px",
                maxHeight: "90vh",
                overflow: "auto"
              }}>
                <h3 style={{ marginTop: 0, marginBottom: "20px" }}>
                  Edit User Details
                </h3>

                {editError && (
                  <div style={{
                    backgroundColor: "#f8d7da",
                    color: "#721c24",
                    padding: "12px",
                    borderRadius: "8px",
                    marginBottom: "16px",
                    border: "1px solid #f5c6cb"
                  }}>
                    {editError}
                  </div>
                )}

                <form onSubmit={handleEditSubmit}>
                  <div style={{ display: "grid", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                        Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={editForm.name}
                        onChange={handleEditChange}
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "8px",
                          border: "1px solid #e0e0e0",
                          fontSize: "14px",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={editForm.email}
                        onChange={handleEditChange}
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "8px",
                          border: "1px solid #e0e0e0",
                          fontSize: "14px",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                        Role
                      </label>
                      <select
                        name="role"
                        value={editForm.role}
                        onChange={handleEditChange}
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "8px",
                          border: "1px solid #e0e0e0",
                          fontSize: "14px"
                        }}
                      >
                        <option value="student">Student</option>
                        <option value="counselor">Counselor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    {/* COUNSELOR-SPECIFIC FIELDS */}
                    {editForm.role === 'counselor' && (
                      <>
                        <div>
                          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                            Department *
                          </label>
                          <select
                            name="department"
                            value={editForm.department}
                            onChange={handleEditChange}
                            style={{
                              width: "100%",
                              padding: "12px",
                              borderRadius: "8px",
                              border: "1px solid #e0e0e0",
                              fontSize: "14px"
                            }}
                          >
                            <option value="">Select Department</option>
                            {departments.map(dept => (
                              <option key={dept.value} value={dept.value}>
                                {dept.label}
                              </option>
                            ))}
                          </select>
                          <small style={{ color: "#666", fontSize: "12px", display: "block", marginTop: "4px" }}>
                            Counselors must be assigned to a department
                          </small>
                        </div>

                        {/* PHOTO UPLOAD SECTION */}
                        <div style={{
                          backgroundColor: "#f8f9fa",
                          padding: "16px",
                          borderRadius: "8px",
                          border: "1px solid #e0e0e0"
                        }}>
                          <label style={{ 
                            display: "block", 
                            marginBottom: "12px", 
                            fontWeight: "600",
                            color: "#333"
                          }}>
                            Profile Photo
                          </label>
                          
                          {/* Photo Preview */}
                          {(photoFile || editForm.photo_url) && (
                            <div style={{ 
                              textAlign: "center", 
                              marginBottom: "12px" 
                            }}>
                              <img
                                src={photoFile ? URL.createObjectURL(photoFile) : editForm.photo_url}
                                alt="Preview"
                                style={{
                                  width: "120px",
                                  height: "120px",
                                  borderRadius: "50%",
                                  objectFit: "cover",
                                  border: "3px solid var(--teal)"
                                }}
                              />
                            </div>
                          )}

                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            id="counselor-photo-upload"
                            style={{ display: "none" }}
                          />
                          <label
                            htmlFor="counselor-photo-upload"
                            style={{
                              display: "block",
                              padding: "10px 16px",
                              backgroundColor: "#f0f9ff",
                              color: "var(--teal)",
                              border: "2px dashed var(--teal)",
                              borderRadius: "6px",
                              cursor: "pointer",
                              textAlign: "center",
                              fontWeight: "600",
                              fontSize: "13px",
                              transition: "all 0.2s",
                              marginBottom: "8px"
                            }}
                          >
                            📷 {photoFile ? "Change Photo" : (editForm.photo_url ? "Replace Photo" : "Upload Photo")}
                          </label>
                          
                          {photoFile && (
                            <p style={{ 
                              margin: "0 0 8px 0", 
                              fontSize: "12px", 
                              color: "#666",
                              textAlign: "center"
                            }}>
                              New: {photoFile.name}
                            </p>
                          )}

                          {editForm.photo_url && (
                            <button
                              type="button"
                              onClick={deleteCounselorPhoto}
                              style={{
                                width: "100%",
                                padding: "8px",
                                backgroundColor: "#dc3545",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "600"
                              }}
                            >
                              🗑️ Remove Photo
                            </button>
                          )}

                          <p style={{ 
                            margin: "8px 0 0 0", 
                            fontSize: "11px", 
                            color: "#999",
                            textAlign: "center"
                          }}>
                            Max 5MB • JPG, PNG, GIF
                          </p>
                        </div>

                        {/* LICENSE FIELD */}
                        <div>
                          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                            Professional License / Credentials
                          </label>
                          <input
                            type="text"
                            name="license"
                            value={editForm.license}
                            onChange={handleEditChange}
                            placeholder="e.g., Licensed Psychometrician, PhD in Psychology"
                            style={{
                              width: "100%",
                              padding: "12px",
                              borderRadius: "8px",
                              border: "1px solid #e0e0e0",
                              fontSize: "14px",
                              boxSizing: "border-box"
                            }}
                          />
                        </div>
                      </>
                    )}

                      {/* STUDENT-SPECIFIC FIELDS */}
                      {editForm.role === 'student' && (
                        <>
                          <div>
                            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                              Student ID
                            </label>
                            <input
                              type="text"
                              name="student_id"
                              value={editForm.student_id}
                              onChange={handleEditChange}
                              style={{
                                width: "100%",
                                padding: "12px",
                                borderRadius: "8px",
                                border: "1px solid #e0e0e0",
                                fontSize: "14px",
                                boxSizing: "border-box"
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                              Birthday
                            </label>
                            <input
                              type="date"
                              name="birthday"
                              value={editForm.birthday}
                              onChange={handleEditChange}
                              style={{
                                width: "100%",
                                padding: "12px",
                                borderRadius: "8px",
                                border: "1px solid #e0e0e0",
                                fontSize: "14px",
                                boxSizing: "border-box"
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                              Department
                            </label>
                            <select
                              name="department"
                              value={editForm.department}
                              onChange={handleEditChange}
                              style={{
                                width: "100%",
                                padding: "12px",
                                borderRadius: "8px",
                                border: "1px solid #e0e0e0",
                                fontSize: "14px"
                              }}
                            >
                              <option value="">Select Department</option>
                              {departments.map(dept => (
                                <option key={dept.value} value={dept.value}>
                                  {dept.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                              Program
                            </label>
                            <input
                              type="text"
                              name="program"
                              value={editForm.program}
                              onChange={handleEditChange}
                              placeholder="e.g., BSIT"
                              style={{
                                width: "100%",
                                padding: "12px",
                                borderRadius: "8px",
                                border: "1px solid #e0e0e0",
                                fontSize: "14px",
                                boxSizing: "border-box"
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                              Year Level
                            </label>
                            <select
                              name="year_level"
                              value={editForm.year_level}
                              onChange={handleEditChange}
                              style={{
                                width: "100%",
                                padding: "12px",
                                borderRadius: "8px",
                                border: "1px solid #e0e0e0",
                                fontSize: "14px"
                              }}
                            >
                              <option value="">Select Year Level</option>
                              <option value="1">1st Year</option>
                              <option value="2">2nd Year</option>
                              <option value="3">3rd Year</option>
                              <option value="4">4th Year</option>
                              <option value="5">5th Year</option>
                              <option value="6">Graduate Level</option>
                            </select>
                          </div>
                        </>
                      )}

                      <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                        <button
                          type="submit"
                          disabled={editLoading || uploadingPhoto}
                          style={{
                            flex: 1,
                            padding: "12px",
                            backgroundColor: (editLoading || uploadingPhoto) ? "#ccc" : "var(--teal)",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            cursor: (editLoading || uploadingPhoto) ? "not-allowed" : "pointer",
                            fontWeight: "600",
                            fontSize: "16px"
                          }}
                        >
                          {uploadingPhoto ? "Uploading Photo..." : editLoading ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                          type="button"
                          onClick={closeEditModal}
                          disabled={editLoading || uploadingPhoto}
                          style={{
                            flex: 1,
                            padding: "12px",
                            backgroundColor: "#6c757d",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            cursor: (editLoading || uploadingPhoto) ? "not-allowed" : "pointer",
                            fontWeight: "600",
                            fontSize: "16px"
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Articles Tab - (Keep existing article code) */}
        {activeTab === "articles" && (
          <div>
            <h2 style={{ color: "var(--pink)", marginBottom: "24px" }}>
              Article Management
            </h2>

            {/* Article Form */}
            <div style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "var(--card-shadow)",
              marginBottom: "32px"
            }}>
              <h3 style={{ marginTop: "0", marginBottom: "20px" }}>
                {editingArticle ? "Edit Article" : "Create New Article"}
              </h3>
              <form onSubmit={handleArticleSubmit}>
                <div style={{ display: "grid", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                      Title *
                    </label>
                    <input
                      type="text"
                      value={articleForm.title}
                      onChange={(e) => setArticleForm(prev => ({ ...prev, title: e.target.value }))}
                      required
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid #e0e0e0",
                        fontSize: "14px",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                      Content *
                    </label>
                    <textarea
                      value={articleForm.content}
                      onChange={(e) => setArticleForm(prev => ({ ...prev, content: e.target.value }))}
                      required
                      rows="6"
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid #e0e0e0",
                        fontSize: "14px",
                        boxSizing: "border-box",
                        resize: "vertical"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                      Emotion Tag *
                    </label>
                    <select
                      value={articleForm.emotion_tag}
                      onChange={(e) => setArticleForm(prev => ({ ...prev, emotion_tag: e.target.value }))}
                      required
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid #e0e0e0",
                        fontSize: "14px"
                      }}
                    >
                      <option value="">Select emotion...</option>
                      {emotions.map(emotion => (
                        <option key={emotion} value={emotion}>
                          {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* IMAGE UPLOAD SECTION */}
                  <div style={{
                    backgroundColor: "#f8f9fa",
                    padding: "16px",
                    borderRadius: "8px",
                    border: "1px solid #e0e0e0"
                  }}>
                    <label style={{ 
                      display: "block", 
                      marginBottom: "12px", 
                      fontWeight: "600",
                      color: "#333"
                    }}>
                      Article Image (Optional)
                    </label>
                    
                    {/* Image Preview */}
                    {(articleImageFile || articleForm.image_url) && (
                      <div style={{ 
                        textAlign: "center", 
                        marginBottom: "12px" 
                      }}>
                        <img
                          src={articleImageFile ? URL.createObjectURL(articleImageFile) : articleForm.image_url}
                          alt="Preview"
                          style={{
                            maxWidth: "100%",
                            maxHeight: "300px",
                            borderRadius: "8px",
                            objectFit: "cover",
                            border: "2px solid var(--teal)"
                          }}
                        />
                      </div>
                    )}

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleArticleImageChange}
                      id="article-image-upload"
                      style={{ display: "none" }}
                    />
                    <label
                      htmlFor="article-image-upload"
                      style={{
                        display: "block",
                        padding: "10px 16px",
                        backgroundColor: "#f0f9ff",
                        color: "var(--teal)",
                        border: "2px dashed var(--teal)",
                        borderRadius: "6px",
                        cursor: "pointer",
                        textAlign: "center",
                        fontWeight: "600",
                        fontSize: "13px",
                        transition: "all 0.2s",
                        marginBottom: "8px"
                      }}
                    >
                      🖼️ {articleImageFile ? "Change Image" : (articleForm.image_url ? "Replace Image" : "Upload Image")}
                    </label>
                    
                    {articleImageFile && (
                      <p style={{ 
                        margin: "0 0 8px 0", 
                        fontSize: "12px", 
                        color: "#666",
                        textAlign: "center"
                      }}>
                        New: {articleImageFile.name}
                      </p>
                    )}

                    {articleForm.image_url && (
                      <button
                        type="button"
                        onClick={deleteArticleImage}
                        style={{
                          width: "100%",
                          padding: "8px",
                          backgroundColor: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "600"
                        }}
                      >
                        🗑️ Remove Image
                      </button>
                    )}

                    <p style={{ 
                      margin: "8px 0 0 0", 
                      fontSize: "11px", 
                      color: "#999",
                      textAlign: "center"
                    }}>
                      Max 5MB • JPG, PNG, GIF
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                    <button
                      type="submit"
                      disabled={uploadingArticleImage}
                      style={{
                        flex: 1,
                        padding: "12px",
                        backgroundColor: uploadingArticleImage ? "#ccc" : "var(--teal)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: uploadingArticleImage ? "not-allowed" : "pointer",
                        fontWeight: "600",
                        fontSize: "16px"
                      }}
                    >
                      {uploadingArticleImage ? "Uploading Image..." : editingArticle ? "Update Article" : "Create Article"}
                    </button>
                    {editingArticle && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingArticle(null);
                          setArticleForm({ title: "", content: "", emotion_tag: "", image_url: "" });
                          setArticleImageFile(null);
                        }}
                        disabled={uploadingArticleImage}
                        style={{
                          flex: 1,
                          padding: "12px",
                          backgroundColor: "#6c757d",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          cursor: uploadingArticleImage ? "not-allowed" : "pointer",
                          fontWeight: "600",
                          fontSize: "16px"
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>

            {/* UPDATE the Articles List section to show image previews */}
            <div style={{
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "var(--card-shadow)",
              padding: "24px"
            }}>
              <h3 style={{ marginTop: "0", marginBottom: "20px" }}>
                Existing Articles ({articles.length})
              </h3>
              
              {articles.length === 0 ? (
                <p style={{ color: "#666", fontStyle: "italic" }}>
                  No articles found. Create your first article above.
                </p>
              ) : (
                <div style={{ display: "grid", gap: "16px" }}>
                  {articles.map((article) => (
                    <div
                      key={article.id}
                      style={{
                        padding: "20px",
                        border: "1px solid #e0e0e0",
                        borderRadius: "8px",
                        backgroundColor: "#f8f9fa"
                      }}
                    >
                      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                        {/* Image Thumbnail */}
                        {article.image_url && (
                          <div style={{
                            width: "120px",
                            height: "120px",
                            borderRadius: "8px",
                            overflow: "hidden",
                            flexShrink: 0
                          }}>
                            <img
                              src={article.image_url}
                              alt={article.title}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover"
                              }}
                            />
                          </div>
                        )}
                        
                        {/* Article Info */}
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: "0 0 8px 0", color: "var(--text)" }}>
                            {article.title}
                          </h4>
                          <p style={{ margin: "0 0 8px 0", color: "#666", fontSize: "14px" }}>
                            {article.content.length > 100 
                              ? article.content.substring(0, 100) + "..."
                              : article.content
                            }
                          </p>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <span style={{
                              backgroundColor: "var(--teal)",
                              color: "white",
                              padding: "4px 8px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: "600",
                              textTransform: "uppercase"
                            }}>
                              {article.emotion_tag}
                            </span>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
                          <button
                            onClick={() => editArticle(article)}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "var(--teal)",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "600",
                              whiteSpace: "nowrap"
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteArticle(article.id)}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#dc3545",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "600",
                              whiteSpace: "nowrap"
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ENHANCED Consultations Tab */}
        {activeTab === "consultations" && (
          <div>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              marginBottom: "24px" 
            }}>
              <h2 style={{ color: "var(--pink)", margin: 0 }}>
                Consultation Analytics & Reports
              </h2>
              <button
                onClick={exportToCSV}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                📊 Export to CSV
              </button>
            </div>

        {/* Time Period Filter */}
        <div style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "12px",
          boxShadow: "var(--card-shadow)",
          marginBottom: "24px"
        }}>
          <label style={{ 
            display: "block", 
            marginBottom: "12px", 
            fontWeight: "600",
            color: "#333"
          }}>
            Time Period:
          </label>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {[
              { value: "week", label: "Past Week" },
              { value: "month", label: "Past Month" },
              { value: "year", label: "Past Year" },
              { value: "all", label: "All Time" }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setAnalyticsFilter(option.value)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: analyticsFilter === option.value ? "var(--teal)" : "#f0f0f0",
                  color: analyticsFilter === option.value ? "white" : "#666",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  transition: "all 0.2s"
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Statistics Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "24px"
        }}>
          <div style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "var(--card-shadow)",
            border: "2px solid #e0e0e0"
          }}>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>
              Total Consultations
            </div>
            <div style={{ fontSize: "32px", fontWeight: "700", color: "var(--pink)" }}>
              {analytics.total}
            </div>
          </div>

          <div style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "var(--card-shadow)",
            border: "2px solid #fff3cd"
          }}>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>
              Pending
            </div>
            <div style={{ fontSize: "32px", fontWeight: "700", color: "#856404" }}>
              {analytics.pending}
            </div>
            <div style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
              {analytics.total > 0 ? Math.round((analytics.pending / analytics.total) * 100) : 0}% of total
            </div>
          </div>

          <div style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "var(--card-shadow)",
            border: "2px solid #d4edda"
          }}>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>
              Accepted
            </div>
            <div style={{ fontSize: "32px", fontWeight: "700", color: "#155724" }}>
              {analytics.accepted}
            </div>
            <div style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
              {analytics.total > 0 ? Math.round((analytics.accepted / analytics.total) * 100) : 0}% of total
            </div>
          </div>

          <div style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "var(--card-shadow)",
            border: "2px solid #f8d7da"
          }}>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>
              Rejected
            </div>
            <div style={{ fontSize: "32px", fontWeight: "700", color: "#721c24" }}>
              {analytics.rejected}
            </div>
            <div style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
              {analytics.total > 0 ? Math.round((analytics.rejected / analytics.total) * 100) : 0}% of total
            </div>
          </div>
        </div>

    {/* Counselor Performance */}
    <div style={{
      backgroundColor: "white",
      padding: "24px",
      borderRadius: "12px",
      boxShadow: "var(--card-shadow)",
      marginBottom: "24px"
    }}>
      <h3 style={{ marginTop: "0", marginBottom: "20px", color: "#333" }}>
        Counselor Performance
      </h3>
      {Object.keys(analytics.byCounselor).length > 0 ? (
        <div style={{ display: "grid", gap: "12px" }}>
          {Object.entries(analytics.byCounselor).map(([counselor, stats]) => (
            <div
              key={counselor}
              style={{
                padding: "16px",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
                border: "1px solid #e0e0e0"
              }}
            >
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                marginBottom: "12px"
              }}>
                <strong style={{ color: "#333" }}>{counselor}</strong>
                <span style={{ 
                  fontSize: "20px", 
                  fontWeight: "700", 
                  color: "var(--teal)" 
                }}>
                  {stats.total} total
                </span>
              </div>
              
              {/* Progress bars */}
              <div style={{ display: "grid", gap: "8px" }}>
                <div>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    fontSize: "12px",
                    marginBottom: "4px"
                  }}>
                    <span style={{ color: "#856404" }}>Pending</span>
                    <span>{stats.pending}</span>
                  </div>
                  <div style={{
                    height: "8px",
                    backgroundColor: "#fff3cd",
                    borderRadius: "4px",
                    overflow: "hidden"
                  }}>
                    <div style={{
                      width: `${stats.total > 0 ? (stats.pending / stats.total) * 100 : 0}%`,
                      height: "100%",
                      backgroundColor: "#856404",
                      transition: "width 0.3s"
                    }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    fontSize: "12px",
                    marginBottom: "4px"
                  }}>
                    <span style={{ color: "#155724" }}>Accepted</span>
                    <span>{stats.accepted}</span>
                  </div>
                  <div style={{
                    height: "8px",
                    backgroundColor: "#d4edda",
                    borderRadius: "4px",
                    overflow: "hidden"
                  }}>
                    <div style={{
                      width: `${stats.total > 0 ? (stats.accepted / stats.total) * 100 : 0}%`,
                      height: "100%",
                      backgroundColor: "#155724",
                      transition: "width 0.3s"
                    }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    fontSize: "12px",
                    marginBottom: "4px"
                  }}>
                    <span style={{ color: "#721c24" }}>Rejected</span>
                    <span>{stats.rejected}</span>
                  </div>
                  <div style={{
                    height: "8px",
                    backgroundColor: "#f8d7da",
                    borderRadius: "4px",
                    overflow: "hidden"
                  }}>
                    <div style={{
                      width: `${stats.total > 0 ? (stats.rejected / stats.total) * 100 : 0}%`,
                      height: "100%",
                      backgroundColor: "#721c24",
                      transition: "width 0.3s"
                    }}></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: "#666", fontStyle: "italic" }}>
          No data available for the selected period
        </p>
      )}
    </div>

    {/* Consultation Timeline */}
    <div style={{
      backgroundColor: "white",
      padding: "24px",
      borderRadius: "12px",
      boxShadow: "var(--card-shadow)",
      marginBottom: "24px"
    }}>
      <h3 style={{ marginTop: "0", marginBottom: "20px", color: "#333" }}>
        Consultation Timeline
      </h3>
      {Object.keys(analytics.byDate).length > 0 ? (
        <div style={{ 
          display: "flex", 
          alignItems: "flex-end", 
          gap: "8px",
          height: "200px",
          padding: "20px 0"
        }}>
          {Object.entries(analytics.byDate)
            .sort((a, b) => new Date(a[0]) - new Date(b[0]))
            .map(([date, count]) => {
              const maxCount = Math.max(...Object.values(analytics.byDate));
              const height = (count / maxCount) * 100;
              
              return (
                <div
                  key={date}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  <div style={{
                    position: "relative",
                    width: "100%",
                    height: "160px",
                    display: "flex",
                    alignItems: "flex-end"
                  }}>
                    <div
                      style={{
                        width: "100%",
                        height: `${height}%`,
                        backgroundColor: "var(--teal)",
                        borderRadius: "4px 4px 0 0",
                        transition: "height 0.3s",
                        position: "relative"
                      }}
                      title={`${count} consultation${count !== 1 ? 's' : ''}`}
                    >
                      <span style={{
                        position: "absolute",
                        top: "-20px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#333"
                      }}>
                        {count}
                      </span>
                    </div>
                  </div>
                  <div style={{
                    fontSize: "11px",
                    color: "#666",
                    textAlign: "center",
                    transform: "rotate(-45deg)",
                    whiteSpace: "nowrap"
                  }}>
                    {date}
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <p style={{ color: "#666", fontStyle: "italic" }}>
          No timeline data available
        </p>
      )}
    </div>

    {/* Detailed Consultation List with Scroll */}
    <div style={{
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "var(--card-shadow)",
              overflow: "hidden"
            }}>
              <div style={{ 
                padding: "20px 24px",
                borderBottom: "1px solid #e0e0e0",
                backgroundColor: "#f8f9fa"
              }}>
                <h3 style={{ margin: 0, color: "#333" }}>
                  Detailed Consultation Records
                </h3>
                <p style={{ margin: "8px 0 0 0", fontSize: "14px", color: "#666" }}>
                  Showing {consultations.length} total consultations
                </p>
              </div>

              {/* Scrollable table container */}
              <div style={{ 
                maxHeight: "500px", 
                overflowY: "auto",
                overflowX: "auto"
              }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ 
                    position: "sticky", 
                    top: 0, 
                    backgroundColor: "#f8f9fa",
                    zIndex: 1
                  }}>
                    <tr>
                      <th style={{ 
                        padding: "12px 16px", 
                        textAlign: "left", 
                        borderBottom: "2px solid #e0e0e0",
                        fontWeight: "600",
                        fontSize: "13px",
                        color: "#333"
                      }}>
                        Date
                      </th>
                      <th style={{ 
                        padding: "12px 16px", 
                        textAlign: "left", 
                        borderBottom: "2px solid #e0e0e0",
                        fontWeight: "600",
                        fontSize: "13px",
                        color: "#333"
                      }}>
                        Time
                      </th>
                      <th style={{ 
                        padding: "12px 16px", 
                        textAlign: "left", 
                        borderBottom: "2px solid #e0e0e0",
                        fontWeight: "600",
                        fontSize: "13px",
                        color: "#333"
                      }}>
                        Student
                      </th>
                      <th style={{ 
                        padding: "12px 16px", 
                        textAlign: "left", 
                        borderBottom: "2px solid #e0e0e0",
                        fontWeight: "600",
                        fontSize: "13px",
                        color: "#333"
                      }}>
                        Department
                      </th>
                      <th style={{ 
                        padding: "12px 16px", 
                        textAlign: "left", 
                        borderBottom: "2px solid #e0e0e0",
                        fontWeight: "600",
                        fontSize: "13px",
                        color: "#333"
                      }}>
                        Counselor
                      </th>
                      <th style={{ 
                        padding: "12px 16px", 
                        textAlign: "center", 
                        borderBottom: "2px solid #e0e0e0",
                        fontWeight: "600",
                        fontSize: "13px",
                        color: "#333"
                      }}>
                        Reason
                      </th>
                      <th style={{ 
                        padding: "12px 16px", 
                        textAlign: "center", 
                        borderBottom: "2px solid #e0e0e0",
                        fontWeight: "600",
                        fontSize: "13px",
                        color: "#333"
                      }}>
                        Status
                      </th>
                      <th style={{ 
                        padding: "12px 16px", 
                        textAlign: "left", 
                        borderBottom: "2px solid #e0e0e0",
                        fontWeight: "600",
                        fontSize: "13px",
                        color: "#333",
                        minWidth: "200px"
                      }}>
                        Remarks
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultations.length > 0 ? (
                      consultations.map((consultation, index) => (
                        <tr 
                          key={consultation.id} 
                          style={{ 
                            borderBottom: "1px solid #f0f0f0",
                            backgroundColor: index % 2 === 0 ? "white" : "#fafafa"
                          }}
                        >
                          <td style={{ padding: "12px 16px", fontSize: "14px" }}>
                            {formatDate(consultation.date)}
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: "14px" }}>
                            {consultation.time ? new Date(`2000-01-01T${consultation.time}`).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            }) : '—'}
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: "14px" }}>
                            <div style={{ fontWeight: "500" }}>
                              {consultation.student?.name || 'Unknown'}
                            </div>
                            <div style={{ fontSize: "12px", color: "#999" }}>
                              {consultation.student?.email || '—'}
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: "14px" }}>
                            <div style={{ fontWeight: "500", color: "#555" }}>
                              {consultation.student?.department || 'Not specified'}
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: "14px" }}>
                            <div style={{ fontWeight: "500" }}>
                              {consultation.counselor?.name || 'Unknown'}
                            </div>
                            <div style={{ fontSize: "12px", color: "#999" }}>
                              {consultation.counselor?.email || '—'}
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            {consultation.reason ? (
                              <span style={{
                                display: "inline-block",
                                padding: "6px 12px",
                                borderRadius: "20px",
                                fontSize: "12px",
                                fontWeight: "600",
                                backgroundColor: getEmotionColor(consultation.reason).bg,
                                color: getEmotionColor(consultation.reason).color
                              }}>
                                {getEmotionColor(consultation.reason).icon} {consultation.reason}
                              </span>
                            ) : (
                              <span style={{ color: "#999", fontSize: "12px", fontStyle: "italic" }}>
                                Not specified
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <span style={getStatusBadgeStyle(consultation.status)}>
                              {consultation.status}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: "13px", color: "#666", maxWidth: "300px" }}>
                            {consultation.status === 'rejected' && consultation.rejection_reason ? (
                              <div>
                                <span style={{ fontWeight: "600", color: "#d32f2f" }}>Rejection: </span>
                                <span>{consultation.rejection_reason}</span>
                              </div>
                            ) : consultation.counselor_notes ? (
                              <div>
                                <span style={{ fontWeight: "600", color: "#388e3c" }}>Notes: </span>
                                <span>{consultation.counselor_notes}</span>
                              </div>
                            ) : (
                              <span style={{ fontStyle: "italic", color: "#bbb" }}>No remarks</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td 
                          colSpan="8" 
                          style={{ 
                            padding: "40px", 
                            textAlign: "center", 
                            color: "#666",
                            fontStyle: "italic"
                          }}
                        >
                          No consultations found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Scroll indicator */}
              {consultations.length > 10 && (
                <div style={{
                  padding: "12px",
                  textAlign: "center",
                  fontSize: "12px",
                  color: "#999",
                  backgroundColor: "#f8f9fa",
                  borderTop: "1px solid #e0e0e0"
                }}>
                  ↕ Scroll to view all {consultations.length} consultations
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}