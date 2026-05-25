import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useMemo, useState } from "react";
import * as Print from "expo-print";
import AppButton from "../components/AppButton";
import AppCard from "../components/AppCard";
import AppDropdown from "../components/AppDropdown";
import AppScreen from "../components/AppScreen";
import { useAuth } from "../context/AuthContext";
import {
  getManagerStats,
  getRoutesByLine,
  getUnitsByLine,
} from "../services/apiService";
import { colors } from "../theme/colors";

const reportOptions = [
  {
    value: "units",
    label: "Unidades",
    description:
      "Genera un PDF con todas las unidades de tu línea, su estado y chofer asignado.",
    iconName: "bus",
  },
  {
    value: "drivers",
    label: "Choferes",
    description:
      "Genera un PDF con los choferes asignados y sus unidades en operación.",
    iconName: "account",
  },
  {
    value: "active-routes",
    label: "Rutas activas",
    description: "Genera un PDF con las rutas disponibles en tu línea.",
    iconName: "map-marker-path",
  },
  {
    value: "overview",
    label: "Resumen operativo",
    description: "Genera un PDF con un resumen del estado de la operación.",
    iconName: "clipboard-list",
  },
];

const buildReportHtml = ({ title, subtitle, columns, rows }) => {
  const rowsHtml = rows
    .map(
      (row) => `
        <tr>
          ${columns
            .map(
              (column) =>
                `<td style="padding:12px 14px;border:1px solid #D9E4F8;">${String(
                  row[column.key] ?? "-",
                )}</td>`,
            )
            .join("")}
        </tr>`,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 24px; color: #0F172A; background: #F4F7FF; }
          .brand-bar { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; background: ${colors.primary}; color: white; border-radius: 18px 18px 0 0; }
          .brand-logo { font-size: 20px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
          .brand-tag { font-size: 12px; opacity: 0.9; }
          .content-card { background: white; border-radius: 20px; padding: 24px; box-shadow: 0 14px 42px rgba(9, 16, 87, 0.08); margin-top: -8px; }
          h1 { color: #102A60; font-size: 28px; margin: 0 0 6px; }
          p { color: #475569; margin: 0 0 20px; line-height: 1.6; }
          .meta { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
          .meta-item { background: #EFF6FF; color: #1D4ED8; border-radius: 999px; padding: 6px 12px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; }
          th, td { padding: 14px 16px; border: 1px solid #D9E4F8; text-align: left; }
          th { background: #E0E8FF; color: #0F172A; font-weight: 700; }
          tr:nth-child(even) { background: #F8FAFF; }
          .footer { margin-top: 24px; color: #64748B; font-size: 13px; }
          .watermark { position: absolute; top: 24px; right: 24px; opacity: 0.08; font-size: 64px; font-weight: 900; color: ${colors.primary}; transform: rotate(-20deg); }
        </style>
      </head>
      <body>
        <div class="watermark">Trakiar</div>
        <div class="brand-bar">
          <div class="brand-logo">Trakiar</div>
          <div class="brand-tag">Reporte operativo</div>
        </div>
        <div class="content-card">
          <h1>${title}</h1>
          <div class="meta">
            <span class="meta-item">${subtitle}</span>
            <span class="meta-item">Generado: ${new Date().toLocaleDateString()}</span>
          </div>
          <table>
            <thead>
              <tr>
                ${columns.map((column) => `<th>${column.label}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">Generado desde la app Trakiar.</div>
        </div>
      </body>
    </html>
  `;
};

const getDriverReportRows = (units) => {
  const drivers = new Map();

  units.forEach((unidad) => {
    if (!unidad.chofer_correo) {
      return;
    }

    if (!drivers.has(unidad.chofer_correo)) {
      drivers.set(unidad.chofer_correo, {
        nombre: unidad.chofer_nombre || "-",
        correo: unidad.chofer_correo,
        unidad: unidad.identificador || `Unidad #${unidad.id}`,
        estado_unidad: unidad.estado || "-",
      });
    }
  });

  return Array.from(drivers.values());
};

const getReportData = async (type, token) => {
  if (type === "units") {
    const response = await getUnitsByLine(token);
    const rows = (response.unidades || []).map((unidad) => ({
      identificador: unidad.identificador || `Unidad #${unidad.id}`,
      estado: unidad.estado || "-",
      chofer: unidad.chofer_nombre || "Sin chofer",
      correo_chofer: unidad.chofer_correo || "-",
      creado: unidad.created_at
        ? new Date(unidad.created_at).toLocaleDateString()
        : "-",
    }));

    return {
      title: "Reporte de Unidades",
      subtitle: "Listado de unidades de la línea con estado y chofer asignado.",
      columns: [
        { key: "identificador", label: "Unidad" },
        { key: "estado", label: "Estado" },
        { key: "chofer", label: "Chofer" },
        { key: "correo_chofer", label: "Correo chofer" },
        { key: "creado", label: "Creado" },
      ],
      rows: rows.length
        ? rows
        : [
            {
              identificador: "Sin datos",
              estado: "-",
              chofer: "-",
              correo_chofer: "-",
              creado: "-",
            },
          ],
    };
  }

  if (type === "drivers") {
    const response = await getUnitsByLine(token);
    const rows = getDriverReportRows(response.unidades || []);

    return {
      title: "Reporte de Choferes",
      subtitle: "Choferes asignados a unidades en tu línea.",
      columns: [
        { key: "nombre", label: "Nombre" },
        { key: "correo", label: "Correo" },
        { key: "unidad", label: "Unidad" },
        { key: "estado_unidad", label: "Estado unidad" },
      ],
      rows: rows.length
        ? rows
        : [
            {
              nombre: "Sin datos",
              correo: "-",
              unidad: "-",
              estado_unidad: "-",
            },
          ],
    };
  }

  if (type === "active-routes") {
    const response = await getRoutesByLine(token);
    const rows = (response.rutas || []).map((ruta) => ({
      nombre: ruta.nombre || "-",
      descripcion: ruta.descripcion || "-",
      creado: ruta.created_at
        ? new Date(ruta.created_at).toLocaleDateString()
        : "-",
    }));

    return {
      title: "Reporte de Rutas",
      subtitle: "Rutas disponibles en tu línea.",
      columns: [
        { key: "nombre", label: "Ruta" },
        { key: "descripcion", label: "Descripción" },
        { key: "creado", label: "Creado" },
      ],
      rows: rows.length
        ? rows
        : [{ nombre: "Sin rutas", descripcion: "-", creado: "-" }],
    };
  }

  const response = await getManagerStats(token);
  return {
    title: "Resumen operativo",
    subtitle: "Indicadores clave de la operación de tu línea.",
    columns: [
      { key: "indicador", label: "Indicador" },
      { key: "valor", label: "Valor" },
    ],
    rows: [
      { indicador: "Total de unidades", valor: response.units?.total ?? "-" },
      { indicador: "Unidades activas", valor: response.units?.active ?? "-" },
      {
        indicador: "Unidades inactivas",
        valor: response.units?.inactive ?? "-",
      },
      {
        indicador: "Choferes con unidad asignada",
        valor: response.drivers?.assigned ?? "-",
      },
      { indicador: "Total de rutas", valor: response.routes?.total ?? "-" },
      {
        indicador: "Cobertura de rutas (%)",
        valor: response.coverage?.coveragePct ?? "-",
      },
      {
        indicador: "Unidades con datos recientes (%)",
        valor: response.etaQuality?.recentPct ?? "-",
      },
      {
        indicador: "Velocidad promedio (km/h)",
        valor: response.etaQuality?.avgSpeedKmh ?? "-",
      },
    ],
  };
};

export default function PdfReportsScreen() {
  const { token } = useAuth();
  const [reportType, setReportType] = useState("units");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const selectedReport = useMemo(
    () =>
      reportOptions.find((option) => option.value === reportType) ??
      reportOptions[0],
    [reportType],
  );

  const handleGeneratePdf = async () => {
    if (!token) {
      Alert.alert(
        "Error",
        "No se encontró sesión activa. Vuelve a iniciar sesión.",
      );
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const reportData = await getReportData(reportType, token);
      const html = buildReportHtml(reportData);

      if (Platform.OS === "web") {
        await Print.printAsync({ html });
      } else {
        const printFile = await Print.printToFileAsync({ html });
        await Print.printAsync({ uri: printFile.uri });
      }

      setFeedback({
        tone: "success",
        message: "PDF generado e impresión iniciada correctamente.",
      });
    } catch (error) {
      console.error(error);
      setFeedback({
        tone: "error",
        message: "No se pudo generar el PDF. Intenta de nuevo.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.header}>Reportes PDF</Text>
        <Text style={styles.description}>
          Selecciona el tipo de reporte, revisa la vista previa y genera el PDF
          para imprimir desde el celular.
        </Text>

        <AppCard style={styles.card}>
          <AppDropdown
            label="Tipo de reporte"
            value={reportType}
            options={reportOptions.map((option) => ({
              value: option.value,
              label: option.label,
              leftIconName: option.iconName,
              leftIconColor: colors.primary,
            }))}
            onChange={setReportType}
            placeholder="Selecciona un reporte"
            emptyText="No hay tipos de reporte disponibles."
          />
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.previewTitle}>Vista previa del reporte</Text>
          <Text style={styles.previewLabel}>Reporte seleccionado</Text>
          <Text style={styles.previewText}>{selectedReport.label}</Text>
          <Text style={styles.previewLabel}>Descripción</Text>
          <Text style={styles.previewText}>{selectedReport.description}</Text>
        </AppCard>

        <View style={styles.actionWrap}>
          <AppButton
            title={loading ? "Generando PDF..." : "Generar reporte PDF"}
            onPress={handleGeneratePdf}
            loading={loading}
            disabled={loading}
          />
        </View>

        {feedback?.message ? (
          <Text
            style={[
              styles.feedback,
              feedback.tone === "error" ? styles.errorText : styles.successText,
            ]}
          >
            {feedback.message}
          </Text>
        ) : null}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
    paddingBottom: 28,
    paddingTop: Platform.select({ ios: 10, android: 50, default: 50 }),
  },
  header: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  description: {
    color: colors.textMuted,
    lineHeight: 22,
  },
  card: {
    padding: 16,
  },
  previewTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  previewLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 10,
  },
  previewText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
  actionWrap: {
    marginTop: 10,
  },
  feedback: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 20,
  },
  successText: {
    color: "#1F7A1F",
  },
  errorText: {
    color: "#B00020",
  },
});
