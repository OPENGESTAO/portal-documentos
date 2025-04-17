import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Modal } from "react-bootstrap";
import { NumericFormat, NumberFormatValues } from "react-number-format";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Header from "../components/Header";
import "../styles/DocumentManagementPage.css";

const SUPABASE_URL = "https://cnlcyxhkmvyjbtybdjuj.supabase.co";

interface Document {
  id: string;
  categoria: string;
  tipodocumento?: string;
  descricao: string;
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
  cpf_cnpj: string;
  cliente: string;
}

interface Empresa {
  id: string;
  nome: string;
  campos: Record<string, string | number>;
  cliente: string;
}

interface Cliente {
  id: string;
  email: string;
  name: string;
}

interface DocumentToAdd {
  tipodocumento: string;
  Identificação: string;
  file: File;
}

interface NovaEmpresa {
  nome: string;
  identificacao: string;
  capitalSocialTotal: string;
  percentCapitalSocial: string;
  qtdQuotasAcoes: string;
  valorCapitalSocial: string;
}

const DocumentManagementPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState("Imóveis");
  const [description, setDescription] = useState("");
  const [documentFields, setDocumentFields] = useState<Record<string, string | number>>({});
  const [uploading, setUploading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState("");
  const [proprietarios, setProprietarios] = useState<Proprietario[]>([]);
  const [selectedProprietario, setSelectedProprietario] = useState("");
  const [novoProprietario, setNovoProprietario] = useState({ nome: "", cpf_cnpj: "" });
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState("");
  const [novaEmpresa, setNovaEmpresa] = useState<NovaEmpresa>({
    nome: "",
    identificacao: "",
    capitalSocialTotal: "",
    percentCapitalSocial: "",
    qtdQuotasAcoes: "",
    valorCapitalSocial: "",
  });
  const [empresaEditando, setEmpresaEditando] = useState<Empresa | null>(null);
  const [showEmpresaModal, setShowEmpresaModal] = useState(false);
  const [showEditEmpresaModal, setShowEditEmpresaModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [documentosCliente, setDocumentosCliente] = useState<Document[]>([]);
  const [modoGerenciamento, setModoGerenciamento] = useState(false);
  const [documentoEditando, setDocumentoEditando] = useState<Document | null>(null);
  const [tipodocumento, setTipodocumento] = useState("");
  const [loadingGerenciamento, setLoadingGerenciamento] = useState(false);
  const [addingNewDocument, setAddingNewDocument] = useState(false);
  const [documentsToAdd, setDocumentsToAdd] = useState<DocumentToAdd[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loadingClientes, setLoadingClientes] = useState(false);
  useEffect(() => {
    if (showConfirmation) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }, [showConfirmation]);
  
  const navigate = useNavigate();
  const [formattedValues, setFormattedValues] = useState<Record<string, string>>({});

  const categoryFields: Record<string, string[]> = {
    Imóveis: tipodocumento === "Matrícula"
      ? [
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
          "Identificação do Imóvel",
          "% de Titularidade",
          "Data de Aquisição",
          "Situação do Imóvel",
          "Valor Declarado",
          "Valor de Mercado",
        ]
      : [],
    Veículos: ["Identificação do Veículo", "Ano", "Placa", "Renavam", "Valor"],
    "Empresas e Participações": ["Identificação"],
    "Contratos de Locações": ["Identificação", "Início", "Final", "Valor"],
    "Documentos Contábeis": ["Identificação", "Competência"],
    "Declarações de IRPF": ["Identificação", "Ano - Calendário"],
    "Outros Documentos": ["Identificação", "Observações", "Vencimento"],
  };

  const empresaFieldsConfig = [
    "Identificação",
    "Capital Social Total",
    "%Capital Social",
    "Quantidade de Quotas/Ações",
    "Valor Capital Social Participação",
  ];

  const situacaoImovelOptions = ["Locado", "Não Locado", "Vendido"];
  const tipodocumentoOptions = [
    "Contrato Social",
    "Alterações Contratuais",
    "Acordo de Sócios",
    "Atas de Reuniões",
    "Estatuto Social",
    "Livro de Ações",
  ];
  const outrosDocumentosOptions = [
    "CNH",
    "Passaporte",
    "Certidão de Nascimento",
    "Certidão de Casamento",
    "Declaração União Estável",
    "Testamento",
    "Procurações",
  ];

  const fetchProprietarios = useCallback(async () => {
    if (!selectedCliente) return;
    const { data, error } = await supabase
      .from("proprietarios")
      .select("*")
      .eq("cliente", selectedCliente);
    if (error) {
      console.error("Erro ao buscar proprietários:", error);
      return;
    }
    setProprietarios(data);
  }, [selectedCliente]);

  const fetchEmpresas = useCallback(async () => {
    if (!selectedCliente) return;
    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .eq("cliente", selectedCliente);
    if (error) {
      console.error("Erro ao buscar empresas:", error);
      return;
    }
    setEmpresas(data);
  }, [selectedCliente]);

  const fetchDocumentosCliente = useCallback(async () => {
    if (!selectedCliente) {
      console.log("Nenhum cliente selecionado para buscar documentos.");
      return;
    }
    console.log("Buscando documentos para o cliente:", selectedCliente);
    const { data, error } = await supabase
      .from("documentos")
      .select("*")
      .eq("cliente", selectedCliente);
    if (error) {
      console.error("Erro ao buscar documentos:", error);
      return;
    }
    console.log("Documentos retornados do Supabase:", data);
    setDocumentosCliente(data.map(doc => ({
      ...doc,
      tipoDocumento: doc.tipodocumento,
    })));
  }, [selectedCliente]);

     
  useEffect(() => {
    const fetchClientes = async () => {
      setLoadingClientes(true);
      setFetchError(null);
      try {
        const { data, error } = await supabase
  .from("users")
  .select("id, email, name")
  .eq("role", "client")
  .eq("active", true);
        if (error) throw error;
        setClientes(data);
      } catch (error) {
        console.error("Erro ao buscar clientes:", error);
        setFetchError("Não foi possível carregar a lista de clientes.");
      } finally {
        setLoadingClientes(false);
      }
    };

    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }
      const { data: userData } = await supabase
        .from("users")
        .select("role, permissions")
        .eq("id", user.id)
        .single();
      if (userData?.role !== "admin" && !userData?.permissions?.permissions?.includes("manage_documents")) {
        navigate("/dashboard");
      }
    };

    checkAccess();
    fetchClientes();
  }, [navigate]);

  useEffect(() => {
    if (selectedCliente) {
      fetchProprietarios();
      fetchEmpresas();
      fetchDocumentosCliente();
    } else {
      setProprietarios([]);
      setEmpresas([]);
      setDocumentosCliente([]);
    }
  }, [selectedCliente, fetchProprietarios, fetchEmpresas, fetchDocumentosCliente]);

  const handleCadastrarProprietario = async () => {
    if (!novoProprietario.nome || !novoProprietario.cpf_cnpj) {
      alert("Preencha o nome e o CPF/CNPJ do proprietário.");
      return;
    }
    try {
      const { data, error } = await supabase
        .from("proprietarios")
        .insert({
          cliente: selectedCliente,
          nome: novoProprietario.nome,
          cpf_cnpj: novoProprietario.cpf_cnpj,
        })
        .select()
        .single();
      if (error) throw error;
      setProprietarios([...proprietarios, data]);
      setSelectedProprietario(data.id);
      setNovoProprietario({ nome: "", cpf_cnpj: "" });
      alert("Proprietário cadastrado com sucesso!");
    } catch (error) {
      console.error("Erro ao cadastrar proprietário:", error);
      alert("Erro ao cadastrar proprietário.");
    }
  };

  const handleCadastrarEmpresa = async () => {
    if (!novaEmpresa.nome || !novaEmpresa.identificacao) {
      alert("Informe o nome e a identificação da empresa.");
      return;
    }
    try {
      const { data, error } = await supabase
        .from("empresas")
        .insert({
          cliente: selectedCliente,
          nome: novaEmpresa.nome,
          campos: {
            Identificação: novaEmpresa.identificacao,
            "Capital Social Total": Number(novaEmpresa.capitalSocialTotal) || 0,
            "%Capital Social": novaEmpresa.percentCapitalSocial || "",
            "Quantidade de Quotas/Ações": novaEmpresa.qtdQuotasAcoes || "",
            "Valor Capital Social Participação": Number(novaEmpresa.valorCapitalSocial) || 0,
          },
        })
        .select()
        .single();
      if (error) throw error;
      setEmpresas([...empresas, data]);
      setSelectedEmpresa(data.id);
      setNovaEmpresa({
        nome: "",
        identificacao: "",
        capitalSocialTotal: "",
        percentCapitalSocial: "",
        qtdQuotasAcoes: "",
        valorCapitalSocial: "",
      });
      setShowEmpresaModal(false);
      setAddingNewDocument(true);
      alert("Empresa cadastrada com sucesso!");
    } catch (error) {
      console.error("Erro ao cadastrar empresa:", error);
      alert("Erro ao cadastrar empresa.");
    }
  };

  const handleEditarEmpresa = (empresa: Empresa) => {
    setEmpresaEditando({
      id: empresa.id,
      nome: empresa.nome,
      campos: {
        Identificação: empresa.campos?.Identificação || "",
        "Capital Social Total": empresa.campos?.["Capital Social Total"] || "",
        "%Capital Social": empresa.campos?.["%Capital Social"] || "",
        "Quantidade de Quotas/Ações": empresa.campos?.["Quantidade de Quotas/Ações"] || "",
        "Valor Capital Social Participação":
          empresa.campos?.["Valor Capital Social Participação"] || "",
      },
      cliente: empresa.cliente,
    });
    setShowEditEmpresaModal(true);
  };

  const handleSalvarEdicaoEmpresa = async () => {
    if (!empresaEditando?.nome || !empresaEditando?.campos.Identificação) {
      alert("Informe o nome e a identificação da empresa.");
      return;
    }
    try {
      const { error } = await supabase
        .from("empresas")
        .update({
          nome: empresaEditando.nome,
          campos: empresaEditando.campos,
        })
        .eq("id", empresaEditando.id);
      if (error) throw error;
      setEmpresas(
        empresas.map((emp) =>
          emp.id === empresaEditando.id ? { ...emp, ...empresaEditando } : emp
        )
      );
      setShowEditEmpresaModal(false);
      setEmpresaEditando(null);
      alert("Empresa atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar empresa:", error);
      alert("Erro ao atualizar empresa.");
    }
  };

  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = event.target.value;
    setCategory(newCategory);
    setDocumentFields({});
    setTipodocumento(
      newCategory === "Imóveis" || newCategory === "Outros Documentos" ? tipodocumento : ""
    );
    setSelectedEmpresa(newCategory === "Empresas e Participações" ? selectedEmpresa : "");
    setDocumentFields(
      newCategory === "Empresas e Participações" ? { Identificação: "" } : {}
    );
    setAddingNewDocument(false);
  };

  const handleTipodocumentoChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const tipo = event.target.value;
    setTipodocumento(tipo);
    setDocumentFields((prev) => ({ ...prev, tipodocumento: tipo }));
    if (category !== "Outros Documentos") {
      setDocumentFields({});
    }
  };

  const handleFieldChange = (field: string, value: string | number) => {
    let formattedValue: string | number = value;
    if (
      field.includes("Data") ||
      field.includes("Início") ||
      field.includes("Final") ||
      field.includes("Vencimento")
    ) {
      formattedValue = formatDateInput(String(value));
    } else if (field === "%Capital Social") {
      formattedValue = String(value).replace(/[^0-9.]/g, "");
      if (formattedValue !== "" && !formattedValue.endsWith("%")) {
        formattedValue = `${formattedValue}%`;
      }
    } else if (field.includes("Valor") || field === "Capital Social Total") {
      if (value === "" && field === "Valor de Mercado") {
        formattedValue = "";
      } else {
        let numericValue = String(value).replace(/[^0-9,]/g, "");
        numericValue = numericValue.replace(/\./g, "");
        numericValue = numericValue.replace(",", ".");
        formattedValue = parseFloat(numericValue) || 0;
      }
    } else if (field === "% de Titularidade") {
      let numericValue = String(value).replace(/[^0-9.]/g, "");
      formattedValue = parseFloat(numericValue) || 0;
    }

    setDocumentFields((prev) => {
      if (prev[field] === formattedValue) {
        return prev;
      }
      return { ...prev, [field]: formattedValue };
    });
  };

  const handleDocumentFieldChange = (field: string, value: string | number) => {
    setDocumentFields((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setSelectedFile(e.target.files[0]);
  };

  const handleAddDocument = () => {
    if (!tipodocumento || !documentFields.Identificação || !selectedFile) {
      alert("Preencha o tipo de documento, a identificação e selecione um arquivo.");
      return;
    }
    setDocumentsToAdd([
      ...documentsToAdd,
      { tipodocumento, Identificação: String(documentFields.Identificação), file: selectedFile },
    ]);
    setTipodocumento("");
    setDocumentFields({ Identificação: "" });
    setSelectedFile(null);
  };

  const handleConfirmUpload = () => {
    if (!selectedFile && !documentoEditando && !documentsToAdd.length) {
      alert("Selecione um arquivo ou adicione pelo menos um documento.");
      return;
    }
    if (!selectedCliente) {
      alert("Selecione um cliente.");
      return;
    }
    if (category === "Imóveis") {
      if (!tipodocumento) {
        alert("Selecione o tipo de documento para Imóveis.");
        return;
      }
      if (!selectedProprietario) {
        alert("Selecione ou cadastre um proprietário.");
        return;
      }
    }
    if (category === "Empresas e Participações") {
      if (!selectedEmpresa) {
        alert("Selecione ou cadastre uma empresa.");
        return;
      }
      if (!tipodocumento && !documentsToAdd.length && !documentoEditando) {
        alert("Selecione o tipo de documento ou adicione pelo menos um documento.");
        return;
      }
      if (
        !documentFields.Identificação &&
        !documentsToAdd.some((doc) => doc.Identificação) &&
        !documentoEditando
      ) {
        alert("Informe a identificação do documento.");
        return;
      }
    }
    if (category === "Outros Documentos" && !tipodocumento) {
      alert("Selecione o tipo de documento para Outros Documentos.");
      return;
    }
    setShowConfirmation(true);
  };

  const registrarLog = async (
    acao: string,
    documentoId: string | null,
    dadosAntigos: any = null,
    url: string | null = null
  ) => {
    if (!acao || typeof acao !== 'string' || acao.trim() === '') {
      throw new Error("O campo 'acao' é obrigatório e deve ser uma string não vazia");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const dadosNovos = {
        categoria: category,
        tipodocumento:
          category === "Imóveis" || category === "Outros Documentos" || category === "Empresas e Participações"
            ? tipodocumento
            : null,
        descricao: description,
        campos: { ...documentFields },
        url: url || (documentoEditando ? documentoEditando.url : null),
        proprietario: category === "Imóveis" ? selectedProprietario : null,
        empresa: category === "Empresas e Participações" ? selectedEmpresa : null,
        percentual_titularidade: documentFields["% de Titularidade"] || null,
        valor_mercado: documentFields["Valor de Mercado"] || null,
      };
      const logData = {
        usuario: user.id,
        action: acao,
        table_name: "documentos",
        cliente: selectedCliente,
        documentoid: documentoId,
        timestamp: new Date().toISOString(),
        before: dadosAntigos,
        after: dadosNovos,
        novoarquivo: selectedFile?.name || null,
      };
      console.log("Dados a serem inseridos na tabela logs:", logData);
      const { error } = await supabase.from("logs").insert(logData);
      if (error) {
        throw new Error("Erro ao registrar log: " + error.message);
      }
    } catch (error) {
      console.error("Erro detalhado ao registrar log:", error);
      throw error;
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("Usuário não autenticado: " + (authError?.message || "Erro desconhecido"));
      }

      let url = documentoEditando?.url;

      if (selectedFile || documentsToAdd.length > 0) {
        if (selectedFile && !documentoEditando) {
          const sanitizedFileName = selectedFile.name
            .replace(/[^a-zA-Z0-9.-]/g, "_")
            .replace(/_+/g, "_");
          const fileName = `${Date.now()}-${sanitizedFileName}`;
          const { data, error: uploadError } = await supabase.storage
            .from("documents")
            .upload(fileName, selectedFile);
          if (uploadError) {
            throw new Error("Erro ao fazer upload do arquivo para o Storage: " + uploadError.message);
          }
          url = `${SUPABASE_URL}/storage/v1/object/public/documents/${data.path}`;
        }

        if (documentsToAdd.length > 0) {
          const uploadPromises = documentsToAdd.map(async (doc) => {
            const sanitizedFileName = doc.file.name
              .replace(/[^a-zA-Z0-9.-]/g, "_")
              .replace(/_+/g, "_");
            const fileName = `${Date.now()}-${sanitizedFileName}`;
            const { data, error: uploadError } = await supabase.storage
              .from("documents")
              .upload(fileName, doc.file);
            if (uploadError) {
              throw new Error("Erro ao fazer upload do arquivo (múltiplos documentos): " + uploadError.message);
            }
            const docUrl = `${SUPABASE_URL}/storage/v1/object/public/documents/${data.path}`;
            const { data: insertedDoc, error: insertError } = await supabase
              .from("documentos")
              .insert({
                usuario: user.id,
                cliente: selectedCliente,
                categoria: category,
                tipodocumento: doc.tipodocumento,
                descricao: description,
                campos: { Identificação: doc.Identificação },
                url: docUrl,
                empresa: category === "Empresas e Participações" ? selectedEmpresa : null,
                created_at: new Date().toISOString(),
              })
              .select()
              .single();
            if (insertError) {
              throw new Error("Erro ao inserir documento (múltiplos documentos): " + insertError.message);
            }
            console.log("Chamando registrarLog para múltiplos documentos com acao: 'upload'");
            await registrarLog("upload", insertedDoc.id, null, docUrl);
          });
          await Promise.all(uploadPromises);
        }

        if (documentoEditando?.url && selectedFile) {
          const filePath = documentoEditando.url.split("/documents/")[1];
          const { error: deleteError } = await supabase.storage
            .from("documents")
            .remove([filePath]);
          if (deleteError) {
            throw new Error("Erro ao excluir arquivo antigo do Storage: " + deleteError.message);
          }
        }
      }

      if (documentoEditando) {
        const dadosAntigos = {
          categoria: documentoEditando.categoria,
          tipodocumento: documentoEditando.tipodocumento || null,
          descricao: documentoEditando.descricao,
          campos: documentoEditando.campos,
          url: documentoEditando.url,
          proprietario: documentoEditando.proprietario || null,
          empresa: documentoEditando.empresa || null,
          percentual_titularidade: documentoEditando.percentual_titularidade || null,
          valor_mercado: documentoEditando.valor_mercado || null,
        };
        const { error: updateError } = await supabase
          .from("documentos")
          .update({
            categoria: category,
            tipodocumento:
              category === "Imóveis" || category === "Outros Documentos" || category === "Empresas e Participações"
                ? tipodocumento
                : null,
            descricao: description,
            campos: documentFields,
            url,
            proprietario: category === "Imóveis" ? selectedProprietario : null,
            empresa: category === "Empresas e Participações" ? selectedEmpresa : null,
            percentual_titularidade: documentFields["% de Titularidade"] || null,
            valor_mercado: documentFields["Valor de Mercado"] || null,
          })
          .eq("id", documentoEditando.id);
        if (updateError) {
          throw new Error("Erro ao atualizar documento na tabela: " + updateError.message);
        }
        console.log("Chamando registrarLog para atualização com acao: 'atualização'");
        await registrarLog("atualização", documentoEditando.id, dadosAntigos, url);
        alert("Documento atualizado com sucesso!");
      } else if (selectedFile && !documentsToAdd.length) {
        const documentData = {
          usuario: user.id,
          cliente: selectedCliente,
          categoria: category,
          tipodocumento:
            category === "Imóveis" || category === "Outros Documentos" || category === "Empresas e Participações"
              ? tipodocumento
              : null,
          descricao: description,
          campos: documentFields,
          url,
          proprietario: category === "Imóveis" ? selectedProprietario : null,
          empresa: category === "Empresas e Participações" ? selectedEmpresa : null,
          percentual_titularidade: documentFields["% de Titularidade"] || null,
          valor_mercado: documentFields["Valor de Mercado"] || null,
          created_at: new Date().toISOString(),
        };
        console.log("Dados a serem inseridos na tabela documentos:", documentData);
        const { data, error: insertError } = await supabase
          .from("documentos")
          .insert(documentData)
          .select()
          .single();
        if (insertError) {
          throw new Error("Erro ao inserir documento na tabela: " + insertError.message);
        }
        console.log("Chamando registrarLog para upload com acao: 'upload'");
        await registrarLog("upload", data.id, null, url);
        alert("Documento enviado com sucesso!");
      }

      setDescription("");
      setDocumentFields({});
      setTipodocumento("");
      setDocumentoEditando(null);
      setShowConfirmation(false);
      setSelectedFile(null);
      setSelectedProprietario("");
      setSelectedEmpresa("");
      setDocumentsToAdd([]);
      setAddingNewDocument(false);
      await fetchDocumentosCliente();
    } catch (error: unknown) {
      console.error("Erro detalhado ao enviar/atualizar documento:", error);
      const errorMessage = error instanceof Error ? error.message : "Verifique os dados e tente novamente.";
      alert("Erro ao enviar/atualizar documento: " + errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleEditarDocumento = (documento: Document) => {
    setDocumentoEditando(documento);
    setCategory(documento.categoria);
    setDescription(documento.descricao);
    setDocumentFields({
      ...documento.campos,
      "% de Titularidade": documento.percentual_titularidade || "",
      "Valor de Mercado": documento.valor_mercado !== undefined ? documento.valor_mercado : "",
    });
    if (
      documento.categoria === "Imóveis" ||
      documento.categoria === "Outros Documentos" ||
      documento.categoria === "Empresas e Participações"
    ) {
      setTipodocumento(documento.tipodocumento || "");
    }
    if (documento.categoria === "Imóveis") {
      setSelectedProprietario(documento.proprietario || "");
    }
    if (documento.categoria === "Empresas e Participações") {
      setSelectedEmpresa(documento.empresa || "");
      setAddingNewDocument(true);
    }
    setModoGerenciamento(false);
  };

  const handleExcluirDocumento = async (documento: Document) => {
    if (!window.confirm("Tem certeza que deseja excluir este documento?")) return;
    try {
      await registrarLog("exclusão", documento.id, {
        categoria: documento.categoria,
        tipodocumento: documento.tipodocumento || null,
        descricao: documento.descricao,
        campos: documento.campos,
        url: documento.url,
        proprietario: documento.proprietario || null,
        empresa: documento.empresa || null,
        percentual_titularidade: documento.percentual_titularidade || null,
        valor_mercado: documento.valor_mercado || null,
      });
      if (documento.url) {
        const filePath = documento.url.split("/documents/")[1];
        const { error: deleteError } = await supabase.storage
          .from("documents")
          .remove([filePath]);
        if (deleteError) throw deleteError;
      }
      const { error } = await supabase
        .from("documentos")
        .delete()
        .eq("id", documento.id);
      if (error) throw error;
      alert("Documento excluído com sucesso!");
      setDocumentosCliente(documentosCliente.filter((doc) => doc.id !== documento.id));
    } catch (error) {
      console.error("Erro ao excluir documento:", error);
      alert("Erro ao excluir documento.");
    }
  };

  const handleAddNewDocument = () => {
    setAddingNewDocument(true);
    setDocumentFields({ Identificação: "" });
    setTipodocumento("");
    setSelectedFile(null);
  };

  const formatCurrencyInput = (value?: string | number): string => {
    if (value === undefined || value === null || value === "") return "";
    const numericValue = Number(value);
    if (isNaN(numericValue)) return "";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(numericValue);
  };

  const formatDateInput = (value: string): string => {
    if (!value) return "";
    value = value.replace(/\D/g, "");
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 4) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
    } else if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    return value;
  };

  const documentosPorCategoria = useMemo(() => {
    const groupedDocs: Record<string, Document[] | Record<string, Document[]>> = documentosCliente.reduce(
      (acc: Record<string, Document[]>, doc) => {
        if (!acc[doc.categoria]) acc[doc.categoria] = [];
        (acc[doc.categoria] as Document[]).push(doc);
        return acc;
      }, {}
    );

    if (Array.isArray(groupedDocs["Imóveis"])) {
      const imoveis = groupedDocs["Imóveis"] as Document[];
      groupedDocs["Imóveis"] = imoveis.reduce((acc: Record<string, Document[]>, doc) => {
        const proprietarioId = doc.proprietario || "Sem Proprietário";
        if (!acc[proprietarioId]) acc[proprietarioId] = [];
        acc[proprietarioId].push(doc);
        return acc;
      }, {});
    }

    if (Array.isArray(groupedDocs["Empresas e Participações"])) {
      const empresas = groupedDocs["Empresas e Participações"] as Document[];
      groupedDocs["Empresas e Participações"] = empresas.reduce((acc: Record<string, Document[]>, doc) => {
        const empresaId = doc.empresa || "Sem Empresa";
        if (!acc[empresaId]) acc[empresaId] = [];
        acc[empresaId].push(doc);
        return acc;
      }, {});
    }

    return groupedDocs;
  }, [documentosCliente]);

  const getProprietarioNome = (proprietarioId?: string): string => {
    const proprietario = proprietarios.find((p) => p.id === proprietarioId);
    return proprietario ? proprietario.nome : "Proprietário Desconhecido";
  };

  const getEmpresaNome = (empresaId?: string): string => {
    const empresa = empresas.find((e) => e.id === empresaId);
    return empresa ? empresa.nome : "Empresa Desconhecida";
  };

  const getFieldsForDisplay = (documento: Document): string[] => {
    if (documento.categoria !== "Imóveis") {
      return categoryFields[documento.categoria] || [];
    }
    return documento.tipodocumento === "Matrícula"
      ? [
          "Identificação do Imóvel",
          "% de Titularidade",
          "Data de Aquisição",
          "Nº Matrícula",
          "Insc. Municipal (IPTU)",
          "Situação do Imóvel",
          "Valor Declarado",
          "Valor de Mercado",
        ]
      : documento.tipodocumento === "Contrato"
      ? [
          "Identificação do Imóvel",
          "% de Titularidade",
          "Data de Aquisição",
          "Situação do Imóvel",
          "Valor Declarado",
          "Valor de Mercado",
        ]
      : [];
  };

  return (
    <div className="management-container">
      <Header showLogout={true} />
      <div className="management-content">
        <h2>Gerenciamento de Documentos</h2>
        <div className="form-section">
          <label className="form-label">Selecione o Cliente:</label>
          {loadingClientes ? (
            <p>Carregando clientes...</p>
          ) : fetchError ? (
            <div className="alert alert-danger">{fetchError}</div>
          ) : (
            <select
              className="form-input"
              value={selectedCliente}
              onChange={(e) => setSelectedCliente(e.target.value)}
              required
            >
              <option value="">Selecione um cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.email}>
                  {cliente.name} ({cliente.email})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="form-section">
          <button
            className="form-btn form-btn-primary"
            onClick={() => setModoGerenciamento(false)}
            disabled={!selectedCliente}
          >
            Upload de Documentos
          </button>
          <button
            className="form-btn form-btn-secondary"
            onClick={async () => {
              if (selectedCliente) {
                setLoadingGerenciamento(true);
                setModoGerenciamento(true);
                await fetchDocumentosCliente();
                setLoadingGerenciamento(false);
              }
            }}
            disabled={!selectedCliente}
          >
            Gerenciar Documentos
          </button>
        </div>

        {!modoGerenciamento && (
          <>
            <div className="form-section">
              <label className="form-label">Escolha um documento:</label>
              <input
                type="file"
                className="form-input"
                onChange={handleFileChange}
              />
              {documentoEditando?.url && (
                <div className="form-link">
                  <a href={documentoEditando.url} target="_blank" rel="noopener noreferrer">
                    Ver arquivo atual
                  </a>
                </div>
              )}
            </div>

            <div className="form-section">
              <label className="form-label">Categoria do Documento:</label>
              <select className="form-input" value={category} onChange={handleCategoryChange}>
                {Object.keys(categoryFields).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {category === "Imóveis" && (
              <>
                <div className="form-section">
                  <label className="form-label">Tipo de Documento:</label>
                  <select
                    className="form-input"
                    value={tipodocumento}
                    onChange={handleTipodocumentoChange}
                    required
                  >
                    <option value="">Selecione o tipo</option>
                    <option value="Matrícula">Matrícula</option>
                    <option value="Contrato">Contrato</option>
                  </select>
                </div>

                <div className="form-section">
                  <label className="form-label">Proprietário:</label>
                  <select
                    className="form-input"
                    value={selectedProprietario}
                    onChange={(e) => setSelectedProprietario(e.target.value)}
                  >
                    <option value="">Selecione um proprietário</option>
                    {proprietarios.map((proprietario) => (
                      <option key={proprietario.id} value={proprietario.id}>
                        {proprietario.nome} ({proprietario.cpf_cnpj})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-section">
                  <h5>CADASTRAR NOVO PROPRIETÁRIO</h5>
                  <div className="form-grid">
                    <div>
                      <label className="form-label">Nome do Proprietário:</label>
                      <input
                        type="text"
                        className="form-input"
                        value={novoProprietario.nome}
                        onChange={(e) =>
                          setNovoProprietario({ ...novoProprietario, nome: e.target.value })
                        }
                        placeholder="Digite o nome"
                      />
                    </div>
                    <div>
                      <label className="form-label">CPF/CNPJ:</label>
                      <input
                        type="text"
                        className="form-input"
                        value={novoProprietario.cpf_cnpj}
                        onChange={(e) =>
                          setNovoProprietario({ ...novoProprietario, cpf_cnpj: e.target.value })
                        }
                        placeholder="Digite o CPF ou CNPJ"
                      />
                    </div>
                  </div>
                  <button
                    className="form-btn form-btn-secondary"
                    onClick={handleCadastrarProprietario}
                  >
                    Cadastrar Proprietário
                  </button>
                </div>
              </>
            )}

            {category === "Empresas e Participações" && (
              <>
                <div className="form-section">
                  <label className="form-label">Empresa:</label>
                  <select
                    className="form-input"
                    value={selectedEmpresa}
                    onChange={(e) => {
                      setSelectedEmpresa(e.target.value);
                      setAddingNewDocument(!!e.target.value);
                    }}
                  >
                    <option value="">Selecione uma empresa</option>
                    {empresas.map((empresa) => (
                      <option key={empresa.id} value={empresa.id}>
                        {empresa.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-section">
                  <button
                    className="form-btn form-btn-secondary"
                    onClick={() => setShowEmpresaModal(true)}
                  >
                    Cadastrar Nova Empresa
                  </button>
                </div>

                <Modal show={showEmpresaModal} onHide={() => setShowEmpresaModal(false)}>
                  <Modal.Header closeButton>
                    <Modal.Title>Cadastrar Nova Empresa</Modal.Title>
                  </Modal.Header>
                  <Modal.Body>
                    <div className="form-section">
                      <label className="form-label">Nome da Empresa:</label>
                      <input
                        type="text"
                        className="form-input"
                        value={novaEmpresa.nome}
                        onChange={(e) => setNovaEmpresa({ ...novaEmpresa, nome: e.target.value })}
                        placeholder="Digite o nome"
                      />
                    </div>
                    {empresaFieldsConfig.map((field) => (
                      <div key={field} className="form-section">
                        <label className="form-label">{field}:</label>
                        {field.includes("Valor") || field === "Capital Social Total" ? (
                          <NumericFormat
                            thousandSeparator="."
                            decimalSeparator=","
                            prefix="R$ "
                            decimalScale={2}
                            fixedDecimalScale
                            className="form-input"
                            value={formattedValues[field] || formatCurrencyInput(novaEmpresa[field.toLowerCase().replace(/ /g, "") as keyof NovaEmpresa] || 0)}
                            onValueChange={(values: NumberFormatValues) => {
                              setFormattedValues((prev) => ({
                                ...prev,
                                [field]: values.formattedValue,
                              }));
                            }}
                            onBlur={() => {
                              const formattedValue = formattedValues[field] || "";
                              const numericValue = formattedValue
                                .replace("R$ ", "")
                                .replace(/\./g, "")
                                .replace(",", ".");
                              const floatValue = parseFloat(numericValue) || 0;
                              setNovaEmpresa((prev) => ({
                                ...prev,
                                [field.toLowerCase().replace(/ /g, "") as keyof NovaEmpresa]: String(floatValue),
                              }));
                            }}
                          />
                        ) : field === "%Capital Social" ? (
                          <input
                            type="text"
                            className="form-input"
                            value={novaEmpresa.percentCapitalSocial}
                            onChange={(e) =>
                              setNovaEmpresa({
                                ...novaEmpresa,
                                percentCapitalSocial: e.target.value,
                              })
                            }
                            placeholder="Ex: 25%"
                          />
                        ) : field === "Quantidade de Quotas/Ações" ? (
                          <input
                            type="number"
                            className="form-input"
                            value={novaEmpresa.qtdQuotasAcoes}
                            onChange={(e) =>
                              setNovaEmpresa({ ...novaEmpresa, qtdQuotasAcoes: e.target.value })
                            }
                          />
                        ) : (
                          <input
                            type="text"
                            className="form-input"
                            value={novaEmpresa.identificacao}
                            onChange={(e) =>
                              setNovaEmpresa({ ...novaEmpresa, identificacao: e.target.value })
                            }
                            placeholder="Ex: CNPJ"
                          />
                        )}
                      </div>
                    ))}
                  </Modal.Body>
                  <Modal.Footer>
                    <button
                      className="form-btn form-btn-secondary"
                      onClick={() => setShowEmpresaModal(false)}
                    >
                      Cancelar
                    </button>
                    <button
                      className="form-btn form-btn-primary"
                      onClick={handleCadastrarEmpresa}
                    >
                      Cadastrar
                    </button>
                  </Modal.Footer>
                </Modal>

                {selectedEmpresa && addingNewDocument && (
                  <div className="form-section">
                    <h5>Adicionar Documento</h5>
                    {documentsToAdd.map((doc, index) => (
                      <div key={index} className="form-document-item">
                        <p>
                          Tipo: {doc.tipodocumento}, Identificação: {doc.Identificação}
                        </p>
                        <button
                          className="form-btn form-btn-danger"
                          onClick={() =>
                            setDocumentsToAdd(documentsToAdd.filter((_, i) => i !== index))
                          }
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                    <div className="form-section">
                      <label className="form-label">Tipo de Documento:</label>
                      <select
                        className="form-input"
                        value={tipodocumento}
                        onChange={handleTipodocumentoChange}
                        required
                      >
                        <option value="">Selecione o tipo</option>
                        {tipodocumentoOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-section">
                      <label className="form-label">Identificação:</label>
                      <input
                        type="text"
                        className="form-input"
                        value={String(documentFields.Identificação || "")}
                        onChange={(e) => handleDocumentFieldChange("Identificação", e.target.value)}
                        placeholder="Informe a identificação"
                      />
                    </div>
                    <div className="form-section">
                      <label className="form-label">Arquivo:</label>
                      <input
                        type="file"
                        className="form-input"
                        onChange={handleFileChange}
                      />
                    </div>
                    <div className="form-section">
                      <button
                        className="form-btn form-btn-primary"
                        onClick={handleAddDocument}
                        disabled={!tipodocumento || !documentFields.Identificação || !selectedFile}
                      >
                        Adicionar Documento
                      </button>
                      <button
                        className="form-btn form-btn-success"
                        onClick={handleAddDocument}
                        disabled={!tipodocumento || !documentFields.Identificação || !selectedFile}
                      >
                        + Adicionar Mais
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {category === "Outros Documentos" && (
              <div className="form-section">
                <label className="form-label">Tipo de Documento:</label>
                <select
                  className="form-input"
                  value={tipodocumento}
                  onChange={handleTipodocumentoChange}
                  required
                >
                  <option value="">Selecione o tipo</option>
                  {outrosDocumentosOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {categoryFields[category]?.length > 0 && (
              categoryFields[category].map((field) => (
                <div key={field} className="form-section">
                  <label className="form-label">{field}:</label>
                  {field === "Situação do Imóvel" ? (
                    <select
                      className="form-input"
                      value={String(documentFields[field] || "")}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                    >
                      <option value="">Selecione a situação</option>
                      {situacaoImovelOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : field.includes("Valor") || field === "Capital Social Total" ? (
                    <NumericFormat
                      thousandSeparator="."
                      decimalSeparator=","
                      prefix="R$ "
                      decimalScale={2}
                      fixedDecimalScale={field !== "Valor de Mercado"}
                      className="form-input"
                      value={documentFields[field] === "" ? "" : formattedValues[field] || formatCurrencyInput(documentFields[field] || 0)}
                      onValueChange={(values: NumberFormatValues) => {
                        setFormattedValues((prev) => ({
                          ...prev,
                          [field]: values.formattedValue,
                        }));
                        handleFieldChange(field, values.formattedValue === "" ? "" : values.floatValue || 0);
                      }}
                      onBlur={() => {
                        const formattedValue = formattedValues[field] || "";
                        if (formattedValue === "" && field === "Valor de Mercado") {
                          handleFieldChange(field, "");
                        } else {
                          const numericValue = formattedValue
                            .replace("R$ ", "")
                            .replace(/\./g, "")
                            .replace(",", ".");
                          const floatValue = parseFloat(numericValue) || 0;
                          handleFieldChange(field, floatValue);
                        }
                      }}
                    />
                  ) : field === "% de Titularidade" ? (
                    <NumericFormat
                      decimalSeparator="."
                      suffix="%"
                      decimalScale={2}
                      className="form-input"
                      value={documentFields[field] || ""}
                      onValueChange={(values: NumberFormatValues) => {
                        handleFieldChange(field, values.floatValue || 0);
                      }}
                    />
                  ) : (
                    <input
                      type="text"
                      className="form-input"
                      value={String(documentFields[field] || "")}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                    />
                  )}
                </div>
              ))
            )}

            <div className="form-section">
              <label className="form-label">Descrição do Documento:</label>
              <textarea
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Adicione uma breve descrição..."
              />
            </div>

            <div className="form-section">
              <button
                className="form-btn form-btn-primary"
                onClick={handleConfirmUpload}
                disabled={uploading}
              >
                {uploading
                  ? "Enviando..."
                  : documentoEditando
                  ? "Atualizar Documento"
                  : "Confirmar e Enviar Documento"}
              </button>
            </div>
          </>
        )}

        {modoGerenciamento && (
          <>
            {loadingGerenciamento ? (
              <p className="text-center">Carregando documentos...</p>
            ) : (
              <div>
                {Object.entries(documentosPorCategoria).map(([categoria, documentos]) => (
                  <div key={categoria} className="form-section">
                    <h3>{categoria}</h3>
                    {categoria === "Imóveis" &&
                      Object.entries(documentos as Record<string, Document[]>).map(([proprietarioId, docs]) => (
                        <div key={proprietarioId} className="mb-3">
                          <h4>{getProprietarioNome(proprietarioId)}</h4>
                          <div className="table-responsive">
                            <table className="table">
                              <thead>
                                <tr>
                                  <th>Tipo de Documento</th>
                                  {getFieldsForDisplay(docs[0]).map((field) => (
                                    <th key={field}>{field}</th>
                                  ))}
                                  <th>Arquivo</th>
                                  <th>Ações</th>
                                </tr>
                              </thead>
                              <tbody>
                                {docs.map((documento) => (
                                  <tr key={documento.id}>
                                    <td>{documento.tipodocumento || "-"}</td>
                                    {getFieldsForDisplay(documento).map((field) => (
                                      <td key={field}>
                                        {field === "% de Titularidade"
                                          ? documento.percentual_titularidade
                                            ? `${documento.percentual_titularidade}%`
                                            : "-"
                                          : field === "Valor de Mercado"
                                          ? formatCurrencyInput(documento.valor_mercado)
                                          : field.includes("Valor") || field === "Capital Social Total"
                                          ? formatCurrencyInput(documento.campos[field])
                                          : field.includes("Data") ||
                                            field.includes("Início") ||
                                            field.includes("Final") ||
                                            field.includes("Vencimento")
                                          ? formatDateInput(String(documento.campos[field]))
                                          : String(documento.campos[field] || "-")}
                                      </td>
                                    ))}
                                    <td>
                                      {documento.url && (
                                        <a href={documento.url} target="_blank" rel="noopener noreferrer">
                                          Ver arquivo
                                        </a>
                                      )}
                                    </td>
                                    <td>
                                      <button
                                        className="table-btn table-btn-warning"
                                        onClick={() => handleEditarDocumento(documento)}
                                      >
                                        Editar
                                      </button>
                                      <button
                                        className="table-btn table-btn-danger"
                                        onClick={() => handleExcluirDocumento(documento)}
                                      >
                                        Excluir
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    {categoria === "Empresas e Participações" &&
                      Object.entries(documentos as Record<string, Document[]>).map(([empresaId, docs]) => (
                        <div key={empresaId} className="mb-3">
                          <h4>
                            {getEmpresaNome(empresaId)}
                            {empresaId !== "Sem Empresa" && (
                              <button
                                className="table-btn table-btn-warning"
                                onClick={() =>
                                  handleEditarEmpresa(empresas.find((emp) => emp.id === empresaId)!)
                                }
                              >
                                Editar Empresa
                              </button>
                            )}
                          </h4>
                          <div className="table-responsive">
                            <table className="table">
                              <thead>
                                <tr>
                                  <th>Tipo de Documento</th>
                                  {getFieldsForDisplay(docs[0]).map((field) => (
                                    <th key={field}>{field}</th>
                                  ))}
                                  <th>Arquivo</th>
                                  <th>Ações</th>
                                </tr>
                              </thead>
                              <tbody>
                                {docs.map((documento) => (
                                  <tr key={documento.id}>
                                    <td>{documento.tipodocumento || "-"}</td>
                                    {getFieldsForDisplay(documento).map((field) => (
                                      <td key={field}>
                                        {field.includes("Valor") || field === "Capital Social Total"
                                          ? formatCurrencyInput(documento.campos[field])
                                          : field.includes("Data") ||
                                            field.includes("Início") ||
                                            field.includes("Final") ||
                                            field.includes("Vencimento")
                                          ? formatDateInput(String(documento.campos[field]))
                                          : String(documento.campos[field] || "-")}
                                      </td>
                                    ))}
                                    <td>
                                      {documento.url && (
                                        <a href={documento.url} target="_blank" rel="noopener noreferrer">
                                          Ver arquivo
                                        </a>
                                      )}
                                    </td>
                                    <td>
                                      <button
                                        className="table-btn table-btn-warning"
                                        onClick={() => handleEditarDocumento(documento)}
                                      >
                                        Editar
                                      </button>
                                      <button
                                        className="table-btn table-btn-danger"
                                        onClick={() => handleExcluirDocumento(documento)}
                                      >
                                        Excluir
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <button
                            className="form-btn form-btn-primary"
                            onClick={handleAddNewDocument}
                          >
                            Adicionar Novo Documento
                          </button>
                          {addingNewDocument && (
                            <div className="form-section">
                              <div className="form-section">
                                <label className="form-label">Tipo de Documento:</label>
                                <select
                                  className="form-input"
                                  value={tipodocumento}
                                  onChange={handleTipodocumentoChange}
                                  required
                                >
                                  <option value="">Selecione o tipo</option>
                                  {tipodocumentoOptions.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="form-section">
                                <label className="form-label">Identificação:</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  value={String(documentFields.Identificação || "")}
                                  onChange={(e) => handleDocumentFieldChange("Identificação", e.target.value)}
                                  placeholder="Informe a identificação"
                                />
                              </div>
                              <div className="form-section">
                                <label className="form-label">Arquivo:</label>
                                <input
                                  type="file"
                                  className="form-input"
                                  onChange={handleFileChange}
                                />
                              </div>
                              <div className="form-section">
                                <button
                                  className="form-btn form-btn-success"
                                  onClick={handleAddDocument}
                                  disabled={!tipodocumento || !documentFields.Identificação || !selectedFile}
                                >
                                  {uploading ? "Enviando..." : "Adicionar Documento"}
                                </button>
                                <button
                                  className="form-btn form-btn-secondary"
                                  onClick={() => {
                                    setAddingNewDocument(false);
                                    setDocumentFields({});
                                    setTipodocumento("");
                                    setSelectedFile(null);
                                  }}
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    {categoria !== "Imóveis" && categoria !== "Empresas e Participações" && (
                      <div className="table-responsive">
                        <table className="table">
                          <thead>
                            <tr>
                              {(categoria === "Imóveis" || categoria === "Outros Documentos") && (
                                <th>Tipo de Documento</th>
                              )}
                              {Array.isArray(documentos) && documentos.length > 0 &&
                                getFieldsForDisplay(documentos[0]).map((field) => (
                                  <th key={field}>{field}</th>
                                ))}
                              <th>Arquivo</th>
                              <th>Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.isArray(documentos) && documentos.map((documento) => (
                              <tr key={documento.id}>
                                {(categoria === "Imóveis" || categoria === "Outros Documentos") && (
                                  <td>{documento.tipodocumento || "-"}</td>
                                )}
                                {getFieldsForDisplay(documento).map((field) => (
                                  <td key={field}>
                                    {field.includes("Valor") || field === "Capital Social Total"
                                      ? formatCurrencyInput(documento.campos[field])
                                      : field.includes("Data") ||
                                        field.includes("Início") ||
                                        field.includes("Final") ||
                                        field.includes("Vencimento")
                                      ? formatDateInput(String(documento.campos[field]))
                                      : String(documento.campos[field] || "-")}
                                  </td>
                                ))}
                                <td>
                                  {documento.url && (
                                    <a href={documento.url} target="_blank" rel="noopener noreferrer">
                                      Ver arquivo
                                    </a>
                                  )}
                                </td>
                                <td>
                                  <button
                                    className="table-btn table-btn-warning"
                                    onClick={() => handleEditarDocumento(documento)}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    className="table-btn table-btn-danger"
                                    onClick={() => handleExcluirDocumento(documento)}
                                  >
                                    Excluir
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <Modal
          show={showEditEmpresaModal}
          onHide={() => setShowEditEmpresaModal(false)}
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>Editar Empresa</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {empresaEditando && (
              <>
                <div className="form-section">
                  <label className="form-label">Nome da Empresa:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={empresaEditando.nome}
                    onChange={(e) => setEmpresaEditando({ ...empresaEditando, nome: e.target.value })}
                    placeholder="Digite o nome"
                  />
                </div>
                {empresaFieldsConfig.map((field) => (
                  <div key={field} className="form-section">
                    <label className="form-label">{field}:</label>
                    {field.includes("Valor") || field === "Capital Social Total" ? (
                      <NumericFormat
                        thousandSeparator="."
                        decimalSeparator=","
                        prefix="R$ "
                        decimalScale={2}
                        fixedDecimalScale
                        className="form-input"
                        value={formattedValues[field] || formatCurrencyInput(empresaEditando?.campos[field] || 0)}
                        onValueChange={(values: NumberFormatValues) => {
                          setFormattedValues((prev) => ({
                            ...prev,
                            [field]: values.formattedValue,
                          }));
                        }}
                        onBlur={() => {
                          const formattedValue = formattedValues[field] || "";
                          const numericValue = formattedValue
                            .replace("R$ ", "")
                            .replace(/\./g, "")
                            .replace(",", ".");
                          const floatValue = parseFloat(numericValue) || 0;
                          setEmpresaEditando((prev) => {
                            if (!prev) return prev;
                            return {
                              ...prev,
                              id: prev.id,
                              nome: prev.nome,
                              cliente: prev.cliente,
                              campos: { ...prev.campos, [field]: floatValue },
                            };
                          });
                        }}
                      />
                    ) : field === "%Capital Social" ? (
                      <input
                        type="text"
                        className="form-input"
                        value={String(empresaEditando.campos[field] || "")}
                        onChange={(e) =>
                          setEmpresaEditando({
                            ...empresaEditando,
                            campos: { ...empresaEditando.campos, [field]: e.target.value },
                          })
                        }
                        placeholder="Ex: 25%"
                      />
                    ) : field === "Quantidade de Quotas/Ações" ? (
                      <input
                        type="number"
                        className="form-input"
                        value={String(empresaEditando.campos[field] || "")}
                        onChange={(e) =>
                          setEmpresaEditando({
                            ...empresaEditando,
                            campos: { ...empresaEditando.campos, [field]: e.target.value },
                          })
                        }
                      />
                    ) : (
                      <input
                        type="text"
                        className="form-input"
                        value={String(empresaEditando.campos[field] || "")}
                        onChange={(e) =>
                          setEmpresaEditando({
                            ...empresaEditando,
                            campos: { ...empresaEditando.campos, [field]: e.target.value },
                          })
                        }
                        placeholder="Ex: CNPJ"
                      />
                    )}
                  </div>
                ))}
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <button
              className="form-btn form-btn-secondary"
              onClick={() => setShowEditEmpresaModal(false)}
            >
              Cancelar
            </button>
            <button
              className="form-btn form-btn-primary"
              onClick={handleSalvarEdicaoEmpresa}
            >
              Salvar
            </button>
          </Modal.Footer>
        </Modal>

        {showConfirmation && (
          <Modal
            show={showConfirmation}
            onHide={() => setShowConfirmation(false)}
            centered
            size="lg"
          >
            <Modal.Header closeButton>
              <Modal.Title>{documentoEditando ? "Confirmação de Atualização" : "Confirmação de Upload"}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div className="mb-3">
                <h5>Detalhes do Documento</h5>
                <p><strong>Cliente Selecionado:</strong> {selectedCliente}</p>
                <p><strong>Categoria:</strong> {category}</p>
                {category === "Imóveis" && (
                  <p><strong>Proprietário:</strong> {getProprietarioNome(selectedProprietario)}</p>
                )}
                {category === "Empresas e Participações" && (
                  <p><strong>Empresa:</strong> {getEmpresaNome(selectedEmpresa)}</p>
                )}
                {(category === "Imóveis" || category === "Outros Documentos" || category === "Empresas e Participações") && (
                  <p><strong>Tipo de Documento:</strong> {tipodocumento}</p>
                )}
                <p><strong>Descrição:</strong> {description || "Nenhuma descrição fornecida"}</p>
                <div className="mt-3">
                  <h6>Campos Preenchidos:</h6>
                  <ul className="list-group">
                    {Object.entries(documentFields).map(([field, value]) => (
                      <li key={field} className="list-group-item">
                        <strong>{field}:</strong> {field === "% de Titularidade" ? `${value}%` : field.includes("Valor") ? formatCurrencyInput(value) : String(value) || "Não preenchido"}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <button
                className="form-btn form-btn-secondary"
                onClick={() => setShowConfirmation(false)}
              >
                Voltar e Corrigir
              </button>
              <button
                className="form-btn form-btn-primary"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? "Processando..." : documentoEditando ? "Atualizar" : "Confirmar e Enviar"}
              </button>
            </Modal.Footer>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default DocumentManagementPage;