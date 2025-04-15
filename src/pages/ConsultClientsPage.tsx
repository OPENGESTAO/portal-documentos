import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import DocumentList from './DocumentList';
import Header from '../components/Header';
import '../styles/ConsultClientsPage.css';

interface Client {
  id: string;
  email: string;
  name: string; // Adicionando o campo name
}

export default function ConsultClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientEmail, setSelectedClientEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Buscar clientes com role 'client'
  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      const { data, error } = await supabase
  .from('users')
  .select('id, email, name')
  .eq('role', 'client')
  .eq('active', true);


      if (error) {
        console.error('Erro ao buscar clientes:', error);
        setLoading(false);
        return;
      }

      setClients(data || []);
      setLoading(false);
    };

    fetchClients();
  }, []);

  // Manipular mudança na seleção do cliente
  const handleClientChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClientEmail(event.target.value || null);
  };

  return (
    <div className="consult-clients-container">
      <Header />
      <main className="consult-clients-main">
        <h1>Consultar Clientes</h1>
        <p>Selecione um cliente para visualizar seus documentos</p>

        {loading ? (
          <p className="loading">Carregando clientes...</p>
        ) : (
          <div className="client-selection">
            <label htmlFor="client-select">Selecionar Cliente:</label>
            <select
              id="client-select"
              value={selectedClientEmail || ''}
              onChange={handleClientChange}
            >
              <option value="">-- Selecione um cliente --</option>
              {clients.map((client) => (
                <option key={client.id} value={client.email}>
                  {client.name ? `${client.name} (${client.email})` : client.email}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Renderizar DocumentList apenas se um cliente estiver selecionado */}
        {selectedClientEmail && (
          <div className="client-document-list">
            <DocumentList clienteEmail={selectedClientEmail} />
          </div>
        )}
      </main>
    </div>
  );
}