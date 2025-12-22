import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Design System - Sprint 21", () => {
  const clientSrcPath = path.join(__dirname, "../client/src");
  
  describe("Color System", () => {
    it("should have Slate Blue primary color defined in index.css", () => {
      const indexCss = fs.readFileSync(
        path.join(clientSrcPath, "index.css"),
        "utf-8"
      );
      // Check for Slate Blue color values (oklch format)
      expect(indexCss).toContain("--primary:");
      // Verify light theme has proper background
      expect(indexCss).toContain("--background:");
    });

    it("should have dark theme variables defined", () => {
      const indexCss = fs.readFileSync(
        path.join(clientSrcPath, "index.css"),
        "utf-8"
      );
      expect(indexCss).toContain(".dark");
    });

    it("should not have hardcoded slate colors in pages", () => {
      const pagesPath = path.join(clientSrcPath, "pages");
      const pageFiles = fs.readdirSync(pagesPath).filter(f => f.endsWith(".tsx"));
      
      for (const file of pageFiles) {
        const content = fs.readFileSync(path.join(pagesPath, file), "utf-8");
        // Allow slate in comments but not in className
        const classNameMatches = content.match(/className="[^"]*slate-\d+[^"]*"/g) || [];
        expect(classNameMatches.length).toBe(0);
      }
    });

    it("should not have hardcoded violet colors in pages", () => {
      const pagesPath = path.join(clientSrcPath, "pages");
      const pageFiles = fs.readdirSync(pagesPath).filter(f => f.endsWith(".tsx"));
      
      for (const file of pageFiles) {
        const content = fs.readFileSync(path.join(pagesPath, file), "utf-8");
        const classNameMatches = content.match(/className="[^"]*violet-\d+[^"]*"/g) || [];
        expect(classNameMatches.length).toBe(0);
      }
    });
  });

  describe("Typography", () => {
    it("should have Google Fonts loaded in index.html", () => {
      const indexHtml = fs.readFileSync(
        path.join(clientSrcPath, "../index.html"),
        "utf-8"
      );
      expect(indexHtml).toContain("fonts.googleapis.com");
      expect(indexHtml).toContain("Libre+Baskerville");
      expect(indexHtml).toContain("Inter");
    });

    it("should have font-display defined for headings", () => {
      const indexCss = fs.readFileSync(
        path.join(clientSrcPath, "index.css"),
        "utf-8"
      );
      expect(indexCss).toContain("--font-display");
      expect(indexCss).toContain("Libre Baskerville");
    });
  });

  describe("Mobile Components", () => {
    it("should have MobileBottomNav component", () => {
      const componentPath = path.join(clientSrcPath, "components/MobileBottomNav.tsx");
      expect(fs.existsSync(componentPath)).toBe(true);
      
      const content = fs.readFileSync(componentPath, "utf-8");
      expect(content).toContain("md:hidden");
      expect(content).toContain("min-h-[44px]"); // Touch target size
    });

    it("should have MobileBottomSheet component", () => {
      const componentPath = path.join(clientSrcPath, "components/MobileBottomSheet.tsx");
      expect(fs.existsSync(componentPath)).toBe(true);
      
      const content = fs.readFileSync(componentPath, "utf-8");
      expect(content).toContain("md:hidden");
      expect(content).toContain("onTouchStart");
    });
  });

  describe("Theme Toggle", () => {
    it("should have ThemeToggle component", () => {
      const componentPath = path.join(clientSrcPath, "components/ThemeToggle.tsx");
      expect(fs.existsSync(componentPath)).toBe(true);
      
      const content = fs.readFileSync(componentPath, "utf-8");
      expect(content).toContain("useTheme");
      expect(content).toContain("setTheme");
    });

    it("should have ThemeContext with setTheme function", () => {
      const contextPath = path.join(clientSrcPath, "contexts/ThemeContext.tsx");
      expect(fs.existsSync(contextPath)).toBe(true);
      
      const content = fs.readFileSync(contextPath, "utf-8");
      expect(content).toContain("setTheme");
      expect(content).toContain("system");
      expect(content).toContain("resolvedTheme");
    });
  });

  describe("DashboardLayout Integration", () => {
    it("should import ThemeToggle in DashboardLayout", () => {
      const layoutPath = path.join(clientSrcPath, "components/DashboardLayout.tsx");
      const content = fs.readFileSync(layoutPath, "utf-8");
      expect(content).toContain("ThemeToggle");
    });

    it("should import MobileBottomNav in DashboardLayout", () => {
      const layoutPath = path.join(clientSrcPath, "components/DashboardLayout.tsx");
      const content = fs.readFileSync(layoutPath, "utf-8");
      expect(content).toContain("MobileBottomNav");
    });

    it("should have mobile padding for bottom nav", () => {
      const layoutPath = path.join(clientSrcPath, "components/DashboardLayout.tsx");
      const content = fs.readFileSync(layoutPath, "utf-8");
      expect(content).toContain("pb-20");
    });
  });

  describe("Semantic Color Usage", () => {
    it("should use semantic colors in Home page", () => {
      const homePath = path.join(clientSrcPath, "pages/Home.tsx");
      const content = fs.readFileSync(homePath, "utf-8");
      
      // Should use semantic colors
      expect(content).toContain("bg-background");
      expect(content).toContain("text-primary");
      expect(content).toContain("text-muted-foreground");
    });

    it("should use semantic colors in Projects page", () => {
      const projectsPath = path.join(clientSrcPath, "pages/Projects.tsx");
      const content = fs.readFileSync(projectsPath, "utf-8");
      
      // Should use semantic colors
      expect(content).toContain("text-muted-foreground");
      expect(content).toContain("bg-accent");
    });
  });
});
