import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMe } from '../api';

const OAuthSuccess = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    const finalizeLogin = async () => {
      if (token) {
        localStorage.setItem('baithak_token', token);
        try {
          const { data } = await getMe();
          setUser(data.user);
          navigate('/');
        } catch (err) {
          console.error('OAuth finalize error:', err);
          localStorage.removeItem('baithak_token');
          navigate('/login');
        }
      } else {
        navigate('/login');
      }
    };

    finalizeLogin();
  }, [navigate, setUser]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#060d14] text-white">
      <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-[var(--text-muted)] font-medium">Signing you in...</p>
    </div>
  );
};

export default OAuthSuccess;
