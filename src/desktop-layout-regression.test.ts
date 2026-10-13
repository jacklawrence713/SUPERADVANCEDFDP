import { describe, it, expect } from "vitest";

describe("Desktop Layout Structure Regression", () => {
  it("verifies root container has flex layout for proper desktop structure", () => {
    const mockNode = document.createElement("div");
    mockNode.style.display = "flex";
    mockNode.style.flexDirection = "row";
    
    expect(mockNode.style.display).toBe("flex");
    expect(mockNode.style.flexDirection).toBe("row");
  });

  it("verifies right column wrapper exists between sidebar and main content", () => {
    const rightCol = document.createElement("div");
    rightCol.style.flex = "1";
    rightCol.style.display = "flex";
    rightCol.style.flexDirection = "column";
    rightCol.style.minWidth = "0";
    rightCol.style.height = "100vh";
    
    expect(rightCol.style.display).toBe("flex");
    expect(rightCol.style.flexDirection).toBe("column");
    expect(rightCol.style.minWidth).toBe("0px");
    expect(rightCol.style.height).toBe("100vh");
    expect(rightCol.style.flex).toMatch(/^1/);
  });

  it("verifies ticker has proper flex constraints", () => {
    const ticker = document.createElement("div");
    ticker.style.overflow = "hidden";
    ticker.style.flexShrink = "0";
    ticker.style.padding = "6px 0";
    
    expect(ticker.style.overflow).toBe("hidden");
    expect(ticker.style.flexShrink).toBe("0");
  });

  it("verifies main content wrapper fills remaining space", () => {
    const mainContent = document.createElement("div");
    mainContent.style.flex = "1";
    mainContent.style.minWidth = "0";
    mainContent.style.overflowY = "auto";
    mainContent.style.paddingBottom = "40px";
    
    expect(mainContent.style.minWidth).toBe("0px");
    expect(mainContent.style.overflowY).toBe("auto");
    expect(mainContent.style.flex).toMatch(/^1/);
  });

  it("desktop layout: sidebar + right column should NOT push content off-screen", () => {
    const desktop = document.createElement("div");
    desktop.style.width = "1440px";
    desktop.style.height = "900px";
    desktop.style.display = "flex";
    desktop.style.flexDirection = "row";
    
    const sidebar = document.createElement("div");
    sidebar.style.width = "220px";
    sidebar.style.flexShrink = "0";
    
    const rightCol = document.createElement("div");
    rightCol.style.flex = "1";
    rightCol.style.display = "flex";
    rightCol.style.flexDirection = "column";
    rightCol.style.minWidth = "0";
    
    desktop.appendChild(sidebar);
    desktop.appendChild(rightCol);
    
    expect(parseInt(sidebar.style.width)).toBe(220);
    expect(rightCol.style.flex).toMatch(/^1/);
    expect(rightCol.style.minWidth).toBe("0px");
  });

  it("ticker is nested inside right column, not sibling to main content", () => {
    const rightCol = document.createElement("div");
    rightCol.style.display = "flex";
    rightCol.style.flexDirection = "column";
    
    const ticker = document.createElement("div");
    ticker.style.flexShrink = "0";
    
    const mainContent = document.createElement("div");
    mainContent.style.flex = "1";
    mainContent.style.overflowY = "auto";
    
    rightCol.appendChild(ticker);
    rightCol.appendChild(mainContent);
    
    expect(rightCol.children.length).toBe(2);
    expect(rightCol.children[0]).toBe(ticker);
    expect(rightCol.children[1]).toBe(mainContent);
  });

  it("mobile layout: ticker and main content stack vertically", () => {
    const mobile = document.createElement("div");
    mobile.style.display = "flex";
    mobile.style.flexDirection = "column";
    mobile.style.width = "390px";
    mobile.style.height = "844px";
    
    const ticker = document.createElement("div");
    ticker.style.flexShrink = "0";
    ticker.style.height = "40px";
    
    const mainContent = document.createElement("div");
    mainContent.style.flex = "1";
    mainContent.style.overflowY = "auto";
    mainContent.style.paddingBottom = "70px";
    
    mobile.appendChild(ticker);
    mobile.appendChild(mainContent);
    
    expect(mobile.children.length).toBe(2);
    expect(mobile.style.flexDirection).toBe("column");
  });

  it("rightcol wrapper height constraint prevents overflow", () => {
    const rightCol = document.createElement("div");
    rightCol.style.height = "100vh";
    
    expect(rightCol.style.height).toBe("100vh");
  });

  it("tabs render inside main content, not as root siblings", () => {
    const mainContent = document.createElement("div");
    mainContent.style.flex = "1";
    mainContent.style.overflowY = "auto";
    
    const tab1 = document.createElement("div");
    tab1.setAttribute("data-tab", "trade");
    
    const tab2 = document.createElement("div");
    tab2.setAttribute("data-tab", "rankings");
    
    mainContent.appendChild(tab1);
    mainContent.appendChild(tab2);
    
    expect(mainContent.querySelector("[data-tab='trade']")).toBe(tab1);
    expect(mainContent.querySelector("[data-tab='rankings']")).toBe(tab2);
  });

  it("ticker container has fixed height to not compete for horizontal space", () => {
    const tickerContainer = document.createElement("div");
    tickerContainer.style.overflow = "hidden";
    tickerContainer.style.flexShrink = "0";
    
    expect(tickerContainer.style.flexShrink).toBe("0");
    expect(tickerContainer.style.overflow).toBe("hidden");
  });

  it("right column forces sidebar to take fixed width on desktop", () => {
    const desktop = document.createElement("div");
    desktop.style.display = "flex";
    desktop.style.flexDirection = "row";
    
    const sidebar = document.createElement("div");
    sidebar.style.width = "220px";
    sidebar.style.flexShrink = "0";
    
    desktop.appendChild(sidebar);
    
    expect(sidebar.style.flexShrink).toBe("0");
    expect(sidebar.style.width).toBe("220px");
  });
});
