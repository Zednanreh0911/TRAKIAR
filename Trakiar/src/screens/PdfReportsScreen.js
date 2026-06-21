import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useMemo, useState } from "react";
import * as Print from "expo-print";
import DateTimePicker from "@react-native-community/datetimepicker";
import AppButton from "../components/AppButton";
import AppCard from "../components/AppCard";
import AppDropdown from "../components/AppDropdown";
import AppHeroHeader from "../components/AppHeroHeader";
import AppScreen from "../components/AppScreen";
import { useAuth } from "../context/AuthContext";
import {
  getManagerStats,
  getRoutesByLine,
  getUnitsByLine,
} from "../services/apiService";
import { colors } from "../theme/colors";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const reportOptions = [
  {
    value: "units",
    label: "Unidades",
    description:
      "Genera un PDF con todas las unidades de tu línea, su estado y chofer asignado.",
    iconName: "bus",
    supportsDateFilter: true,
  },
  {
    value: "drivers",
    label: "Choferes",
    description:
      "Genera un PDF con los choferes asignados y sus unidades en operación.",
    iconName: "account",
    supportsDateFilter: true,
  },
  {
    value: "active-routes",
    label: "Rutas activas",
    description: "Genera un PDF con las rutas disponibles en tu línea.",
    iconName: "map-marker-path",
    supportsDateFilter: true,
  },
  {
    value: "overview",
    label: "Resumen operativo",
    description: "Genera un PDF con un resumen del estado de la operación.",
    iconName: "clipboard-list",
    supportsDateFilter: false,
  },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const toISODate = (date) => date.toISOString().split("T")[0];

const formatDisplayDate = (date) =>
  date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// ─────────────────────────────────────────────
// HTML Builder
// ─────────────────────────────────────────────
const buildReportHtml = ({ title, subtitle, columns, rows, dateLabel }) => {
  const rowsHtml = rows
    .map(
      (row) => `
        <tr>
          ${columns
            .map(
              (col) =>
                `<td style="padding:12px 14px;border:1px solid #D9E4F8;">${String(
                  row[col.key] ?? "-",
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
          .content-card { background: white; border-radius: 20px; padding: 24px; box-shadow: 0 14px 42px rgba(9,16,87,0.08); margin-top: -8px; }
          h1 { color: #102A60; font-size: 28px; margin: 0 0 6px; }
          .meta { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
          .meta-item { background: #EFF6FF; color: #1D4ED8; border-radius: 999px; padding: 6px 12px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; table-layout: fixed; }
          th, td { padding: 10px 12px; border: 1px solid #D9E4F8; text-align: left; word-break: break-word; font-size: 12px; }
          th { background: #E0E8FF; color: #0F172A; font-weight: 700; }
          tr:nth-child(even) { background: #F8FAFF; }
          .footer { margin-top: 24px; color: #64748B; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="brand-bar">
          <div class="brand-logo">Trakiar</div>
          <div class="brand-tag">Reporte operativo</div>
        </div>
        <div class="content-card">
          <h1>${title}</h1>
          <div class="meta">
            <span class="meta-item">${subtitle}</span>
            <span class="meta-item">Generado: ${new Date().toLocaleDateString()}</span>
            ${dateLabel ? `<span class="meta-item">📅 ${dateLabel}</span>` : ""}
          </div>
          <table>
            <thead><tr>${columns.map((c) => `<th>${c.label}</th>`).join("")}</tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="footer">Generado desde la app Trakiar.</div>
        </div>
      </body>
    </html>
  `;
};

// ─────────────────────────────────────────────
// Driver rows helper
// ─────────────────────────────────────────────
const getDriverReportRows = (units) => {
  const drivers = new Map();
  units.forEach((u) => {
    if (!u.chofer_correo) return;
    if (!drivers.has(u.chofer_correo)) {
      drivers.set(u.chofer_correo, {
        nombre: u.chofer_nombre || "-",
        correo: u.chofer_correo,
        unidad: u.identificador || `Unidad #${u.id}`,
        estado_unidad: u.estado || "-",
        modificado_por: u.modified_by_nombre || u.modified_by || "-",
      });
    }
  });
  return Array.from(drivers.values());
};

// ─────────────────────────────────────────────
// Data fetcher
// ─────────────────────────────────────────────
const getReportData = async (type, token, dateFilter) => {
  if (type === "units") {
    const res = await getUnitsByLine(token, dateFilter);
    const rows = (res.unidades || []).map((u) => ({
      identificador: u.identificador || `Unidad #${u.id}`,
      estado: u.estado || "-",
      chofer: u.chofer_nombre || "Sin chofer",
      modificado_por: u.modified_by_nombre || u.modified_by || "-",
      creado: u.created_at ? new Date(u.created_at).toLocaleDateString() : "-",
    }));
    return {
      title: "Reporte de Unidades",
      subtitle: "Listado de unidades con estado y chofer asignado.",
      columns: [
        { key: "identificador", label: "Unidad" },
        { key: "estado", label: "Estado" },
        { key: "chofer", label: "Chofer" },
        { key: "modificado_por", label: "Modificado por" },
        { key: "creado", label: "Creado" },
      ],
      rows: rows.length
        ? rows
        : [{ identificador: "Sin datos", estado: "-", chofer: "-", modificado_por: "-", creado: "-" }],
    };
  }

  if (type === "drivers") {
    const res = await getUnitsByLine(token, dateFilter);
    const rows = getDriverReportRows(res.unidades || []);
    return {
      title: "Reporte de Choferes",
      subtitle: "Choferes asignados a unidades en tu línea.",
      columns: [
        { key: "nombre", label: "Nombre" },
        { key: "correo", label: "Correo" },
        { key: "unidad", label: "Unidad" },
        { key: "estado_unidad", label: "Estado unidad" },
        { key: "modificado_por", label: "Modificado por" },
      ],
      rows: rows.length
        ? rows
        : [{ nombre: "Sin datos", correo: "-", unidad: "-", estado_unidad: "-", modificado_por: "-" }],
    };
  }

  if (type === "active-routes") {
    const res = await getRoutesByLine(token, dateFilter);
    const rows = (res.rutas || []).map((r) => ({
      nombre: r.nombre || "-",
      descripcion: r.descripcion || "-",
      modificado_por: r.modified_by_nombre || r.modified_by || "-",
      creado: r.created_at ? new Date(r.created_at).toLocaleDateString() : "-",
    }));
    return {
      title: "Reporte de Rutas",
      subtitle: "Rutas disponibles en tu línea.",
      columns: [
        { key: "nombre", label: "Ruta" },
        { key: "descripcion", label: "Descripción" },
        { key: "modificado_por", label: "Modificado por" },
        { key: "creado", label: "Creado" },
      ],
      rows: rows.length
        ? rows
        : [{ nombre: "Sin rutas", descripcion: "-", modificado_por: "-", creado: "-" }],
    };
  }

  const res = await getManagerStats(token);
  return {
    title: "Resumen operativo",
    subtitle: "Indicadores clave de la operación de tu línea.",
    columns: [
      { key: "indicador", label: "Indicador" },
      { key: "valor", label: "Valor" },
    ],
    rows: [
      { indicador: "Total de unidades", valor: res.units?.total ?? "-" },
      { indicador: "Unidades activas", valor: res.units?.active ?? "-" },
      { indicador: "Unidades inactivas", valor: res.units?.inactive ?? "-" },
      { indicador: "Choferes con unidad asignada", valor: res.drivers?.assigned ?? "-" },
      { indicador: "Total de rutas", valor: res.routes?.total ?? "-" },
      { indicador: "Cobertura de rutas (%)", valor: res.coverage?.coveragePct ?? "-" },
      { indicador: "Unidades con datos recientes (%)", valor: res.etaQuality?.recentPct ?? "-" },
      { indicador: "Velocidad promedio (km/h)", valor: res.etaQuality?.avgSpeedKmh ?? "-" },
    ],
  };
};

// ─────────────────────────────────────────────
// Date field component
// iOS:     display="inline"  → calendar embedded in scroll, no modal needed
// Android: display="default" → native system dialog
// ─────────────────────────────────────────────
function DateField({ label, date, onChange, openField, fieldKey, setOpenField }) {
  const isOpen = openField === fieldKey;

  // Android: open native dialog
  const handleAndroidPress = () => setOpenField(isOpen ? null : fieldKey);

  // iOS: toggle inline calendar
  const handleIOSPress = () => setOpenField(isOpen ? null : fieldKey);

  if (Platform.OS === "android") {
    return (
      <>
        <TouchableOpacity
          style={[styles.dateField, isOpen && styles.dateFieldActive]}
          onPress={handleAndroidPress}
          activeOpacity={0.75}
        >
          <Text style={styles.dateFieldLabel}>{label}</Text>
          <Text style={[styles.dateFieldValue, !date && styles.dateFieldPlaceholder]}>
            {date ? formatDisplayDate(date) : "Cualquier fecha"}
          </Text>
          <Text style={styles.dateFieldCaret}>{isOpen ? "▲" : "▼"}</Text>
        </TouchableOpacity>
        {isOpen && (
          <DateTimePicker
            value={date || new Date()}
            mode="date"
            display="default"
            onChange={(event, selected) => {
              setOpenField(null);
              if (event.type === "set" && selected) onChange(selected);
            }}
          />
        )}
      </>
    );
  }

  // iOS — inline calendar toggles in place
  return (
    <>
      <TouchableOpacity
        style={[styles.dateField, isOpen && styles.dateFieldActive]}
        onPress={handleIOSPress}
        activeOpacity={0.75}
      >
        <Text style={styles.dateFieldLabel}>{label}</Text>
        <Text style={[styles.dateFieldValue, !date && styles.dateFieldPlaceholder]}>
          {date ? formatDisplayDate(date) : "Toca para seleccionar"}
        </Text>
        <Text style={styles.dateFieldCaret}>{isOpen ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.inlinePickerWrap}>
          <DateTimePicker
            value={date || new Date()}
            mode="date"
            display="inline"
            onChange={(_, selected) => {
              if (selected) onChange(selected);
            }}
            locale="es-MX"
            accentColor={colors.primary}
            style={styles.inlinePicker}
          />
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => setOpenField(null)}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>Listo ✓</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────
export default function PdfReportsScreen({ navigation }) {
  const { token } = useAuth();
  const [reportType, setReportType] = useState("units");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [useDateFilter, setUseDateFilter] = useState(false);
  const [fechaDesde, setFechaDesde] = useState(null);
  const [fechaHasta, setFechaHasta] = useState(null);
  // which date field has its picker open ("desde" | "hasta" | null)
  const [openField, setOpenField] = useState(null);

  const selectedReport = useMemo(
    () => reportOptions.find((o) => o.value === reportType) ?? reportOptions[0],
    [reportType],
  );
  const supportsFilter = selectedReport.supportsDateFilter;

  const buildDateLabel = () => {
    if (!useDateFilter || !supportsFilter) return null;
    if (fechaDesde && fechaHasta)
      return `${formatDisplayDate(fechaDesde)} — ${formatDisplayDate(fechaHasta)}`;
    if (fechaDesde) return `Desde ${formatDisplayDate(fechaDesde)}`;
    if (fechaHasta) return `Hasta ${formatDisplayDate(fechaHasta)}`;
    return null;
  };

  const buildDateFilter = () => {
    if (!useDateFilter || !supportsFilter) return {};
    return {
      fechaDesde: fechaDesde ? toISODate(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? toISODate(fechaHasta) : undefined,
    };
  };

  const handleGeneratePdf = async () => {
    if (!token) {
      Alert.alert("Error", "No se encontró sesión activa. Vuelve a iniciar sesión.");
      return;
    }
    if (useDateFilter && supportsFilter && fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      Alert.alert("Fechas inválidas", "La fecha de inicio no puede ser mayor a la fecha final.");
      return;
    }
    setOpenField(null);
    setLoading(true);
    setFeedback(null);
    try {
      const dateFilter = buildDateFilter();
      const reportData = await getReportData(reportType, token, dateFilter);
      const html = buildReportHtml({ ...reportData, dateLabel: buildDateLabel() });
      if (Platform.OS === "web") {
        await Print.printAsync({ html });
      } else {
        const printFile = await Print.printToFileAsync({ html });
        await Print.printAsync({ uri: printFile.uri });
      }
      setFeedback({ tone: "success", message: "PDF generado e impresión iniciada correctamente." });
    } catch (error) {
      console.error(error);
      setFeedback({ tone: "error", message: "No se pudo generar el PDF. Intenta de nuevo." });
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
        <AppHeroHeader
          title="Reportes PDF"
          subtitle="Selecciona el tipo de reporte, filtra por fechas y genera el PDF."
          onBack={() => navigation.goBack()}
        />

        {/* ── Tipo de reporte ── */}
        <AppCard style={styles.card}>
          <AppDropdown
            label="Tipo de reporte"
            value={reportType}
            options={reportOptions.map((o) => ({
              value: o.value,
              label: o.label,
              leftIconName: o.iconName,
              leftIconColor: colors.primary,
            }))}
            onChange={(val) => {
              setReportType(val);
              setFeedback(null);
              setOpenField(null);
            }}
            placeholder="Selecciona un reporte"
            emptyText="No hay tipos de reporte disponibles."
          />
        </AppCard>

        {/* ── Filtro por fechas ── */}
        {supportsFilter && (
          <AppCard style={styles.card}>
            <Text style={styles.filterTitle}>Rango de fechas</Text>

            {/* Toggle */}
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleOption, !useDateFilter && styles.toggleOptionActive]}
                onPress={() => {
                  setUseDateFilter(false);
                  setFechaDesde(null);
                  setFechaHasta(null);
                  setOpenField(null);
                }}
                activeOpacity={0.75}
              >
                <Text style={[styles.toggleText, !useDateFilter && styles.toggleTextActive]}>
                  Todos los datos
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleOption, useDateFilter && styles.toggleOptionActive]}
                onPress={() => setUseDateFilter(true)}
                activeOpacity={0.75}
              >
                <Text style={[styles.toggleText, useDateFilter && styles.toggleTextActive]}>
                  Por fechas
                </Text>
              </TouchableOpacity>
            </View>

            {/* Date fields — each toggles its own inline calendar */}
            {useDateFilter && (
              <View style={styles.fieldsWrap}>
                <DateField
                  label="Desde"
                  date={fechaDesde}
                  onChange={setFechaDesde}
                  openField={openField}
                  fieldKey="desde"
                  setOpenField={setOpenField}
                />
                <DateField
                  label="Hasta"
                  date={fechaHasta}
                  onChange={setFechaHasta}
                  openField={openField}
                  fieldKey="hasta"
                  setOpenField={setOpenField}
                />

                {(fechaDesde || fechaHasta) && (
                  <TouchableOpacity
                    style={styles.clearBtn}
                    onPress={() => { setFechaDesde(null); setFechaHasta(null); setOpenField(null); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.clearBtnText}>✕  Limpiar fechas</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </AppCard>
        )}

        {/* ── Vista previa ── */}
        <AppCard style={styles.card}>
          <Text style={styles.previewTitle}>Vista previa del reporte</Text>
          <Text style={styles.previewLabel}>Reporte seleccionado</Text>
          <Text style={styles.previewText}>{selectedReport.label}</Text>
          <Text style={styles.previewLabel}>Descripción</Text>
          <Text style={styles.previewText}>{selectedReport.description}</Text>
          {supportsFilter && useDateFilter && (
            <>
              <Text style={styles.previewLabel}>Rango de fechas</Text>
              <Text style={styles.previewText}>
                {buildDateLabel() ?? "Sin rango definido — se incluyen todos"}
              </Text>
            </>
          )}
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

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  content: {
    gap: 24,
    paddingBottom: 40,
    paddingTop: Platform.select({ ios: 10, android: 50, default: 50 }),
    paddingHorizontal: 24,
  },
  card: { gap: 12 },

  // Preview
  previewTitle: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  previewLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 10,
  },
  previewText: {
    color: colors.primaryDark,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
    fontWeight: "600",
  },

  // Filter section
  filterTitle: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: "center",
  },
  toggleOptionActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  toggleText: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
  toggleTextActive: { color: "#FFFFFF" },

  // Date fields
  fieldsWrap: { gap: 8 },
  dateField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 8,
  },
  dateFieldActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  dateFieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    width: 46,
  },
  dateFieldValue: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "600",
  },
  dateFieldPlaceholder: {
    color: colors.textMuted,
    fontWeight: "500",
  },
  dateFieldCaret: {
    color: colors.textMuted,
    fontSize: 11,
  },

  // Inline calendar wrapper (iOS)
  inlinePickerWrap: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: "hidden",
    marginTop: -4,
  },
  inlinePicker: {
    width: "100%",
  },
  doneBtn: {
    marginHorizontal: 16,
    marginBottom: 14,
    marginTop: 4,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },

  // Clear dates
  clearBtn: {
    alignSelf: "center",
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearBtnText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },

  // Action / feedback
  actionWrap: { marginTop: 4 },
  feedback: { marginTop: 14, fontSize: 14, lineHeight: 20, textAlign: "center" },
  successText: { color: "#1F7A1F" },
  errorText: { color: "#B00020" },
});
