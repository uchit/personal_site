window.addEventListener("DOMContentLoaded", function () {
  if (!window.PagefindUI) return;
  new PagefindUI({
    element: "#search",
    showSubResults: true,
    showImages: false,
    excerptLength: 20,
    resetStyles: false,
  });

  var params = new URLSearchParams(location.search);
  var q = params.get("q");
  if (q) {
    var input = document.querySelector("#search input");
    if (input) {
      input.value = q;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
});
