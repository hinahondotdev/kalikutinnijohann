import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        console.log('🔍 AuthCallback - Starting verification...');
        console.log('Current URL:', window.location.href);
        console.log('Hash:', window.location.hash);
        console.log('Search:', window.location.search);

        // Check for hash params (new Supabase format)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hashAccessToken = hashParams.get('access_token');
        const hashType = hashParams.get('type');
        const hashError = hashParams.get('error');
        const hashErrorDescription = hashParams.get('error_description');

        // Check for query params (old format or email link direct click)
        const searchParams = new URLSearchParams(window.location.search);
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        console.log('Hash params:', { hashAccessToken, hashType, hashError });
        console.log('Query params:', { token, type });

        // Handle errors from Supabase
        if (hashError) {
          console.error('Supabase auth error:', hashError, hashErrorDescription);
          setError(hashErrorDescription || hashError);
          setStatus('error');
          return;
        }

        // Method 1: Handle hash-based verification (modern Supabase)
        if (hashAccessToken && hashType === 'signup') {
          console.log('✅ Method 1: Hash-based verification detected');
          
          // Session should already be set by Supabase
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Session error:', sessionError);
            setError(sessionError.message);
            setStatus('error');
            return;
          }

          if (session?.user) {
            console.log('✅ Session found, user verified:', session.user.email);
            setStatus('success');
            
            // Redirect after 2 seconds
            setTimeout(() => {
              navigate('/profile-completion');
            }, 2000);
          } else {
            console.error('No session found despite having access token');
            setError('Session not established. Please try signing in.');
            setStatus('error');
          }
          return;
        }

        // Method 2: Handle token-based verification (email link direct)
        if (token && type === 'signup') {
          console.log('✅ Method 2: Token-based verification detected');
          
          // Exchange token for session
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup'
          });

          if (verifyError) {
            console.error('Token verification error:', verifyError);
            
            // Check if it's an expired token
            if (verifyError.message.includes('expired')) {
              setError('Verification link has expired. Please request a new one.');
            } else {
              setError(verifyError.message);
            }
            setStatus('error');
            return;
          }

          if (data?.session) {
            console.log('✅ Session created via token verification');
            setStatus('success');
            
            setTimeout(() => {
              navigate('/profile-completion');
            }, 2000);
          } else {
            setError('Verification successful but session not created. Please try signing in.');
            setStatus('error');
          }
          return;
        }

        // Method 3: Check if user is already signed in (page refresh)
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log('✅ User already has active session');
          setStatus('success');
          
          setTimeout(() => {
            navigate('/profile-completion');
          }, 1000);
          return;
        }

        // No valid verification method found
        console.error('❌ No valid verification parameters found');
        setError('Invalid or missing verification parameters.');
        setStatus('error');

      } catch (err) {
        console.error('❌ Verification error:', err);
        setError(err.message || 'An unexpected error occurred during verification.');
        setStatus('error');
      }
    };

    verifyEmail();
  }, [navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(180deg, #fff 0%, #fff6fb 100%)',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '48px',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '500px',
        width: '100%'
      }}>
        {status === 'verifying' && (
          <>
            <div style={{
              width: '64px',
              height: '64px',
              border: '6px solid #f3f3f3',
              borderTop: '6px solid #e91e63',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 24px'
            }}></div>
            <h2 style={{ color: '#333', marginBottom: '12px', fontSize: '24px' }}>
              Verifying Your Email...
            </h2>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Please wait while we verify your email address.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>✅</div>
            <h2 style={{ color: '#00bfa5', marginBottom: '12px', fontSize: '24px' }}>
              Email Verified!
            </h2>
            <p style={{ color: '#666', marginBottom: '16px', fontSize: '15px' }}>
              Your email has been successfully verified.
            </p>
            <p style={{ color: '#999', fontSize: '14px' }}>
              Redirecting you to complete your profile...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>❌</div>
            <h2 style={{ color: '#d32f2f', marginBottom: '12px', fontSize: '24px' }}>
              Verification Failed
            </h2>
            <p style={{ 
              color: '#666', 
              marginBottom: '24px', 
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              {error || 'The verification link is invalid or has expired.'}
            </p>
            
            {error?.includes('expired') && (
              <div style={{
                backgroundColor: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
                fontSize: '13px',
                color: '#856404',
                textAlign: 'left'
              }}>
                <strong>💡 What to do next:</strong>
                <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                  <li>Go back to the login page</li>
                  <li>Try signing in with your email and password</li>
                  <li>If that doesn't work, sign up again with the same email</li>
                </ol>
              </div>
            )}
            
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '12px 32px',
                backgroundColor: '#e91e63',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#d81b60'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#e91e63'}
            >
              Back to Login
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}