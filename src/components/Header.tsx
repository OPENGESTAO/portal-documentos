// src/components/Header.tsx
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import logo from '../assets/logo.png';
import '../styles/Header.css';

interface HeaderProps {
  showLogout?: boolean; // Prop opcional para controlar a visibilidade do botão
}

export default function Header({ showLogout = true }: HeaderProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Erro ao fazer logout:', error);
    } else {
      navigate('/'); // Redireciona para a página de login após o logout
    }
  };

  return (
    <header className="header">
      <img src={logo} alt="Open Gestão Logo" className="header-logo" />
      {showLogout && (
        <button onClick={handleLogout} className="logout-button">
          Sair
        </button>
      )}
    </header>
  );
}