import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Header from "../components/Header";
import "../styles/DocumentList.css";
import {
  FaHome,
  FaCar,
  FaBuilding,
  FaFileContract,
  FaChartBar,
  FaMoneyBillWave,
  FaFileAlt,
} from 'react-icons/fa';

interface Document {
  id: string;
  categoria: string;
  tipodocumento?: string;
  campos: Record<string, string | number>;
  url?: string;
  proprietario?: string;
  empresa?: string;
  cliente: string;
  percentual_titularidade?: number;
  valor_mercado?: number;
}

interface Proprietario {
  id: string;
  nome: string;
  cliente: string;
}

interface Empresa {
  id: string;
  nome: string;
  cliente: string;
  campos: Record<string, string | number>;
}

interface DocumentListProps {
  clienteEmail?: string;
  hideHeader?: boolean;
}

interface Category {
  name: string;
  fields: string[] | ((document: Document) => string[]);
}

const DocumentList: React.FC<DocumentListProps> = ({ clienteEmail, hideHeader = false }) => {
  const [documents, setDocuments] = useState<Record<string, Document[]>>({});
  const [proprietarios, setProprietarios] = useState<Proprietario[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedProprietarios, setExpandedProprietarios] = useState<Set<string>>(new Set());
  const [expandedEmpresas, setExpandedEmpresas] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const categoryParam = searchParams.get("category");

  const formatCurrency = (value?: string | number | null): string => {
    if (value === null || value === undefined || value === "") return "R$ 0,00";
    
    const parsedValue =
      typeof value === "number"
        ? value
        : parseFloat(String(value).replace(/\./g, "").replace(",", "."));
  
    if (isNaN(parsedValue)) return "R$ 0,00";
  
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(parsedValue);
  };

  const formatPercentage = (value?: number | null): string => {
    if (value === null || value === undefined) return "-";
    return `${value}%`;
  };

  const formatDate = (date?: string): string => {
    if (!date) return "-";
    let rawDate: Date;
    if (date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = date.split("/").map(Number);
      rawDate = new Date(year, month - 1, day);
    } else {
      rawDate = new Date(date);
    }
    if (isNaN(rawDate.getTime())) return "-";
    const day = String(rawDate.getDate()).padStart(2, "0");
    const month = String(rawDate.getMonth() + 1).padStart(2, "0");
    const year = String(rawDate.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const categories: Category[] = useMemo(
    () => [
      {
        name: "Imóveis",
        fields: (document: Document) => {
          const tipodocumento = document?.tipodocumento || "";
          return tipodocumento === "Matrícula"
            ? [
                "Tipo de Documento",
                "Identificação do Imóvel",
                "% de Titularidade",
                "Data de Aquisição",
                "Nº Matrícula",
                "Insc. Municipal (IPTU)",
                "Situação do Imóvel",
                "Valor Declarado",
                "Valor de Mercado",
              ]
            : tipodocumento === "Contrato"
            ? [
                "Tipo de Documento",
                "Identificação do Imóvel",
                "% de Titularidade",
                "Data de Aquisição",
                "Situação do Imóvel",
                "Valor Declarado",
                "Valor de Mercado",
              ]
            : [];
        },
      },
      {
        name: "Veículos",
        fields: [
          "Identificação do Veículo",
          "Ano",
          "Placa",
          "Renavam",
          "Valor",
        ],
      },
      {
        name: "Empresas e Participações",
        fields: ["Tipo de Documento", "Identificação"],
      },
      {
        name: "Contratos de Locações",
        fields: ["Identificação", "Início", "Final", "Valor"],
      },
      {
        name: "Documentos Contábeis",
        fields: ["Identificação", "Competência"],
      },
      {
        name: "Declarações de IRPF",
        fields: ["Identificação", "Ano - Calendário"],
      },
      {
        name: "Outros Documentos",
        fields: ["Tipo de Documento", "Identificação", "Observações", "Vencimento"],
      },
    ],
    []
  );

  const empresaFields = [
    "Nome",
    "Identificação",
    "Capital Social Total",
    "%Capital Social",
    "Quantidade de Quotas/Ações",
    "Valor Capital Social Participação",
  ];

  const documentosPorProprietario = useMemo(() => {
    if (!documents["Imóveis"]) return {};
    return documents["Imóveis"].reduce<Record<string, Document[]>>((acc, doc) => {
      const proprietarioId = doc.proprietario || "Sem Proprietário";
      if (!acc[proprietarioId]) acc[proprietarioId] = [];
      acc[proprietarioId].push(doc);
      return acc;
    }, {});
  }, [documents]);

  const documentosPorEmpresa = useMemo(() => {
    if (!documents["Empresas e Participações"]) return {};
    return documents["Empresas e Participações"].reduce<Record<string, Document[]>>((acc, doc) => {
      const empresaId = doc.empresa || "Sem Empresa";
      if (!acc[empresaId]) acc[empresaId] = [];
      acc[empresaId].push(doc);
      return acc;
    }, {});
  }, [documents]);

  const getProprietarioNome = (proprietarioId?: string): string => {
    const proprietario = proprietarios.find((p) => p.id === proprietarioId);
    return proprietario ? proprietario.nome : "Proprietário Desconhecido";
  };

  const getEmpresaData = (empresaId?: string): Empresa => {
    const empresa = empresas.find((e) => e.id === empresaId);
    return empresa || { nome: "Empresa Desconhecida", campos: {}, id: "", cliente: "" };
  };

  const logDownload = async (document: Document) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const logData = {
      usuario: user.email,
      action: "download",
      table_name: "documentos",
      cliente: document.cliente,
      documentoid: document.id,
      timestamp: new Date().toISOString(),
      before: null,
      after: {
        categoria: document.categoria,
        tipodocumento: document.tipodocumento || null,
        campos: document.campos,
        url: document.url,
        proprietario: document.proprietario || null,
        empresa: document.empresa || null,
        percentual_titularidade: document.percentual_titularidade || null,
        valor_mercado: document.valor_mercado || null,
      },
      novoarquivo: null,
    };

    const { error } = await supabase.from("logs").insert(logData);
    if (error) {
      console.error("Erro ao registrar log de download:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        navigate("/");
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (userError || !userData || (userData.role !== "client" && !clienteEmail)) {
        navigate("/dashboard");
        return;
      }

      const emailToFetch = clienteEmail || user.email;

      const fetchProprietarios = async () => {
        const { data, error } = await supabase
          .from("proprietarios")
          .select("*")
          .eq("cliente", emailToFetch);
        if (error) {
          console.error("Erro ao buscar proprietários:", error);
          return;
        }
        setProprietarios(data || []);
      };

      const fetchEmpresas = async () => {
        const { data, error } = await supabase
          .from("empresas")
          .select("*")
          .eq("cliente", emailToFetch);
        if (error) {
          console.error("Erro ao buscar empresas:", error);
          return;
        }
        setEmpresas(data || []);
      };

      const fetchDocuments = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from("documentos")
          .select("*")
          .eq("cliente", emailToFetch);
        if (error) {
          console.error("Erro ao buscar documentos:", error);
          setLoading(false);
          return;
        }
        const allDocs: Record<string, Document[]> = {};
        data?.forEach((doc: Document) => {
          if (!allDocs[doc.categoria]) allDocs[doc.categoria] = [];
          allDocs[doc.categoria].push(doc);
        });
        setDocuments(allDocs);
        setLoading(false);
      };

      await Promise.all([fetchProprietarios(), fetchEmpresas(), fetchDocuments()]);
    };

    fetchData();
  }, [navigate, clienteEmail]);

  useEffect(() => {
    if (categoryParam && categories.some((cat) => cat.name === categoryParam)) {
      setExpandedCategory(categoryParam);
    } else if (hideHeader && !expandedCategory) {
      setExpandedCategory(categories[0]?.name || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryParam, hideHeader, categories]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategory(expandedCategory === categoryName ? null : categoryName);
  };

  const toggleProprietario = (proprietarioId: string) => {
    setExpandedProprietarios((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(proprietarioId)) {
        newSet.delete(proprietarioId);
      } else {
        newSet.add(proprietarioId);
      }
      return newSet;
    });
  };

  const toggleEmpresa = (empresaId: string) => {
    setExpandedEmpresas((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(empresaId)) {
        newSet.delete(empresaId);
      } else {
        newSet.add(empresaId);
      }
      return newSet;
    });
  };

  const getCategoryFields = (category: Category, doc?: Document): string[] => {
    if (typeof category.fields === "function") {
      return doc ? category.fields(doc) : [];
    }
    return category.fields;
  };

  // Substitua o return do seu componente DocumentList por este bloco completo
return (
  <div className="document-list-container">
    {!hideHeader && (
      <>
        <Header showLogout={true} />
        <div className="document-list-content">
          <h2 className="document-list-title">Documentos Disponíveis</h2>
          {loading ? (
            <p className="text-center">Carregando documentos...</p>
          ) : (
            <div className="category-buttons-wrapper">
              <div className="category-buttons">
                {categories.map((category) => (
                  <button
                    key={category.name}
                    className={`category-btn ${
                      expandedCategory === category.name ? "active" : ""
                    }`}
                    onClick={() => toggleCategory(category.name)}
                  >
                    <span className="btn-icon">
                      {category.name === "Imóveis" && FaHome({ color: "white" })}
                      {category.name === "Veículos" && FaCar({ color: "white" })}
                      {category.name === "Empresas e Participações" && FaBuilding({ color: "white" })}
                      {category.name === "Contratos de Locações" && FaFileContract({ color: "white" })}
                      {category.name === "Documentos Contábeis" && FaChartBar({ color:"white"})}
                      {category.name === "Declarações de IRPF" && FaMoneyBillWave({ color: "white" })}
                      {category.name === "Outros Documentos" && FaFileAlt({ color: "white" })}
                    </span>
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </>
    )}

    <div className={hideHeader ? "document-list-content-no-header" : "document-list-content"}>
      {loading && !hideHeader ? null : (
        categories.map((category) => (
          expandedCategory === category.name && (
            <div key={category.name} className="category-content">
              {category.name === "Imóveis" ? (
                Object.entries(documentosPorProprietario).map(([proprietarioId, docs]) => (
                  <div key={proprietarioId} className="proprietario-section">
                    <h3
                      className="proprietario-title"
                      onClick={() => toggleProprietario(proprietarioId)}
                    >
                      {expandedProprietarios.has(proprietarioId) ? "(-)" : "(+)"} {getProprietarioNome(proprietarioId)}
                    </h3>
                    {expandedProprietarios.has(proprietarioId) && (
                      <div className="table-responsive">
                        <table className="table">
                          <thead>
                            <tr>
                              {getCategoryFields(category, docs[0]).map((field) => (
                                <th key={field}>{field}</th>
                              ))}
                              <th>Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {docs.map((doc) => (
                              <tr key={doc.id}>
                                {getCategoryFields(category, doc).map((field) => {
                                  const isTipoDoc = field === "Tipo de Documento";
                                  const value = isTipoDoc
                                    ? doc.tipodocumento || "-"
                                    : field === "% de Titularidade"
                                    ? formatPercentage(doc.percentual_titularidade)
                                    : field === "Valor de Mercado"
                                    ? formatCurrency(doc.valor_mercado)
                                    : field.includes("Valor") || field === "Capital Social Total"
                                    ? formatCurrency(doc.campos[field])
                                    : field.includes("Data") || field.includes("Início") || field.includes("Final") || field.includes("Vencimento")
                                    ? formatDate(doc.campos[field] as string)
                                    : doc.campos[field] || "-";

                                  return (
                                    <td key={field} data-label={field}>{value}</td>
                                  );
                                })}
                                <td data-label="Ações">
                                  {doc.url ? (
                                    <a
                                      href={doc.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="table-btn table-btn-success"
                                      onClick={() => logDownload(doc)}
                                    >
                                      Baixar
                                    </a>
                                  ) : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))
              ) : category.name === "Empresas e Participações" ? (
                Object.entries(documentosPorEmpresa).map(([empresaId, docs]) => {
                  const empresa = getEmpresaData(empresaId);
                  return (
                    <div key={empresaId} className="empresa-section">
                      <h3 onClick={() => toggleEmpresa(empresaId)}>
                        {expandedEmpresas.has(empresaId) ? "(-)" : "(+)"} {empresa.nome}
                      </h3>
                      {expandedEmpresas.has(empresaId) && (
                        <>
                          <div className="empresa-data">
                            <h4>Dados da Empresa</h4>
                            <table className="table">
                              <thead>
                                <tr>
                                  {empresaFields.map((field) => (
                                    <th key={field}>{field}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td data-label="Nome">{empresa.nome}</td>
                                  <td data-label="Identificação">{empresa.campos?.Identificação || "-"}</td>
                                  <td data-label="Capital Social Total">{formatCurrency(empresa.campos?.["Capital Social Total"])}</td>
                                  <td data-label="%Capital Social">{empresa.campos?.["%Capital Social"] || "-"}</td>
                                  <td data-label="Quantidade de Quotas/Ações">{empresa.campos?.["Quantidade de Quotas/Ações"] || "-"}</td>
                                  <td data-label="Valor Capital Social Participação">{formatCurrency(empresa.campos?.["Valor Capital Social Participação"])}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          <div className="table-responsive">
                            <h4>Documentos</h4>
                            <table className="table">
                              <thead>
                                <tr>
                                  {getCategoryFields(category).map((field) => (
                                    <th key={field}>{field}</th>
                                  ))}
                                  <th>Ações</th>
                                </tr>
                              </thead>
                              <tbody>
                                {docs.length > 0 ? (
                                  docs.map((doc) => (
                                    <tr key={doc.id}>
                                      {getCategoryFields(category).map((field) => (
                                        <td key={field} data-label={field}>
                                          {field === "Tipo de Documento"
                                            ? doc.tipodocumento || "-"
                                            : field === "Identificação"
                                            ? doc.campos?.[field] || "-"
                                            : "-"}
                                        </td>
                                      ))}
                                      <td data-label="Ações">
                                        {doc.url ? (
                                          <a
                                            href={doc.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="table-btn table-btn-success"
                                            onClick={() => logDownload(doc)}
                                          >
                                            Baixar
                                          </a>
                                        ) : "-"}
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={getCategoryFields(category).length + 1}>
                                      Nenhum documento disponível.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        {getCategoryFields(category, documents[category.name]?.[0]).map(
                          (field) => (
                            <th key={field}>{field}</th>
                          )
                        )}
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents[category.name]?.length > 0 ? (
                        documents[category.name].map((doc) => (
                          <tr key={doc.id}>
                            {getCategoryFields(category, doc).map((field) => {
                              const isTipoDoc = field === "Tipo de Documento";
                              const value = isTipoDoc
                                ? doc.tipodocumento || "-"
                                : field.includes("Valor") || field === "Capital Social Total"
                                ? formatCurrency(doc.campos[field])
                                : field.includes("Data") || field.includes("Início") || field.includes("Final") || field.includes("Vencimento")
                                ? formatDate(doc.campos[field] as string)
                                : doc.campos[field] || "-";

                              return (
                                <td key={field} data-label={field}>{value}</td>
                              );
                            })}
                            <td data-label="Ações">
                              {doc.url ? (
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="table-btn table-btn-success"
                                  onClick={() => logDownload(doc)}
                                >
                                  Baixar
                                </a>
                              ) : "-"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={getCategoryFields(category, documents[category.name]?.[0]).length + 1}
                          >
                            Nenhum documento disponível.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        ))
      )}
    </div>
  </div>
);
};

export default DocumentList;
