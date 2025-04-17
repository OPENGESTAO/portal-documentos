import { useEffect, useState } from 'react';
import { FaEdit, FaKey, FaPlus, FaSearch } from 'react-icons/fa';
import { supabase } from '../supabaseClient';
import Header from '../components/Header';
import '../styles/UserManagementPage.css';

interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role: string;
  active?: boolean;
  permissions: { permissions: string[] } | null;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);

  useEffect(() => {
    const getToken = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) setToken(session.access_token);
      else setError('Token não disponível. Faça login novamente.');
    };
    getToken();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from('users').select('*');
      if (error) setError('Erro ao carregar usuários.');
      else setUsers(data);
    };
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return setError('Token de autenticação não disponível.');

    const form = e.currentTarget;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const phone = (form.elements.namedItem('phone') as HTMLInputElement).value;
    const role = (form.elements.namedItem('role') as HTMLSelectElement).value;
    const permissions = Array.from(
      form.querySelectorAll('input[name="permissions"]:checked') as NodeListOf<HTMLInputElement>
    ).map((input) => input.value);

    const phoneRegex = /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/;
    if (!phoneRegex.test(phone)) {
      setError('Celular inválido. Ex: (11) 91234-5678');
      return;
    }

    const password = Math.random().toString(36).slice(-8) + 'A1!';

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setError('Usuário logado não encontrado.');

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, password, role, name, phone, permissions, requesterEmail: user.email })

      });

      const result = await response.json();
      if (!response.ok) {
        setError('Erro ao criar usuário: ' + result.error);
        return;
      }

      setUsers([...users, { id: result.user.id, email, role, name, phone, permissions: { permissions }, active: true }]);
      setShowAddModal(false);
    } catch {
      setError('Erro ao criar usuário.');
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleEditUserSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser || !token) return setError('Dados incompletos.');

    const form = e.currentTarget;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
const email = (form.elements.namedItem('email') as HTMLInputElement).value;
const phone = (form.elements.namedItem('phone') as HTMLInputElement).value;
const role = (form.elements.namedItem('role') as HTMLSelectElement).value;

    const permissions = Array.from(
      form.querySelectorAll('input[name="permissions"]:checked') as NodeListOf<HTMLInputElement>
    ).map(input => input.value);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/update-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: selectedUser.id, email, role, name, phone, permissions })

      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Erro ao atualizar usuário.');
        return;
      }

      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, email, role, permissions: { permissions } } : u));
      setShowEditModal(false);
    } catch {
      setError('Erro ao conectar com o servidor.');
    }
  };

  const handleResetPassword = async (user: User) => {
    if (!token) return setError('Token não disponível.');
    const newPassword = Math.random().toString(36).slice(-8) + 'A1!';

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/update-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: user.id, password: newPassword })
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Erro ao redefinir senha.');
        return;
      }

      setNewPassword(newPassword);
      setSelectedUser(user);
      setShowResetPasswordModal(true);
    } catch {
      setError('Erro ao conectar com o servidor.');
    }
  };

  const handleDeactivateUser = async (user: User) => {
    if (!token) return setError('Token não disponível.');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/update-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: user.id, active: false })
      });

      if (response.ok) {
        setUsers(users.map(u => u.id === user.id ? { ...u, active: false } : u));
      } else {
        const result = await response.json();
        setError(result.error || 'Erro ao desativar usuário.');
      }
    } catch {
      setError('Erro ao conectar com o servidor.');
    }
  };

  const filteredUsers = users.filter((user) =>
    (user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="user-management-container">
      <Header />
      <main className="user-management-main">
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <h1>Gerenciamento de Usuários</h1>

        <div className="search-container">
          <button className="add-user-button" onClick={() => setShowAddModal(true)}>
            {FaPlus({})} Adicionar Usuário
          </button>
          <div className="search-input-wrapper">
          {FaSearch({})}
            <input
              type="text"
              placeholder="Buscar usuário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <table className="user-table">
  <thead>
    <tr>
      <th>Nome</th>
      <th>E-mail</th>
      <th>Celular</th>
      <th>Função</th>
      <th>Status</th>
      <th>Ações</th>
    </tr>
  </thead>
  <tbody>
    {filteredUsers.map((user) => (
      <tr key={user.id}>
        <td>{user.name}</td>
        <td>{user.email}</td>
        <td>{user.phone}</td>
        <td>{user.role}</td>
        <td>{user.active ? 'Ativo' : 'Inativo'}</td>
        <td className="action-buttons">
          <button onClick={() => handleEditUser(user)}>{FaEdit({})} Editar</button>
          <button onClick={() => handleResetPassword(user)}>{FaKey({})} Redefinir Senha</button>
          {user.active && (
            <button onClick={() => handleDeactivateUser(user)} className="deactivate-button">
              🚫 Desativar
            </button>
          )}
        </td>
      </tr>
    ))}
  </tbody>
</table>


   

        {showAddModal && (
          <div className="modal">
            <div className="modal-content">
              <h2>Adicionar Usuário</h2>
              <form onSubmit={handleAddUser}>
                <label>Nome: <input type="text" name="name" required /></label>
                <label>E-mail: <input type="email" name="email" required /></label>
                <label>Celular: <input type="text" name="phone" required placeholder="(11) 91234-5678" /></label>
                <label>Função:
                  <select name="role" required>
                    <option value="admin">Administrador</option>
                    <option value="employee">Funcionário</option>
                    <option value="client">Cliente</option>
                  </select>
                </label>
                <fieldset>
                  <legend>Permissões:</legend>
                  <label><input type="checkbox" name="permissions" value="manage_users" /> Gerenciar Usuários</label>
                  <label><input type="checkbox" name="permissions" value="manage_documents" /> Gerenciar Documentos</label>
                  <label><input type="checkbox" name="permissions" value="view_logs" /> Ver Logs</label>
                  <label><input type="checkbox" name="permissions" value="consult_clients" /> Consultar Clientes</label>
                </fieldset>
                <div className="modal-buttons">
                  <button type="submit">Salvar</button>
                  <button type="button" onClick={() => setShowAddModal(false)}>Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEditModal && selectedUser && (
          <div className="modal">
            <div className="modal-content">
              <h2>Editar Usuário</h2>
              <form onSubmit={handleEditUserSubmit}>
  <label>Nome: <input type="text" name="name" defaultValue={selectedUser.name} required /></label>
  <label>E-mail: <input type="email" name="email" defaultValue={selectedUser.email} required /></label>
  <label>Celular: <input type="text" name="phone" defaultValue={selectedUser.phone} required placeholder="(11) 91234-5678" /></label>
  <label>Função:
    <select name="role" defaultValue={selectedUser.role} required>

                    <option value="admin">Administrador</option>
                    <option value="employee">Funcionário</option>
                    <option value="client">Cliente</option>
                  </select>
                </label>
                <fieldset>
                  <legend>Permissões:</legend>
                  <label><input type="checkbox" name="permissions" value="manage_users" defaultChecked={(selectedUser.permissions?.permissions || []).includes('manage_users')} /> Gerenciar Usuários</label>
                  <label><input type="checkbox" name="permissions" value="manage_documents" defaultChecked={(selectedUser.permissions?.permissions || []).includes('manage_documents')} /> Gerenciar Documentos</label>
                  <label><input type="checkbox" name="permissions" value="view_logs" defaultChecked={(selectedUser.permissions?.permissions || []).includes('view_logs')} /> Ver Logs</label>
                  <label><input type="checkbox" name="permissions" value="consult_clients" defaultChecked={(selectedUser.permissions?.permissions || []).includes('consult_clients')} /> Consultar Clientes</label>
                </fieldset>
                <div className="modal-buttons">
                  <button type="submit">Salvar</button>
                  <button type="button" onClick={() => setShowEditModal(false)}>Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showResetPasswordModal && selectedUser && (
          <div className="modal">
            <div className="modal-content">
              <h2>Senha Redefinida</h2>
              <p>Nova senha para <strong>{selectedUser.email}</strong>: <strong>{newPassword}</strong></p>
              <button onClick={() => navigator.clipboard.writeText(newPassword)}>Copiar Senha</button>
              <button onClick={() => setShowResetPasswordModal(false)}>Fechar</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
