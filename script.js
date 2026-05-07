/*
  Casa Mirabella shared site behavior.
  Edit this file if you want to change:
  1. the default language
  2. the mobile menu behavior
  3. the simple image lightbox in the gallery
*/

const storageKey = "casa-mirabella-language";
const html = document.documentElement;
const header = document.querySelector(".site-header");
const navToggle = document.querySelector(".nav-toggle");
const languageToggle = document.querySelector(".language-toggle");
const languageLabel = document.querySelector("[data-lang-label]");

const setLanguage = (language) => {
  const next = language === "it" ? "it" : "en";
  html.setAttribute("data-language", next);
  html.setAttribute("lang", next);

  if (languageLabel) {
    languageLabel.textContent = next === "en" ? "IT" : "EN";
  }

  try {
    localStorage.setItem(storageKey, next);
  } catch (error) {
    console.warn("Language preference could not be saved.", error);
  }
};

const getSavedLanguage = () => {
  try {
    return localStorage.getItem(storageKey);
  } catch (error) {
    return null;
  }
};

setLanguage(getSavedLanguage() || "en");

if (languageToggle) {
  languageToggle.addEventListener("click", () => {
    const current = html.getAttribute("data-language") || "en";
    setLanguage(current === "en" ? "it" : "en");
  });
}

if (navToggle && header) {
  navToggle.addEventListener("click", () => {
    const open = header.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(open));
  });
}

document.querySelectorAll(".site-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    if (header) {
      header.classList.remove("nav-open");
    }
    if (navToggle) {
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
});

const contactForm = document.querySelector(".contact-form");
if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
  });
}

const lightbox = document.querySelector(".lightbox");
const lightboxImage = document.querySelector(".lightbox-image");
const lightboxClose = document.querySelector(".lightbox-close");

if (lightbox && lightboxImage && lightboxClose) {
  document.querySelectorAll("[data-lightbox-src]").forEach((item) => {
    item.addEventListener("click", () => {
      lightboxImage.src = item.getAttribute("data-lightbox-src") || "";
      lightboxImage.alt = item.getAttribute("data-lightbox-alt") || "";
      lightbox.hidden = false;
      document.body.style.overflow = "hidden";
    });
  });

  const closeLightbox = () => {
    lightbox.hidden = true;
    lightboxImage.src = "";
    document.body.style.overflow = "";
  };

  lightboxClose.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !lightbox.hidden) {
      closeLightbox();
    }
  });
}

const availabilityRoot = document.querySelector("[data-availability-calendar]");

if (availabilityRoot) {
  const monthsRoot = availabilityRoot.querySelector("[data-calendar-months]");
  const statusRoot = availabilityRoot.querySelector("[data-calendar-status]");
  const weekdays = {
    en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    it: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]
  };

  const getLanguage = () => html.getAttribute("data-language") || "en";

  const startOfUtcDay = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const addUtcDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  const toIsoDate = (date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const setCalendarStatus = (messageEn, messageIt, isError = false) => {
    if (!statusRoot) {
      return;
    }

    statusRoot.innerHTML = `
      <span class="lang lang-en">${messageEn}</span>
      <span class="lang lang-it">${messageIt}</span>
    `;
    statusRoot.style.color = isError ? "#8b4032" : "";
    setLanguage(getLanguage());
  };

  const formatMonthLabel = (date, language) => new Intl.DateTimeFormat(language === "it" ? "it-IT" : "en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);

  const renderMonth = (baseDate, blockedDates) => {
    const language = getLanguage();
    const firstDay = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), 1));
    const lastDay = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + 1, 0));
    const month = document.createElement("section");
    month.className = "calendar-month";

    const title = document.createElement("h3");
    title.className = "calendar-month-title";
    title.textContent = formatMonthLabel(firstDay, language);
    month.appendChild(title);

    const weekdayRow = document.createElement("div");
    weekdayRow.className = "calendar-weekdays";
    weekdays[language].forEach((label) => {
      const item = document.createElement("span");
      item.textContent = label;
      weekdayRow.appendChild(item);
    });
    month.appendChild(weekdayRow);

    const grid = document.createElement("div");
    grid.className = "calendar-grid";
    const startOffset = (firstDay.getUTCDay() + 6) % 7;

    for (let index = 0; index < startOffset; index += 1) {
      const empty = document.createElement("span");
      empty.className = "calendar-day is-empty";
      empty.setAttribute("aria-hidden", "true");
      grid.appendChild(empty);
    }

    for (let day = 1; day <= lastDay.getUTCDate(); day += 1) {
      const date = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), day));
      const isoDate = toIsoDate(date);
      const isUnavailable = blockedDates.has(isoDate);
      const cell = document.createElement("span");
      cell.className = `calendar-day ${isUnavailable ? "is-unavailable" : "is-available"}`;
      cell.textContent = String(day);
      cell.title = isUnavailable
        ? (language === "it" ? "Occupato" : "Unavailable")
        : (language === "it" ? "Libero" : "Available");
      grid.appendChild(cell);
    }

    month.appendChild(grid);
    return month;
  };

  const renderAvailabilityCalendar = (blockedDateList) => {
    if (!monthsRoot) {
      return;
    }

    const blockedDates = new Set(blockedDateList);
    monthsRoot.innerHTML = "";
    const today = startOfUtcDay(new Date());

    for (let offset = 0; offset < 4; offset += 1) {
      const monthDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offset, 1));
      monthsRoot.appendChild(renderMonth(monthDate, blockedDates));
    }
  };

  const fetchAvailability = async () => {
    setCalendarStatus("Loading availability...", "Caricamento disponibilita...");

    try {
      const response = await fetch("availability.php");
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Availability request failed.");
      }

      renderAvailabilityCalendar(payload.blockedDates || []);
      const syncedAt = payload.lastSynced
        ? new Intl.DateTimeFormat(getLanguage() === "it" ? "it-IT" : "en-US", {
            dateStyle: "medium",
            timeStyle: "short"
          }).format(new Date(payload.lastSynced))
        : null;

      if (syncedAt) {
        setCalendarStatus(`Updated ${syncedAt}`, `Aggiornato ${syncedAt}`);
      } else {
        setCalendarStatus("Availability loaded.", "Disponibilita caricata.");
      }
    } catch (error) {
      if (monthsRoot) {
        monthsRoot.innerHTML = "";
      }

      setCalendarStatus(
        "Live availability is temporarily unavailable. Please use the Booking.com link or contact us directly.",
        "La disponibilita live e temporaneamente non disponibile. Usa il link Booking.com o contattaci direttamente.",
        true
      );
    }
  };

  fetchAvailability();

  if (languageToggle) {
    languageToggle.addEventListener("click", () => {
      const months = Array.from(monthsRoot?.children || []);
      if (months.length) {
        fetchAvailability();
      }
    });
  }
}
