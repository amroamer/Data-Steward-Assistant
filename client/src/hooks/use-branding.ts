import { useMemo } from "react";
import { useEntity } from "@/context/entity-context";
import kpmgLogoPath from "@assets/kpmg-logo.svg";

export interface BrandTheme {
  logo: string;
  appTitle: string;
  sidebarBg: string;
  primary: string;
  secondary: string;
  accent: string;
  logoInvert: boolean;
}

const DEFAULTS: BrandTheme = {
  logo: kpmgLogoPath,
  appTitle: "KPMG Data Owner Agent",
  sidebarBg: "#00338D",
  primary: "#005EB8",
  secondary: "#00338D",
  accent: "#0091DA",
  logoInvert: true,
};

export function useBranding(): BrandTheme {
  const { currentEntity } = useEntity();

  return useMemo(() => {
    if (!currentEntity) return DEFAULTS;

    return {
      logo: currentEntity.logoBase64 || DEFAULTS.logo,
      appTitle: currentEntity.appTitle || DEFAULTS.appTitle,
      sidebarBg: currentEntity.colorSidebar || DEFAULTS.sidebarBg,
      primary: currentEntity.colorPrimary || DEFAULTS.primary,
      secondary: currentEntity.colorSecondary || DEFAULTS.secondary,
      accent: currentEntity.colorAccent || DEFAULTS.accent,
      logoInvert: currentEntity.logoInvert ?? DEFAULTS.logoInvert,
    };
  }, [
    currentEntity?.logoBase64,
    currentEntity?.appTitle,
    currentEntity?.colorSidebar,
    currentEntity?.colorPrimary,
    currentEntity?.colorSecondary,
    currentEntity?.colorAccent,
    currentEntity?.logoInvert,
  ]);
}
