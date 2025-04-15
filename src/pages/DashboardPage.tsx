import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
  TooltipItem,
  ChartEvent,
  ActiveElement,
  Chart,
} from "chart.js";
import { FiFileText } from "react-icons/fi";
import Header from "../components/Header";
import "../styles/DashboardPage.css";

// Registrar componentes do Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

// Interface para tipar as notificações
interface Notification {
  id: string;
  category: string;
  identificacao: string;
  vencimento: string;
  diasRestantes: number;
}

// Interface para tipar o patrimônio
interface Patrimonio {
  "Imóveis": number;
  "Veículos": number;
  "Empresas e Participações": number;
  "Receita Aluguéis": number;
}

function DashboardPage() {
  const [patrimonio, setPatrimonio] = useState<Patrimonio>({
    "Imóveis": 0,
    "Veículos": 0,
    "Empresas e Participações": 0,
    "Receita Aluguéis": 0,
  });
  const [imoveisValorDeclarado, setImoveisValorDeclarado] = useState<number>(0); // Novo estado para Valor Declarado
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Função auxiliar para converter data de diferentes formatos
  const parseDate = (dateInput: string | undefined): Date | null => {
    if (!dateInput) return null;

    let parsedDate: Date;

    // Caso o formato seja DD/MM/YYYY
    if (dateInput.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = dateInput.split("/").map(Number);
      parsedDate = new Date(year, month - 1, day);
    }
    // Caso seja uma string ISO ou outro formato reconhecido
    else {
      parsedDate = new Date(dateInput);
    }

    if (isNaN(parsedDate.getTime())) {
      console.warn(`Data inválida: ${dateInput}`);
      return null;
    }
    return parsedDate;
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        console.error("Usuário não autenticado!");
        navigate("/");
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (userError || !userData || userData.role !== "client") {
        navigate("/dashboard");
        return;
      }

      const emailToFetch = user.email;

      setLoading(true);
      const patrimonioData: Patrimonio = {
        "Imóveis": 0,
        "Veículos": 0,
        "Empresas e Participações": 0,
        "Receita Aluguéis": 0,
      };
      let imoveisValorDeclaradoTemp = 0; // Variável temporária para Valor Declarado
      const notificationsData: Notification[] = [];

      try {
        // Consulta para documentos
        const { data: documentos, error: documentosError } = await supabase
          .from("documentos")
          .select("*")
          .eq("cliente", emailToFetch);

        if (documentosError) {
          console.error("Erro ao buscar documentos:", documentosError);
          setLoading(false);
          return;
        }

        console.log("[DEBUG] Total de documentos encontrados:", documentos.length);

        documentos.forEach((doc: any) => {
          const category = doc.categoria;
          const campos = doc.campos || {};

          console.log(`[DEBUG] Documento [${category}] ID: ${doc.id}, Campos:`, campos);

          switch (category) {
            case "Imóveis":
              if (doc.tipodocumento && campos["Situação do Imóvel"] !== "Vendido") {
                const valorMercadoRaw = doc.valor_mercado; // Usar Valor de Mercado
                const valorMercado =
                  typeof valorMercadoRaw === "number"
                    ? valorMercadoRaw
                    : parseFloat(String(valorMercadoRaw).replace(/\D/g, "")) / 100 || 0;
                patrimonioData["Imóveis"] += valorMercado;

                const valorDeclaradoRaw = campos["Valor Declarado"];
                const valorDeclarado =
                  typeof valorDeclaradoRaw === "string"
                    ? parseFloat(valorDeclaradoRaw.replace(/\D/g, "")) / 100 || 0
                    : typeof valorDeclaradoRaw === "number"
                    ? valorDeclaradoRaw
                    : 0;
                imoveisValorDeclaradoTemp += valorDeclarado;
              }
              break;
            case "Veículos":
              const valorVeiculoRaw = campos["Valor"];
              const valorVeiculo =
                typeof valorVeiculoRaw === "string"
                  ? parseFloat(valorVeiculoRaw.replace("R$", "").replace(/\./g, "").replace(",", ".")) || 0
                  : typeof valorVeiculoRaw === "number"
                  ? valorVeiculoRaw
                  : 0;
              patrimonioData["Veículos"] += valorVeiculo;
              break;
            case "Contratos de Locações":
              if (doc.descricao?.toLowerCase().includes("locação")) {
                const valorContratoRaw = campos["Valor"];
                const valorContrato =
                  typeof valorContratoRaw === "string"
                    ? parseFloat(valorContratoRaw.replace(/\D/g, "")) / 100 || 0
                    : typeof valorContratoRaw === "number"
                    ? valorContratoRaw
                    : 0;
                patrimonioData["Receita Aluguéis"] += valorContrato;
              }
              if (campos["Final"]) {
                const vencimentoDate = parseDate(campos["Final"]);
                if (vencimentoDate) {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const diffTime = vencimentoDate.getTime() - today.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  if (diffDays <= 45) {
                    notificationsData.push({
                      id: doc.id,
                      category: "Contratos de Locações",
                      identificacao: campos["Identificação"] || "Sem identificação",
                      vencimento: vencimentoDate.toLocaleDateString("pt-BR"),
                      diasRestantes: diffDays,
                    });
                  }
                }
              }
              break;
            case "Outros Documentos":
              if (campos["Vencimento"] || campos["Validade"]) {
                const vencimentoDate = parseDate(campos["Vencimento"] || campos["Validade"]);
                if (vencimentoDate) {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const diffTime = vencimentoDate.getTime() - today.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  if (doc.tipodocumento === "Passaporte" && diffDays <= 180) {
                    notificationsData.push({
                      id: doc.id,
                      category: "Outros Documentos",
                      identificacao: campos["Identificação"] || "Sem identificação",
                      vencimento: vencimentoDate.toLocaleDateString("pt-BR"),
                      diasRestantes: diffDays,
                    });
                  } else if (diffDays <= 30) {
                    notificationsData.push({
                      id: doc.id,
                      category: "Outros Documentos",
                      identificacao: campos["Identificação"] || "Sem identificação",
                      vencimento: vencimentoDate.toLocaleDateString("pt-BR"),
                      diasRestantes: diffDays,
                    });
                  }
                }
              }
              break;
            default:
              break;
          }
        });

        // Consulta para empresas
        const { data: empresas, error: empresasError } = await supabase
          .from("empresas")
          .select("*")
          .eq("cliente", emailToFetch);

        if (empresasError) {
          console.error("Erro ao buscar empresas:", empresasError);
          setLoading(false);
          return;
        }

        console.log("[DEBUG] Total de empresas encontradas:", empresas.length);

        empresas.forEach((doc: any) => {
          const campos = doc.campos || doc;

          console.log(`[DEBUG] Empresa ID: ${doc.id}, Campos:`, campos);

          const valorBruto = campos["Valor Capital Social Participação"] || "0";
          console.log(`[DEBUG] Empresa [${doc.id}] Valor bruto:`, valorBruto);

          const valorNumerico =
            typeof valorBruto === "string"
              ? parseFloat(valorBruto.replace(/[^\d,]/g, "").replace(",", "."))
              : valorBruto;

          const valorFinal = Number.isNaN(valorNumerico) ? 0 : valorNumerico;

          patrimonioData["Empresas e Participações"] += valorFinal;
          console.log(
            `[DEBUG] Empresa [${doc.id}] Total acumulado para Empresas e Participações:`,
            patrimonioData["Empresas e Participações"]
          );
        });

        notificationsData.sort((a, b) => a.diasRestantes - b.diasRestantes);
        console.log("[DEBUG] Patrimônio final:", patrimonioData);
        setPatrimonio(patrimonioData);
        setImoveisValorDeclarado(imoveisValorDeclaradoTemp); // Atualizar estado para Valor Declarado
        setNotifications(notificationsData);
      } catch (error) {
        console.error("Erro ao buscar documentos ou empresas:", error);
      }

      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  // Dados do gráfico
  const data: ChartData<"pie"> = {
    labels: (Object.keys(patrimonio) as Array<keyof Patrimonio>).filter(
      (category) => patrimonio[category] > 0
    ),
    datasets: [
      {
        data: (Object.keys(patrimonio) as Array<keyof Patrimonio>)
          .filter((category) => patrimonio[category] > 0)
          .map((category) => patrimonio[category]),
        backgroundColor: ["#3e4093", "#83cbbd", "#d6e039", "#6981b0"],
        borderColor: ["#2e2f6b", "#63ab9d", "#b6c019", "#596190"],
        borderWidth: 2,
        hoverOffset: 20,
      },
    ],
  };

  // Opções do gráfico
  const options: ChartOptions<"pie"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          font: {
            size: 14,
            weight: "bold",
          },
          color: "#2c3e50",
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleFont: { size: 14 },
        bodyFont: { size: 12 },
        callbacks: {
          label: (tooltipItem: TooltipItem<"pie">) => {
            const category = data.labels![tooltipItem.dataIndex] as keyof Patrimonio;
            const value = patrimonio[category];
            return `${category}: ${new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(value)}`;
          },
        },
      },
    },
    cutout: "60%",
    onClick: (
      event: ChartEvent,
      elements: ActiveElement[],
      chart: Chart<"pie", number[], string>
    ) => {
      if (elements.length > 0) {
        const categoryIndex = elements[0].index;
        const category = data.labels![categoryIndex];
        navigate(`/document-list?category=${category}`);
      }
    },
    animation: {
      animateScale: true,
      animateRotate: true,
    },
  };

  const handleAcessarDocumentos = () => {
    navigate("/document-list");
  };

  const handleNotificationClick = (category: string, id: string) => {
    navigate(`/document-list?category=${category}&docId=${id}`);
  };

  return (
    <div className="dashboard-container">
      <Header showLogout={true} />
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h2 className="dashboard-title">Dashboard do Patrimônio</h2>
          <button
            className="category-btn acessar-documentos"
            onClick={handleAcessarDocumentos}
            title="Acessar Documentos"
          >
            <FiFileText className="btn-icon" /> Acessar Documentos
          </button>
        </div>
        {loading ? (
          <p className="text-center">Carregando dados do patrimônio...</p>
        ) : (
          <div className="dashboard-main">
            <div className="chart-container">
              <Pie data={data} options={options} />
            </div>
            <div className="notifications-container">
              <h4>Notificações de Vencimento</h4>
              {notifications.length > 0 ? (
                <ul className="notifications-list">
                  {notifications.map((notification, index) => (
                    <li
                      key={index}
                      className="notification-item"
                      onClick={() => handleNotificationClick(notification.category, notification.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <div>
                        <strong>{notification.identificacao}</strong>
                        <p>Vencimento: {notification.vencimento}</p>
                      </div>
                      <span
                        className={`days-left ${
                          notification.diasRestantes < 0 ? "overdue" : "within-deadline"
                        }`}
                      >
                        {notification.diasRestantes >= 0
                          ? `${notification.diasRestantes} dias restantes`
                          : `${Math.abs(notification.diasRestantes)} dias vencidos`}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Nenhum documento próximo ao vencimento.</p>
              )}
            </div>
          </div>
        )}

        {!loading && (
          <div className="mt-4">
            <h4>Resumo do Patrimônio</h4>
            <ul className="list-group">
              <li className="list-group-item">
                Imóveis Valor Declarado:{" "}
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(imoveisValorDeclarado)}
              </li>
              <li className="list-group-item">
                Imóveis Valor de Mercado:{" "}
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(patrimonio["Imóveis"])}
              </li>
              {Object.entries(patrimonio)
                .filter(([category]) => category !== "Imóveis")
                .map(([category, value]) =>
                  value > 0 ? (
                    <li key={category} className="list-group-item">
                      {category}:{" "}
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(value)}
                    </li>
                  ) : null
                )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;