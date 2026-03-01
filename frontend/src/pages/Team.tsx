// Redirects to Players
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TeamRedirect() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/players', { replace: true }); }, [navigate]);
  return null;
}
