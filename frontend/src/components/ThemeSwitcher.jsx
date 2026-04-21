import { useTheme } from "../context/ThemeContext";
import "../styles/ThemeSwitcher.css";

export const ThemeSwitcher = () => {
  const { mode, palette, toggleMode, changePalette, PALETTES } = useTheme();

  return (
    <div className="theme-switcher">
      {/* Dark Mode Toggle */}
      <div className="theme-section">
        <div className="theme-label">
          <span className="material-symbols-outlined">contrast</span>
          Theme
        </div>
        <button 
          className="theme-toggle"
          onClick={toggleMode}
          title={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
        >
          <span className="material-symbols-outlined">
            {mode === "light" ? "light_mode" : "dark_mode"}
          </span>
          <span className="toggle-text">
            {mode === "light" ? "Light" : "Dark"}
          </span>
        </button>
      </div>

      {/* Color Palette Selector */}
      <div className="theme-section">
        <div className="theme-label">
          <span className="material-symbols-outlined">palette</span>
          Colors
        </div>
        <div className="palette-grid">
          {Object.entries(PALETTES).map(([key, config]) => (
            <button
              key={key}
              className={`palette-btn ${palette === key ? "active" : ""}`}
              onClick={() => changePalette(key)}
              title={config.name}
              style={{
                background: `linear-gradient(135deg, ${config.light.primary}, ${config.light.secondary})`,
              }}
            >
              {palette === key && (
                <span className="material-symbols-outlined check-icon">check</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
