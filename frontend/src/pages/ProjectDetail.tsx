// Redirect to player detail
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ProjectDetailRedirect() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/players', { replace: true }); }, [navigate]);
  return null;
}
