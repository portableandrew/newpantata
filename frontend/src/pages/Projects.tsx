// Repurposed as Players page - see Players.tsx
// This file redirects to maintain routing compatibility
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Players() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/players', { replace: true }); }, [navigate]);
  return null;
}
