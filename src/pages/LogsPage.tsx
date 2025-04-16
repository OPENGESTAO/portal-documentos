import React, { useEffect, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { Modal } from 'react-bootstrap';
import { supabase } from '../supabaseClient';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';
import '../styles/LogsPage.css';

interface Log {
  id: string;
  usuario: string;
  action: string;
  table_name: string;
  cliente: string;
  documentoid: string | null;
  timestamp: string;
  before: any;
  after: any;
  novoarquivo: string | null;
}

interface Client {
  email: string;
  name: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<Log[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const logsPerPage = 50;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch logs, clients, and check access
  useEffect(() => {
    const checkAccessAndFetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role, permissions')
        .eq('id', user.id)
        .single();

      if (userData?.role !== 'admin' && !userData?.permissions?.permissions?.includes('view_logs')) {
        navigate('/dashboard');
        return;
      }

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('users')
        .select('email, name')
        .eq('role', 'client');
      if (clientsError) {
        setError('Erro ao carregar os clientes.');
        console.error('Erro ao buscar clientes:', clientsError);
      } else {
        setClients(clientsData);
      }

      // Fetch logs
      const { data: logsData, error: logsError } = await supabase
        .from('logs')
        .select('*')
        .order('timestamp', { ascending: false });

      if (logsError) {
        setError('Erro ao carregar os logs.');
        console.error('Erro ao buscar logs:', logsError);
      } else {
        setLogs(logsData);
        setFilteredLogs(logsData);
      }
      setLoading(false);
    };

    checkAccessAndFetchData();
  }, [navigate]);

  // Apply filters and search
  useEffect(() => {
    let filtered = logs;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((log) =>
        (log.usuario?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.cliente?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by action
    if (actionFilter) {
      filtered = filtered.filter((log) => log.action === actionFilter);
    }

    // Filter by date range
    if (startDate || endDate) {
      filtered = filtered.filter((log) => {
        const logDate = new Date(log.timestamp).getTime();
        const start = startDate ? new Date(startDate).getTime() : -Infinity;
        const end = endDate ? new Date(endDate).getTime() + 86399999 : Infinity; // Include entire end day
        return logDate >= start && logDate <= end;
      });
    }

    setFilteredLogs(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [logs, searchTerm, actionFilter, startDate, endDate]);

  // Pagination logic
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR', { timeZone: 'UTC' });
  };

  // Get client name from email
  const getClientName = (email: string) => {
    const client = clients.find((c) => c.email === email);
    return client ? client.name : email;
  };

  // Show details modal
  const handleShowDetails = (log: Log) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  // Truncate URL for display (optional, to prevent overly long URLs from breaking the layout)
  const truncateUrl = (url: string, maxLength: number = 50) => {
    if (url.length <= maxLength) return url;
    return `${url.substring(0, maxLength - 3)}...`;
  };

  // Render diff view for before/after changes in modal
  const renderDetails = (log: Log) => {
    const { action, before, after } = log;

    if (action === 'upload') {
      // For uploads, show the inserted data
      return (
        <div className="mb-3">
          <h5>Detalhes do Documento Inserido</h5>
          <p><strong>Categoria:</strong> {after?.categoria || '-'}</p>
          <p><strong>Tipo de Documento:</strong> {after?.tipodocumento || '-'}</p>
          <p><strong>Descrição:</strong> {after?.descricao || 'Nenhuma descrição fornecida'}</p>
          {after?.proprietario && (
            <p><strong>Proprietário:</strong> {after.proprietario}</p>
          )}
          {after?.empresa && (
            <p><strong>Empresa:</strong> {after.empresa}</p>
          )}
          {after?.campos && (
            <div className="mt-3">
              <h6>Campos Preenchidos:</h6>
              <ul className="list-group">
                {Object.entries(after.campos).map(([field, value]) => (
                  <li key={field} className="list-group-item">
                    <strong>{field}:</strong> {String(value) || 'Não preenchido'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    if (action === 'atualização') {
      // For updates, show the changes
      if (!before || !after) return <span>Nenhuma alteração registrada.</span>;

      const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
      const changes: React.JSX.Element[] = [];

      allKeys.forEach((key) => {
        const beforeValue = before[key];
        const afterValue = after[key];

        if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
          changes.push(
            <li key={key} className="list-group-item">
              <strong>{key}:</strong>
              <div className="change-before">Antes: {beforeValue ? String(beforeValue) : 'N/A'}</div>
              <div className="change-after">Depois: {afterValue ? String(afterValue) : 'N/A'}</div>
            </li>
          );
        }
      });

      return (
        <div className="mb-3">
          <h5>Detalhes das Alterações</h5>
          <ul className="list-group">
            {changes.length > 0 ? changes : <li className="list-group-item">Sem alterações significativas.</li>}
          </ul>
        </div>
      );
    }

    return <span>Detalhes não disponíveis para esta ação.</span>;
  };

  return (
    <div className="logs-container">
      <Header />
      <main className="logs-main">
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <h1>Logs do Sistema</h1>

        <div className="filters-container">
          <div className="search-container">
            <div className="search-input-wrapper">
            {FaSearch({})}
              <input
                type="text"
                placeholder="Buscar logs (usuário, ação, cliente)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">Filtrar por Ação:</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="filter-input"
            >
              <option value="">Todas</option>
              <option value="upload">Upload</option>
              <option value="atualização">Atualização</option>
              <option value="exclusão">Exclusão</option>
              <option value="download">Download</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Data Início:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Data Fim:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="filter-input"
            />
          </div>
        </div>

        {loading ? (
          <p>Carregando logs...</p>
        ) : (
          <>
            <div className="table-responsive">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Usuário</th>
                    <th>Ação</th>
                    <th>Tabela</th>
                    <th>Cliente</th>
                    <th>URL do Documento</th>
                    <th>Alterações</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLogs.length > 0 ? (
                    currentLogs.map((log) => (
                      <tr key={log.id}>
                        <td>{formatTimestamp(log.timestamp)}</td>
                        <td>{log.usuario}</td>
                        <td>{log.action}</td>
                        <td>{log.table_name}</td>
                        <td>{getClientName(log.cliente)}</td>
                        <td>
                          {log.after?.url ? (
                            <a
                              href={log.after.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="document-link"
                              title={log.after.url}
                            >
                              {truncateUrl(log.after.url)}
                            </a>
                          ) : '-'}
                        </td>
                        <td>
                          {(log.action === 'upload' || log.action === 'atualização') ? (
                            <button
                              className="table-btn table-btn-primary"
                              onClick={() => handleShowDetails(log)}
                            >
                              Ver Detalhes
                            </button>
                          ) : 'Sem alterações.'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7}>Nenhum log encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  Anterior
                </button>
                <span>
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {selectedLog && (
        <Modal
          show={showDetailsModal}
          onHide={() => setShowDetailsModal(false)}
          centered
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>Detalhes do Log</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {renderDetails(selectedLog)}
          </Modal.Body>
          <Modal.Footer>
            <button
              className="form-btn form-btn-secondary"
              onClick={() => setShowDetailsModal(false)}
            >
              Fechar
            </button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}