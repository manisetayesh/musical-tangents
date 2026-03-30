const vis_header_1 = document.getElementById("vis-header-1");
const vinyl_header = document.getElementById("vinyl-header");

function setPathMode(mode) {
  const normalized = mode === "explorer" ? "explorer" : "artist";
  window.__mtPathMode = normalized;
  window.dispatchEvent(
    new CustomEvent("mt:path-change", {
      detail: { mode: normalized },
    }),
  );
}

function artist() {
  console.log("artist");
  vis_header_1.textContent = "Which features line up with popularity?";
  vinyl_header.textContent = "The most popular genres per year";
  setPathMode("artist");
  vis_header_1.scrollIntoView({ behavior: "smooth" });
}

function explorer() {
  console.log("explorer");
  vis_header_1.textContent = "Which features line up with standing out?";
  vinyl_header.textContent = "The most niche genres per year";
  setPathMode("explorer");
  vis_header_1.scrollIntoView({ behavior: "smooth" });
}

setPathMode("artist");
