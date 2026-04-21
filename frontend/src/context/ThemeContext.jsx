import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export const THEME_MODES = {
  light: "light",
  dark: "dark",
};

// Color palette definitions
export const COLOR_PALETTES = {
  ocean: {
    name: "Ocean",
    light: {
      primary: "#006879",
      secondary: "#00a8cc",
      tertiary: "#435e91",
      error: "#ba1a1a",
    },
    dark: {
      primary: "#54d7f2",
      secondary: "#5dd9f8",
      tertiary: "#adc7ff",
      error: "#ffb4ab",
    },
  },
  forest: {
    name: "Forest",
    light: {
      primary: "#2d6a4f",
      secondary: "#40916c",
      tertiary: "#52b788",
      error: "#ba1a1a",
    },
    dark: {
      primary: "#81c784",
      secondary: "#a5d6a7",
      tertiary: "#c8e6c9",
      error: "#ffb4ab",
    },
  },
  sunset: {
    name: "Sunset",
    light: {
      primary: "#d84315",
      secondary: "#ff6f00",
      tertiary: "#ff9100",
      error: "#ba1a1a",
    },
    dark: {
      primary: "#ffb74d",
      secondary: "#ffb74d",
      tertiary: "#ffe082",
      error: "#ffb4ab",
    },
  },
  midnight: {
    name: "Midnight",
    light: {
      primary: "#1a237e",
      secondary: "#3949ab",
      tertiary: "#5c6bc0",
      error: "#ba1a1a",
    },
    dark: {
      primary: "#7986cb",
      secondary: "#9fa8da",
      tertiary: "#c5cae9",
      error: "#ffb4ab",
    },
  },
  berry: {
    name: "Berry",
    light: {
      primary: "#6a1b9a",
      secondary: "#ad1457",
      tertiary: "#c2185b",
      error: "#ba1a1a",
    },
    dark: {
      primary: "#ce93d8",
      secondary: "#f06292",
      tertiary: "#ec407a",
      error: "#ffb4ab",
    },
  },
};

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem("smartprint-theme-mode");
    return saved || THEME_MODES.light;
  });

  const [palette, setPalette] = useState(() => {
    const saved = localStorage.getItem("smartprint-theme-palette");
    return saved || "ocean";
  });

  useEffect(() => {
    localStorage.setItem("smartprint-theme-mode", mode);
    document.documentElement.setAttribute("data-theme-mode", mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem("smartprint-theme-palette", palette);
    document.documentElement.setAttribute("data-theme-palette", palette);
    applyTheme(mode, palette);
  }, [palette, mode]);

  const applyTheme = (currentMode, currentPalette) => {
    const isDark = currentMode === THEME_MODES.dark;
    const paletteConfig = COLOR_PALETTES[currentPalette];
    const colors = isDark ? paletteConfig.dark : paletteConfig.light;

    const root = document.documentElement;
    
    if (isDark) {
      // Dark mode
      root.style.setProperty("--surface", "#0a0e27");
      root.style.setProperty("--surface-dim", "#000000");
      root.style.setProperty("--surface-bright", "#2a2d3a");
      root.style.setProperty("--surface-container-lowest", "#05070f");
      root.style.setProperty("--surface-container-low", "#15171f");
      root.style.setProperty("--surface-container", "#1f2230");
      root.style.setProperty("--surface-container-high", "#2a2e3d");
      root.style.setProperty("--surface-container-highest", "#35394a");
      root.style.setProperty("--surface-variant", "#49454f");
      root.style.setProperty("--on-surface", "#f5f1f8");
      root.style.setProperty("--on-surface-variant", "#e8e1ed");
      root.style.setProperty("--outline", "#a39fb5");
      root.style.setProperty("--outline-variant", "#605b70");
    } else {
      // Light mode
      root.style.setProperty("--surface", "#fffbfe");
      root.style.setProperty("--surface-dim", "#e7d9e8");
      root.style.setProperty("--surface-bright", "#fffbfe");
      root.style.setProperty("--surface-container-lowest", "#ffffff");
      root.style.setProperty("--surface-container-low", "#f7f2f8");
      root.style.setProperty("--surface-container", "#f0eaf5");
      root.style.setProperty("--surface-container-high", "#eae4f0");
      root.style.setProperty("--surface-container-highest", "#e4deea");
      root.style.setProperty("--surface-variant", "#e7d9e8");
      root.style.setProperty("--on-surface", "#1a1620");
      root.style.setProperty("--on-surface-variant", "#49454e");
      root.style.setProperty("--outline", "#7a747e");
      root.style.setProperty("--outline-variant", "#cac4cf");
    }

    // Apply palette colors
    root.style.setProperty("--primary", colors.primary);
    root.style.setProperty("--secondary", colors.secondary);
    root.style.setProperty("--tertiary", colors.tertiary);
    root.style.setProperty("--error", colors.error);

    if (isDark) {
      root.style.setProperty("--primary-container", `${colors.primary}25`);
      root.style.setProperty("--secondary-container", `${colors.secondary}25`);
      root.style.setProperty("--tertiary-container", `${colors.tertiary}25`);
      root.style.setProperty("--error-container", `${colors.error}25`);
      root.style.setProperty("--on-primary", "#000000");
      root.style.setProperty("--on-secondary", "#000000");
      root.style.setProperty("--on-tertiary", "#000000");
      root.style.setProperty("--on-error", "#000000");
      root.style.setProperty("--on-primary-container", colors.primary);
      root.style.setProperty("--on-secondary-container", colors.secondary);
      root.style.setProperty("--on-tertiary-container", colors.tertiary);
      root.style.setProperty("--on-error-container", colors.error);
    } else {
      root.style.setProperty("--primary-container", `${colors.primary}15`);
      root.style.setProperty("--secondary-container", `${colors.secondary}15`);
      root.style.setProperty("--tertiary-container", `${colors.tertiary}15`);
      root.style.setProperty("--error-container", `${colors.error}15`);
      root.style.setProperty("--on-primary", "#ffffff");
      root.style.setProperty("--on-secondary", "#ffffff");
      root.style.setProperty("--on-tertiary", "#ffffff");
      root.style.setProperty("--on-error", "#ffffff");
    }
  };

  const toggleMode = () => {
    setMode(prev => prev === THEME_MODES.light ? THEME_MODES.dark : THEME_MODES.light);
  };

  const changePalette = (newPalette) => {
    setPalette(newPalette);
  };

  return (
    <ThemeContext.Provider value={{ mode, palette, toggleMode, changePalette, PALETTES: COLOR_PALETTES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
