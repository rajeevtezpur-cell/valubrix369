import { useMemo, useState } from "react";
import { BANGALORE_PROJECTS } from "../data/bangaloreProjects";
import { filterProjectsByBuilderAndLocality } from "../utils/projectFilter";

interface Props {
  locality: string;
  builder: string;
  value: string;
  onChange: (projectName: string, builderName: string) => void;
  placeholder?: string;
  className?: string;
}

// Shared dark-themed input style for glassmorphism backgrounds
const darkInputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 10,
  padding: "8px 12px",
  color: "#F4F7FF",
  fontSize: 13,
  width: "100%",
  outline: "none",
  caretColor: "#F4F7FF",
};

const darkSelectStyle: React.CSSProperties = {
  background: "#0F1825",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 10,
  padding: "8px 12px",
  color: "#F4F7FF",
  fontSize: 13,
  width: "100%",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "rgba(216,181,106,0.75)",
  marginBottom: 5,
  display: "block",
};

export default function ProjectLinkedDropdown({
  locality,
  builder,
  value,
  onChange,
  placeholder = "Select project (optional)",
  className = "",
}: Props) {
  const [search, setSearch] = useState("");
  const [manualProject, setManualProject] = useState("");

  // Strict AND filter: locality AND builder both enforced
  const { localProjects, otherProjects, bothSelected } = useMemo(() => {
    const q = search.toLowerCase();
    const bothSet = !!locality && !!builder;

    // Strict AND filtered pool
    let strictPool = filterProjectsByBuilderAndLocality(builder, locality);

    if (q) {
      strictPool = strictPool.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.locality.toLowerCase().includes(q),
      );
    }

    if (bothSet) {
      return {
        localProjects: strictPool.slice(0, 100),
        otherProjects: [],
        bothSelected: true,
      };
    }

    if (locality) {
      const local = strictPool.slice(0, 80);
      const localIds = new Set(local.map((p) => p.id));
      let otherPool = builder
        ? BANGALORE_PROJECTS.filter((p) => p.builder === builder)
        : BANGALORE_PROJECTS;
      if (q) {
        otherPool = otherPool.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.locality.toLowerCase().includes(q),
        );
      }
      const other = otherPool.filter((p) => !localIds.has(p.id)).slice(0, 100);
      return {
        localProjects: local,
        otherProjects: other,
        bothSelected: false,
      };
    }

    if (builder) {
      return {
        localProjects: strictPool.slice(0, 150),
        otherProjects: [],
        bothSelected: false,
      };
    }

    return {
      localProjects: strictPool.slice(0, 150),
      otherProjects: [],
      bothSelected: false,
    };
  }, [locality, builder, search]);

  const selectedProject = useMemo(
    () => BANGALORE_PROJECTS.find((p) => p.name === value),
    [value],
  );

  // Is the current value from a dropdown selection (not manual)?
  const isDropdownSelection = !!selectedProject;

  function handleDropdownChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (!val) return;
    if (val === "__clear__") {
      onChange("", "");
      // Don't clear manual — user may still want to use it
      return;
    }
    if (
      val === "__sep__" ||
      val === "__sep_local__" ||
      val === "__no_results__"
    )
      return;
    const proj = BANGALORE_PROJECTS.find((p) => p.id === val);
    if (proj) {
      // Dropdown selection clears/overrides manual entry
      setManualProject("");
      onChange(proj.name, proj.builder);
    }
  }

  function handleManualChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value;
    setManualProject(name);
    // Manual entry clears dropdown selection
    if (name.trim()) {
      onChange("", ""); // clear dropdown value so manual takes priority
    }
  }

  function handleManualBlur() {
    const name = manualProject.trim();
    if (name) {
      // Store in localStorage for future use
      try {
        const stored: string[] = JSON.parse(
          localStorage.getItem("vb_manual_projects") || "[]",
        );
        if (!stored.map((s) => s.toLowerCase()).includes(name.toLowerCase())) {
          localStorage.setItem(
            "vb_manual_projects",
            JSON.stringify([name, ...stored].slice(0, 30)),
          );
        }
      } catch {
        // ignore storage errors
      }
      onChange(name, builder || "");
    }
  }

  const selectedId = selectedProject?.id ?? "";
  const separatorLabel = builder
    ? `── ${builder} – Other Locations ──`
    : "── Other Locations ──";

  // Determine what's active: dropdown or manual
  const dropdownActive = isDropdownSelection && !!value;
  const manualActive = !isDropdownSelection && !!manualProject.trim();

  return (
    <div className={`space-y-3 ${className}`}>
      {/* ── Dropdown Section ─────────────────────────────────────── */}
      <div>
        <label htmlFor="pld-search" style={labelStyle}>
          Select Project (Optional)
        </label>

        {/* Search filter */}
        <input
          id="pld-search"
          type="text"
          placeholder="Search project..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...darkInputStyle, marginBottom: 6 }}
          data-ocid="project_dropdown.search_input"
        />

        {/* Dropdown select — ALWAYS visible */}
        <select
          value={selectedId}
          onChange={handleDropdownChange}
          style={{
            ...darkSelectStyle,
            border: dropdownActive
              ? "1px solid rgba(110,231,183,0.5)"
              : "1px solid rgba(255,255,255,0.14)",
          }}
          data-ocid="project_dropdown.select"
        >
          <option value="" style={{ color: "rgba(244,247,255,0.45)" }}>
            {placeholder}
          </option>
          <option value="__clear__">— Clear selection —</option>

          {localProjects.length > 0 && (
            <>
              {!bothSelected && locality && (
                <option disabled value="__sep_local__">
                  {`=== In ${locality} ===`}
                </option>
              )}
              {localProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.locality})
                </option>
              ))}
            </>
          )}

          {otherProjects.length > 0 && !bothSelected && (
            <>
              {localProjects.length > 0 && (
                <option disabled value="__sep__">
                  {separatorLabel}
                </option>
              )}
              {otherProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.locality})
                </option>
              ))}
            </>
          )}

          {localProjects.length === 0 && otherProjects.length === 0 && (
            <option disabled value="__no_results__">
              No projects found — try entering manually below
            </option>
          )}
        </select>

        {/* Dropdown selection confirmation */}
        {dropdownActive && (
          <p
            style={{
              color: "rgba(110,231,183,0.8)",
              fontSize: 12,
              marginTop: 5,
            }}
          >
            ✓ {value}
            {selectedProject
              ? ` · ${selectedProject.builder} · ${selectedProject.locality}`
              : ""}
          </p>
        )}
      </div>

      {/* ── Manual Entry Section — ALWAYS visible ─────────────── */}
      <div>
        <label htmlFor="pld-manual" style={labelStyle}>
          Can't find your project? Enter manually
        </label>

        <input
          id="pld-manual"
          type="text"
          placeholder="Type project name..."
          value={manualProject}
          onChange={handleManualChange}
          onBlur={handleManualBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          style={{
            ...darkInputStyle,
            border: manualActive
              ? "1px solid rgba(216,181,106,0.5)"
              : "1px solid rgba(255,255,255,0.14)",
          }}
          data-ocid="project_dropdown.manual_input"
        />

        {/* Contextual notes */}
        {manualActive && (
          <p
            style={{
              color: "rgba(216,181,106,0.75)",
              fontSize: 12,
              marginTop: 5,
            }}
          >
            ✓ Using manual entry · Will be saved for future use
          </p>
        )}

        {/* Always-visible helper note */}
        <p
          style={{
            color: "rgba(185,198,216,0.4)",
            fontSize: 11,
            marginTop: manualActive ? 3 : 5,
            fontStyle: "italic",
          }}
        >
          Your entry helps us improve our database
        </p>
      </div>

      {/* Priority note when BOTH are filled — clarify which takes precedence */}
      {dropdownActive && manualProject.trim() && (
        <p
          style={{
            background: "rgba(37,99,235,0.1)",
            border: "1px solid rgba(37,99,235,0.25)",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 11,
            color: "rgba(147,197,253,0.8)",
          }}
        >
          ℹ️ Dropdown selection takes priority. Clear it to use manual entry.
        </p>
      )}
    </div>
  );
}
