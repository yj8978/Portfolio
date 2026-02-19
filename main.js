// Load Header
fetch("/components/header.html")
  .then(res => res.text())
  .then(data => {
    document.getElementById("header").innerHTML = data;

    // Re-attach menu toggle AFTER loading header
    const toggle = document.getElementById("menuToggle");
    const menu = document.getElementById("navMenu");

    if (toggle && menu) {
      toggle.addEventListener("click", () => {
        menu.classList.toggle("show");
        toggle.classList.toggle("active");
      });

      menu.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
          menu.classList.remove("show");
          toggle.classList.remove("active");
        });
      });
    }
  });

// Load Footer
fetch("/components/footer.html")
  .then(res => res.text())
  .then(data => {
    document.getElementById("footer").innerHTML = data;
  });
