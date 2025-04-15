// src/pages/AdminPage.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUsers, FaFileAlt, FaHistory, FaSearch } from 'react-icons/fa';
import { supabase } from '../supabaseClient';
import Header from '../components/Header';
import '../styles/AdminPage.css';

export default function AdminPage() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPermissions = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('role, permissions')
        .eq('id', session.user.id)
        .single();

      if (error || !data) {
        console.error('Erro ao carregar permissões:', error);
        navigate('/');
        return;
      }

      if (data.role !== 'admin' && data.role !== 'employee') {
        navigate('/');
        return;
      }

      const perms = data.permissions?.permissions || [];
      setPermissions(perms);
      setLoading(false);
    };

    fetchPermissions();
  }, [navigate]);

  const hasPermission = (key: string) => permissions.includes(key);

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="admin-container">
      <Header />
      <main className="admin-main">
        <h1>Página Administração do Portal</h1>
        <p>Gerencie usuários, documentos e logs do sistema</p>
        <div className="admin-buttons">
          {hasPermission('manage_users') && (
            <Link to="/users">
              <button><FaUsers /> Gerenciamento de Usuários</button>
            </Link>
          )}
          {hasPermission('manage_documents') && (
            <Link to="/documents">
              <button><FaFileAlt /> Gerenciamento de Documentos</button>
            </Link>
          )}
          {hasPermission('view_logs') && (
            <Link to="/logs">
              <button><FaHistory /> Logs do Sistema</button>
            </Link>
          )}
          {hasPermission('consult_clients') && (
            <Link to="/consult-clients">
              <button><FaSearch /> Consultar Clientes</button>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
