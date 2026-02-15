import React, { useState, useEffect } from 'react';
import {
  Box, Card, TextField, Button, Typography, Avatar, IconButton,
  CircularProgress, Alert, Container, Paper, Divider, Grid, Tabs, Tab,
  Switch, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, Select, MenuItem, FormControl, InputLabel, Snackbar
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  FileDownload as FileDownloadIcon, Delete as DeleteIcon,
  Settings as SettingsIcon, Lock as LockIcon, Person as PersonIcon,
  GetApp as GetAppIcon, History as HistoryIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import { useAuth } from './AuthContext';
import BackButton from './components/BackButton';

const NEON_PURPLE = '#bb86fc';
const NEON_CYAN = '#03dac6';
const GLASS_BG = 'rgba(30, 41, 59, 0.5)';
const GLASS_BORDER = '1px solid rgba(255, 255, 255, 0.1)';
const API_BASE = 'http://127.0.0.1:8000';

const EditProfile = () => {
  const navigate = useNavigate();
  const { updateProfilePic } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  
  const [profileData, setProfileData] = useState({
    display_name: '',
    email: '',
    phone: '',
    college: '',
    enrollment_id: '',
    bio: ''
  });
  
  const [settings, setSettings] = useState({
    defaultResponseMode: 'fast',
    enableNotifications: true,
    autoSaveHistory: true,
    showQuickSuggestions: true,
    privacyMode: false
  });
  
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [profilePic, setProfilePic] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    fetchUserProfile();
    loadSettings();
    fetchChatHistory();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load profile');
      }

      const data = await response.json();
      setProfileData({
        display_name: data.display_name || '',
        email: data.email || '',
        phone: data.mobile_number || '',
        college: data.college || '',
        enrollment_id: data.enrollment_id || '',
        bio: data.bio || ''
      });

      if (data.profile_picture_url) {
        const url = data.profile_picture_url;
        const resolved = url.startsWith('http') ? url : `${API_BASE}${url}`;
        setPreviewUrl(resolved);
        updateProfilePic(resolved);
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to load profile: ' + err.message);
      setLoading(false);
    }
  };

  const resolveAvatarUrl = (url) => {
    if (!url) return null;
    const s = String(url).trim();
    if (!s) return null;
    if (s.startsWith('http')) return s;
    if (s.startsWith('/')) return `${API_BASE}${s}`;
    return s;
  };

  const uploadAvatar = async (file) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Please login again');

    const uploadForm = new FormData();
    uploadForm.append('file', file);

    // Prefer new Supabase-backed endpoint.
    let res = await fetch(`${API_BASE}/upload-avatar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: uploadForm
    });

    if (!res.ok) {
      // Fallback to legacy local upload endpoint (kept for backward compatibility).
      res = await fetch(`${API_BASE}/profile/upload-picture`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: uploadForm
      });
    }

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(txt || 'Failed to upload profile photo');
    }

    const data = await res.json().catch(() => ({}));
    const url = data?.url;
    if (!url) throw new Error('Upload succeeded but URL was missing');
    return resolveAvatarUrl(url);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePic(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);

      // Upload immediately and sync to Navbar.
      (async () => {
        try {
          setAvatarUploading(true);
          setError('');
          const uploadedUrl = await uploadAvatar(file);
          if (uploadedUrl) {
            setPreviewUrl(uploadedUrl);
            updateProfilePic(uploadedUrl);
            setProfilePic(null); // prevent re-upload on Save
          }
        } catch (err) {
          setError(err?.message || 'Failed to upload photo');
        } finally {
          setAvatarUploading(false);
        }
      })();
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('token');
      if (!token) throw new Error('Please login again');

      // 1) Upload profile picture (backend expects multipart field name: "file")
      if (profilePic) {
        const uploadForm = new FormData();
        uploadForm.append('file', profilePic);
        const uploadedUrl = await uploadAvatar(profilePic);
        if (uploadedUrl) {
          setPreviewUrl(uploadedUrl);
          updateProfilePic(uploadedUrl);
        }
      }

      // 2) Update profile fields (backend expects JSON)
      const payload = {
        display_name: profileData.display_name,
        mobile_number: profileData.phone,
        email: profileData.email,
        college: profileData.college,
        enrollment_id: profileData.enrollment_id,
        bio: profileData.bio
      };

      const response = await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(errText || 'Failed to update profile');
      }

      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Load user settings from localStorage
  const loadSettings = () => {
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  };

  // Save settings to localStorage
  const handleSaveSettings = () => {
    localStorage.setItem('userSettings', JSON.stringify(settings));
    showSnackbar('Settings saved successfully!');
  };

  // Fetch chat history for export
  const fetchChatHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`${API_BASE}/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setChatHistory(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    try {
      if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        setError('All password fields are required');
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError('New passwords do not match');
        return;
      }

      if (passwordData.newPassword.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      setSaving(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/profile/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          old_password: passwordData.oldPassword,
          new_password: passwordData.newPassword,
          confirm_password: passwordData.confirmPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to change password');
      }

      showSnackbar('Password changed successfully!');
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Export chat history as PDF
  const exportChatHistoryPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      let yPos = margin;

      // Header
      doc.setFillColor(187, 134, 252);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('BCABuddy Chat History', pageWidth / 2, 25, { align: 'center' });

      yPos = 55;

      // Metadata
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Exported on: ${new Date().toLocaleString()}`, margin, yPos);
      doc.text(`Total Messages: ${chatHistory.length}`, margin, yPos + 7);
      
      yPos += 20;

      // Chat messages
      chatHistory.forEach((msg, index) => {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = margin;
        }

        // Message header
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        const role = msg.role === 'user' ? '👤 You' : '🤖 BCABuddy';
        doc.text(role, margin, yPos);
        
        yPos += 8;

        // Message content
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(msg.text || msg.content || '', maxWidth);
        doc.text(lines, margin, yPos);
        
        yPos += lines.length * 5 + 10;

        // Divider
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 10;
      });

      // Footer on last page
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Generated by BCABuddy', pageWidth / 2, pageHeight - 10, { align: 'center' });

      doc.save(`BCABuddy_ChatHistory_${new Date().toISOString().split('T')[0]}.pdf`);
      showSnackbar('Chat history exported successfully!');
      setExportDialogOpen(false);
    } catch (err) {
      setError('Failed to export PDF: ' + err.message);
    }
  };

  // Export user data as CSV
  const exportDataCSV = () => {
    try {
      const csvContent = [
        ['Message #', 'Role', 'Content', 'Timestamp'],
        ...chatHistory.map((msg, index) => [
          index + 1,
          msg.role,
          `"${(msg.text || msg.content || '').replace(/"/g, '""')}"`,
          msg.timestamp || new Date().toISOString()
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `BCABuddy_Data_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      showSnackbar('Data exported as CSV successfully!');
      setExportDialogOpen(false);
    } catch (err) {
      setError('Failed to export CSV: ' + err.message);
    }
  };

  // Delete account (placeholder - would need backend endpoint)
  const handleDeleteAccount = async () => {
    try {
      // Placeholder: In production, this would call DELETE /profile endpoint
      showSnackbar('Account deletion requested. Please contact support.');
      setDeleteDialogOpen(false);
    } catch (err) {
      setError('Failed to delete account: ' + err.message);
    }
  };

  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setError('');
    setSuccess('');
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: '#000000',
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(187, 134, 252, 0.05) 0%, transparent 50%),
                           radial-gradient(circle at 80% 80%, rgba(3, 218, 198, 0.05) 0%, transparent 50%)`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <BackButton />
        <CircularProgress sx={{ color: NEON_CYAN }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#000000',
        backgroundImage: `radial-gradient(circle at 20% 50%, rgba(187, 134, 252, 0.05) 0%, transparent 50%),
                         radial-gradient(circle at 80% 80%, rgba(3, 218, 198, 0.05) 0%, transparent 50%)`,
        padding: 3,
        paddingTop: 12
      }}
    >
      <BackButton />
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
          <Typography variant="h5" sx={{ color: '#E6EAF0', fontWeight: 700 }}>
            Profile & Settings
          </Typography>
        </Box>

        {/* Error and Success Messages */}
        {error && <Alert severity="error" sx={{ marginBottom: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ marginBottom: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

        {/* Main Card with Tabs */}
        <Card
          sx={{
            background: GLASS_BG,
            border: GLASS_BORDER,
            backdropFilter: 'blur(12px)',
            borderRadius: 3,
            overflow: 'hidden',
            color: '#E6EAF0'
          }}
        >
          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              '& .MuiTab-root': {
                color: '#888',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '15px',
                minWidth: 120,
                '&.Mui-selected': {
                  color: NEON_CYAN
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: NEON_CYAN,
                height: 3
              }
            }}
          >
            <Tab icon={<PersonIcon />} label="Profile" iconPosition="start" />
            <Tab icon={<LockIcon />} label="Security" iconPosition="start" />
            <Tab icon={<SettingsIcon />} label="Settings" iconPosition="start" />
            <Tab icon={<GetAppIcon />} label="Export" iconPosition="start" />
          </Tabs>

          <Box sx={{ padding: 4 }}>
            {/* Tab 0: Profile */}
            {activeTab === 0 && (
              <>
                {/* Profile Picture Section */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 4 }}>
                  <Box sx={{ position: 'relative', display: 'inline-flex', marginBottom: 2 }}>
                    <Avatar
                      sx={{
                        width: 100,
                        height: 100,
                        background: `linear-gradient(135deg, ${NEON_PURPLE}, ${NEON_CYAN})`,
                        fontSize: '40px',
                        fontWeight: 700
                      }}
                      src={previewUrl}
                      imgProps={{ style: { objectFit: 'cover' } }}
                    >
                      {profileData.display_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                    </Avatar>

                    {avatarUploading && (
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '50%',
                          bgcolor: 'rgba(10, 13, 23, 0.65)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backdropFilter: 'blur(12px)'
                        }}
                      >
                        <CircularProgress size={28} sx={{ color: NEON_CYAN }} />
                      </Box>
                    )}
                  </Box>

                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    sx={{
                      color: NEON_CYAN,
                      borderColor: NEON_CYAN,
                      '&:hover': {
                        borderColor: NEON_PURPLE,
                        color: NEON_PURPLE
                      }
                    }}
                  >
                    Upload Photo
                    <input
                      hidden
                      accept="image/*"
                      type="file"
                      onChange={handleProfilePicChange}
                    />
                  </Button>
                </Box>

                <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', marginBottom: 3 }} />

                {/* Form Fields */}
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Display Name"
                      name="display_name"
                      value={profileData.display_name}
                      onChange={handleInputChange}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#E6EAF0',
                          '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                          '&:hover fieldset': { borderColor: NEON_CYAN },
                          '&.Mui-focused fieldset': { borderColor: NEON_CYAN }
                        },
                        '& .MuiInputLabel-root': { color: '#888' },
                        '& .MuiInputLabel-root.Mui-focused': { color: NEON_CYAN }
                      }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Email"
                      name="email"
                      type="email"
                      value={profileData.email}
                      onChange={handleInputChange}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#E6EAF0',
                          '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                          '&:hover fieldset': { borderColor: NEON_CYAN },
                          '&.Mui-focused fieldset': { borderColor: NEON_CYAN }
                        },
                        '& .MuiInputLabel-root': { color: '#888' },
                        '& .MuiInputLabel-root.Mui-focused': { color: NEON_CYAN }
                      }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Phone"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleInputChange}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#E6EAF0',
                          '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                          '&:hover fieldset': { borderColor: NEON_CYAN },
                          '&.Mui-focused fieldset': { borderColor: NEON_CYAN }
                        },
                        '& .MuiInputLabel-root': { color: '#888' },
                        '& .MuiInputLabel-root.Mui-focused': { color: NEON_CYAN }
                      }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="College/University"
                      name="college"
                      value={profileData.college}
                      onChange={handleInputChange}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#E6EAF0',
                          '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                          '&:hover fieldset': { borderColor: NEON_CYAN },
                          '&.Mui-focused fieldset': { borderColor: NEON_CYAN }
                        },
                        '& .MuiInputLabel-root': { color: '#888' },
                        '& .MuiInputLabel-root.Mui-focused': { color: NEON_CYAN }
                      }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Enrollment ID"
                      name="enrollment_id"
                      value={profileData.enrollment_id}
                      onChange={handleInputChange}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#E6EAF0',
                          '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                          '&:hover fieldset': { borderColor: NEON_CYAN },
                          '&.Mui-focused fieldset': { borderColor: NEON_CYAN }
                        },
                        '& .MuiInputLabel-root': { color: '#888' },
                        '& .MuiInputLabel-root.Mui-focused': { color: NEON_CYAN }
                      }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Bio (Optional)"
                      name="bio"
                      value={profileData.bio}
                      onChange={handleInputChange}
                      placeholder="Tell us about yourself..."
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#E6EAF0',
                          '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                          '&:hover fieldset': { borderColor: NEON_CYAN },
                          '&.Mui-focused fieldset': { borderColor: NEON_CYAN }
                        },
                        '& .MuiInputLabel-root': { color: '#888' },
                        '& .MuiInputLabel-root.Mui-focused': { color: NEON_CYAN }
                      }}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', margin: '24px 0' }} />

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/dashboard')}
                    sx={{
                      color: '#888',
                      borderColor: '#888',
                      '&:hover': {
                        borderColor: NEON_CYAN,
                        color: NEON_CYAN
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSaveProfile}
                    disabled={saving}
                    sx={{
                      background: `linear-gradient(135deg, ${NEON_PURPLE}, ${NEON_CYAN})`,
                      color: '#000',
                      fontWeight: 700,
                      '&:hover': {
                        boxShadow: `0 0 20px rgba(187, 134, 252, 0.5)`
                      },
                      '&:disabled': {
                        opacity: 0.6
                      }
                    }}
                  >
                    {saving ? <CircularProgress size={24} /> : 'Save Changes'}
                  </Button>
                </Box>
              </>
            )}

            {/* Tab 1: Security */}
            {activeTab === 1 && (
              <>
                <Typography variant="h6" sx={{ color: NEON_PURPLE, marginBottom: 3, fontWeight: 600 }}>
                  Change Password
                </Typography>

                <Grid container spacing={3}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      type="password"
                      label="Current Password"
                      value={passwordData.oldPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#E6EAF0',
                          '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                          '&:hover fieldset': { borderColor: NEON_CYAN },
                          '&.Mui-focused fieldset': { borderColor: NEON_CYAN }
                        },
                        '& .MuiInputLabel-root': { color: '#888' },
                        '& .MuiInputLabel-root.Mui-focused': { color: NEON_CYAN }
                      }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      type="password"
                      label="New Password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#E6EAF0',
                          '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                          '&:hover fieldset': { borderColor: NEON_CYAN },
                          '&.Mui-focused fieldset': { borderColor: NEON_CYAN }
                        },
                        '& .MuiInputLabel-root': { color: '#888' },
                        '& .MuiInputLabel-root.Mui-focused': { color: NEON_CYAN }
                      }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      type="password"
                      label="Confirm New Password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#E6EAF0',
                          '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                          '&:hover fieldset': { borderColor: NEON_CYAN },
                          '&.Mui-focused fieldset': { borderColor: NEON_CYAN }
                        },
                        '& .MuiInputLabel-root': { color: '#888' },
                        '& .MuiInputLabel-root.Mui-focused': { color: NEON_CYAN }
                      }}
                    />
                  </Grid>
                </Grid>

                <Box sx={{ marginTop: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    onClick={handleChangePassword}
                    disabled={saving}
                    sx={{
                      background: `linear-gradient(135deg, ${NEON_PURPLE}, ${NEON_CYAN})`,
                      color: '#000',
                      fontWeight: 700,
                      '&:hover': {
                        boxShadow: `0 0 20px rgba(187, 134, 252, 0.5)`
                      }
                    }}
                  >
                    {saving ? <CircularProgress size={24} /> : 'Update Password'}
                  </Button>
                </Box>

                <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', margin: '32px 0' }} />

                <Typography variant="h6" sx={{ color: '#ff6b6b', marginBottom: 2, fontWeight: 600 }}>
                  Danger Zone
                </Typography>

                <Paper
                  sx={{
                    background: 'rgba(255, 107, 107, 0.1)',
                    border: '1px solid rgba(255, 107, 107, 0.3)',
                    padding: 3,
                    borderRadius: 2
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#E6EAF0', marginBottom: 2 }}>
                    Once you delete your account, there is no going back. Please be certain.
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<DeleteIcon />}
                    onClick={() => setDeleteDialogOpen(true)}
                    sx={{
                      color: '#ff6b6b',
                      borderColor: '#ff6b6b',
                      '&:hover': {
                        borderColor: '#ff4757',
                        backgroundColor: 'rgba(255, 107, 107, 0.1)'
                      }
                    }}
                  >
                    Delete Account
                  </Button>
                </Paper>
              </>
            )}

            {/* Tab 2: Settings */}
            {activeTab === 2 && (
              <>
                <Typography variant="h6" sx={{ color: NEON_PURPLE, marginBottom: 3, fontWeight: 600 }}>
                  Preferences
                </Typography>

                <Grid container spacing={3}>
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <InputLabel sx={{ color: '#888', '&.Mui-focused': { color: NEON_CYAN } }}>
                        Default Response Mode
                      </InputLabel>
                      <Select
                        value={settings.defaultResponseMode}
                        onChange={(e) => setSettings({ ...settings, defaultResponseMode: e.target.value })}
                        label="Default Response Mode"
                        sx={{
                          color: '#E6EAF0',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: NEON_CYAN },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: NEON_CYAN },
                          '& .MuiSvgIcon-root': { color: '#888' }
                        }}
                      >
                        <MenuItem value="fast">⚡ Fast</MenuItem>
                        <MenuItem value="thinking">🧠 Thinking</MenuItem>
                        <MenuItem value="pro">🏆 Pro</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.enableNotifications}
                          onChange={(e) => setSettings({ ...settings, enableNotifications: e.target.checked })}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: NEON_CYAN
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: NEON_CYAN
                            }
                          }}
                        />
                      }
                      label="Enable Notifications"
                      sx={{ color: '#E6EAF0' }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.autoSaveHistory}
                          onChange={(e) => setSettings({ ...settings, autoSaveHistory: e.target.checked })}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: NEON_CYAN
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: NEON_CYAN
                            }
                          }}
                        />
                      }
                      label="Auto-save Chat History"
                      sx={{ color: '#E6EAF0' }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.showQuickSuggestions}
                          onChange={(e) => setSettings({ ...settings, showQuickSuggestions: e.target.checked })}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: NEON_CYAN
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: NEON_CYAN
                            }
                          }}
                        />
                      }
                      label="Show Quick Suggestions"
                      sx={{ color: '#E6EAF0' }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.privacyMode}
                          onChange={(e) => setSettings({ ...settings, privacyMode: e.target.checked })}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: NEON_PURPLE
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: NEON_PURPLE
                            }
                          }}
                        />
                      }
                      label="Privacy Mode (Don't save history)"
                      sx={{ color: '#E6EAF0' }}
                    />
                  </Grid>
                </Grid>

                <Box sx={{ marginTop: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    onClick={handleSaveSettings}
                    sx={{
                      background: `linear-gradient(135deg, ${NEON_PURPLE}, ${NEON_CYAN})`,
                      color: '#000',
                      fontWeight: 700,
                      '&:hover': {
                        boxShadow: `0 0 20px rgba(187, 134, 252, 0.5)`
                      }
                    }}
                  >
                    Save Settings
                  </Button>
                </Box>
              </>
            )}

            {/* Tab 3: Export */}
            {activeTab === 3 && (
              <>
                <Typography variant="h6" sx={{ color: NEON_PURPLE, marginBottom: 3, fontWeight: 600 }}>
                  Export Your Data
                </Typography>

                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card
                      sx={{
                        background: 'rgba(187, 134, 252, 0.1)',
                        border: `1px solid ${NEON_PURPLE}`,
                        padding: 3,
                        borderRadius: 2,
                        height: '100%'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
                        <FileDownloadIcon sx={{ color: NEON_PURPLE, marginRight: 1 }} />
                        <Typography variant="h6" sx={{ color: '#E6EAF0', fontWeight: 600 }}>
                          Chat History PDF
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: '#888', marginBottom: 2 }}>
                        Export all your chat conversations as a formatted PDF document.
                      </Typography>
                      <Chip
                        label={`${chatHistory.length} messages`}
                        size="small"
                        sx={{
                          background: 'rgba(187, 134, 252, 0.2)',
                          color: NEON_PURPLE,
                          marginBottom: 2
                        }}
                      />
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={exportChatHistoryPDF}
                        disabled={chatHistory.length === 0}
                        sx={{
                          color: NEON_PURPLE,
                          borderColor: NEON_PURPLE,
                          '&:hover': {
                            borderColor: NEON_CYAN,
                            color: NEON_CYAN
                          },
                          '&:disabled': {
                            opacity: 0.5
                          }
                        }}
                      >
                        Export as PDF
                      </Button>
                    </Card>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card
                      sx={{
                        background: 'rgba(3, 218, 198, 0.1)',
                        border: `1px solid ${NEON_CYAN}`,
                        padding: 3,
                        borderRadius: 2,
                        height: '100%'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
                        <GetAppIcon sx={{ color: NEON_CYAN, marginRight: 1 }} />
                        <Typography variant="h6" sx={{ color: '#E6EAF0', fontWeight: 600 }}>
                          Data Export CSV
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: '#888', marginBottom: 2 }}>
                        Download all your data in CSV format for analysis or backup.
                      </Typography>
                      <Chip
                        label="Spreadsheet format"
                        size="small"
                        sx={{
                          background: 'rgba(3, 218, 198, 0.2)',
                          color: NEON_CYAN,
                          marginBottom: 2
                        }}
                      />
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={exportDataCSV}
                        disabled={chatHistory.length === 0}
                        sx={{
                          color: NEON_CYAN,
                          borderColor: NEON_CYAN,
                          '&:hover': {
                            borderColor: NEON_PURPLE,
                            color: NEON_PURPLE
                          },
                          '&:disabled': {
                            opacity: 0.5
                          }
                        }}
                      >
                        Export as CSV
                      </Button>
                    </Card>
                  </Grid>
                </Grid>

                <Paper
                  sx={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: 3,
                    borderRadius: 2,
                    marginTop: 3
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#888', fontSize: '13px' }}>
                    📌 <strong>Note:</strong> Exported files include all your chat messages, timestamps, and metadata. 
                    Keep these files secure as they contain your personal data.
                  </Typography>
                </Paper>
              </>
            )}
          </Box>
        </Card>

        {/* Delete Account Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          PaperProps={{
            sx: {
              background: GLASS_BG,
              backdropFilter: 'blur(12px)',
              border: GLASS_BORDER,
              color: '#E6EAF0'
            }
          }}
        >
          <DialogTitle sx={{ color: '#ff6b6b', fontWeight: 600 }}>
            Delete Account?
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: '#E6EAF0' }}>
              This action cannot be undone. All your data, chat history, and settings will be permanently deleted.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              sx={{ color: '#888' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAccount}
              sx={{ color: '#ff6b6b', fontWeight: 600 }}
            >
              Delete Permanently
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={() => setSnackbarOpen(false)}
          message={snackbarMessage}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          ContentProps={{
            sx: {
              background: `linear-gradient(135deg, ${NEON_PURPLE}, ${NEON_CYAN})`,
              color: '#000',
              fontWeight: 600
            }
          }}
        />
      </Container>
    </Box>
  );
};

export default EditProfile;
