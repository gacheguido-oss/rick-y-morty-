    const API_URL = "https://rickandmortyapi.com/api";

const searchInput = document.getElementById("search");
const statusSelect = document.getElementById("status");
const speciesSelect = document.getElementById("species");
const clearButton = document.getElementById("clearFilters");

const charactersContainer = document.getElementById("characters");
const message = document.getElementById("message");
const resultsCount = document.getElementById("resultsCount");
const pageInfo = document.getElementById("pageInfo");
const pageNumber = document.getElementById("pageNumber");

const prevButton = document.getElementById("prevPage");
const nextButton = document.getElementById("nextPage");

const dialog = document.getElementById("characterDialog");
const detailsContainer = document.getElementById("characterDetails");
const closeDialogButton = document.getElementById("closeDialog");

let currentPage = 1;
let totalPages = 1;
let searchTimer;
let requestController = null;
let detailController = null;
let requestId = 0;

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;

  return element;
}

function translateStatus(status) {
  const statuses = {
    Alive: "Vivo",
    Dead: "Muerto",
    unknown: "Desconocido"
  };

  return statuses[status] || status;
}

function setMessage(text) {
  message.textContent = text;
}

function updatePagination() {
  pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
  pageNumber.textContent = `· ${currentPage}`;

  prevButton.disabled = currentPage <= 1;
  nextButton.disabled = currentPage >= totalPages;
}

async function loadCharacters(page = 1) {
  currentPage = page;

  const thisRequest = ++requestId;

  if (requestController) requestController.abort();
  requestController = new AbortController();

  charactersContainer.replaceChildren();
  setMessage("Buscando personajes en el multiverso...");
  resultsCount.textContent = "Cargando...";
  prevButton.disabled = true;
  nextButton.disabled = true;

  const params = new URLSearchParams({
    page: String(currentPage)
  });

  const name = searchInput.value.trim();
  const status = statusSelect.value;
  const species = speciesSelect.value;

  if (name) params.set("name", name);
  if (status) params.set("status", status);
  if (species) params.set("species", species);

  try {
    const response = await fetch(
      `${API_URL}/character/?${params}`,
      { signal: requestController.signal }
    );

    if (thisRequest !== requestId) return;

    if (response.status === 404) {
      totalPages = 1;
      resultsCount.textContent = "0 personajes";
      updatePagination();
      setMessage("No se encontraron personajes. Probá otros filtros.");
      return;
    }

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    const data = await response.json();

    if (thisRequest !== requestId) return;

    totalPages = data.info.pages;
    resultsCount.textContent =
      `${data.info.count} personajes encontrados`;

    setMessage("");
    renderCharacters(data.results);
    updatePagination();
  } catch (error) {
    if (error.name === "AbortError") return;
    if (thisRequest !== requestId) return;

    console.error(error);
    resultsCount.textContent = "";
    setMessage("Error al cargar los personajes. Intentá nuevamente.");
  }
}

function renderCharacters(characters) {
  charactersContainer.replaceChildren();

  const fragment = document.createDocumentFragment();

  characters.forEach((character) => {
    const card = createElement("article", "character-card");
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Ver a ${character.name}`);

    const image = createElement("img", "character-image");
    image.src = character.image;
    image.alt = character.name;
    image.loading = "lazy";

    const content = createElement("div", "card-content");
    const name = createElement("h3", "", character.name);

    const statusLine = createElement("p", "status-line");
    const dot = createElement(
      "span",
      `status-dot ${character.status.toLowerCase()}`
    );

    const statusText = createElement(
      "span",
      "",
      `${translateStatus(character.status)} · ${character.species}`
    );

    statusLine.append(dot, statusText);

    const origin = createElement("p", "card-meta");
    origin.append(
      createElement("strong", "", "Planeta de origen"),
      createElement("span", "", character.origin.name)
    );

    const location = createElement("p", "card-meta");
    location.style.marginTop = "10px";
    location.append(
      createElement("strong", "", "Ubicación actual"),
      createElement("span", "", character.location.name)
    );

    const link = createElement(
      "span",
      "card-link",
      "Ver ficha completa →"
    );

    content.append(name, statusLine, origin, location, link);
    card.append(image, content);

    card.addEventListener("click", () => {
      showCharacterDetails(character);
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showCharacterDetails(character);
      }
    });

    fragment.append(card);
  });

  charactersContainer.append(fragment);
}

async function fetchResource(url, signal) {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error("No se pudo consultar el recurso.");
  }

  return response.json();
}

async function showCharacterDetails(character) {
  if (detailController) detailController.abort();

  detailController = new AbortController();
  const { signal } = detailController;

  detailsContainer.replaceChildren();

  const header = createElement("div", "detail-header");
  const image = createElement("img", "detail-image");

  image.src = character.image;
  image.alt = character.name;

  const heading = createElement("div");
  heading.append(
    createElement("h2", "", character.name),
    createElement(
      "p",
      "status-line",
      `${translateStatus(character.status)} · ${character.species}`
    )
  );

  header.append(image, heading);

  const information = createElement("section", "detail-section");
  information.append(createElement("h3", "", "Información"));

  const infoList = createElement("div", "detail-list");

  [
    ["Género", character.gender],
    ["Especie", character.species],
    ["Tipo", character.type || "No especificado"],
    ["Origen", character.origin.name],
    ["Ubicación actual", character.location.name],
    ["Cantidad de episodios", String(character.episode.length)]
  ].forEach(([label, value]) => {
    infoList.append(
      createElement("p", "", `${label}: ${value}`)
    );
  });

  information.append(infoList);

  const episodesSection = createElement("section", "detail-section");
  episodesSection.append(createElement("h3", "", "Episodios"));

  const episodesList = createElement("div", "episode-list");
  episodesList.append(
    createElement("p", "", "Cargando episodios...")
  );

  episodesSection.append(episodesList);
  detailsContainer.append(header, information, episodesSection);

  if (!dialog.open) dialog.showModal();

  try {
    if (character.origin.url) {
      const originData = await fetchResource(
        character.origin.url,
        signal
      );

      if (signal.aborted) return;

      const originSection = createElement("section", "detail-section");
      originSection.append(
        createElement("h3", "", "Planeta de origen")
      );

      const originInfo = createElement("div", "detail-list");

      [
        ["Nombre", originData.name],
        ["Tipo", originData.type],
        ["Dimensión", originData.dimension],
        ["Residentes", String(originData.residents.length)]
      ].forEach(([label, value]) => {
        originInfo.append(
          createElement("p", "", `${label}: ${value}`)
        );
      });

      originSection.append(originInfo);
      information.append(originSection);
    }

    if (signal.aborted) return;

    if (character.episode.length === 0) {
      episodesList.replaceChildren(
        createElement("p", "", "No hay episodios registrados.")
      );
      return;
    }

    const episodes = await Promise.all(
      character.episode.map((url) => fetchResource(url, signal))
    );

    if (signal.aborted) return;

    episodesList.replaceChildren();

    episodes.forEach((episode) => {
      const item = createElement("article", "episode-item");

      item.append(
        createElement("strong", "", episode.episode),
        createElement("span", "", episode.name),
        createElement(
          "p",
          "card-meta",
          `Emisión: ${episode.air_date}`
        )
      );

      episodesList.append(item);
    });
  } catch (error) {
    if (error.name === "AbortError") return;

    console.error(error);
    episodesList.replaceChildren(
      createElement(
        "p",
        "",
        "No se pudieron cargar los detalles."
      )
    );
  }
}

function applyFilters() {
  clearTimeout(searchTimer);

  searchTimer = setTimeout(() => {
    loadCharacters(1);
  }, 350);
}

searchInput.addEventListener("input", applyFilters);

statusSelect.addEventListener("change", () => loadCharacters(1));
speciesSelect.addEventListener("change", () => loadCharacters(1));

clearButton.addEventListener("click", () => {
  searchInput.value = "";
  statusSelect.value = "";
  speciesSelect.value = "";

  clearTimeout(searchTimer);
  loadCharacters(1);
});

prevButton.addEventListener("click", () => {
  if (currentPage > 1) loadCharacters(currentPage - 1);
});

nextButton.addEventListener("click", () => {
  if (currentPage < totalPages) loadCharacters(currentPage + 1);
});

closeDialogButton.addEventListener("click", () => {
  dialog.close();
});

dialog.addEventListener("close", () => {
  if (detailController) detailController.abort();
});

loadCharacters();