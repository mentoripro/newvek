(() => {
  const menuToggle = document.querySelector("#menu-toggle");
  const nav = document.querySelector("#site-nav");
  const menuQuery = window.matchMedia("(max-width: 979px)");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let lockY = 0;

  const setMenuLabel = () => {
    if (!menuToggle) return;
    const open = menuToggle.checked && menuQuery.matches;
    menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
    menuToggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    if (nav) nav.setAttribute("aria-hidden", menuQuery.matches && !menuToggle.checked ? "true" : "false");
  };

  const lockScroll = () => {
    if (document.body.classList.contains("is-locked")) return;
    lockY = window.scrollY;
    document.body.classList.add("is-locked");
    document.body.style.top = `-${lockY}px`;
  };

  const unlockScroll = (restore) => {
    if (!document.body.classList.contains("is-locked")) return;
    document.body.classList.remove("is-locked");
    document.body.style.top = "";
    if (restore) window.scrollTo(0, lockY);
  };

  const syncMenu = () => {
    const open = Boolean(menuToggle?.checked && menuQuery.matches);
    if (open) lockScroll();
    else unlockScroll(true);
    setMenuLabel();
  };

  menuToggle?.addEventListener("change", syncMenu);
  menuQuery.addEventListener("change", () => {
    if (!menuQuery.matches && menuToggle) menuToggle.checked = false;
    syncMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !menuToggle?.checked) return;
    menuToggle.checked = false;
    syncMenu();
    menuToggle.focus();
  });

  nav?.addEventListener("click", (event) => {
    const link = event.target.closest("a[href^='#']");
    if (!link || !menuToggle?.checked) return;
    event.preventDefault();
    const target = document.querySelector(link.getAttribute("href"));
    menuToggle.checked = false;
    unlockScroll(false);
    setMenuLabel();
    target?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  });

  setMenuLabel();

  const navLinks = [...document.querySelectorAll(".nav__link")];
  const spyTargets = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (spyTargets.length && "IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = `#${entry.target.id}`;
          navLinks.forEach((link) => link.toggleAttribute("aria-current", link.getAttribute("href") === id));
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    spyTargets.forEach((section) => spy.observe(section));
  }

  const dock = document.querySelector(".dock");
  const hero = document.querySelector(".hero");
  const calcSection = document.querySelector("#raschet");
  if (dock && "IntersectionObserver" in window) {
    let hideForHero = true;
    let hideForForm = false;
    const syncDock = () => dock.classList.toggle("is-hidden", hideForHero || hideForForm);
    if (hero) {
      new IntersectionObserver(
        ([entry]) => {
          hideForHero = entry.isIntersecting && entry.intersectionRatio > 0.35;
          syncDock();
        },
        { threshold: [0, 0.35, 0.6] }
      ).observe(hero);
    }
    if (calcSection) {
      new IntersectionObserver(
        ([entry]) => {
          hideForForm = entry.isIntersecting && entry.intersectionRatio > 0.12;
          syncDock();
        },
        { threshold: [0, 0.12, 0.25] }
      ).observe(calcSection);
    }
    syncDock();
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-object]");
    if (!trigger) return;
    const select = document.querySelector("#object");
    if (select) select.value = trigger.dataset.object;
  });

  const OLD_WATTS = {
    fluorescent: 15,
    hid: 13,
    halogen: 26,
    led: 8.5,
  };
  const NEW_WATTS = 5.5;
  const TARIFF = 9;
  const moneyFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

  const calcForm = document.querySelector("#calc-form");
  const calcResult = document.querySelector("#calc-result");
  const calcError = document.querySelector("#calc-error");

  const readCalc = () => {
    const area = Number(document.querySelector("#area")?.value);
    const hours = Number(document.querySelector("#hours")?.value);
    const kind = document.querySelector("#lamp-type")?.value;
    return { area, hours, kind };
  };

  const renderCalc = () => {
    if (!calcResult || !calcError) return null;
    const { area, hours, kind } = readCalc();
    calcError.textContent = "";
    if (!Number.isFinite(area) || area < 10 || area > 500000) {
      calcError.textContent = "Укажите площадь от 10 до 500 000 м².";
      calcResult.hidden = true;
      return null;
    }
    if (!Number.isFinite(hours) || hours < 1 || hours > 24) {
      calcError.textContent = "Укажите время работы света от 1 до 24 часов.";
      calcResult.hidden = true;
      return null;
    }
    const oldWatts = OLD_WATTS[kind] ?? OLD_WATTS.fluorescent;
    const delta = Math.max(oldWatts - NEW_WATTS, 0);
    const kwh = (delta / 1000) * area * hours * 365;
    const money = kwh * TARIFF;
    const value = calcResult.querySelector("[data-calc-value]");
    const note = calcResult.querySelector("[data-calc-note]");
    if (delta <= 0) {
      value.textContent = "Экономия небольшая";
      note.textContent = "Текущая система уже близка к новым светодиодам. Смету имеет смысл считать по нормам освещённости и состоянию светильников.";
    } else {
      value.textContent = `${moneyFormat.format(money)} ₽/год`;
      note.textContent = `Ориентир: около ${moneyFormat.format(kwh)} кВт·ч в год при тарифе ${TARIFF} ₽/кВт·ч. Это не оферта — точную экономию подтвердим расчётом по объекту.`;
    }
    calcResult.hidden = false;
    return { area, hours, money, kwh, delta };
  };

  calcForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    renderCalc();
  });

  document.querySelector("#calc-apply")?.addEventListener("click", () => {
    const result = renderCalc();
    const comment = document.querySelector("#comment");
    const name = document.querySelector("#name");
    if (!result || !comment) return;
    const summary =
      result.delta <= 0
        ? "Ориентир экономии: замена даст небольшой выигрыш по энергии, нужен расчёт по нормам."
        : `Ориентир экономии: площадь ${moneyFormat.format(result.area)} м², около ${moneyFormat.format(result.money)} ₽/год при тарифе ${TARIFF} ₽/кВт·ч.`;
    const lines = comment.value
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("Ориентир экономии:"));
    lines.push(summary);
    comment.value = lines.join("\n");
    name?.focus();
  });

  const leadForm = document.querySelector("#lead-form");
  const leadOk = document.querySelector("#lead-ok");

  const setFieldError = (input, message) => {
    const field = input.closest(".field");
    const slot = field?.querySelector(".field__error");
    if (slot) slot.textContent = message;
    input.setAttribute("aria-invalid", message ? "true" : "false");
  };

  const clearField = (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement || input instanceof HTMLTextAreaElement) {
      setFieldError(input, "");
    }
  };
  leadForm?.addEventListener("input", clearField);
  leadForm?.addEventListener("change", clearField);

  leadForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = leadForm.querySelector("#name");
    const phone = leadForm.querySelector("#phone");
    const object = leadForm.querySelector("#object");
    const comment = leadForm.querySelector("#comment");
    const honeypot = leadForm.querySelector("[name='website']");
    let valid = true;

    const nameValue = name.value.trim();
    if (nameValue.length < 2) {
      setFieldError(name, "Как к вам обращаться?");
      valid = false;
    } else setFieldError(name, "");

    const digits = phone.value.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) {
      setFieldError(phone, "Введите телефон, чтобы мы перезвонили.");
      valid = false;
    } else setFieldError(phone, "");

    if (!object.value) {
      setFieldError(object, "Выберите тип объекта.");
      valid = false;
    } else setFieldError(object, "");

    if (!valid) {
      leadForm.querySelector("[aria-invalid='true']")?.focus();
      return;
    }

    if (!honeypot?.value) {
      const leads = JSON.parse(localStorage.getItem("novyvek-leads") || "[]");
      leads.push({
        name: nameValue,
        phone: phone.value.trim(),
        object: object.value,
        comment: comment.value.trim(),
        at: new Date().toISOString(),
      });
      localStorage.setItem("novyvek-leads", JSON.stringify(leads));
    }

    leadForm.querySelector(".form__body").hidden = true;
    leadOk.hidden = false;
    leadOk.focus();
  });
})();
