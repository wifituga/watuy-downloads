const RELEASE_API =
  "https://api.github.com/repos/wifituga/watuy-downloads/releases/latest";
const RELEASE_FALLBACK =
  "https://github.com/wifituga/watuy-downloads/releases/latest";

const downloadGrid = document.querySelector("#download-grid");
const releaseVersion = document.querySelector("#release-version");
const releaseDate = document.querySelector("#release-date");
const heroVersion = document.querySelector("#hero-version");

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function assetFor(assets, extension) {
  return assets.find((asset) => asset.name.toLowerCase().endsWith(extension));
}

function shaFor(assets, binary) {
  if (!binary) return undefined;
  return assets.find((asset) => asset.name === `${binary.name}.sha256`);
}

function appendText(parent, tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  parent.append(element);
  return element;
}

function renderCard({ asset, sha, title, description, recommended }) {
  if (!asset) return;
  const card = document.createElement("article");
  card.className = `download-card${recommended ? " recommended" : ""}`;

  appendText(
    card,
    "span",
    asset.name.toLowerCase().endsWith(".exe")
      ? "NSIS / EXE"
      : "WINDOWS INSTALLER / MSI",
    "file-type",
  );
  appendText(card, "h3", title);
  appendText(card, "p", description);

  const details = document.createElement("div");
  details.className = "download-details";
  appendText(details, "span", "WINDOWS X64");
  appendText(details, "span", formatBytes(asset.size));
  card.append(details);

  const link = document.createElement("a");
  link.className = `button${recommended ? " button-primary" : ""}`;
  link.href = asset.browser_download_url;
  link.textContent = "DESCARGAR ↓";
  card.append(link);

  const hash = asset.digest?.startsWith("sha256:")
    ? asset.digest.slice(7)
    : undefined;
  if (hash || sha) {
    const block = document.createElement("details");
    block.className = "hash-block";
    appendText(block, "summary", "SHA-256 / VERIFICACIÓN");
    if (hash) appendText(block, "code", hash);
    if (sha) {
      const shaLink = document.createElement("a");
      shaLink.href = sha.browser_download_url;
      shaLink.textContent = "DESCARGAR ARCHIVO .SHA256 ↗";
      block.append(shaLink);
    }
    card.append(block);
  }

  downloadGrid.append(card);
}

function renderFailure() {
  downloadGrid.replaceChildren();
  downloadGrid.removeAttribute("aria-busy");
  const card = document.createElement("div");
  card.className = "loading-card";
  appendText(card, "span", "NO SE PUDO CONSULTAR LA RELEASE. ");
  const link = document.createElement("a");
  link.href = RELEASE_FALLBACK;
  link.textContent = "ABRIR GITHUB RELEASES ↗";
  card.append(link);
  downloadGrid.append(card);
  heroVersion.textContent = "RELEASE EN GITHUB";
}

async function loadRelease() {
  try {
    const response = await fetch(RELEASE_API, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) throw new Error(`GitHub respondió ${response.status}`);
    const release = await response.json();
    const version = String(release.tag_name || "").replace(/^v/, "");
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const exe = assetFor(assets, ".exe");
    const msi = assetFor(assets, ".msi");

    releaseVersion.textContent = `v${version}`;
    releaseDate.textContent = `PUBLICADA ${formatDate(release.published_at).toUpperCase()}`;
    heroVersion.textContent = `VERSIÓN ${version} / ESTABLE`;
    downloadGrid.replaceChildren();
    downloadGrid.removeAttribute("aria-busy");

    renderCard({
      asset: exe,
      sha: shaFor(assets, exe),
      title: "INSTALADOR .EXE",
      description:
        "Instalación guiada, accesos directos y desinstalador integrado.",
      recommended: true,
    });
    renderCard({
      asset: msi,
      sha: shaFor(assets, msi),
      title: "PAQUETE .MSI",
      description:
        "Para despliegue administrado mediante políticas o herramientas MDM.",
      recommended: false,
    });

    if (!exe && !msi) renderFailure();
  } catch (error) {
    console.warn("No se pudo cargar la release pública", error);
    renderFailure();
  }
}

void loadRelease();
